---
type: agent_requested
description: 推荐返费系统（小程序 + CRM）业务规则与开发规范。涉及推荐人注册审批、简历推荐、审核分配、签单、上户、返费结算等场景时启用。
---

# 推荐返费系统 Skill

本 Skill 固化「安得褓贝」推荐返费系统（`backend/src/modules/referral/`）的核心业务规则、数据模型、API 契约与小程序开发规范。开发/修改相关功能时必须遵守。

## 1. 角色体系

| 角色 | 标识值 | 判定来源 |
|---|---|---|
| 客户/访客 | `customer` | 默认 |
| 员工 | `staff` | `staff` 集合白名单命中 |
| 管理员 | `admin` | `staff` 集合中 `isAdmin: true` |
| 推荐官 | `推荐官`（旧值 `referrer` 兼容） | `referrers` 集合中 `approvalStatus=approved` |

**角色优先级**：`admin > staff > 推荐官 > customer`

## 2. 核心业务约束（改动前必读）

1. **推荐人永久绑定 sourceStaffId**（身份链路），但每条推荐的 `assignedStaffId` 每次动态解析（业务链路）。
2. **assignedStaffId 三级兜底**：① `targetStaffId` 在职 → ② `sourceStaffId` 在职 → ③ 管理员 openid。
3. **审核/跟进权唯一性**：仅 `assignedStaffId === callerOpenid` 可审核/更新状态，后端必须强校验，否则 403。
4. **24 小时审核 SLA**：提交时写入 `reviewDeadlineAt = now + 24h`，每 30 分钟定时扫描超时记录，`reassignType=review_timeout` 流转管理员。
5. **员工离职处理**：`staff.isActive=false` + `leftAt=离职日`，批量将其名下 `pending_review/following_up` 记录转管理员，`reassignType=departure`。
6. **返费归属分割线 = 离职日**：`rewardOwnerStaffId` 在合同签署时快照；`contractSignedAt < leftAt` → 原员工，否则 → 当前 `assignedStaffId`。
7. **返费 30 天基准日优先级**：`onboardConfirmedAt` > `startDate` > `onboardedAt`（上户回调按此顺序取最严谨日期 + 30 天写入 `rewardExpectedAt`）。
8. **`markPaid` 硬校验**：`rewardExpectedAt` 未到拒绝打款；已 `paid` 记录禁止重复打款。
9. **合同 30 天内提前终止**：记录回退至 `following_up`，不发放返费；已 `paid` 则保持终态，后续重签不重置。
10. **双向去重**（推荐库=推荐人私有池；简历库=公司公有池，物理隔离）：
    - **推荐端提交**：跨 `resumes` + `referral_resumes` 查重，排除 `rejected`/`invalid`/`released`。命中 `resumes` → 打 `referralActivated=true` 标记 + 创建 `activated` 推荐记录，并返回 400。
    - **CRM 录简历**：反查 `referral_resumes`，排除 `rejected`/`invalid`/`activated`/`released`。命中抛 `ConflictException`，错误信息必须包含推荐人姓名 + 当前状态 label，并提示"先到推荐管理页释放"。
    - 两个池之间只有一条人工通道："释放"按钮（见第 11 条），审核通过的推荐记录**不自动**进入简历库。
11. **"释放"动作**（`POST /referral/staff/release-to-resume-library`）：
    - 权限：管理员 **或** 该记录的 `assignedStaffId`（简历归属员工），其他员工 403。
    - 可释放状态：`approved` / `following_up`；`linkedResumeId` 已存在则拒绝（防重）。
    - 数据流：先把 `referral_resumes.status` 置为 `released` + 记录 `releasedAt`/`releasedBy` → 调用 `ResumeService.createMinimalFromReferral` 在 `resumes` 创建记录（`leadSource='referral'`，带推荐人姓名到 remarks）→ 回写 `linkedResumeId`。失败时回滚状态。
    - 释放后推荐记录继续承担签单/上户/返费结算（规则 6-9 不变）。

## 3. 状态机

**`reviewStatus`**（审核环节）：`pending_review` | `approved` | `rejected` | `activated`

**`status`**（整体流程）：
```
pending_review → (approved/rejected) → following_up → contracted → onboarded
                                           ↓  ↓             ↑
                                        invalid│    (合同30天内终止回退)
                                               │    ↓
                                               │  reward_pending → reward_paid
                                               ↓
                                          released（管理员/归属员工手动释放到简历库）

activated（简历库已存在，不进审核队列，仅作标记）
```

**`rewardStatus`**：`pending` | `reviewing` | `paid` | `rejected`

## 4. 后端开发规范

### 4.1 目录与文件位置
- 业务代码：`backend/src/modules/referral/`
- Controller：`referral.controller.ts`
- Service：`referral.service.ts`
- Mongoose Model：`models/*.model.ts`（`referrer` / `referral-resume` / `referral-binding-log` / `referral-reward`）

### 4.2 路由分组约定
- `/referral/miniprogram/*` — 小程序端（`@Public()`，用 openid 鉴权）
- `/referral/staff/*` — 员工端（`@Public()`，用 staffId 鉴权）
- `/referral/admin/*` — 管理员端（`@Public()`，用 staffId + isAdmin 校验）
- `/referral/crm/*` — CRM 回调（`X-Service-Secret` 请求头鉴权，`CRM_SERVICE_SECRET` 环境变量）

### 4.3 响应格式（强制统一）
```ts
// 成功
return { success: true, data, message? };
// 失败
throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
```

### 4.4 Controller 必带装饰器
`@ApiTags('推荐返费系统')`、每个路由加 `@ApiOperation({ summary: '...' })`，公开接口加 `@Public()`。

### 4.5 `serviceType` 使用英文 key
如 `yuesao`、`yuyingsao`、`baomu` 等，通过 `GET /referral/miniprogram/job-types` 统一下发，前端不得硬编码中文。

### 4.6 绑定变更审计
**任何修改 `assignedStaffId` 的代码路径**都必须同步写入 `referral_binding_logs`，`reassignType` 取 `manual` / `departure` / `review_timeout` 之一，`manual` 的 `reason` 必填。

## 5. 小程序前端开发（`pages/` 下页面）

### 5.1 页面路径与权限
| 路径 | 角色 |
|---|---|
| `pages/referrerRegister/index` | customer（扫海报落地） |
| `pages/referrerRegister/pending` | customer（申请等待页） |
| `pages/referralSubmit/index` | 推荐官 |
| `pages/myReferrals/index` / `detail` | 推荐官 |
| `pages/admin/referralReview/index` / `detail` | staff / admin |
| `pages/admin/referrerApproval/index` | admin |
| `pages/admin/referralManage/index` | admin |

### 5.2 扫码落地必做
1. `onLoad` 解析 scene 中的 `staffId`，`wx.setStorageSync('referral_source_staff_id', staffId)`。
2. 调用 `GET /referral/miniprogram/staff-info?staffId=` 获取 `isActive`；`isActive=false` 时落地页提示「该顾问已不在职，本次推荐将由管理员接管」。
3. 提交推荐时透传 `targetStaffId`（本次扫码员工），后端做二次在职校验。

### 5.3 脱敏约定
推荐人端展示被推荐阿姨姓名用「张**」形式，员工端不脱敏。

### 5.4 状态标签颜色
待审核灰 / 审核未通过红 / 跟进中蓝 / 已激活橙（仅员工可见） / 已签单绿 / 已上户青 / 返费待审核橙加粗 / 返费已打款深绿 / 未录用红。

## 6. 常见陷阱

- ❌ 不要用 `sourceStaffId` 做审核权校验 —— 用 `assignedStaffId`
- ❌ 不要把 `serviceType` 存中文 —— 统一英文 key
- ❌ 不要直接改 `assignedStaffId` 不写 `referral_binding_logs`
- ❌ 不要在 `contracted` 时用 `assignedStaffId` 作为返费归属 —— 用快照的 `rewardOwnerStaffId`
- ❌ 去重时不要把 `rejected`/`invalid`/`released` 记录算进去（CRM 录简历还要额外排除 `activated`）
- ❌ `rewardExpectedAt` 未到禁止 `markPaid`，已 `paid` 禁止二次打款
- ❌ 不要让审核通过的推荐简历自动流入简历库 —— 必须由管理员或归属员工手动点"释放"按钮

## 7. 对应 PRD 文件
完整业务说明见 `backend/src/推荐奖励功能（返费系统）`（无扩展名的 Markdown 文件，v1.6，~1700 行）。本 Skill 是 PRD 的开发侧摘要，两者冲突时以 PRD 为准，并提醒用户同步更新本文件。

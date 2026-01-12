# 安得家政CRM系统 - API完整文档

> **文档版本**: v1.4  
> **最后更新**: 2026-01-10  
> **维护团队**: 安得家政技术团队

---

## 📋 目录

- [1. 概述](#1-概述)
- [2. 通用规范](#2-通用规范)
- [3. 认证授权（auth）](#3-认证授权auth)
- [4. 简历管理（resumes）](#4-简历管理resumes)
- [5. 客户管理（customers）](#5-客户管理customers)
- [6. 线索流转（lead-transfer）](#6-线索流转lead-transfer)
- [7. 合同管理（contracts）](#7-合同管理contracts)
- [8. 保险（大树保 / dashubao）](#8-保险大树保--dashubao)
- [9. 面试间管理（interview）](#9-面试间管理interview)
- [10. ZEGO 能力与提词/远程控制（zego）](#10-zego-能力与提词远程控制zego)
- [11. 通知（notifications）](#11-通知notifications)
- [12. 跟进记录（follow-ups）](#12-跟进记录follow-ups)
- [13. 用户与角色（users / roles）](#13-用户与角色users--roles)
- [14. 文件上传（upload）](#14-文件上传upload)
- [15. 微信相关（wechat / wechat-openid 等）](#15-微信相关wechat--wechat-openid-等)
- [16. 第三方与运维（ocr / baidu / trtc / 日志 / 健康检查）](#16-第三方与运维ocr--baidu--trtc--日志--健康检查)
- [17. 已废弃或未实现接口（旧文档兼容说明）](#17-已废弃或未实现接口旧文档兼容说明)
- [18. 错误码说明](#18-错误码说明)
- [19. 最佳实践](#19-最佳实践)
- [20. 更新日志](#20-更新日志)

---

## 1. 概述

### 1.1 基础信息

- **全局前缀**: 后端通过 `app.setGlobalPrefix('api')` 设置统一前缀，因此所有接口默认以 `/api` 开头。
- **生产环境 API Base**: `https://crm.andejiazheng.com/api`
- **本地开发 API Base**: `http://localhost:3000/api`（或开发端口）
- **Swagger（建议以此为准）**: `/api/docs`
- **认证方式**: Bearer Token
  - 请求头：`Authorization: Bearer {token}`

### 1.2 文档说明

本文件以 `backend/src/modules/**/**.controller.ts` 为准，补齐并修正了历史文档中与代码不一致的部分。

- 文档中的“是否需要登录”根据控制器是否使用 `JwtAuthGuard` 以及注释说明整理；如有变更，以代码为准。
- 部分接口为内部测试/调试用途（例如 `test-*`），已明确标注。

---

## 2. 通用规范

### 2.1 统一响应格式（推荐处理方式）

大多数业务接口返回如下结构（部分模块可能略有差异）：

```json
{
  "success": true,
  "data": {},
  "message": "操作成功/失败的消息",
  "error": "错误详情（可选）",
  "timestamp": 1626342025123
}
```

### 2.2 常见状态码

| 状态码 | 说明 |
|------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无响应体） |
| 400 | 请求参数错误 |
| 401 | 未授权（Token无效或过期） |
| 403 | 禁止访问（权限不足/资源不可访问） |
| 404 | 资源不存在 |
| 409 | 冲突（重复资源等） |
| 413 | 上传文件过大 |
| 500 | 服务器内部错误 |

### 2.3 分页查询约定

常见分页参数：
- `page`: 页码，从 1 开始
- `pageSize` 或 `limit`: 每页条数

返回一般为：

```json
{
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "list": []
}
```

---

## 3. 认证授权（auth）

**控制器**: `backend/src/modules/auth/auth.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/auth/login` | 否 | CRM 账号密码登录 |
| POST | `/api/auth/miniprogram-login` | 否 | 小程序登录（code + phone） |
| POST | `/api/auth/logout` | 是 | 登出 |
| GET | `/api/auth/session` | 是 | 获取会话信息 |
| POST | `/api/auth/refresh` | 是 | 刷新 Token（实现依赖服务侧策略） |
| GET | `/api/auth/me` | 是 | 获取当前用户信息 |
| POST | `/api/auth/avatar` | 是 | 上传用户头像（multipart） |

**登录请求示例**：

```json
{
  "username": "admin",
  "password": "******"
}
```

---

## 4. 简历管理（resumes）

**控制器**: `backend/src/modules/resume/resume.controller.ts`

### 4.1 CRM 端简历

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/resumes` | 是 | 创建简历（multipart，多文件字段） |
| POST | `/api/resumes/json` | 是 | 创建简历（JSON 版本，用于部分场景） |
| GET | `/api/resumes` | 是 | 获取简历列表（分页/筛选） |
| GET | `/api/resumes/options` | 是 | 获取下拉选项/枚举（用于表单） |
| GET | `/api/resumes/enums` | 是 | 获取枚举（用于前端映射） |
| GET | `/api/resumes/search-workers` | 是 | 搜索服务人员（用于合同/保险等） |
| GET | `/api/resumes/test-search-workers` | 是 | 测试搜索（调试用） |
| GET | `/api/resumes/:id` | 是 | 获取简历详情 |
| PATCH | `/api/resumes/:id` | 是 | 更新简历 |
| DELETE | `/api/resumes/:id` | 是 | 删除简历 |

### 4.2 简历公开/分享

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/resumes/public/list` | 否/部分实现可能公开 | 公共简历列表（用于外部展示） |
| GET | `/api/resumes/public/:id` | 否/部分实现可能公开 | 公共简历详情 |
| GET | `/api/resumes/:id/public` | 是 | 获取公开简历信息（内部用途） |
| POST | `/api/resumes/:id/share` | 是 | 生成分享 Token |
| GET | `/api/resumes/shared/:token` | 否 | 根据分享 Token 获取简历 |

### 4.3 小程序简历（含自助注册）

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/resumes/miniprogram/self-register` | 否/以实现为准 | 小程序端自助注册（历史兼容） |
| POST | `/api/resumes/miniprogram/create` | 是 | 小程序创建简历（幂等/校验等） |
| GET | `/api/resumes/miniprogram/:id` | 是 | 小程序获取简历详情 |
| PATCH | `/api/resumes/miniprogram/:id` | 是 | 小程序更新简历 |
| POST | `/api/resumes/miniprogram/:id/upload-file` | 是 | 小程序上传单文件 |
| POST | `/api/resumes/miniprogram/:id/upload-files` | 是 | 小程序上传多文件 |
| DELETE | `/api/resumes/miniprogram/:id/delete-file` | 是 | 小程序删除文件 |
| POST | `/api/resumes/miniprogram/validate` | 是 | 小程序数据校验（防重复/格式检查） |
| GET | `/api/resumes/miniprogram/stats` | 是 | 小程序统计信息 |

### 4.4 简历文件管理（CRM）

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/resumes/:id/upload` | 是 | 给简历追加上传（单入口） |
| POST | `/api/resumes/:id/files` | 是 | 批量追加文件（按实现） |
| DELETE | `/api/resumes/:id/files/:fileId` | 是 | 删除指定文件（按 fileId） |
| POST | `/api/resumes/:id/files/delete` | 是 | 删除文件（兼容旧实现） |
| PATCH | `/api/resumes/:id/personal-photos` | 是 | 更新个人照片集合（按实现） |

### 4.5 档期/可用性（availability）

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/resumes/:id/availability` | 是 | 获取档期 |
| POST | `/api/resumes/:id/availability` | 是 | 更新档期 |
| POST | `/api/resumes/:id/availability/batch` | 是 | 批量更新档期 |
| DELETE | `/api/resumes/:id/availability` | 是 | 删除档期 |
| GET | `/api/resumes/:id/availability/check` | 是 | 校验档期（是否冲突等） |

### 4.6 导入

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/resumes/import-excel` | 是 | Excel 导入简历（按实现） |

---

## 5. 客户管理（customers）

**控制器**: `backend/src/modules/customers/customers.controller.ts`

### 5.1 CRM 客户基础接口

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/customers` | 是 | 创建客户 |
| GET | `/api/customers` | 是 | 获取客户列表（查询参数较多） |
| GET | `/api/customers/statistics` | 是 | 客户统计 |
| GET | `/api/customers/customer-id/:customerId` | 是 | 通过业务 customerId 获取客户 |
| GET | `/api/customers/address-by-phone/:phone` | 是 | 通过手机号获取服务地址（合同页用） |
| GET | `/api/customers/assignable-users` | 是 | 获取可分配员工列表 |
| POST | `/api/customers/batch-assign` | 是 | 批量分配客户 |
| GET | `/api/customers/my-customer-count` | 是 | 我的客户数量 |
| GET | `/api/customers/:id` | 是 | 获取客户详情 |
| PATCH | `/api/customers/:id` | 是 | 更新客户 |
| DELETE | `/api/customers/:id` | 是 | 删除客户 |

### 5.2 线索公海（public-pool）

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/customers/public-pool` | 是 | 获取公海线索列表 |
| GET | `/api/customers/public-pool/statistics` | 是 | 公海统计 |
| POST | `/api/customers/public-pool/claim` | 是 | 认领公海线索 |
| POST | `/api/customers/public-pool/assign` | 是 | 从公海分配线索 |
| POST | `/api/customers/batch-release-to-pool` | 是 | 批量释放到公海 |
| POST | `/api/customers/:id/release-to-pool` | 是 | 单条释放到公海 |
| GET | `/api/customers/:id/public-pool-logs` | 是 | 公海操作日志 |

### 5.3 客户跟进（customer follow-ups）

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/customers/:id/follow-ups` | 是 | 新增客户跟进 |
| GET | `/api/customers/:id/follow-ups` | 是 | 获取客户跟进列表 |

### 5.4 分配与日志

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| PATCH | `/api/customers/:id/assign` | 是 | 分配/改派负责人 |
| GET | `/api/customers/:id/assignment-logs` | 是 | 分配日志 |
| GET | `/api/customers/:id/operation-logs` | 是 | 操作日志 |

### 5.5 小程序客户接口

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/customers/miniprogram/statistics` | 是 | 小程序客户统计 |
| GET | `/api/customers/miniprogram/list` | 是 | 小程序客户列表 |
| POST | `/api/customers/miniprogram/create` | 是 | 小程序创建客户 |
| GET | `/api/customers/miniprogram/:id` | 是 | 小程序客户详情 |
| PATCH | `/api/customers/miniprogram/:id` | 是 | 小程序更新客户 |
| PATCH | `/api/customers/miniprogram/:id/assign` | 是 | 小程序分配客户 |
| POST | `/api/customers/miniprogram/:id/follow-ups` | 是 | 小程序新增客户跟进 |
| GET | `/api/customers/miniprogram/:id/follow-ups` | 是 | 小程序客户跟进列表 |
| GET | `/api/customers/miniprogram/:id/assignment-logs` | 是 | 小程序分配日志 |
| GET | `/api/customers/miniprogram/employees/list` | 是 | 小程序端员工列表（用于分配） |
| POST | `/api/customers/import-excel` | 是 | 客户 Excel 导入 |

---

## 6. 线索流转（lead-transfer）

**控制器**: `backend/src/modules/customers/controllers/lead-transfer.controller.ts`

> 该模块通常需要管理员/经理权限（RolesGuard）。

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/lead-transfer/rules` | 是 | 创建流转规则 |
| GET | `/api/lead-transfer/rules` | 是 | 获取规则列表 |
| GET | `/api/lead-transfer/rules/:id` | 是 | 获取规则详情 |
| GET | `/api/lead-transfer/rules/:id/predict` | 是 | 预测下次流转 |
| PATCH | `/api/lead-transfer/rules/:id` | 是 | 更新规则 |
| PATCH | `/api/lead-transfer/rules/:id/toggle` | 是 | 启用/禁用规则 |
| DELETE | `/api/lead-transfer/rules/:id` | 是 | 删除规则 |
| GET | `/api/lead-transfer/records` | 是 | 获取流转记录 |
| GET | `/api/lead-transfer/statistics` | 是 | 流转统计 |
| GET | `/api/lead-transfer/user-statistics/:userId` | 是 | 用户流转统计 |
| POST | `/api/lead-transfer/execute-now` | 是 | 手动执行流转任务 |

---

## 7. 合同管理（contracts）

**控制器**: `backend/src/modules/contracts/contracts.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/contracts` | 是 | 创建合同 |
| GET | `/api/contracts` | 是 | 合同列表（page/limit/search/showAll） |
| GET | `/api/contracts/statistics` | 是 | 合同统计 |
| GET | `/api/contracts/customer/:customerId` | 是 | 根据客户ID查询合同 |
| GET | `/api/contracts/worker/:workerId` | 是 | 根据服务人员ID查询合同 |
| GET | `/api/contracts/number/:contractNumber` | 是 | 根据合同号查询合同 |
| GET | `/api/contracts/search-by-worker` | 否（公开） | 通过服务人员信息查询合同（保险投保页自动填充） |
| GET | `/api/contracts/:id` | 是 | 合同详情 |
| PUT | `/api/contracts/:id` | 是 | 更新合同 |
| DELETE | `/api/contracts/:id` | 是 | 删除合同 |
| GET | `/api/contracts/test-no-auth` | 否（公开） | 测试端点 |
| GET | `/api/contracts/:id/esign-info` | 是 | 获取合同爱签信息（含实时状态/预览） |
| POST | `/api/contracts/:id/download-contract` | 是 | 下载合同（按实现） |
| POST | `/api/contracts/esign/test-get-contract` | 是 | 爱签调试接口 |
| GET | `/api/contracts/check-customer/:customerPhone` | 是 | 检查客户（按实现） |
| POST | `/api/contracts/change-worker/:originalContractId` | 是 | 更换阿姨/服务人员 |
| GET | `/api/contracts/history/:customerPhone` | 是 | 客户合同历史 |
| GET | `/api/contracts/latest/list` | 是 | 最新合同列表（按实现） |
| POST | `/api/contracts/signed-callback/:contractId` | 是/按实现 | 签署回调（按实现） |

> 说明：该控制器文件存在重复声明的历史代码片段，最终以运行时路由为准；建议以 Swagger `/api/docs` 或实际请求验证为权威。

---

## 8. 保险（大树保 / dashubao）

**控制器**: `backend/src/modules/dashubao/dashubao.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/dashubao/policy` | 是 | 投保确认-创建保单 |
| POST | `/api/dashubao/policy/query` | 是 | 从大树保查询保单 |
| POST | `/api/dashubao/policy/cancel` | 是 | 注销未生效保单 |
| POST | `/api/dashubao/policy/print` | 是 | 获取电子保单 PDF |
| POST | `/api/dashubao/policy/invoice` | 是 | 申请电子发票 |
| POST | `/api/dashubao/policy/payment/:policyRef` | 是 | 获取微信支付信息 |
| POST | `/api/dashubao/payment/callback` | 否（回调） | 支付回调（XML 原文） |
| POST | `/api/dashubao/policy/amend` | 是 | 批改-替换被保险人 |
| POST | `/api/dashubao/policy/add-insured` | 是 | 批增-增加被保险人 |
| POST | `/api/dashubao/policy/surrender` | 是 | 退保 |
| GET | `/api/dashubao/policy/rebate/:policyNo` | 是 | 返佣查询 |
| GET | `/api/dashubao/policies` | 是 | 本地保单列表 |
| GET | `/api/dashubao/policy/:id` | 是 | 根据ID获取保单 |
| GET | `/api/dashubao/policy/by-policy-no/:policyNo` | 是 | 根据保单号获取保单 |
| GET | `/api/dashubao/policy/by-policy-ref/:policyRef` | 是 | 根据商户单号获取保单 |
| POST | `/api/dashubao/policy/sync/:policyNo` | 是 | 同步保单状态 |

---

## 9. 面试间管理（interview）

**控制器**: `backend/src/modules/interview/interview.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/interview/rooms` | 是 | 创建面试间 |
| GET | `/api/interview/active-room` | 是 | 获取当前活跃面试间 |
| GET | `/api/interview/rooms` | 是 | 面试间列表 |
| GET | `/api/interview/rooms/:roomId` | 是 | 面试间详情 |
| POST | `/api/interview/rooms/:roomId/end` | 是 | 结束面试间 |
| GET | `/api/interview/rooms/:roomId/status` | 是 | 检查面试间状态 |
| POST | `/api/interview/create-room` | 是 | 简化版创建面试间（小程序H5用） |
| GET | `/api/interview/latest-room` | 是 | 获取最新活跃面试间 |

---

## 10. ZEGO 能力与提词/远程控制（zego）

**控制器**: `backend/src/modules/zego/zego.controller.ts`

### 10.1 Token 与配置

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/zego/generate-token` | 是 | 生成主持人 Token |
| GET | `/api/zego/config` | 是 | 获取 ZEGO 配置 |
| POST | `/api/zego/generate-guest-token` | 否 | 生成访客 Token（客户/阿姨加入） |

### 10.2 房间控制

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/zego/kick-user` | 是 | 踢出用户（主持人） |
| POST | `/api/zego/dismiss-room` | 是 | 解散房间（主持人） |
| POST | `/api/zego/check-room` | 否 | 检查房间状态 |
| POST | `/api/zego/leave-room` | 否 | 用户离开房间（支持 sendBeacon） |

### 10.3 提词器

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/zego/push-teleprompter` | 是 | 推送提词内容 |
| POST | `/api/zego/control-teleprompter` | 是 | 控制提词器（播放/暂停等） |
| POST | `/api/zego/get-teleprompter` | 否 | 拉取提词器消息（轮询） |
| POST | `/api/zego/quick-start-teleprompter` | 是 | 一键推送并启动 |

### 10.4 远程控制（摄像头/麦克风等）

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/zego/remote-control` | 是 | 主持人下发远控 |
| POST | `/api/zego/get-remote-control` | 否 | 拉取远控消息（轮询） |

---

## 11. 通知（notifications）

**控制器**: `backend/src/modules/notification/notification.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/notifications` | 是 | 获取通知列表 |
| GET | `/api/notifications/unread-count` | 是 | 未读数量 |
| PUT | `/api/notifications/mark-read` | 是 | 标记已读（批量） |
| PUT | `/api/notifications/mark-all-read` | 是 | 全部标记已读 |

---

## 12. 跟进记录（follow-ups）

**控制器**: `backend/src/modules/follow-up/follow-up.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/follow-ups` | 是 | 创建跟进记录 |
| GET | `/api/follow-ups/test-populate` | 是 | 测试 populate（调试） |
| GET | `/api/follow-ups/resume/:resumeId` | 是 | 获取某简历跟进记录 |
| GET | `/api/follow-ups/user` | 是 | 当前用户跟进记录 |
| GET | `/api/follow-ups/recent` | 是 | 最近跟进记录 |
| GET | `/api/follow-ups/all` | 是 | 获取所有跟进记录 |
| DELETE | `/api/follow-ups/:id` | 是 | 删除跟进记录 |

---

## 13. 用户与角色（users / roles）

### 13.1 用户（users）

**控制器**: `backend/src/modules/users/users.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/users` | 是 | 创建用户 |
| GET | `/api/users` | 是 | 用户列表 |
| GET | `/api/users/:id` | 是 | 用户详情 |
| PATCH | `/api/users/:id` | 是 | 更新用户 |
| DELETE | `/api/users/:id` | 是 | 删除用户 |

### 13.2 角色（roles）

**控制器**: `backend/src/modules/roles/roles.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/roles` | 是 | 创建角色 |
| GET | `/api/roles` | 是 | 角色列表 |
| GET | `/api/roles/:id` | 是 | 角色详情 |
| PATCH | `/api/roles/:id` | 是 | 更新角色 |
| DELETE | `/api/roles/:id` | 是 | 删除角色 |

---

## 14. 文件上传（upload）

**控制器**: `backend/src/modules/upload/upload.controller.ts`

> 注意：当前实现的路径与历史文档不同，接口为 `upload/file` 与 `upload/video`，并非 `/api/upload` 与 `/api/upload/batch`。

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/upload/file` | 否/按实现 | 上传文件到 COS（multipart，含 type） |
| GET | `/api/upload/file/:fileUrl` | 否/按实现 | 获取文件（重定向到签名 URL） |
| DELETE | `/api/upload/file/:fileUrl` | 否/按实现 | 删除文件 |
| POST | `/api/upload/video` | 否/按实现 | 上传视频并转码（multipart） |

---

## 15. 微信相关（wechat / wechat-openid 等）

### 15.1 CRM 微信服务（wechat）

**控制器**: `backend/src/modules/wechat/wechat.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/wechat/bind-qrcode/:userId` | 否/按实现 | 生成员工绑定二维码 |
| GET | `/api/wechat/event` | 否 | 微信服务器验证（返回 echostr） |
| POST | `/api/wechat/event` | 否 | 微信事件处理（关注/扫码） |
| POST | `/api/wechat/test-message` | 否/按实现 | 测试发送消息 |

### 15.2 小程序侧微信能力（weixin controller 内定义的路径）

**控制器**: `backend/src/modules/weixin/weixin.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/wechat/openid` | 否 | 通过 code 获取 openid |
| POST | `/api/advisor/subscribe` | 否 | 保存顾问订阅状态 |
| POST | `/api/customer/action` | 否 | 记录客户行为（可触发线索/通知链路） |
| POST | `/api/message/send` | 否 | 发送订阅消息 |

---

## 16. 第三方与运维（ocr / baidu / trtc / 日志 / 健康检查）

### 16.1 OCR（ocr）

**控制器**: `backend/src/modules/ocr/ocr.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/ocr/idcard` | 否 | 身份证 OCR（multipart，file） |
| GET | `/api/ocr/health` | 否 | OCR 健康检查 |
| GET | `/api/ocr/metrics` | 否 | OCR 指标 |

### 16.2 百度地图地点联想（baidu/place）

**控制器**: `backend/src/modules/baidu/baidu.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/baidu/place/suggestion` | 否 | 地点联想（query 必填） |

### 16.3 TRTC（trtc）

**控制器**: `backend/src/modules/trtc/trtc.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/trtc/getUserSig` | 是 | 获取 UserSig |
| GET | `/api/trtc/config` | 是 | 获取 SDK 配置 |

### 16.4 小程序访问日志（miniprogram-access-log）

**控制器**: `backend/src/modules/miniprogram-log/miniprogram-log.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| POST | `/api/miniprogram-access-log` | 否 | 记录小程序 H5 页面访问日志 |

### 16.5 健康检查（health）

**控制器**:
- `backend/src/modules/health/health.controller.ts`
- `backend/src/app.controller.ts`（存在同名 health 路由实现）

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/health` | 否 | 服务健康检查 |

### 16.6 驾驶舱（dashboard）

**控制器**: `backend/src/modules/dashboard/dashboard.controller.ts`

| 方法 | 路径 | 是否需要登录 | 说明 |
|---|---|---|---|
| GET | `/api/dashboard/stats` | 否/按实现 | 获取驾驶舱统计（可带日期范围） |
| GET | `/api/dashboard/customer-business` | 否/按实现 | 客户业务指标 |
| GET | `/api/dashboard/financial` | 否/按实现 | 财务指标 |
| GET | `/api/dashboard/efficiency` | 否/按实现 | 运营效率指标 |
| GET | `/api/dashboard/health` | 否/按实现 | dashboard 模块健康检查 |

---

## 17. 已废弃或未实现接口（旧文档兼容说明）

历史版本文档与 `api-interfaces-list.txt` 中曾出现如下接口，但当前在 `backend/src` 目录下未找到对应 `@Controller()` 实现（或已被新的模块替代）：

- **视频面试（旧）**：`/api/video-interviews/**`  
  - 已由 **面试间模块** `/api/interview/**` + **ZEGO 模块** `/api/zego/**` 取代。

- **订单管理（旧）**：`/api/orders/**`

- **数据字典（旧）**：`/api/dictionaries/**`

- **统计分析（旧）**：`/api/statistics/**`  
  - 当前统计相关集中在 `/api/dashboard/**`、`/api/customers/statistics`、`/api/contracts/statistics`、`/api/lead-transfer/statistics` 等。

如果前端或小程序仍在调用旧接口，请先在调用侧统一切换到上述新接口；确需兼容时再评估是否需要补一层兼容路由。

---

## 18. 错误码说明

### 18.1 HTTP 状态码

| 状态码 | 说明 | 示例场景 |
|--------|------|----------|
| 200 | 成功 | 请求成功处理 |
| 201 | 创建成功 | 资源创建成功 |
| 400 | 请求错误 | 参数验证失败 |
| 401 | 未授权 | Token无效或过期 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 资源不存在 | 请求的资源未找到 |
| 409 | 冲突 | 资源已存在（如重复手机号） |
| 422 | 无法处理的实体 | 数据格式正确但业务逻辑错误 |
| 500 | 服务器错误 | 服务器内部错误 |

### 18.2 业务错误码（示例）

| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| VALIDATION_ERROR | 数据验证失败 | 400 |
| UNAUTHORIZED | 未授权 | 401 |
| FORBIDDEN | 禁止访问 | 403 |
| NOT_FOUND | 资源不存在 | 404 |
| DUPLICATE | 资源重复 | 409 |
| FILE_TOO_LARGE | 文件过大 | 413 |
| INVALID_FILE_TYPE | 文件类型不支持 | 400 |

---

## 19. 最佳实践

### 19.1 认证与授权

- 前端应在 Axios 拦截器统一注入 `Authorization` 头，并对 401 做统一跳转处理。
- 对于“公共接口/回调接口”（如支付回调、访客 token）请确保仅暴露必要能力。

### 19.2 分页与搜索

- 避免一次性拉取全量数据；列表类接口优先分页。
- 搜索建议带防抖，避免高频请求。

### 19.3 上传

- 上传前校验文件大小与 MIME 类型。
- 对视频上传建议提示“转码耗时”，并对失败提供可重试。

---

## 20. 更新日志

### v1.4 (2026-01-10)

- 按后端源码补齐并修正 `API完整文档.md`。
- 将旧接口（`/api/video-interviews`、`/api/orders`、`/api/dictionaries`、`/api/statistics`）标注为已废弃/未实现，并指向当前替代模块。
- 更新文件上传接口路径为 `/api/upload/file` 与 `/api/upload/video`。
- 补充合同、保险（大树保）、线索流转、通知、跟进、用户/角色、微信相关、OCR/TRTC/日志/健康检查等模块。

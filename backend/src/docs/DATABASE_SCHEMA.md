# 安得家政CRM系统 数据库结构规范

## MongoDB 数据模型

本系统采用MongoDB作为数据库，使用TypeORM进行对象关系映射。

### 简历（Resume）集合

```typescript
@Entity('resumes')
export class Resume {
  @PrimaryColumn()
  id: string;

  // 基本信息
  @Column()
  name: string; // 姓名

  @Column()
  phone: string; // 手机号

  @Column()
  age: number; // 年龄

  @Column({ nullable: true })
  wechat?: string; // 微信号

  @Column({ nullable: true })
  idNumber?: string; // 身份证号

  @Column()
  education: string; // 学历

  @Column()
  nativePlace: string; // 籍贯

  @Column()
  experienceYears: number; // 工作年限

  @Column({ nullable: true })
  maritalStatus?: string; // 婚姻状况

  @Column({ nullable: true })
  religion?: string; // 宗教信仰

  @Column({ nullable: true })
  currentAddress?: string; // 当前住址

  @Column({ nullable: true })
  hukouAddress?: string; // 户口所在地

  @Column({ nullable: true })
  birthDate?: string; // 出生日期

  @Column({ nullable: true })
  ethnicity?: string; // 民族

  @Column({ nullable: true })
  gender?: string; // 性别

  @Column({ nullable: true })
  zodiac?: string; // 生肖

  @Column({ nullable: true })
  zodiacSign?: string; // 星座

  // 工作信息
  @Column()
  jobType: string; // 工种

  @Column({ nullable: true })
  expectedSalary?: number; // 期望薪资

  @Column({ nullable: true })
  serviceArea?: string; // 服务区域

  @Column({ nullable: true })
  orderStatus?: string; // 接单状态

  @Column('simple-array', { nullable: true })
  skills?: string[]; // 技能标签

  @Column({ nullable: true })
  leadSource?: string; // 线索来源

  @Column('json', { nullable: true })
  workExperience?: { 
    startDate: string; 
    endDate: string; 
    description: string 
  }[]; // 工作经历

  // 文件信息
  @Column({ nullable: true })
  idCardFrontUrl?: string; // 身份证正面照片URL

  @Column({ nullable: true })
  idCardBackUrl?: string; // 身份证背面照片URL

  @Column('simple-array', { nullable: true })
  photoUrls?: string[]; // 个人照片URL数组

  @Column('simple-array', { nullable: true })
  certificateUrls?: string[]; // 证书照片URL数组

  @Column('simple-array', { nullable: true })
  medicalReportUrls?: string[]; // 体检报告URL数组

  // 时间戳
  @Column()
  createdAt: Date; // 创建时间

  @Column()
  updatedAt: Date; // 更新时间
}
```

### 用户（User）集合

```typescript
@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  username: string; // 用户名

  @Column()
  password: string; // 密码（加密存储）

  @Column()
  name: string; // 姓名

  @Column({ nullable: true })
  email?: string; // 邮箱

  @Column({ nullable: true })
  phone?: string; // 手机号

  @Column()
  role: string; // 角色 (admin, manager, employee)

  @Column('simple-array')
  permissions: string[]; // 权限列表

  @Column()
  createdAt: Date; // 创建时间

  @Column()
  updatedAt: Date; // 更新时间

  @Column({ default: true })
  active: boolean; // 账户是否激活
}
```

### 推荐人（Referrer）集合

Collection 名称: `referrers`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `_id` | ObjectId | ✅ | 文档ID |
| `openid` | string | ✅ | 微信 openid |
| `name` | string | ✅ | 真实姓名 |
| `phone` | string | ✅ | 手机号（唯一索引） |
| `wechatId` | string | — | 微信号（接收返费用） |
| `idCard` | string | — | 身份证号 |
| `bankCardNumber` | string | — | 银行卡号 |
| `bankName` | string | — | 开户行 |
| `sourceStaffId` | string | ✅ | 永久绑定的来源员工 ID（扫哪位员工的海报注册），对应 `users._id` |
| `sourceCustomerId` | string | — | 扫码时携带的来源客户 ID，对应 `customers._id` |
| `approvalStatus` | enum | ✅ | `pending_approval` / `approved` / `rejected` |
| `approvedBy` | string | — | 审批通过的管理员 openid |
| `approvedAt` | Date | — | 审批通过时间 |
| `rejectedReason` | string | — | 拒绝原因 |
| `totalReferrals` | number | — | 累计推荐次数（默认 0） |
| `totalRewardAmount` | number | — | 累计已获返费金额（元，默认 0） |
| `status` | enum | — | `active` / `disabled`（默认 active） |
| `createdAt` | Date | — | 创建时间（自动） |
| `updatedAt` | Date | — | 更新时间（自动） |

**索引**：
- `phone` 唯一索引

---

### 推荐简历（ReferralResume）集合

Collection 名称: `referral_resumes`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `_id` | ObjectId | ✅ | 文档ID |
| `referrerId` | string | ✅ | 推荐人 `referrers._id` |
| `referrerPhone` | string | ✅ | 推荐人手机号（冗余） |
| `referrerName` | string | — | 推荐人姓名（冗余，列表展示用） |
| `name` | string | ✅ | 被推荐阿姨姓名 |
| `phone` | string | — | 被推荐阿姨手机号（去重用，sparse 索引） |
| `idCard` | string | — | 被推荐阿姨身份证号（加密存储，去重用，sparse 索引） |
| `customerId` | string | — | 来源客户 ID（客户海报场景），对应 `customers._id` |
| `serviceType` | string | ✅ | 服务类型（月嫂/育婴嫂/保姆/护老/小时工） |
| `experience` | string | — | 从业经验描述 |
| `remark` | string | — | 推荐人备注 |
| **`assignedStaffId`** | string | ✅ | **当前归属员工 ID**（审核/跟进权限归属）。取值优先级：①本次扫码海报员工（`targetStaffId`，在职）→ ②`sourceStaffId`（在职）→ ③管理员兜底 |
| **`rewardOwnerStaffId`** | string | — | **返费归属员工 ID**（合同签署时快照的 `assignedStaffId`） |
| `reviewStatus` | enum | ✅ | `pending_review` / `approved` / `rejected` / `activated` |
| `reviewDeadlineAt` | Date | — | 审核截止时间（提交时间 + 24h） |
| `reviewedAt` | Date | — | 实际审核时间 |
| `reviewedBy` | string | — | 审核员工 ID |
| `reviewNote` | string | — | 审核备注（拒绝时必填） |
| `status` | enum | ✅ | 见下方状态枚举 |
| `contractId` | string | — | 关联合同 ID（签单后 CRM 回填） |
| `contractSignedAt` | Date | — | 合同签署时间 |
| `onboardedAt` | Date | — | 上户时间 |
| `serviceFee` | number | — | 合同服务费（元） |
| `rewardAmount` | number | — | 返费金额（元） |
| `rewardExpectedAt` | Date | — | 预计到账日期（签单日 + 30 天） |
| `rewardPaidAt` | Date | — | 实际打款日期 |
| `rewardStatus` | enum | — | `pending` / `reviewing` / `approved` / `paid` / `rejected` |
| `payeeName` | string | — | 收款人姓名（推荐人申请结算时填写） |
| `payeePhone` | string | — | 收款人手机号 |
| `bankCard` | string | — | 银行卡号 |
| `bankName` | string | — | 开户行名称 |
| `settlementAppliedAt` | Date | — | 推荐人提交结算申请时间 |
| `linkedResumeId` | string | — | 审核通过后入库简历 ID（`resumes._id`） |
| `cloudDbId` | string | — | 小程序云数据库原始 ID（防重复同步，sparse 唯一索引） |
| `createdAt` | Date | — | 创建时间（自动） |
| `updatedAt` | Date | — | 更新时间（自动） |

**复合索引**：
- `{ assignedStaffId, reviewStatus }`
- `{ assignedStaffId, status }`
- `{ rewardOwnerStaffId }`
- `{ reviewDeadlineAt }`
- `{ phone }` sparse
- `{ idCard }` sparse
- `{ customerId }` sparse
- `{ cloudDbId }` sparse + unique

---

### 返费打款记录（ReferralReward）集合

Collection 名称: `referral_rewards`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `_id` | ObjectId | ✅ | 文档ID |
| `referralResumeId` | string | ✅ | 关联 `referral_resumes._id` |
| `assignedStaffId` | string | ✅ | 绑定员工 ID（冗余，便于按员工查询） |
| `referrerId` | string | ✅ | 推荐人 ID |
| `referrerPhone` | string | ✅ | 推荐人手机号（冗余） |
| `referrerWechatId` | string | — | 推荐人微信号 |
| `amount` | number | ✅ | 返费金额（元） |
| `status` | enum | ✅ | `reviewing` / `paid` / `rejected`（默认 reviewing） |
| `reviewedBy` | string | — | 审核员工 ID |
| `paidAt` | Date | — | 打款时间 |
| `paidBy` | string | — | 打款操作员 ID |
| `remark` | string | — | 审核备注 |
| `createdAt` | Date | — | 创建时间（自动） |
| `updatedAt` | Date | — | 更新时间（自动） |

**索引**：
- `{ referralResumeId }`
- `{ assignedStaffId, status }`
- `{ referrerId }`

---

## 枚举值标准

### 婚姻状况 (maritalStatus)
- `single`: 未婚
- `married`: 已婚
- `divorced`: 离异
- `widowed`: 丧偶

### 宗教信仰 (religion)
- `none`: 无
- `buddhism`: 佛教
- `christianity`: 基督教
- `islam`: 伊斯兰教
- `catholicism`: 天主教
- `hinduism`: 印度教
- `taoism`: 道教
- `protestantism`: 新教
- `orthodoxy`: 东正教

### 性别 (gender)
- `male`: 男
- `female`: 女

### 生肖 (zodiac)
- `rat`: 鼠
- `ox`: 牛
- `tiger`: 虎
- `rabbit`: 兔
- `dragon`: 龙
- `snake`: 蛇
- `horse`: 马
- `goat`: 羊
- `monkey`: 猴
- `rooster`: 鸡
- `dog`: 狗
- `pig`: 猪

### 星座 (zodiacSign)
- `capricorn`: 摩羯座
- `aquarius`: 水瓶座
- `pisces`: 双鱼座
- `aries`: 白羊座
- `taurus`: 金牛座
- `gemini`: 双子座
- `cancer`: 巨蟹座
- `leo`: 狮子座
- `virgo`: 处女座
- `libra`: 天秤座
- `scorpio`: 天蝎座
- `sagittarius`: 射手座

### 工种 (jobType)
- `yuexin`: 月嫂
- `zhujia-yuer`: 住家育儿嫂
- `baiban-yuer`: 白班育儿
- `baojie`: 保洁
- `baiban-baomu`: 白班保姆
- `zhujia-baomu`: 住家保姆
- `yangchong`: 养宠
- `xiaoshi`: 小时工

### 接单状态 (orderStatus)
- `accepting`: 想接单
- `not-accepting`: 不接单
- `on-service`: 已上户

### 技能标签 (skills)
- `muying`: 母婴护理师
- `cuiru`: 高级催乳师
- `yuezican`: 月子餐营养师
- `chanhou`: 产后修复师
- `teshu-yinger`: 特殊婴儿护理
- `yiliaobackground`: 医疗背景
- `yuying`: 高级育婴师
- `zaojiao`: 早教师
- `fushi`: 辅食营养师
- `ertui`: 小儿推拿师
- `waiyu`: 外语
- `zhongcan`: 中餐
- `xican`: 西餐
- `mianshi`: 面食
- `jiashi`: 驾驶
- `shouyi`: 整理收纳

### 线索来源 (leadSource)
- `referral`: 转介绍
- `paid-lead`: 付费线索
- `community`: 社群线索
- `door-to-door`: 地推
- `shared-order`: 合单
- `other`: 其他

### 用户角色 (role)
- `admin`: 管理员
- `manager`: 经理
- `employee`: 员工

---

## 推荐系统枚举值

### 推荐人审批状态 (approvalStatus)
- `pending_approval`: 待审批
- `approved`: 已通过
- `rejected`: 已拒绝

### 推荐简历审核状态 (reviewStatus)
- `pending_review`: 待审核
- `approved`: 已通过（跟进中）
- `rejected`: 已拒绝
- `activated`: 简历库已有此阿姨，推荐直接激活，不进审核队列

### 推荐简历业务状态 (status)
- `pending_review`: 待审核
- `rejected`: 审核拒绝
- `following_up`: 跟进中（审核通过后）
- `contracted`: 已签单
- `onboarded`: 已上户
- `reward_pending`: 返费待申请
- `reward_approved`: 返费审核通过，待打款
- `reward_paid`: 返费已打款
- `invalid`: 无效（去重被标记）
- `activated`: 已激活（简历库已存在）

### 返费状态 (rewardStatus)
- `pending`: 未申请
- `reviewing`: 审核中
- `approved`: 审核通过（待打款）
- `paid`: 已打款
- `rejected`: 已拒绝

### 归属员工解析优先级
每条推荐记录的 `assignedStaffId` 在提交时按以下优先级解析：
1. 本次扫码的海报员工 `targetStaffId`（需在职）
2. 推荐人注册时绑定的来源员工 `sourceStaffId`（需在职）
3. 兜底：系统管理员（`role=admin`）

`rewardOwnerStaffId` 在合同签署（CRM 回调 `/crm/contract-signed`）时快照为当时的 `assignedStaffId`，之后不再随员工变动而改变。
# 安得家政 CRM 系统 - 完整技术文档

> **版本**: 1.0.0  
> **更新日期**: 2026年1月31日  
> **项目地址**: https://crm.andejiazheng.com  
> **API文档**: https://crm.andejiazheng.com/api/docs  
> **技术栈**: NestJS + React + MongoDB + PM2

---

## 目录

1. [产品概述](#一产品概述)
2. [功能模块详解](#二功能模块详解)
3. [技术架构](#三技术架构)
4. [API接口文档](#四api接口文档)
5. [第三方服务集成](#五第三方服务集成)
6. [部署运维](#六部署运维)
7. [小程序集成](#七小程序集成)
8. [常见问题](#八常见问题)
9. [更新日志](#九更新日志)
10. [联系方式](#十联系方式)

---

## 一、产品概述

### 1.1 系统简介

安得家政 CRM 系统是一套面向家政服务行业的现代化客户关系管理平台，提供从客户获取、阿姨简历管理、智能匹配、合同签约、保险投保到视频面试的全流程数字化解决方案。

### 1.2 核心价值

| 价值点 | 描述 | 实现方式 |
|--------|------|----------|
| **客户全生命周期管理** | 从线索获取到签约服务的完整跟踪 | 状态流转机制、跟进记录、自动流转规则 |
| **数字化签约** | 在线电子合同签署 | 集成爱签电子签约平台 |
| **智能匹配** | 客户需求与阿姨档期自动匹配 | 档期日历系统、多维度筛选 |
| **视频面试** | 远程视频面试，提升沟通效率 | 集成ZEGO即构音视频SDK |
| **保险服务** | 家政人员保险一键投保 | 集成大树保保险平台 |
| **多端协同** | CRM后台 + 微信小程序协同工作 | 统一API接口、数据同步 |

### 1.3 目标用户与权限矩阵

| 角色 | 使用场景 | 核心权限 |
|------|----------|----------|
| **超级管理员** | 系统配置、用户管理 | 所有模块完整权限、角色配置 |
| **运营经理** | 客户分配、数据统计 | 客户管理、统计报表、线索分配 |
| **销售顾问** | 客户跟进、签约 | 分配客户管理、合同创建、跟进记录 |
| **简历管理员** | 阿姨简历维护 | 简历增删改查、档期管理 |
| **阿姨/家政员** | 自助注册、档期管理 | 小程序端：个人简历、档期设置 |
| **客户** | 查看阿姨、签约 | 小程序端：阿姨列表、视频面试、在线签约 |

### 1.4 核心业务流程

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              核心业务流程图                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  【线索获取】          【客户跟进】           【签约服务】          【售后管理】   │
│      │                    │                     │                     │        │
│      ▼                    ▼                     ▼                     ▼        │
│  ┌────────┐          ┌────────┐           ┌────────┐           ┌────────┐      │
│  │ 抖音  │          │ 电话  │           │ 视频  │           │ 服务  │      │
│  │ 美团  │ ──────▶  │ 微信  │  ──────▶  │ 面试  │  ──────▶  │ 回访  │      │
│  │ 小红书 │          │ 面访  │           │ 签约  │           │ 换人  │      │
│  │ 转介绍 │          │ 推荐  │           │ 保险  │           │ 续签  │      │
│  └────────┘          └────────┘           └────────┘           └────────┘      │
│      │                    │                     │                     │        │
│      ▼                    ▼                     ▼                     ▼        │
│  ┌──────────────────────────────────────────────────────────────────────┐      │
│  │                    CRM系统数据中心 (MongoDB)                          │      │
│  │  客户数据 │ 阿姨简历 │ 合同记录 │ 保险保单 │ 跟进记录 │ 面试记录     │      │
│  └──────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.5 客户状态流转

```
┌──────────┐     分配      ┌──────────┐     跟进     ┌──────────┐
│  新线索   │  ──────────▶  │  匹配中   │  ─────────▶  │  已面试  │
└──────────┘               └──────────┘              └──────────┘
                                │                         │
                                │ 流失                    │ 签约
                                ▼                         ▼
                           ┌──────────┐            ┌──────────┐
                           │ 流失客户 │            │  已签约  │
                           └──────────┘            └──────────┘
                                                        │
                                          ┌─────────────┼─────────────┐
                                          ▼             ▼             ▼
                                    ┌──────────┐ ┌──────────┐ ┌──────────┐
                                    │  退款中  │ │  已退款  │ │   待定   │
                                    └──────────┘ └──────────┘ └──────────┘
```

---

## 二、功能模块详解

### 2.1 客户管理模块 (customers)

#### 模块概述
客户管理是CRM系统的核心模块，管理所有客户的全生命周期数据。

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | String | ✅ | 客户姓名 |
| `phone` | String | ❌ | 手机号（与微信号至少填一个） |
| `wechatId` | String | ❌ | 微信号 |
| `idCardNumber` | String | ❌ | 身份证号 |
| `leadSource` | String | ✅ | 线索来源 |
| `serviceCategory` | String | ❌ | 需求服务品类 |
| `contractStatus` | String | ✅ | 客户状态 |
| `leadLevel` | String | ✅ | 线索等级 |
| `salaryBudget` | Number | ❌ | 薪资预算 (1000-50000) |
| `expectedStartDate` | Date | ❌ | 期望上户日期 |
| `familySize` | Number | ❌ | 家庭人口 |
| `restSchedule` | String | ❌ | 休息制度 |
| `address` | String | ❌ | 地址 |
| `expectedDeliveryDate` | Date | ❌ | 预产期（月嫂类型） |
| `dealAmount` | Number | ❌ | 成交金额 |
| `assignedTo` | ObjectId | ❌ | 当前负责人 |
| `lastActivityAt` | Date | ❌ | 最后活动时间 |
| `autoTransferEnabled` | Boolean | ❌ | 是否允许自动流转 |
| `inPublicPool` | Boolean | ❌ | 是否在公海中 |

#### 枚举值定义

**线索来源**:
```typescript
['美团', '抖音', '快手', '小红书', '转介绍', '杭州同馨', '握个手平台', '线索购买', '莲心', '美家', '天机鹿', '孕妈联盟', '高阁', '星星', '妈妈网', '犀牛', '宝宝树', '其他']
```

**客户状态**: `['已签约', '匹配中', '已面试', '流失客户', '已退款', '退款中', '待定']`

**线索等级**: `['O类', 'A类', 'B类', 'C类', 'D类', '流失']`
- O类: 超高意向，立即签约 | A类: 高意向，近期签约 | B类: 中等意向 | C类: 低意向 | D类: 待定

**需求品类**: `['月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老']`

**休息制度**: `['单休', '双休', '无休', '调休', '待定']`

#### 业务规则
1. **线索自动流转**: 当 `lastActivityAt` 超过配置时间未有跟进，自动流转到公海池
2. **公海池机制**: 未分配或流转的线索进入公海池，可被抓取
3. **重复检测**: 同一手机号不允许重复创建

---

### 2.2 简历管理模块 (resume)

#### 模块概述
管理家政服务人员（阿姨）的完整简历信息，包括基本信息、工作经历、技能证书、照片、档期等。

#### 基本信息字段
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | String | ✅ | 姓名 |
| `phone` | String | ✅ | 手机号 (11位) |
| `gender` | Enum | ✅ | 性别: female/male |
| `age` | Number | ✅ | 年龄 (18-65) |
| `jobType` | Enum | ✅ | 工种 |
| `education` | Enum | ✅ | 学历 |
| `experienceYears` | Number | ✅ | 工作经验年限 (0-50) |
| `nativePlace` | String | ✅ | 籍贯 |
| `idNumber` | String | ❌ | 身份证号 |
| `expectedSalary` | Number | ❌ | 期望薪资 |
| `maternityNurseLevel` | Enum | ❌ | 月嫂档位 |
| `skills` | Array | ❌ | 技能列表 |
| `serviceArea` | Array | ❌ | 服务区域 |
| `selfIntroduction` | String | ❌ | 自我介绍 |
| `internalEvaluation` | String | ❌ | 内部员工评价 |

#### 工种枚举 (JobType)
| 枚举值 | 中文名称 | 枚举值 | 中文名称 |
|--------|----------|--------|----------|
| `yuexin` | 月嫂 | `zhujia-yuer` | 住家育儿嫂 |
| `baiban-yuer` | 白班育儿嫂 | `baojie` | 保洁 |
| `baiban-baomu` | 白班保姆 | `zhujia-baomu` | 住家保姆 |
| `yangchong` | 养宠 | `xiaoshi` | 小时工 |
| `zhujia-hulao` | 住家护老 | | |

#### 学历枚举 (Education)
| 枚举值 | 中文 | 枚举值 | 中文 | 枚举值 | 中文 |
|--------|------|--------|------|--------|------|
| `no` | 无学历 | `primary` | 小学 | `middle` | 初中 |
| `secondary` | 中专 | `vocational` | 职高 | `high` | 高中 |
| `college` | 大专 | `bachelor` | 本科 | `graduate` | 研究生+ |

#### 月嫂档位枚举 (MaternityNurseLevel)
| 枚举值 | 中文名称 | 薪资范围 |
|--------|----------|----------|
| `junior` | 初级月嫂 | 8000-12000 |
| `silver` | 银牌月嫂 | 12000-15000 |
| `gold` | 金牌月嫂 | 15000-18000 |
| `platinum` | 铂金月嫂 | 18000-22000 |
| `diamond` | 钻石月嫂 | 22000-28000 |
| `crown` | 皇冠月嫂 | 28000+ |

#### 技能枚举 (Skill)
| 枚举值 | 中文 | 枚举值 | 中文 | 枚举值 | 中文 |
|--------|------|--------|------|--------|------|
| `chanhou` | 产后修复 | `teshu-yinger` | 特殊婴儿护理 | `yiliaobackground` | 医疗背景 |
| `yuying` | 育婴 | `zaojiao` | 早教 | `fushi` | 辅食添加 |
| `ertui` | 小儿推拿 | `waiyu` | 外语 | `zhongcan` | 中餐烹饪 |
| `xican` | 西餐烹饪 | `mianshi` | 面食制作 | `jiashi` | 家务整理 |
| `shouyi` | 收纳整理 | `muying` | 母婴护理 | `cuiru` | 催乳 |
| `yuezican` | 月子餐 | `yingyang` | 营养配餐 | `liliao-kangfu` | 理疗康复 |
| `shuangtai-huli` | 双胎护理 | `yanglao-huli` | 养老护理 | | |

#### 照片字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `idCardFront` | FileInfo | 身份证正面 |
| `idCardBack` | FileInfo | 身份证反面 |
| `personalPhoto` | FileInfo[] | 个人照片 |
| `certificates` | FileInfo[] | 证书照片 |
| `reports` | FileInfo[] | 体检报告 |
| `confinementMealPhotos` | FileInfo[] | 月子餐照片 |
| `cookingPhotos` | FileInfo[] | 烹饪照片 |
| `selfIntroductionVideo` | FileInfo | 自我介绍视频 |

**FileInfo结构**: `{ url: string, filename: string, mimetype: string, size: number }`

#### 档期管理
**档期状态**: `unset`(未设置) | `available`(可接单) | `unavailable`(不可接单) | `occupied`(已占用) | `leave`(请假)

```typescript
interface AvailabilityPeriod {
  date: Date;                    // 日期
  status: AvailabilityStatus;   // 状态
  contractId?: ObjectId;         // 关联合同ID
  remarks?: string;              // 备注
}
```

#### 工作经历结构
```typescript
interface WorkExperience {
  startDate: string;        // 开始日期 (YYYY-MM)
  endDate: string;          // 结束日期 (YYYY-MM)
  description: string;      // 工作描述
  orderNumber?: string;     // 订单编号
  district?: string;        // 服务区域
  customerName?: string;    // 客户名称
  customerReview?: string;  // 客户评价
  photos?: FileInfo[];      // 工作照片
}
---

### 2.3 合同管理模块 (contracts)

#### 模块概述
管理客户与家政服务人员之间的服务合同，支持换人功能、合同历史追溯、电子签约。

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `contractNumber` | String | ✅ | 合同编号（自动生成） |
| `customerName` | String | ✅ | 客户姓名 |
| `customerPhone` | String | ✅ | 客户手机号 |
| `customerIdCard` | String | ❌ | 客户身份证 |
| `contractType` | Enum | ✅ | 合同类型 |
| `startDate` | Date | ✅ | 开始日期 |
| `endDate` | Date | ✅ | 结束日期 |
| `workerName` | String | ✅ | 服务人员姓名 |
| `workerPhone` | String | ✅ | 服务人员电话 |
| `workerIdCard` | String | ✅ | 服务人员身份证 |
| `workerSalary` | Number | ✅ | 家政员工资 |
| `customerServiceFee` | Number | ✅ | 客户服务费 |
| `workerServiceFee` | Number | ❌ | 家政员服务费 |
| `deposit` | Number | ❌ | 定金 |
| `expectedDeliveryDate` | Date | ❌ | 预产期 |
| `salaryPaymentDay` | Number | ❌ | 工资发放日(1-31) |
| `remarks` | String | ❌ | 备注 |

#### 合同类型枚举 (ContractType)
```typescript
enum ContractType {
  YUEXIN = '月嫂',
  ZHUJIA_YUER = '住家育儿嫂',
  BAOJIE = '保洁',
  ZHUJIA_BAOMU = '住家保姆',
  YANGCHONG = '养宠',
  XIAOSHI = '小时工',
  BAIBAN_YUER = '白班育儿',
  BAIBAN_BAOMU = '白班保姆',
  ZHUJIA_HULAO = '住家护老'
}
```

#### 合同状态枚举 (ContractStatus)
| 状态 | 说明 | 状态 | 说明 |
|------|------|------|------|
| `draft` | 草稿 | `signing` | 签约中 |
| `active` | 生效中 | `replaced` | 已被替换 |
| `cancelled` | 已作废 | | |

#### 爱签集成字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `esignContractNo` | String | 爱签合同编号 |
| `esignStatus` | String | 爱签状态缓存 |
| `esignCreatedAt` | Date | 爱签合同创建时间 |
| `esignSignedAt` | Date | 爱签签署完成时间 |
| `esignTemplateNo` | String | 爱签模板编号 |
| `esignPreviewUrl` | String | 爱签预览链接 |

#### 换人功能字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `isLatest` | Boolean | 是否为最新合同 |
| `replacedByContractId` | ObjectId | 被哪个合同替换 |
| `replacesContractId` | ObjectId | 替换了哪个合同 |
| `changeDate` | Date | 换人生效日期 |
| `serviceDays` | Number | 实际服务天数 |

#### 客户合同历史
```typescript
interface CustomerContractHistory {
  customerPhone: string;           // 客户手机号
  customerName: string;            // 客户姓名
  contracts: ContractHistoryRecord[];  // 合同历史
  latestContractId: ObjectId;      // 最新合同ID
  totalWorkers: number;            // 总共换过几个阿姨
}
```

---

### 2.4 视频面试模块 (interview)

#### 模块概述
基于ZEGO即构SDK实现的视频面试功能，支持主持人与多个访客的实时视频通话。

#### 面试间字段
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `roomId` | String | ✅ | 房间ID（唯一） |
| `roomName` | String | ✅ | 房间名称 |
| `hostUserId` | ObjectId | ✅ | 主持人用户ID |
| `hostName` | String | ✅ | 主持人姓名 |
| `hostZegoUserId` | String | ✅ | 主持人ZEGO用户ID |
| `status` | Enum | ✅ | 状态: active/ended |
| `source` | String | ❌ | 创建来源: pc/miniprogram |
| `participants` | Array | ❌ | 参与者列表 |
| `duration` | Number | ❌ | 持续时长（秒） |

#### 参与者结构
```typescript
interface Participant {
  userId: string;           // ZEGO用户ID
  userName: string;         // 用户名
  role: 'host' | 'guest';   // 角色
  identity?: string;        // 访客身份
  joinedAt: Date;           // 加入时间
  leftAt?: Date;            // 离开时间
}
```

#### 业务规则
1. **单例模式**: 每个用户同时只能有一个活跃面试间
2. **自动关闭**: 创建新面试间时自动关闭旧的
3. **无人自动关闭**: 3分钟无人自动关闭
4. **访客权限**: 通过分享链接加入，无需登录

---

### 2.5 保险管理模块 (dashubao)

#### 模块概述
集成大树保保险平台，为家政服务人员提供保险投保、查询、退保服务。

#### 保单字段
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `agencyPolicyRef` | String | ✅ | 渠道流水号（唯一） |
| `policyNo` | String | ❌ | 大树保保单号 |
| `planCode` | String | ✅ | 计划代码 |
| `effectiveDate` | String | ✅ | 生效日期 |
| `expireDate` | String | ✅ | 结束日期 |
| `groupSize` | Number | ✅ | 被保险人数量 |
| `totalPremium` | Number | ✅ | 总保费 |
| `status` | Enum | ✅ | 保单状态 |
| `policyHolder` | Object | ✅ | 投保人信息 |
| `insuredList` | Array | ✅ | 被保险人列表 |
| `resumeId` | ObjectId | ❌ | 关联阿姨简历ID |

#### 保单状态枚举
| 状态 | 说明 | 状态 | 说明 |
|------|------|------|------|
| `pending` | 待支付 | `processing` | 处理中 |
| `active` | 已生效 | `expired` | 已过期 |
| `cancelled` | 已注销 | `surrendered` | 已退保 |

#### 投保人结构
```typescript
interface PolicyHolder {
  policyHolderType: 'I' | 'C';  // I-个人, C-企业
  policyHolderName: string;
  phIdType: string;             // 证件类型
  phIdNumber: string;           // 证件号码
  phTelephone?: string;
}
```

---

### 2.6 通知系统模块 (notification)

#### 模块概述
实时通知系统，支持WebSocket推送和微信小程序订阅消息。

#### 通知字段
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `userId` | ObjectId | ✅ | 接收用户ID |
| `type` | Enum | ✅ | 通知类型 |
| `title` | String | ✅ | 通知标题 |
| `content` | String | ✅ | 通知内容 |
| `priority` | Enum | ❌ | 优先级 (LOW/MEDIUM/HIGH/URGENT) |
| `status` | Enum | ✅ | 通知状态 |
| `data` | Object | ❌ | 附加数据 |
| `icon` | String | ❌ | 图标 |
| `color` | String | ❌ | 颜色 |
| `actionUrl` | String | ❌ | 点击跳转URL |
| `actionText` | String | ❌ | 操作按钮文本 |
| `sentAt` | Date | ❌ | 发送时间 |
| `readAt` | Date | ❌ | 阅读时间 |
| `retryCount` | Number | ❌ | 重试次数 |
| `errorMessage` | String | ❌ | 错误信息 |
| `createdBy` | ObjectId | ❌ | 创建人 |
| `metadata` | Object | ❌ | 额外元数据 |

#### 通知状态枚举 (NotificationStatus)
| 状态 | 说明 |
|------|------|
| `PENDING` | 待发送 |
| `SENT` | 已发送 |
| `READ` | 已读 |
| `FAILED` | 发送失败 |

#### 通知类型枚举 (NotificationType)

**简历相关**:
| 类型 | 说明 |
|------|------|
| `RESUME_CREATED` | 新简历创建 |
| `RESUME_STATUS_CHANGED` | 简历状态变更 |
| `RESUME_ASSIGNED` | 简历被分配 |
| `RESUME_ORDER_STATUS_CHANGED` | 接单状态变更 |
| `RESUME_FOLLOW_UP_DUE` | 简历长期未跟进 |

**客户相关**:
| 类型 | 说明 |
|------|------|
| `CUSTOMER_CREATED` | 新客户创建 |
| `CUSTOMER_ASSIGNED` | 客户分配 |
| `CUSTOMER_TRANSFERRED` | 客户转移 |
| `CUSTOMER_RECLAIMED` | 客户回收到公海 |
| `CUSTOMER_ASSIGNED_FROM_POOL` | 从公海分配 |
| `CUSTOMER_STATUS_CHANGED` | 客户状态变更 |
| `CUSTOMER_FOLLOW_UP_DUE` | 客户长期未跟进 |

**线索流转相关**:
| 类型 | 说明 |
|------|------|
| `LEAD_AUTO_TRANSFER_OUT` | 线索流出通知 |
| `LEAD_AUTO_TRANSFER_IN` | 线索流入通知 |

**合同相关**:
| 类型 | 说明 |
|------|------|
| `CONTRACT_CREATED` | 合同创建 |
| `CONTRACT_SIGNED` | 合同签署完成 |
| `CONTRACT_WORKER_CHANGED` | 合同换人 |
| `CONTRACT_EXPIRING_SOON` | 合同即将到期 |
| `CONTRACT_STATUS_CHANGED` | 合同状态变更 |

**其他类型**:
| 类型 | 说明 |
|------|------|
| `FORM_SUBMISSION_RECEIVED` | 表单提交通知 |
| `DAILY_REPORT_PERSONAL` | 个人日报 |
| `DAILY_REPORT_TEAM` | 团队日报 |
| `WEEKLY_REPORT` | 周报 |
| `MONTHLY_REPORT` | 月报 |
| `SYSTEM_ANNOUNCEMENT` | 系统公告 |
| `PERMISSION_CHANGED` | 权限变更 |
| `ACCOUNT_SECURITY` | 账号安全 |

---

### 2.7 线索管理模块 (training-leads)

#### 模块概述
管理培训类型的线索，适用于招募潜在家政服务人员。

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `leadId` | String | ✅ | 线索编号（自动生成） |
| `name` | String | ✅ | 客户姓名 |
| `phone` | String | ❌ | 手机号 |
| `wechatId` | String | ❌ | 微信号 |
| `leadLevel` | Enum | ✅ | 客户分级 |
| `leadSource` | String | ❌ | 线索来源 |
| `trainingType` | String | ❌ | 培训类型 |
| `intendedCourses` | Array | ❌ | 意向课程 |
| `status` | Enum | ✅ | 线索状态 |
| `assignedTo` | ObjectId | ❌ | 分配负责人 |

#### 线索状态枚举
`新线索` | `跟进中` | `已成交` | `已流失`

#### 培训类型枚举
`月嫂` | `育儿嫂` | `保姆` | `护老` | `师资`

---

### 2.8 文章管理模块 (article)

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | String | ❌ | 文章标题 |
| `author` | String | ❌ | 作者 |
| `source` | String | ❌ | 来源/出处 |
| `contentRaw` | String | ✅ | 原始正文（Markdown） |
| `contentHtml` | String | ✅ | 智能排版后的HTML |
| `imageUrls` | Array | ❌ | 图片URL列表 |
| `status` | Enum | ✅ | 状态: draft/published |

---

### 2.9 Banner管理模块 (banner)

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | String | ✅ | Banner标题 |
| `imageUrl` | String | ✅ | 图片URL（腾讯云COS） |
| `linkUrl` | String | ❌ | 跳转链接 |
| `linkType` | Enum | ❌ | none/miniprogram/h5/external |
| `order` | Number | ❌ | 排序顺序 |
| `status` | Enum | ❌ | active/inactive |
| `startTime` | Date | ❌ | 生效开始时间 |
| `endTime` | Date | ❌ | 生效结束时间 |
| `viewCount` | Number | ❌ | 浏览次数 |
| `clickCount` | Number | ❌ | 点击次数 |

---

### 2.10 用户管理模块 (users)

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `username` | String | ✅ | 用户名（唯一） |
| `password` | String | ✅ | 密码（bcrypt加密） |
| `name` | String | ✅ | 姓名 |
| `email` | String | ❌ | 邮箱 |
| `phone` | String | ❌ | 手机号 |
| `avatar` | String | ❌ | 头像地址 |
| `role` | String | ✅ | 角色 |
| `department` | String | ❌ | 部门 |
| `permissions` | Array | ❌ | 权限列表 |
| `active` | Boolean | ❌ | 是否启用 |
| `wechatOpenId` | String | ❌ | 微信OpenID |

---

### 2.11 跟进记录模块 (follow-up)

#### 模块概述
记录销售人员与客户/阿姨的沟通跟进情况，支持多种跟进类型。

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `resumeId` | ObjectId | ✅ | 关联的简历ID |
| `type` | Enum | ✅ | 跟进类型 |
| `content` | String | ✅ | 跟进内容 |
| `createdBy` | ObjectId | ✅ | 创建人ID |
| `createdAt` | Date | 自动 | 创建时间 |
| `updatedAt` | Date | 自动 | 更新时间 |

#### 跟进类型枚举 (FollowUpType)
| 枚举值 | 中文名称 | 说明 |
|--------|----------|------|
| `phone` | 电话沟通 | 电话联系 |
| `wechat` | 微信沟通 | 微信聊天 |
| `visit` | 到店沟通 | 线下面谈 |
| `interview` | 面试沟通 | 安排面试 |
| `signed` | 已签单 | 签约成功 |
| `other` | 其他 | 其他类型 |

#### 业务规则
1. **自动更新时间**: 创建跟进记录时，自动更新关联简历的`updatedAt`时间
2. **用户关联**: 自动记录创建人信息，支持按用户查询
3. **分页查询**: 支持按简历ID分页查询跟进记录

---

### 2.12 员工评价模块 (employee-evaluation)

#### 模块概述
对家政服务人员的工作表现进行评价，支持多维度评分。

#### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `employeeId` | ObjectId | ✅ | 被评价员工ID（简历ID） |
| `employeeName` | String | ✅ | 被评价员工姓名 |
| `evaluatorId` | ObjectId | ✅ | 评价人ID |
| `evaluatorName` | String | ✅ | 评价人姓名 |
| `contractId` | ObjectId | ❌ | 关联合同ID |
| `contractNo` | String | ❌ | 订单编号 |
| `evaluationType` | Enum | ✅ | 评价类型 |
| `overallRating` | Number | ✅ | 综合评分 (1-5) |
| `serviceAttitudeRating` | Number | ❌ | 服务态度评分 |
| `professionalSkillRating` | Number | ❌ | 专业技能评分 |
| `workEfficiencyRating` | Number | ❌ | 工作效率评分 |
| `communicationRating` | Number | ❌ | 沟通能力评分 |
| `comment` | String | ✅ | 评价内容 |
| `strengths` | String | ❌ | 优点 |
| `improvements` | String | ❌ | 待改进项 |
| `tags` | Array | ❌ | 评价标签 |
| `isPublic` | Boolean | ❌ | 是否公开 |
| `status` | Enum | ✅ | 评价状态 |
| `evaluationDate` | Date | ✅ | 评价时间 |

#### 评价类型枚举
| 枚举值 | 中文名称 | 说明 |
|--------|----------|------|
| `daily` | 日常评价 | 日常工作表现 |
| `monthly` | 月度评价 | 月度汇总评价 |
| `contract_end` | 合同结束评价 | 服务结束后评价 |
| `special` | 专项评价 | 特殊表彰/批评 |

#### 评价状态枚举
| 枚举值 | 中文名称 |
|--------|----------|
| `draft` | 草稿 |
| `published` | 已发布 |
| `archived` | 已归档 |

#### 评价标签示例
`['认真负责', '技能熟练', '沟通良好', '服务热情', '专业细心']`

---

### 2.13 数据统计模块 (Dashboard)

#### 模块概述
提供系统核心业务数据的统计分析，支持多维度数据展示。

#### 统计指标分类

##### 客户业务指标 (CustomerBusinessMetrics)
| 指标 | 说明 | 计算方式 |
|------|------|----------|
| `totalCustomers` | 客户总量 | 所有客户记录数 |
| `newTodayCustomers` | 新增客户 | 时间段内创建的客户数 |
| `pendingMatchCustomers` | 待匹配客户 | 状态为"匹配中"的客户数 |
| `signedCustomers` | 已签约客户 | 状态为"已签约"的客户数 |
| `lostCustomers` | 流失客户 | 状态为"流失客户"的客户数 |

##### 线索质量指标 (LeadQualityMetrics)
| 指标 | 说明 | 计算方式 |
|------|------|----------|
| `aLevelLeadsRatio` | A类线索占比 | A类数量/有等级线索总量×100% |
| `leadSourceDistribution` | 线索来源分布 | 按渠道分组统计 |
| `leadLevelDistribution` | 线索等级分布 | OABCD各等级数量 |
| `leadSourceLevelDetail` | 渠道等级详情 | 每个渠道的OABCD分布 |

##### 合同指标 (ContractMetrics)
| 指标 | 说明 | 计算方式 |
|------|------|----------|
| `totalContracts` | 合同总量 | 所有合同记录数 |
| `newThisMonthContracts` | 新签合同 | 时间段内创建的合同数 |
| `signingContracts` | 签约中合同 | 爱签状态为"1"的合同数 |
| `changeWorkerContracts` | 换人合同数 | 有replacesContractId的合同数 |
| `signConversionRate` | 签约转化率 | 已签约客户/总客户×100% |

##### 简历指标 (ResumeMetrics)
| 指标 | 说明 | 计算方式 |
|------|------|----------|
| `totalResumes` | 简历总量 | 所有简历记录数 |
| `newTodayResumes` | 新增简历 | 时间段内创建的简历数 |
| `acceptingResumes` | 可接单简历 | orderStatus为accepting的数量 |
| `notAcceptingResumes` | 不接单简历 | orderStatus为not-accepting的数量 |
| `onServiceResumes` | 服务中简历 | orderStatus为on-service的数量 |

##### 财务指标 (FinancialMetrics)
| 指标 | 说明 | 计算方式 |
|------|------|----------|
| `monthlyServiceFeeIncome` | 服务费收入 | 时间段内合同服务费总和 |
| `monthlyWageExpenditure` | 工资支出 | 时间段内合同工资总和 |
| `grossProfitMargin` | 毛利润率 | (收入-支出)/收入×100% |
| `monthOverMonthGrowthRate` | 环比增长率 | (本期-上期)/上期×100% |
| `totalActiveContracts` | 生效合同数 | 状态为active/signing的合同数 |
| `averageServiceFee` | 平均服务费 | 服务费总和/合同数 |

##### 效率指标 (EfficiencyMetrics)
| 指标 | 说明 | 计算方式 |
|------|------|----------|
| `averageMatchingDays` | 平均匹配时长 | 从录入到签约的平均天数 |
| `workerChangeRate` | 换人率 | 换人合同/总合同×100% |
| `customerSatisfactionRate` | 客户满意度 | 评价系统数据 |
| `contractSigningRate` | 合同签署率 | 已签署/总合同×100% |
| `averageServiceDuration` | 平均服务时长 | 完成合同的平均服务天数 |
| `quickMatchingRate` | 快速匹配率 | 7天内完成匹配的比例 |

##### 销售漏斗指标 (SalesFunnelMetrics)
| 指标 | 说明 |
|------|------|
| `salesFunnelList` | 各销售人员的漏斗数据 |
| `totalLeads` | 所有销售持有线索总数 |
| `totalDealAmount` | 成交金额总和 |
| `averageConversionRate` | 平均转化率 |

```typescript
// 单个销售漏斗数据结构
interface SalesFunnelItem {
  userId: string;           // 销售ID
  userName: string;         // 销售姓名
  mainLeadSource: string;   // 主要线索渠道
  totalLeads: number;       // 持有线索数
  oLevel: number;           // O类数量
  aLevel: number;           // A类数量
  bLevel: number;           // B类数量
  cLevel: number;           // C类数量
  dLevel: number;           // D类数量
  conversionRate: number;   // 转化率
  totalDealAmount: number;  // 成交总额
  averageDealAmount: number;// 客单价
}
```

---

## 三、技术架构

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端                                    │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│  CRM Web端  │  微信小程序  │   H5页面    │   外部系统回调          │
│  (React)    │  (原生)     │  (面试/签约) │   (爱签/大树保)        │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────┬────────────┘
       │             │             │                  │
       └─────────────┴─────────────┴──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx 反向代理                              │
│                 crm.andejiazheng.com                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      前端静态资源        │     │      API服务            │
│      端口: 4173         │     │      端口: 3000         │
│   (React + Vite)        │     │   (NestJS)             │
└─────────────────────────┘     └───────────┬─────────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
              ▼                             ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│    MongoDB          │       │    腾讯云 COS       │       │   第三方服务        │
│    数据存储          │       │    文件存储         │       │  爱签/大树保/ZEGO   │
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘
```

### 3.2 技术栈

#### 后端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | ^10.4.17 | Node.js 后端框架 |
| MongoDB | ^6.16.0 | NoSQL 数据库 |
| Mongoose | ^8.16.1 | MongoDB ODM |
| Passport | ^0.7.0 | 身份认证 |
| JWT | ^11.0.0 | Token 认证 |
| Socket.IO | ^4.8.1 | WebSocket 实时通信 |
| Axios | ^1.10.0 | HTTP 客户端 |
| Sharp | ^0.34.2 | 图片压缩处理 |
| ExcelJS | ^4.4.0 | Excel 导入导出 |
| class-validator | ^0.14.0 | DTO参数校验 |
| bcrypt | ^5.1.1 | 密码加密 |

#### 前端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.3.1 | 前端框架 |
| TypeScript | ^5.0.2 | 类型安全 |
| Vite | ^4.5.14 | 构建工具 |
| Ant Design | ^5.11.1 | UI 组件库 |
| React Router | ^6.18.0 | 路由管理 |
| Redux Toolkit | ^1.9.7 | 状态管理 |
| Axios | ^1.6.1 | HTTP 请求 |
| Socket.IO Client | ^4.8.1 | 实时通信 |
| ECharts | ^5.4.3 | 图表展示 |
| Quill | ^2.0.3 | 富文本编辑器 |
| ZEGO UIKit | ^2.17.0 | 视频面试SDK |

#### 第三方服务集成
| 服务 | 描述 | 用途 |
|------|------|------|
| 爱签 (esign) | 电子合同签署平台 | 合同在线签署 |
| 大树保 (dashubao) | 家政保险平台 | 人员保险投保/退保 |
| ZEGO 即构 | 实时音视频 | 视频面试 |
| 腾讯云 OCR | 图像识别 | 身份证/证书OCR |
| 腾讯云 COS | 对象存储 | 图片/视频/文件存储 |
| 微信开放平台 | 微信生态 | 小程序登录/订阅消息 |

### 3.3 目录结构

```
andejiazhengcrm/
├── backend/                    # 后端代码
│   ├── src/
│   │   ├── modules/           # 业务模块 (31个)
│   │   │   ├── article/       # 文章管理
│   │   │   ├── auth/          # 认证授权
│   │   │   ├── banner/        # Banner管理
│   │   │   ├── contracts/     # 合同管理
│   │   │   ├── customers/     # 客户管理
│   │   │   ├── dashboard/     # 数据统计
│   │   │   ├── dashubao/      # 大树保保险
│   │   │   ├── employee-evaluation/ # 员工评价
│   │   │   ├── esign/         # 爱签电子签约
│   │   │   ├── follow-up/     # 跟进记录
│   │   │   ├── interview/     # 视频面试
│   │   │   ├── notification/  # 通知系统
│   │   │   ├── ocr/           # OCR识别
│   │   │   ├── resume/        # 简历管理
│   │   │   ├── roles/         # 角色管理
│   │   │   ├── training-leads/ # 线索管理
│   │   │   ├── upload/        # 文件上传
│   │   │   ├── users/         # 用户管理
│   │   │   ├── wechat/        # 微信集成
│   │   │   └── zego/          # ZEGO音视频
│   │   ├── common/            # 公共模块
│   │   ├── config/            # 配置文件
│   │   └── main.ts            # 入口文件
│   ├── package.json
│   └── ecosystem.config.js    # PM2配置
│
├── frontend/                   # 前端代码
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   ├── components/        # 公共组件
│   │   ├── services/          # API服务
│   │   ├── types/             # TypeScript类型
│   │   └── utils/             # 工具函数
│   └── package.json
│
└── scripts/                    # 运维脚本
    ├── manage.sh              # 统一管理脚本
    └── deploy.sh              # 部署脚本
```

### 3.4 认证与授权机制

#### JWT Token认证流程
```
┌──────────┐      登录请求       ┌──────────┐      验证密码       ┌──────────┐
│  客户端   │  ───────────▶  │  API服务  │  ───────────▶  │  MongoDB  │
└──────────┘               └──────────┘               └──────────┘
      ▲                         │
      │                         ▼
      │               ┌────────────────────┐
      └────────────── │ 返回JWT Token   │
       带Token的响应   └────────────────────┘
```

#### Token配置
| 配置项 | 值 | 说明 |
|--------|------|------|
| 算法 | HS256 | HMAC SHA-256签名 |
| 有效期 | 7天 | Token过期时间 |
| Secret | 环境变量 | JWT_SECRET配置 |

#### 访问控制
- **@Public()**: 公开接口，无需认证
- **@UseGuards(JwtAuthGuard)**: 需要JWT认证
- **@Roles('admin')**: 基于角色的权限控制

### 3.5 数据库集合

| 集合名 | 对应模块 | 说明 |
|--------|----------|------|
| `users` | users | 系统用户 |
| `customers` | customers | 客户数据 |
| `resumes` | resume | 阿姨简历 |
| `contracts` | contracts | 合同记录 |
| `customer_contract_histories` | contracts | 客户合同历史 |
| `insurance_policies` | dashubao | 保险保单 |
| `interview_rooms` | interview | 面试间记录 |
| `training_leads` | training-leads | 培训线索 |
| `articles` | article | 文章内容 |
| `banners` | banner | 轮播图 |
| `notifications` | notification | 通知记录 |
| `follow_up_records` | follow-up | 跟进记录 |
| `customer_follow_ups` | customers | 客户跟进记录 |
| `customer_assignment_logs` | customers | 客户分配日志 |
| `customer_operation_logs` | customers | 客户操作日志 |
| `public_pool_logs` | customers | 公海池操作日志 |
| `lead_transfer_rules` | customers | 线索流转规则 |
| `lead_transfer_records` | customers | 线索流转记录 |
| `employee_evaluations` | employee-evaluation | 员工评价 |
| `miniprogram_users` | miniprogram-user | 小程序用户 |
| `roles` | roles | 角色权限 |
| `notification_templates` | notification | 通知模板 |
| `login_logs` | auth | 登录日志 |
| `advisor_subscribes` | weixin | 顾问订阅 |
| `customer_actions` | weixin | 客户行为 |

### 3.5.1 完整环境变量配置说明 (.env)

> **配置文件位置**: `/home/ubuntu/andejiazhengcrm/backend/.env`

#### 数据库配置

| 变量名 | 必填 | 默认值 | 说明 | 示例值 |
|--------|------|--------|------|--------|
| `MONGODB_URI` | ✅ | - | MongoDB连接字符串 | `mongodb://127.0.0.1:27017/housekeeping` |

**MongoDB连接字符串格式**:
```
mongodb://[username:password@]host[:port]/database[?options]
```

**连接池配置** (通过查询参数):
- `maxPoolSize=10`: 最大连接数
- `minPoolSize=1`: 最小连接数
- `connectTimeoutMS=10000`: 连接超时
- `socketTimeoutMS=45000`: Socket超时

---

#### 服务器配置

| 变量名 | 必填 | 默认值 | 说明 | 生产环境推荐值 |
|--------|------|--------|------|----------------|
| `PORT` | ❌ | `3000` | API服务端口 | `3000` |
| `NODE_ENV` | ✅ | `development` | 运行环境 | `production` |
| `FRONTEND_URL` | ✅ | - | 前端访问域名 | `https://crm.andejiazheng.com` |
| `BACKEND_BASE_URL` | ❌ | `FRONTEND_URL` | 后端基础URL | `https://crm.andejiazheng.com` |

**环境切换说明**:
```bash
# 开发环境 - 使用.env.dev
export NODE_ENV=development

# 生产环境 - 使用.env  
export NODE_ENV=production
```

---

#### JWT认证配置

| 变量名 | 必填 | 默认值 | 说明 | 安全建议 |
|--------|------|--------|------|----------|
| `JWT_SECRET` | ✅ | `andejiazheng-secret-key` | JWT签名密钥 | 生产环境必须更换为随机字符串 |
| `JWT_EXPIRES_IN` | ❌ | `7d` | Token有效期 | `24h` 或 `7d` |

**JWT载荷结构**:
```typescript
interface JWTPayload {
  sub: string;       // 用户ID (MongoDB ObjectId)
  username: string;  // 用户名
  role: string;      // 角色
  iat: number;       // 签发时间
  exp: number;       // 过期时间
}
```

**Token刷新策略**:
- 当前实现: 每次登录生成新Token
- 前端需要: 在401响应时重定向到登录页
- 建议: Token有效期内可调用 `/auth/refresh` 续期

---

#### 腾讯云OCR配置

| 变量名 | 必填 | 说明 | 获取方式 |
|--------|------|------|----------|
| `TENCENT_OCR_SECRET_ID` | ✅ | 腾讯云SecretId | 腾讯云控制台 → 访问管理 → API密钥管理 |
| `TENCENT_OCR_SECRET_KEY` | ✅ | 腾讯云SecretKey | 同上 |

**OCR功能说明**:
- 身份证OCR识别: 正反面信息提取
- 银行卡OCR识别: 卡号提取
- 通用文字识别: 证书内容提取

**调用限制**:
- QPS限制: 按购买量
- 单次调用: 图片<7MB, base64<10MB
- 支持格式: PNG, JPG, JPEG, BMP, PDF

---

#### 腾讯云COS配置

| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| `COS_SECRET_ID` | ✅ | COS访问密钥ID | `AKID...` |
| `COS_SECRET_KEY` | ✅ | COS访问密钥 | `czCM...` |
| `COS_BUCKET` | ✅ | 存储桶名称 | `housekeeping-1254058915` |
| `COS_REGION` | ✅ | 存储区域 | `ap-guangzhou` |

**COS存储目录结构**:
```
/{bucket}/
├── resume/
│   ├── photos/           # 个人照片
│   ├── certificates/     # 证书照片
│   ├── reports/          # 体检报告
│   ├── videos/           # 自我介绍视频
│   ├── idcards/          # 身份证照片
│   ├── cooking/          # 烹饪照片
│   └── confinement-meal/ # 月子餐照片
├── banner/               # Banner图片
├── article/              # 文章图片
└── contract/             # 合同文件
```

**COS限制参数** (代码内配置):
```typescript
// backend/src/config/cos.config.ts
UploadMaxSize: 50 * 1024 * 1024,  // 50MB 最大上传
UploadExpireTime: 600,            // 10分钟 上传链接有效期
DownloadExpireTime: 3600,         // 1小时 下载链接有效期
```

---

#### 爱签电子签约配置

| 变量名 | 必填 | 说明 | 获取方式 |
|--------|------|------|----------|
| `ESIGN_APP_ID` | ✅ | 爱签应用ID | 爱签开放平台注册获取 |
| `ESIGN_HOST` | ✅ | 爱签API域名 | 生产: `https://oapi.asign.cn` |
| `ESIGN_PUBLIC_KEY` | ✅ | 爱签公钥 | 用于验证回调签名 |
| `ESIGN_PRIVATE_KEY` | ✅ | 商户私钥 | 用于请求签名 |
| `ESIGN_VERSION` | ❌ | API版本 | 默认 `v1` |
| `ESIGN_NOTIFY_URL` | ✅ | 回调通知URL | `https://crm.andejiazheng.com/api/esign/callback` |

**爱签环境说明**:
| 环境 | HOST | 用途 |
|------|------|------|
| 测试 | `https://test.asign.cn` | 开发调试 |
| 生产 | `https://oapi.asign.cn` | 正式签约 |

**爱签状态码对照表** (详细):
| 状态码 | 名称 | 描述 | 前端颜色 |
|--------|------|------|----------|
| `0` | 等待签约 | 合同已创建，等待首个签署方签署 | `#ff9800` 橙色 |
| `1` | 签约中 | 至少有一方已签署，等待其他签署方 | `#2196f3` 蓝色 |
| `2` | 已签约 | 所有签署方已完成签署 | `#4caf50` 绿色 |
| `3` | 已过期 | 签约有效期已过，未完成签署 | `#f44336` 红色 |
| `4` | 拒签 | 签署方主动拒绝签署 | `#f44336` 红色 |
| `5` | 待审核 | 合同待平台审核 | `#9e9e9e` 灰色 |
| `6` | 已作废 | 合同被作废 | `#9e9e9e` 灰色 |
| `7` | 已撤销 | 合同被发起方撤销 | `#9e9e9e` 灰色 |

---

#### 大树保保险配置

| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| `DASHUBAO_USER` | ✅ | 大树保用户名 | `ande` |
| `DASHUBAO_PASSWORD` | ✅ | 大树保密码 | (保密) |

**大树保API环境**:
| 环境 | URL | 用途 |
|------|------|------|
| 测试 | `http://fx.test.dasurebao.com.cn/remoting/ws` | 开发调试 |
| 生产 | `https://api.dasurebao.com.cn/remoting/ws` | 正式投保 |

**XML请求报文格式**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Packet type="REQUEST" version="1.0">
  <Head>
    <RequestType>0002</RequestType>
    <User>{DASHUBAO_USER}</User>
    <Password>{DASHUBAO_PASSWORD}</Password>
  </Head>
  <Body>
    <!-- 业务数据 -->
  </Body>
</Packet>
```

**请求类型代码**:
| 代码 | 名称 | 说明 |
|------|------|------|
| `0002` | 投保确认 | 创建保单 |
| `0003` | 保单查询 | 查询保单状态 |
| `0004` | 退保申请 | 申请退保 |
| `0007` | 电子发票 | 申请开票 |
| `0008` | 注销保单 | 生效前取消 |

---

#### ZEGO即构音视频配置

| 变量名 | 必填 | 说明 | 获取方式 |
|--------|------|------|----------|
| `ZEGO_APP_ID` | ✅ | 即构应用ID | ZEGO控制台创建项目获取 |
| `ZEGO_SERVER_SECRET` | ✅ | 服务端密钥 | ZEGO控制台项目配置获取 |

**ZEGO Token生成参数**:
```typescript
// Token有效期: 默认7200秒(2小时)
// 房间无人超时: 10分钟自动关闭
const ROOM_TIMEOUT = 10 * 60 * 1000;

// Token载荷结构
interface ZegoTokenPayload {
  app_id: number;
  user_id: string;
  room_id?: string;
  privilege: number;  // 1-登录, 2-发布
  nonce: number;
  create_time: number;
  expire_time: number;
}
```

**ZEGO用户ID命名规范**:
| 类型 | 格式 | 示例 |
|------|------|------|
| 主持人 | `user_{timestamp}` | `user_1706700000000` |
| 访客 | `guest_{随机字符}` | `guest_abc123def456` |

---

#### 微信配置

**微信公众号配置**:
| 变量名 | 必填 | 说明 |
|--------|------|------|
| `WECHAT_APPID` | ✅ | 公众号AppID |
| `WECHAT_APPSECRET` | ✅ | 公众号AppSecret |
| `WECHAT_TOKEN` | ✅ | 消息校验Token |

**微信小程序配置**:
| 变量名 | 必填 | 说明 |
|--------|------|------|
| `MINIPROGRAM_APPID` | ✅ | 小程序AppID |
| `MINIPROGRAM_APPSECRET` | ✅ | 小程序AppSecret |
| `MINIPROGRAM_CLOUD_ENV` | ✅ | 云开发环境ID |

**云函数调用配置**:
```typescript
// 云函数名称: notifyCustomerAssign
// 触发场景: 客户分配给销售人员时
// 通知内容: 销售人员在小程序收到订阅消息
```

---

#### 百度地图配置

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `BAIDU_MAP_AK` | ✅ | 百度地图API密钥 |

**使用场景**:
- 地址解析: 客户地址转经纬度
- 逆地理编码: 经纬度转详细地址
- 服务区域计算: 阿姨服务范围匹配

---

#### 腾讯TRTC配置 (备用)

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `TRTC_SDK_APP_ID` | ❌ | TRTC应用ID |
| `TRTC_SDK_SECRET_KEY` | ❌ | TRTC密钥 |

**说明**: 当前视频面试使用ZEGO SDK，TRTC作为备用方案。

---

#### 环境变量安全最佳实践

1. **不要提交到Git**:
   ```gitignore
   # .gitignore
   .env
   .env.dev
   .env.local
   ```

2. **使用环境变量管理工具**:
   ```bash
   # 通过PM2环境配置
   # ecosystem.config.js
   env_production: {
     NODE_ENV: 'production',
     PORT: 3000
   }
   ```

3. **敏感信息加密存储**:
   - 生产环境使用云服务商的密钥管理
   - 定期轮换敏感密钥

---

### 3.5.2 数据库完整Schema定义

> **说明**: 以下是所有数据库集合的完整字段定义，包括字段类型、必填状态、默认值、验证规则和索引配置。

---

#### 3.5.2.1 用户集合 (users)

**集合名称**: `users`  
**文档模型**: `User`  
**时间戳**: 自动生成 `createdAt` 和 `updatedAt`

**完整字段定义**:

| 字段名 | 类型 | 必填 | 唯一 | 默认值 | 验证规则 | 说明 |
|--------|------|------|------|--------|----------|------|
| `_id` | ObjectId | ✅ | ✅ | auto | - | MongoDB文档ID |
| `username` | String | ✅ | ✅ | - | 非空 | 登录账号 |
| `password` | String | ✅ | ❌ | - | bcrypt加密 | 登录密码 |
| `name` | String | ✅ | ❌ | - | 非空 | 显示名称 |
| `email` | String | ❌ | ❌ | - | email格式 | 邮箱地址 |
| `phone` | String | ❌ | ❌ | - | 11位手机号 | 手机号码 |
| `avatar` | String | ❌ | ❌ | - | URL格式 | 头像地址 |
| `role` | String | ✅ | ❌ | - | 非空 | 用户角色 |
| `department` | String | ❌ | ❌ | - | - | 所属部门 |
| `permissions` | [String] | ❌ | ❌ | `[]` | - | 权限列表 |
| `active` | Boolean | ❌ | ❌ | `true` | - | 是否激活 |
| `wechatOpenId` | String | ❌ | ❌ | - | - | 微信OpenID |
| `wechatNickname` | String | ❌ | ❌ | - | - | 微信昵称 |
| `wechatAvatar` | String | ❌ | ❌ | - | URL格式 | 微信头像 |
| `createdAt` | Date | ✅ | ❌ | auto | - | 创建时间 |
| `updatedAt` | Date | ✅ | ❌ | auto | - | 更新时间 |

**索引配置**:
```javascript
// 唯一索引
UserSchema.index({ username: 1 }, { unique: true });

// 查询优化索引
UserSchema.index({ role: 1 });
UserSchema.index({ active: 1 });
```

**密码加密示例**:
```typescript
import * as bcrypt from 'bcrypt';

// 密码加密 (注册/修改密码时)
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// 密码验证 (登录时)
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

---

#### 3.5.2.2 客户集合 (customers) - 核心集合

**集合名称**: `customers`  
**文档模型**: `Customer`  
**时间戳**: 自动生成 `createdAt` 和 `updatedAt`

**完整字段定义** (32字段):

| 字段名 | 类型 | 必填 | 默认值 | 验证规则 | 说明 |
|--------|------|------|--------|----------|------|
| `_id` | ObjectId | ✅ | auto | - | MongoDB文档ID |
| `name` | String | ✅ | - | 非空 | 客户姓名 |
| `phone` | String | ❌ | - | 11位手机号，sparse唯一 | 手机号码 |
| `wechatId` | String | ❌ | - | - | 微信号 |
| `idCardNumber` | String | ❌ | - | 身份证格式 | 身份证号 |
| `leadSource` | String | ✅ | - | enum(18种) | 线索来源 |
| `serviceCategory` | String | ❌ | - | enum(9种) | 需求服务品类 |
| `contractStatus` | String | ✅ | - | enum(7种) | 客户状态 |
| `leadLevel` | String | ✅ | - | enum(6种) | 线索等级 |
| `salaryBudget` | Number | ❌ | - | 1000-50000 | 薪资预算 |
| `expectedStartDate` | Date | ❌ | - | - | 期望上户日期 |
| `homeArea` | Number | ❌ | - | - | 房屋面积(㎡) |
| `familySize` | Number | ❌ | - | - | 家庭人口 |
| `restSchedule` | String | ❌ | - | enum(5种) | 休息制度 |
| `address` | String | ❌ | - | - | 详细地址 |
| `ageRequirement` | String | ❌ | - | - | 年龄要求 |
| `genderRequirement` | String | ❌ | - | - | 性别要求 |
| `originRequirement` | String | ❌ | - | - | 籍贯要求 |
| `educationRequirement` | String | ❌ | - | enum(9种) | 学历要求 |
| `expectedDeliveryDate` | Date | ❌ | - | - | 预产期 |
| `remarks` | String | ❌ | - | - | 备注信息 |
| `dealAmount` | Number | ❌ | - | >=0 | 成交金额 |
| `createdBy` | String | ✅ | - | - | 创建人ID |
| `assignedTo` | ObjectId | ❌ | - | ref: User | 当前负责人 |
| `assignedBy` | ObjectId | ❌ | - | ref: User | 分配人(管理员) |
| `assignedAt` | Date | ❌ | - | - | 分配时间 |
| `inPublicPool` | Boolean | ❌ | `false` | - | 是否在公海中 |
| `publicPoolEntryTime` | Date | ❌ | - | - | 进入公海时间 |
| `lastFollowUpTime` | Date | ❌ | - | - | 最后跟进时间 |
| `lastActivityAt` | Date | ❌ | `Date.now` | - | 最后活动时间 |
| `autoTransferEnabled` | Boolean | ❌ | `true` | - | 是否允许自动流转 |
| `transferCount` | Number | ❌ | `0` | >=0 | 被流转次数 |

**枚举值详细定义**:

```typescript
// 线索来源 (18种)
const LEAD_SOURCES = [
  '美团', '抖音', '快手', '小红书', '转介绍', '杭州同馨',
  '握个手平台', '线索购买', '莲心', '美家', '天机鹿',
  '孕妈联盟', '高阁', '星星', '妈妈网', '犀牛', '宝宝树', '其他'
];

// 客户状态 (7种)
const CONTRACT_STATUS = [
  '已签约',   // 已完成签约
  '匹配中',   // 正在匹配阿姨
  '已面试',   // 已完成面试
  '流失客户', // 已流失
  '已退款',   // 已完成退款
  '退款中',   // 退款处理中
  '待定'      // 待定状态
];

// 线索等级 (6种) - 与转化率关联
const LEAD_LEVELS = {
  'O类': '超高意向，转化率>80%',
  'A类': '高意向，转化率60-80%',
  'B类': '中等意向，转化率30-60%',
  'C类': '低意向，转化率10-30%',
  'D类': '待定，转化率<10%',
  '流失': '已流失'
};

// 服务品类 (9种)
const SERVICE_CATEGORIES = [
  '月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠',
  '小时工', '白班育儿', '白班保姆', '住家护老'
];

// 休息制度 (5种)
const REST_SCHEDULES = ['单休', '双休', '无休', '调休', '待定'];
```

**索引配置**:
```javascript
CustomerSchema.index({ assignedTo: 1, updatedAt: -1 });
CustomerSchema.index({ inPublicPool: 1, publicPoolEntryTime: -1 });
CustomerSchema.index({ lastFollowUpTime: 1 });
// 线索流转优化复合索引
CustomerSchema.index({
  assignedTo: 1, contractStatus: 1, lastActivityAt: 1,
  autoTransferEnabled: 1, inPublicPool: 1
});
```

---

#### 3.5.2.3 简历集合 (resumes) - 核心集合

**集合名称**: `resumes`  
**文档模型**: `Resume`  
**字段数量**: 60+字段

**基础字段**:

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `name` | String | ✅ | - | 姓名 |
| `gender` | String | ✅ | - | 性别 (male/female) |
| `age` | Number | ✅ | - | 年龄 (18-80) |
| `phone` | String | ✅ | - | 手机号 |
| `idNumber` | String | ❌ | - | 身份证号 (sparse唯一) |
| `jobType` | String | ✅ | - | 工作类型 (9种) |
| `education` | String | ✅ | - | 学历 (9种) |
| `expectedSalary` | Number | ❌ | - | 期望薪资 |
| `experienceYears` | Number | ✅ | - | 工作年限 |
| `nativePlace` | String | ✅ | - | 籍贯 |
| `status` | String | ❌ | `'pending'` | 简历状态 |
| `orderStatus` | String | ❌ | - | 接单状态 |
| `maternityNurseLevel` | String | ❌ | - | 月嫂档位 (6种) |

**文件字段** (嵌套FileInfo结构):

| 字段名 | 类型 | 限制 | 说明 |
|--------|------|------|------|
| `idCardFront` | FileInfo | 1张 | 身份证正面 |
| `idCardBack` | FileInfo | 1张 | 身份证背面 |
| `personalPhoto` | [FileInfo] | 最多10张 | 个人照片 |
| `certificates` | [FileInfo] | 最多20张 | 证书照片 |
| `reports` | [FileInfo] | 最多10张 | 体检报告 |
| `confinementMealPhotos` | [FileInfo] | 最多10张 | 月子餐照片 |
| `cookingPhotos` | [FileInfo] | 最多10张 | 烹饪照片 |
| `selfIntroductionVideo` | FileInfo | 1个 | 自我介绍视频 |

**FileInfo结构**:
```typescript
interface FileInfo {
  url: string;       // 文件URL (必填)
  filename: string;  // 文件名 (必填)
  size?: number;     // 文件大小(字节)
  mimetype?: string; // MIME类型
}
```

**工作经历结构** (WorkExperience):
```typescript
interface WorkExperience {
  startDate: Date;           // 开始日期 (必填)
  endDate: Date;             // 结束日期 (必填)
  description: string;       // 工作描述 (必填)
  orderNumber?: string;      // 订单编号
  district?: string;         // 服务区域
  customerName?: string;     // 客户姓名
  customerReview?: string;   // 客户评价
  photos?: FileInfo[];       // 工作照片
}
```

**档期日历结构** (AvailabilityPeriod):
```typescript
interface AvailabilityPeriod {
  date: Date;                // 具体日期 (必填)
  status: AvailabilityStatus; // 状态
  contractId?: ObjectId;     // 关联合同ID
  remarks?: string;          // 备注
}

// 档期状态枚举 (5种)
enum AvailabilityStatus {
  UNSET = 'unset',           // 未设置（灰色）
  AVAILABLE = 'available',   // 可接单（绿色）
  UNAVAILABLE = 'unavailable', // 不可接单（黑色）
  OCCUPIED = 'occupied',     // 订单占用（红色）
  LEAVE = 'leave'            // 已请假（黄色）
}
```

**关键枚举值定义**:

```typescript
// 工作类型 (9种)
enum JobType {
  YUEXIN = 'yuexin',              // 月嫂
  ZHUJIA_YUER = 'zhujia-yuer',    // 住家育儿嫂
  BAIBAN_YUER = 'baiban-yuer',    // 白班育儿嫂
  BAOJIE = 'baojie',              // 保洁
  BAIBAN_BAOMU = 'baiban-baomu',  // 白班保姆
  ZHUJIA_BAOMU = 'zhujia-baomu',  // 住家保姆
  YANGCHONG = 'yangchong',        // 养宠
  XIAOSHI = 'xiaoshi',            // 小时工
  ZHUJIA_HULAO = 'zhujia-hulao'   // 住家护老
}

// 月嫂档位 (6种)
enum MaternityNurseLevel {
  JUNIOR = 'junior',       // 初级月嫂 (10000-12000元/月)
  SILVER = 'silver',       // 银牌月嫂 (12000-15000元/月)
  GOLD = 'gold',           // 金牌月嫂 (15000-18000元/月)
  PLATINUM = 'platinum',   // 铂金月嫂 (18000-22000元/月)
  DIAMOND = 'diamond',     // 钻石月嫂 (22000-28000元/月)
  CROWN = 'crown'          // 皇冠月嫂 (28000+元/月)
}

// 技能特长 (19种)
enum Skill {
  CHANHOU = 'chanhou',              // 产后护理
  TESHU_YINGER = 'teshu-yinger',    // 特殊婴儿护理
  YILIAO_BACKGROUND = 'yiliaobackground', // 医疗背景
  YUYING = 'yuying',                // 育婴
  ZAOJIAO = 'zaojiao',              // 早教
  FUSHI = 'fushi',                  // 辅食制作
  ERTUI = 'ertui',                  // 小儿推拿
  WAIYU = 'waiyu',                  // 外语能力
  ZHONGCAN = 'zhongcan',            // 中餐烹饪
  XICAN = 'xican',                  // 西餐烹饪
  MIANSHI = 'mianshi',              // 面食制作
  JIASHI = 'jiashi',                // 驾驶技能
  SHOUYI = 'shouyi',                // 收纳整理
  MUYING = 'muying',                // 母婴用品知识
  CUIRU = 'cuiru',                  // 催乳
  YUEZICAN = 'yuezican',            // 月子餐
  YINGYANG = 'yingyang',            // 营养搭配
  SHUANGTAI_HULI = 'shuangtai-huli', // 双胎护理
  YANGLAO_HULI = 'yanglao-huli'    // 养老护理
}
```

**索引配置**:
```javascript
// 身份证号唯一稀疏索引（允许null）
ResumeSchema.index({ idNumber: 1 }, { unique: true, sparse: true, background: true });

// 档期日历查询索引
ResumeSchema.index({ 'availabilityCalendar.date': 1, 'availabilityCalendar.status': 1 });

// 常用查询索引
ResumeSchema.index({ phone: 1 });
ResumeSchema.index({ jobType: 1 });
ResumeSchema.index({ orderStatus: 1 });
```

---

#### 3.5.2.4 合同集合 (contracts)

**集合名称**: `contracts`  
**文档模型**: `Contract`

**完整字段定义** (30+字段):

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `contractNumber` | String | ✅ | 合同编号 (唯一, 格式: HT-YYYYMMDD-XXXX) |
| `customerName` | String | ✅ | 客户姓名 |
| `customerPhone` | String | ✅ | 客户手机号 |
| `contractType` | ContractType | ✅ | 合同类型 (9种) |
| `startDate` | Date | ✅ | 服务开始日期 |
| `endDate` | Date | ✅ | 服务结束日期 |
| `workerName` | String | ✅ | 家政员姓名 |
| `workerPhone` | String | ✅ | 家政员手机号 |
| `workerIdCard` | String | ✅ | 家政员身份证号 |
| `workerSalary` | Number | ✅ | 家政员工资(元/月) |
| `customerServiceFee` | Number | ✅ | 客户服务费(元) |
| `customerId` | ObjectId | ✅ | 关联客户ID |
| `workerId` | ObjectId | ✅ | 关联简历ID |
| `createdBy` | ObjectId | ✅ | 创建人 |
| `contractStatus` | ContractStatus | ❌ | 合同状态 (默认: draft) |
| `isLatest` | Boolean | ❌ | 是否最新合同 (默认: true) |
| `esignContractNo` | String | ❌ | 爱签合同编号 |
| `esignStatus` | String | ❌ | 爱签合同状态 |

**合同状态枚举** (5种):
```typescript
enum ContractStatus {
  DRAFT = 'draft',           // 草稿 - 刚创建，未发起签署
  SIGNING = 'signing',       // 签约中 - 已发起签署，等待签名
  ACTIVE = 'active',         // 生效中 - 签署完成，正在服务
  REPLACED = 'replaced',     // 已被替换 - 换人后的旧合同
  CANCELLED = 'cancelled'    // 已作废 - 取消的合同
}
```

**合同编号生成规则**:
```typescript
// 格式: HT-YYYYMMDD-XXXX
// 示例: HT-20260131-0001
function generateContractNumber(): string {
  const date = dayjs().format('YYYYMMDD');
  const seq = (todayCount + 1).toString().padStart(4, '0');
  return `HT-${date}-${seq}`;
}
```

---

#### 3.5.2.5 面试间集合 (interview_rooms)

**集合名称**: `interview_rooms`  
**文档模型**: `InterviewRoom`

**完整字段定义**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `roomId` | String | ✅ | 房间ID (唯一, 格式: room_timestamp) |
| `roomName` | String | ✅ | 房间名称 |
| `hostUserId` | ObjectId | ✅ | 主持人用户ID (ref: User) |
| `hostName` | String | ✅ | 主持人姓名 |
| `hostZegoUserId` | String | ✅ | 主持人ZEGO用户ID (格式: user_xxx) |
| `status` | String | ✅ | 状态 (active/ended, 默认: active) |
| `source` | String | ❌ | 创建来源 (pc/miniprogram, 默认: pc) |
| `duration` | Number | ❌ | 持续时长(秒) |
| `participants` | [Participant] | ❌ | 参与者列表 |

**参与者结构**:
```typescript
interface Participant {
  userId: string;             // ZEGO用户ID (guest_xxx 或 user_xxx)
  userName: string;           // 用户名
  role: 'host' | 'guest';     // 角色
  identity?: string;          // 访客身份
  joinedAt: Date;             // 加入时间
  leftAt?: Date;              // 离开时间
}
```

---

#### 3.5.2.6 通知集合 (notifications)

**集合名称**: `notifications`  
**文档模型**: `Notification`

**关键字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `userId` | ObjectId | 接收用户ID |
| `type` | NotificationType | 通知类型 (24种) |
| `title` | String | 标题 |
| `content` | String | 内容 |
| `priority` | NotificationPriority | 优先级 (HIGH/MEDIUM/LOW) |
| `status` | NotificationStatus | 状态 (PENDING/SENT/READ/FAILED) |
| `data` | Object | 附加数据 |
| `actionUrl` | String | 点击跳转URL |

**通知类型枚举** (24种):
```typescript
enum NotificationType {
  // 简历相关 (5种)
  RESUME_CREATED, RESUME_STATUS_CHANGED, RESUME_ASSIGNED,
  RESUME_ORDER_STATUS_CHANGED, RESUME_FOLLOW_UP_DUE,
  
  // 客户相关 (9种)
  CUSTOMER_CREATED, CUSTOMER_ASSIGNED, CUSTOMER_TRANSFERRED,
  CUSTOMER_RECLAIMED, CUSTOMER_ASSIGNED_FROM_POOL,
  CUSTOMER_STATUS_CHANGED, CUSTOMER_FOLLOW_UP_DUE,
  LEAD_AUTO_TRANSFER_OUT, LEAD_AUTO_TRANSFER_IN,
  
  // 合同相关 (5种)
  CONTRACT_CREATED, CONTRACT_SIGNED, CONTRACT_WORKER_CHANGED,
  CONTRACT_EXPIRING_SOON, CONTRACT_STATUS_CHANGED,
  
  // 报表相关 (4种)
  DAILY_REPORT_PERSONAL, DAILY_REPORT_TEAM,
  WEEKLY_REPORT, MONTHLY_REPORT,
  
  // 系统相关 (3种)
  SYSTEM_ANNOUNCEMENT, PERMISSION_CHANGED, ACCOUNT_SECURITY
}
```

---

#### 3.5.2.7 其他集合简要说明

**线索流转规则** (lead_transfer_rules):
- 规则名称、触发条件(无活动小时数)、执行时间窗口、用户配额追踪

**线索流转记录** (lead_transfer_records):
- 流转记录、触发条件快照、原/新负责人

**员工评价** (employee_evaluations):
- 评价类型(daily/monthly/contract_end)、综合评分(1-5)、各维度评分

**小程序用户** (miniprogram_users):
- openid(主要标识)、phone(可选)、登录统计

**客户操作日志** (customer_operation_logs):
- 操作类型(create/update/assign/release_to_pool等)、操作详情(before/after)

**公海池日志** (public_pool_logs):
- 操作类型(enter/claim/assign/release)、操作人、来源/目标用户

---

### 3.6 实时通信 (WebSocket) 详细协议说明

#### 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket 通信架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     JWT验证     ┌─────────────────────┐   │
│  │ CRM Web端   │ ──────────────▶ │ NotificationGateway │   │
│  └─────────────┘                 └──────────┬──────────┘   │
│                                             │               │
│  ┌─────────────┐     订阅消息    ┌──────────▼──────────┐   │
│  │ 微信小程序   │ ◀────────────── │ Socket.IO Server    │   │
│  └─────────────┘                 └──────────┬──────────┘   │
│                                             │               │
│                                  ┌──────────▼──────────┐   │
│                                  │ NotificationService │   │
│                                  │ (数据库操作/推送)   │   │
│                                  └─────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Socket.IO 服务端配置

```typescript
// backend/src/modules/notification/notification.gateway.ts
@WebSocketGateway({
  cors: {
    origin: '*',           // 生产环境建议配置具体域名
    credentials: true,
  },
  namespace: '/notifications',
})
```

#### 连接参数

| 参数 | 值 | 说明 |
|------|-----|------|
| URL | `wss://crm.andejiazheng.com` | WebSocket连接地址 |
| 端口 | `3000` | 与HTTP共用端口 |
| 命名空间 | `/notifications` | Socket.IO命名空间 |
| 路径 | `/socket.io/` | Socket.IO默认路径 |
| 传输协议 | `websocket, polling` | 自动降级 |

#### 前端连接代码示例

```typescript
import { io, Socket } from 'socket.io-client';

class NotificationWebSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): void {
    this.socket = io('https://crm.andejiazheng.com/notifications', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('WebSocket连接成功, socketId:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket断开连接, 原因:', reason);
    });

    // 收到通知
    this.socket.on('notification', (data: NotificationPayload) => {
      console.log('收到通知:', data);
      this.handleNotification(data);
    });

    // 未读数量更新
    this.socket.on('unreadCount', (count: number) => {
      console.log('未读数量:', count);
      this.updateUnreadBadge(count);
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('连接错误:', error.message);
      this.reconnectAttempts++;
    });
  }

  // 主动请求未读数量
  requestUnreadCount(): void {
    this.socket?.emit('getUnreadCount');
  }

  // 断开连接
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  private handleNotification(data: NotificationPayload): void {
    // 显示桌面通知
    if (Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.content,
        icon: '/logo.png',
      });
    }
    // 播放提示音
    this.playNotificationSound();
  }

  private updateUnreadBadge(count: number): void {
    // 更新页面上的未读徽章
    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }

  private playNotificationSound(): void {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }
}

// 通知载荷类型
interface NotificationPayload {
  _id: string;
  type: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  icon?: string;
  color?: string;
  actionUrl?: string;
  actionText?: string;
  data?: Record<string, any>;
  createdAt: string;
}
```

#### 服务端事件详解

**1. 连接认证流程**:
```typescript
// 服务端 notification.gateway.ts
async handleConnection(client: Socket) {
  // 1. 从握手中获取token
  const token = client.handshake.auth.token 
    || client.handshake.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    client.disconnect();
    return;
  }

  // 2. 验证JWT
  const payload = this.jwtService.verify(token);
  const userId = payload.sub || payload.userId;

  // 3. 将socket加入用户房间
  client.join(`user:${userId}`);
  
  // 4. 保存用户socket映射
  this.userSocketMap.set(userId, client.id);

  // 5. 发送未读数量
  const unreadCount = await this.notificationService.getUnreadCount(userId);
  client.emit('unreadCount', unreadCount);
}
```

**2. 推送通知给指定用户**:
```typescript
// 服务端调用
async sendToUser(userId: string, notification: any) {
  this.server.to(`user:${userId}`).emit('notification', notification);
}

// 批量推送
async sendToUsers(userIds: string[], notification: any) {
  for (const userId of userIds) {
    await this.sendToUser(userId, notification);
  }
}

// 广播给所有在线用户
async broadcast(notification: any) {
  this.server.emit('notification', notification);
}
```

#### 事件类型完整列表

**客户端 → 服务端事件**:
| 事件名 | 参数 | 说明 |
|--------|------|------|
| `getUnreadCount` | 无 | 请求获取未读通知数量 |

**服务端 → 客户端事件**:
| 事件名 | 载荷类型 | 触发场景 |
|--------|----------|----------|
| `notification` | `NotificationPayload` | 新通知推送 |
| `unreadCount` | `number` | 未读数量更新 |
| `lead_assigned` | `LeadAssignPayload` | 线索分配通知 |
| `contract_signed` | `ContractPayload` | 合同签署完成 |
| `customer_transferred` | `CustomerPayload` | 客户流转通知 |

#### 断线重连策略

```typescript
// 前端重连配置
const socketConfig = {
  reconnection: true,              // 启用自动重连
  reconnectionAttempts: 5,         // 最大重试次数
  reconnectionDelay: 1000,         // 初始重连延迟 (ms)
  reconnectionDelayMax: 5000,      // 最大重连延迟 (ms)
  randomizationFactor: 0.5,        // 随机因子
  timeout: 20000,                  // 连接超时 (ms)
};

// 重连时序:
// 1次: 1000ms 后重试
// 2次: 1500ms 后重试  (1000 * 1.5^1)
// 3次: 2250ms 后重试  (1000 * 1.5^2)
// 4次: 3375ms 后重试  (1000 * 1.5^3)
// 5次: 5000ms 后重试  (最大延迟)
```

#### 心跳机制

Socket.IO内置心跳机制:
- 心跳间隔: 25秒
- 心跳超时: 20秒
- 如果20秒内没有收到响应，连接会被关闭

---

## 四、API 接口文档

> **完整 Swagger 文档**: https://crm.andejiazheng.com/api/docs

### 4.1 接口规范

**基础URL**: `https://crm.andejiazheng.com/api`

**认证方式**: JWT Bearer Token

**请求头**:
```http
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: <unique-key>  # 可选，用于幂等性控制
api-version: 1.0               # 可选，API版本
x-request-id: <uuid>           # 可选，请求追踪ID
```

**统一成功响应格式**:
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": 1706688000000
}
```

**统一错误响应格式**:
```json
{
  "success": false,
  "message": "错误描述",
  "error": "DUPLICATE_PHONE",
  "timestamp": 1706688000000
}
```

### 4.2 HTTP 状态码说明

| 状态码 | 说明 | 常见场景 |
|--------|------|----------|
| 200 | 成功 | 查询、更新成功 |
| 201 | 创建成功 | 新增资源成功 |
| 204 | 无内容 | 删除成功 |
| 400 | 参数错误 | 参数校验失败 |
| 401 | 未认证 | Token无效或过期 |
| 403 | 无权限 | 角色权限不足 |
| 404 | 不存在 | 资源不存在 |
| 500 | 服务器错误 | 内部异常 |

### 4.3 错误码字典

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `DUPLICATE_PHONE` | 手机号已存在 | 提示用户检查手机号 |
| `MISSING_CONTACT` | 缺少联系方式 | 手机号或微信号必填一个 |
| `FORBIDDEN` | 无权限操作 | 检查用户角色 |
| `NOT_FOUND` | 资源不存在 | 检查ID是否正确 |
| `VALIDATION_ERROR` | 参数校验失败 | 检查请求参数 |
| `TOKEN_EXPIRED` | Token过期 | 重新登录 |
| `TOKEN_INVALID` | Token无效 | 重新登录 |
| `DUPLICATE_IDCARD` | 身份证号重复 | 检查身份证号 |
| `FILE_TOO_LARGE` | 文件过大 | 限制50MB |
| `UNSUPPORTED_FILE` | 文件格式不支持 | 检查文件类型 |

---

### 4.4 认证接口 (/auth)

#### POST /auth/login - 用户登录

**请求参数**:
```json
{
  "username": "admin",
  "password": "123456"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "60d5ec49f1b2c8001f8e4e1a",
      "username": "admin",
      "name": "管理员",
      "role": "admin",
      "email": "admin@example.com",
      "department": "管理部",
      "permissions": ["customer:read", "customer:write", "resume:read"]
    }
  },
  "message": "登录成功"
}
```

**失败响应** (401):
```json
{
  "success": false,
  "message": "用户名或密码错误",
  "error": "INVALID_CREDENTIALS"
}
```

#### GET /auth/profile - 获取当前用户信息

**请求头**: 需要 `Authorization: Bearer <token>`

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "username": "admin",
    "name": "管理员",
    "role": "admin",
    "email": "admin@example.com",
    "phone": "13800138000",
    "department": "管理部",
    "avatar": "https://cos.example.com/avatars/admin.jpg",
    "active": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 4.5 客户接口 (/customers)

#### POST /customers - 创建客户

**请求参数**:
```json
{
  "name": "张三",
  "phone": "13800138000",
  "wechatId": "wx123456",
  "leadSource": "美团",
  "contractStatus": "匹配中",
  "leadLevel": "A类",
  "serviceCategory": "月嫂",
  "salaryBudget": 15000,
  "expectedStartDate": "2025-03-01",
  "address": "北京市朝阳区建国路88号",
  "familySize": 3,
  "restSchedule": "双休",
  "expectedDeliveryDate": "2025-04-01",
  "ageRequirement": "35-45岁",
  "genderRequirement": "female",
  "originRequirement": "不限",
  "educationRequirement": "初中以上",
  "remarks": "客户要求有经验的月嫂"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 范围/格式 | 说明 |
|------|------|------|----------|------|
| name | string | ✅ | 1-50字符 | 客户姓名 |
| phone | string | ❌* | 11位数字 | 手机号 |
| wechatId | string | ❌* | 1-50字符 | 微信号 |
| leadSource | string | ✅ | 枚举值 | 线索来源 |
| contractStatus | string | ✅ | 枚举值 | 客户状态 |
| leadLevel | string | ✅ | 枚举值 | 线索等级 |
| serviceCategory | string | ❌ | 枚举值 | 需求服务品类 |
| salaryBudget | number | ❌ | 1000-50000 | 薪资预算 |
| expectedStartDate | string | ❌ | YYYY-MM-DD | 期望上户日期 |
| address | string | ❌ | - | 家庭地址 |
| familySize | number | ❌ | 1-20 | 家庭人口 |
| restSchedule | string | ❌ | 枚举值 | 休息制度 |
| expectedDeliveryDate | string | ❌ | YYYY-MM-DD | 预产期(月嫂类型) |
| remarks | string | ❌ | - | 备注 |

> *注: phone和wechatId至少填写一个

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "customerId": "CUS202501001",
    "name": "张三",
    "phone": "13800138000",
    "leadSource": "美团",
    "contractStatus": "匹配中",
    "leadLevel": "A类",
    "isNew": true,
    "createdAt": "2025-01-31T10:30:00.000Z",
    "createdBy": "60d5ec49f1b2c8001f8e4e1b"
  },
  "message": "客户创建成功"
}
```

#### GET /customers - 获取客户列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 10 | 每页条数 (1-100) |
| search | string | - | 搜索关键词(姓名/手机号) |
| contractStatus | string | - | 筛选客户状态 |
| leadSource | string | - | 筛选线索来源 |
| leadLevel | string | - | 筛选线索等级 |
| assignedTo | string | - | 筛选负责人 ID |
| serviceCategory | string | - | 筛选服务品类 |
| startDate | string | - | 创建时间开始 (YYYY-MM-DD) |
| endDate | string | - | 创建时间结束 (YYYY-MM-DD) |
| isNew | boolean | - | 只显示新线索 |

**请求示例**:
```
GET /api/customers?page=1&limit=10&contractStatus=匹配中&leadLevel=A类
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "_id": "60d5ec49f1b2c8001f8e4e1a",
        "customerId": "CUS202501001",
        "name": "张三",
        "phone": "138****8000",
        "leadSource": "美团",
        "contractStatus": "匹配中",
        "leadLevel": "A类",
        "serviceCategory": "月嫂",
        "isNew": true,
        "assignedToUser": {
          "_id": "60d5ec49f1b2c8001f8e4e1b",
          "name": "张顾问"
        },
        "createdAt": "2025-01-31T10:30:00.000Z",
        "lastActivityAt": "2025-01-31T14:20:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  },
  "message": "客户列表获取成功"
}
```

#### GET /customers/:id - 获取客户详情

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 客户ID (MongoDB ObjectId) |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "customerId": "CUS202501001",
    "name": "张三",
    "phone": "13800138000",
    "wechatId": "wx123456",
    "leadSource": "美团",
    "contractStatus": "匹配中",
    "leadLevel": "A类",
    "serviceCategory": "月嫂",
    "salaryBudget": 15000,
    "expectedStartDate": "2025-03-01T00:00:00.000Z",
    "address": "北京市朝阳区建国路88号",
    "familySize": 3,
    "restSchedule": "双休",
    "expectedDeliveryDate": "2025-04-01T00:00:00.000Z",
    "remarks": "客户要求有经验的月嫂",
    "isNew": true,
    "inPublicPool": false,
    "autoTransferEnabled": true,
    "assignedTo": "60d5ec49f1b2c8001f8e4e1b",
    "assignedToUser": {
      "_id": "60d5ec49f1b2c8001f8e4e1b",
      "name": "张顾问"
    },
    "createdBy": "60d5ec49f1b2c8001f8e4e1c",
    "createdByUser": {
      "_id": "60d5ec49f1b2c8001f8e4e1c",
      "name": "管理员"
    },
    "createdAt": "2025-01-31T10:30:00.000Z",
    "updatedAt": "2025-01-31T14:20:00.000Z",
    "lastActivityAt": "2025-01-31T14:20:00.000Z"
  },
  "message": "客户详情获取成功"
}
```

#### PATCH /customers/:id - 更新客户信息

**请求参数**: 与创建接口相同，只传需要更新的字段

#### DELETE /customers/:id - 删除客户

**响应** (204): 无内容

#### POST /customers/batch-assign - 批量分配客户

**权限**: 仅管理员和经理

**请求参数**:
```json
{
  "customerIds": ["id1", "id2", "id3"],
  "assignedTo": "目标负责人ID",
  "assignmentReason": "分配原因"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "success": 3,
    "failed": 0,
    "errors": [],
    "notificationData": {
      "assignedToId": "...",
      "customerCount": 3
    }
  },
  "message": "批量分配完成：成功 3 个，失败 0 个"
}
```

#### POST /customers/import-excel - 批量导入客户

**请求格式**: `multipart/form-data`

| 参数 | 类型 | 说明 |
|------|------|------|
| file | File | Excel文件 (.xlsx/.xls) |

**Excel模板字段**:
| 列 | 字段 | 必填 | 说明 |
|----|------|------|------|
| A | 客户姓名 | ✅ | - |
| B | 手机号 | ❌* | - |
| C | 微信号 | ❌* | - |
| D | 线索来源 | ✅ | 枚举值 |
| E | 客户状态 | ✅ | 枚举值 |
| F | 线索等级 | ✅ | OABCD类 |
| G | 服务品类 | ❌ | 枚举值 |
| H | 地址 | ❌ | - |
| I | 备注 | ❌ | - |

#### 公海池相关接口

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /customers/public-pool | 所有 | 获取公海客户列表 |
| GET | /customers/public-pool/statistics | 管理员/经理 | 获取公海统计数据 |
| POST | /customers/public-pool/claim | 所有 | 员工领取客户 |
| POST | /customers/public-pool/assign | 管理员/经理 | 从公海分配客户 |
| POST | /customers/batch-release-to-pool | 所有 | 批量释放到公海 |
| POST | /customers/:id/release-to-pool | 所有 | 单个释放到公海 |
| GET | /customers/:id/public-pool-logs | 所有 | 获取公海历史记录 |

#### 跟进记录接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /customers/:id/follow-ups | 创建跟进记录 |
| GET | /customers/:id/follow-ups | 获取跟进记录 |
| GET | /customers/:id/assignment-logs | 获取分配历史 |
| GET | /customers/:id/operation-logs | 获取操作日志(管理员) |

---

### 4.4 简历接口 (/resumes)

#### POST /resumes - 创建简历

**请求格式**: `multipart/form-data`

**请求参数**:
```json
{
  "name": "李阿姨",                         // 必填，姓名 (1-50字符)
  "phone": "13900139000",                    // 必填，手机号 (11位)
  "gender": "female",                        // 必填，性别 (female/male)
  "age": 45,                                 // 必填，年龄 (18-65岁)
  "jobType": "yuexin",                       // 必填，工种
  "education": "middle",                     // 必填，学历
  "experienceYears": 10,                     // 必填，工作经验年限 (0-50)
  "nativePlace": "河南省郑州市",            // 必填，籍贯
  "expectedSalary": 15000,                   // 选填，期望薪资 (≥0)
  "maternityNurseLevel": "gold",             // 选填，月嫂档位
  "skills": ["chanhou", "yuying"],           // 选填，技能列表 (数组)
  "serviceArea": ["北京市朝阳区"],         // 选填，服务区域 (数组)
  "idNumber": "410102198001011234",          // 选填，身份证号 (15/18位)
  "wechat": "wxid_123456",                   // 选填，微信号
  "selfIntroduction": "自我介绍内容",       // 选填，自我介绍 (≤1000字)
  "internalEvaluation": "内部评价",         // 选填，内部员工评价 (≤2000字)
  "orderStatus": "accepting",                // 选填，接单状态
  "leadSource": "referral",                  // 选填，线索来源
  "maritalStatus": "married",                // 选填，婚姻状况
  "religion": "none",                        // 选填，宗教信仰
  "ethnicity": "汉族",                       // 选填，民族
  "zodiac": "dragon",                        // 选填，生肖
  "zodiacSign": "aries",                     // 选填，星座
  "currentAddress": "北京市朝阳区...",      // 选填，现居地址
  "hukouAddress": "河南省郑州市...",        // 选填，户籍地址
  "birthDate": "1980-01-01",                 // 选填，出生日期 (YYYY-MM-DD)
  "emergencyContactName": "张三",            // 选填，紧急联系人姓名
  "emergencyContactPhone": "13800138000",    // 选填，紧急联系人电话 (11位)
  "medicalExamDate": "2025-01-01",           // 选填，体检日期 (YYYY-MM-DD)
  "learningIntention": "yuesao",             // 选填，学习意向
  "currentStage": "experienced-certified",   // 选填，当前阶段
  "workExperiences": []                       // 选填，工作经历数组
}
```

**文件上传字段** (multipart/form-data):
| 字段名 | 最大数量 | 说明 |
|--------|----------|------|
| `idCardFront` | 1 | 身份证正面照片 |
| `idCardBack` | 1 | 身份证背面照片 |
| `photoFiles` | 30 | 个人照片 |
| `certificateFiles` | 30 | 技能证书照片 |
| `medicalReportFiles` | 10 | 体检报告 |
| `selfIntroductionVideo` | 1 | 自我介绍视频 (≤10MB) |
| `confinementMealPhotos` | 30 | 月子餐照片 |
| `cookingPhotos` | 30 | 烹饪照片 |
| `complementaryFoodPhotos` | 30 | 辅食添加照片 |
| `positiveReviewPhotos` | 30 | 好评展示照片 |

**字段验证规则**:
| 字段 | 类型 | 必填 | 验证规则 |
|------|------|------|----------|
| name | string | ✅ | 1-50字符，自动去除首尾空格 |
| phone | string | ✅ | 11位手机号 `/^1[3-9]\d{9}$/` |
| gender | enum | ✅ | `female` 或 `male` |
| age | number | ✅ | 18-65岁整数 |
| jobType | enum | ✅ | 见工种枚举表 |
| education | enum | ✅ | 见学历枚举表 |
| experienceYears | number | ✅ | 0-50年整数 |
| nativePlace | string | ✅ | 籍贯，1-50字符 |
| expectedSalary | number | ❌ | ≥0整数 |
| idNumber | string | ❌ | 15位或18位身份证号 |
| emergencyContactPhone | string | ❌ | 11位手机号 |

**工种枚举 (JobType)** - 完整列表:
| 枚举值 | 中文名称 | 使用场景 |
|--------|----------|----------|
| `yuexin` | 月嫂 | 产后护理、新生儿照护 |
| `zhujia-yuer` | 住家育儿嫂 | 24小时住家照顾婴幼儿 |
| `baiban-yuer` | 白班育儿嫂 | 白天照顾婴幼儿 |
| `baojie` | 保洁 | 家庭清洁服务 |
| `baiban-baomu` | 白班保姆 | 白天家务照料 |
| `zhujia-baomu` | 住家保姆 | 24小时住家家务照料 |
| `yangchong` | 养宠 | 宠物照料 |
| `xiaoshi` | 小时工 | 按小时计费服务 |
| `zhujia-hulao` | 住家护老 | 24小时老人照护 |

**学历枚举 (Education)** - 完整列表:
| 枚举值 | 中文名称 | 排序权重 |
|--------|----------|----------|
| `no` | 无学历 | 0 |
| `primary` | 小学 | 1 |
| `middle` | 初中 | 2 |
| `secondary` | 中专 | 3 |
| `vocational` | 职业学校 | 4 |
| `high` | 高中 | 5 |
| `college` | 大专 | 6 |
| `bachelor` | 本科 | 7 |
| `graduate` | 研究生及以上 | 8 |

**月嫂档位枚举 (MaternityNurseLevel)**:
| 枚举值 | 中文名称 | 参考薪资范围(月) |
|--------|----------|------------------|
| `junior` | 初级月嫂 | 8,000-12,000 |
| `silver` | 银牌月嫂 | 12,000-15,000 |
| `gold` | 金牌月嫂 | 15,000-18,000 |
| `platinum` | 铂金月嫂 | 18,000-22,000 |
| `diamond` | 钻石月嫂 | 22,000-28,000 |
| `crown` | 皇冠月嫂 | 28,000+ |

**技能枚举 (Skill)** - 完整列表:
| 枚举值 | 中文名称 | 适用工种 |
|--------|----------|----------|
| `chanhou` | 产后修复师 | 月嫂 |
| `teshu-yinger` | 特殊婴儿护理 | 月嫂、育儿嫂 |
| `yiliaobackground` | 医疗背景 | 所有 |
| `yuying` | 高级育婴师 | 育儿嫂 |
| `zaojiao` | 早教师 | 育儿嫂 |
| `fushi` | 辅食营养师 | 育儿嫂 |
| `ertui` | 小儿推拿师 | 月嫂、育儿嫂 |
| `waiyu` | 外语 | 所有 |
| `zhongcan` | 中餐 | 保姆 |
| `xican` | 西餐 | 保姆 |
| `mianshi` | 面食 | 保姆 |
| `jiashi` | 驾驶 | 所有 |
| `shouyi` | 整理收纳 | 保姆、保洁 |
| `muying` | 母婴护理师 | 月嫂 |
| `cuiru` | 高级催乳师 | 月嫂 |
| `yuezican` | 月子餐营养师 | 月嫂 |
| `yingyang` | 营养师 | 保姆 |
| `liliao-kangfu` | 理疗康复 | 护老 |
| `shuangtai-huli` | 双胎护理 | 月嫂 |
| `yanglao-huli` | 养老护理 | 护老 |

**接单状态枚举 (OrderStatus)**:
| 枚举值 | 中文名称 | 说明 |
|--------|----------|------|
| `accepting` | 想接单 | 可以安排面试 |
| `not-accepting` | 不接单 | 暂不接受新订单 |
| `on-service` | 已上户 | 正在服务中 |

**婚姻状况枚举 (MaritalStatus)**:
| 枚举值 | 中文名称 |
|--------|----------|
| `single` | 未婚 |
| `married` | 已婚 |
| `divorced` | 离异 |
| `widowed` | 丧偶 |

**宗教信仰枚举 (Religion)**:
| 枚举值 | 中文名称 |
|--------|----------|
| `none` | 无 |
| `buddhism` | 佛教 |
| `taoism` | 道教 |
| `christianity` | 基督教 |
| `catholicism` | 天主教 |
| `islam` | 伊斯兰教 |
| `other` | 其他 |

**生肖枚举 (Zodiac)**:
| 枚举值 | 中文 | 枚举值 | 中文 |
|--------|------|--------|------|
| `rat` | 鼠 | `horse` | 马 |
| `ox` | 牛 | `goat` | 羊 |
| `tiger` | 虎 | `monkey` | 猴 |
| `rabbit` | 兔 | `rooster` | 鸡 |
| `dragon` | 龙 | `dog` | 狗 |
| `snake` | 蛇 | `pig` | 猪 |

**星座枚举 (ZodiacSign)**:
| 枚举值 | 中文 | 枚举值 | 中文 |
|--------|------|--------|------|
| `aries` | 白羊座 | `libra` | 天秤座 |
| `taurus` | 金牛座 | `scorpio` | 天蝎座 |
| `gemini` | 双子座 | `sagittarius` | 射手座 |
| `cancer` | 巨蟹座 | `capricorn` | 摩羯座 |
| `leo` | 狮子座 | `aquarius` | 水瓶座 |
| `virgo` | 处女座 | `pisces` | 双鱼座 |

**线索来源枚举 (LeadSource)**:
| 枚举值 | 中文名称 | 说明 |
|--------|----------|------|
| `referral` | 转介绍 | 老客户推荐 |
| `paid-lead` | 付费线索 | 购买的线索 |
| `community` | 社群线索 | 微信群等社群 |
| `door-to-door` | 地推 | 线下推广 |
| `shared-order` | 合单 | 与其他机构合作 |
| `self-registration` | 自助注册 | 小程序自助注册 |
| `other` | 其他 | 其他渠道 |

**学习意向枚举 (LearningIntention)**:
| 枚举值 | 中文名称 |
|--------|----------|
| `yuesao` | 月嫂 |
| `yuersao` | 育儿嫂 |
| `baomu` | 保姆 |
| `hulao` | 护老 |

**当前阶段枚举 (CurrentStage)**:
| 枚举值 | 中文名称 | 说明 |
|--------|----------|------|
| `experienced-certified` | 有经验有证书 | 熟手 |
| `experienced-no-cert` | 有经验无证书 | 需补证 |
| `certified-no-exp` | 有证书无经验 | 需实习 |
| `beginner` | 小白 | 新手 |
| `not-looking` | 不找工作 | 暂不求职 |

**工作经历结构 (WorkExperience)**:
```typescript
interface WorkExperience {
  startDate: string;        // 开始日期 (YYYY-MM)
  endDate: string;          // 结束日期 (YYYY-MM)
  description: string;      // 工作描述
  orderNumber?: string;     // 订单编号
  district?: string;        // 服务区域
  customerName?: string;    // 客户名称
  customerReview?: string;  // 客户评价
  photos?: FileInfo[];      // 工作照片
}
```

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "name": "李阿姨",
    "phone": "13900139000",
    "gender": "female",
    "age": 45,
    "jobType": "yuexin",
    "education": "middle",
    "experienceYears": 10,
    "nativePlace": "河南省郑州市",
    "expectedSalary": 15000,
    "maternityNurseLevel": "gold",
    "skills": ["chanhou", "yuying"],
    "orderStatus": "accepting",
    "idCardFront": {
      "url": "https://cos.example.com/...",
      "filename": "idcard_front.jpg",
      "mimetype": "image/jpeg",
      "size": 102400
    },
    "personalPhoto": [
      {
        "url": "https://cos.example.com/...",
        "filename": "photo1.jpg"
      }
    ],
    "createdAt": "2025-01-31T10:30:00.000Z",
    "updatedAt": "2025-01-31T10:30:00.000Z"
  },
  "message": "创建简历成功"
}
```

---

#### GET /resumes - 获取简历列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 10 | 每页条数 (1-100) |
| search | string | - | 搜索关键词(姓名/手机号) |
| jobType | string | - | 工种筛选 |
| orderStatus | string | - | 接单状态筛选 |
| minAge | number | - | 最小年龄 |
| maxAge | number | - | 最大年龄 |
| minSalary | number | - | 最低期望薪资 |
| maxSalary | number | - | 最高期望薪资 |
| skills | string | - | 技能筛选(逗号分隔) |
| serviceArea | string | - | 服务区域筛选 |

---

#### GET /resumes/enums - 获取枚举字典 (公开接口)

**说明**: 无需认证，供前端获取所有枚举值用于表单渲染

**成功响应**:
```json
{
  "success": true,
  "data": {
    "gender": [{"value": "female", "label": "女"}, {"value": "male", "label": "男"}],
    "jobType": [{"value": "yuexin", "label": "月嫂"}, ...],
    "education": [{"value": "no", "label": "无学历"}, ...],
    "skills": [{"value": "chanhou", "label": "产后修复师"}, ...],
    "maritalStatus": [...],
    "religion": [...],
    "zodiac": [...],
    "zodiacSign": [...],
    "orderStatus": [...],
    "leadSource": [...],
    "maternityNurseLevel": [...],
    "fileTypes": [...]
  },
  "message": "获取枚举字典成功"
}
```

---

#### POST /resumes/import-excel - 批量导入简历

**请求格式**: `multipart/form-data`

**文件要求**:
- 格式: `.xlsx` 或 `.xls`
- 大小: ≤10MB

**Excel模板字段**:
| 列 | 字段名 | 必填 | 说明 |
|----|--------|------|------|
| A | 姓名 | ✅ | - |
| B | 手机号 | ✅ | 11位 |
| C | 性别 | ✅ | 男/女 |
| D | 年龄 | ✅ | 18-65 |
| E | 工种 | ✅ | 中文名称 |
| F | 学历 | ✅ | 中文名称 |
| G | 工作年限 | ✅ | 数字 |
| H | 籍贯 | ✅ | - |
| I | 期望薪资 | ❌ | 数字 |
| J | 身份证号 | ❌ | 15/18位 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "success": 10,
    "fail": 2,
    "errors": [
      {"row": 5, "error": "手机号格式错误"},
      {"row": 8, "error": "身份证号重复"}
    ]
  },
  "message": "成功导入 10 条简历，失败 2 条"
}
```

---

#### GET /resumes/:id/availability - 获取档期

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | ❌ | 查询开始日期 (YYYY-MM-DD) |
| endDate | string | ❌ | 查询结束日期 (YYYY-MM-DD) |

**档期状态枚举**:
| 状态 | 说明 | 颜色建议 |
|------|------|----------|
| `unset` | 未设置 | 灰色 |
| `available` | 可接单 | 绿色 |
| `unavailable` | 不可接单 | 红色 |
| `occupied` | 已占用 | 蓝色 |
| `leave` | 请假 | 黄色 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "periods": [
      {
        "date": "2025-02-01",
        "status": "available",
        "remarks": "可接单"
      },
      {
        "date": "2025-03-01",
        "status": "occupied",
        "contractId": "60d5ec49f1b2c8001f8e4e1a",
        "remarks": "已有订单 - 张女士"
      }
    ]
  }
}
```

---

#### POST /resumes/:id/availability - 更新档期

**请求参数**:
```json
{
  "periods": [
    {
      "date": "2025-02-15",
      "status": "available",
      "remarks": "可接受新订单"
    },
    {
      "date": "2025-02-20",
      "status": "leave",
      "remarks": "回家过年"
    }
  ]
}
```

---

#### POST /resumes/self-register - 阿姨自助注册 (小程序公开接口)

**说明**: 该接口无需认证，供小程序端阿姨自助注册使用。使用 `CreateResumeV2Dto` 进行宽松校验。

**特殊处理**:
- 手机号自动提取数字 (支持 `138-0013-8000` 格式)
- 姓名自动去除空格
- 年龄字符串自动转数字
- 空字符串自动转为 undefined

---

### 4.5 合同接口 (/contracts)

#### POST /contracts - 创建合同

**请求参数**:
```json
{
  "customerName": "张三",                    // 必填，客户姓名
  "customerPhone": "13800138000",            // 必填，客户手机号 (11位)
  "customerIdCard": "110101199001011234",    // 选填，客户身份证 (18位)
  "contractType": "月嫂",                    // 必填，合同类型
  "startDate": "2025-03-01",                 // 必填，开始日期 (YYYY-MM-DD)
  "endDate": "2025-04-30",                   // 必填，结束日期 (YYYY-MM-DD)
  "workerName": "李阿姨",                    // 必填，服务人员姓名
  "workerPhone": "13900139000",              // 必填，服务人员电话 (11位)
  "workerIdCard": "410102197501011234",      // 必填，服务人员身份证 (18位)
  "workerSalary": 15000,                     // 必填，家政员工资 (元)
  "customerServiceFee": 2000,                // 必填，客户服务费 (元)
  "workerServiceFee": 500,                   // 选填，家政员服务费 (元)
  "deposit": 1000,                           // 选填，定金 (元)
  "expectedDeliveryDate": "2025-03-15",      // 选填，预产期 (月嫂类型必填)
  "salaryPaymentDay": 15,                    // 选填，工资发放日 (1-31)
  "remarks": "备注信息"                      // 选填，备注
}
```

**字段验证规则**:
| 字段 | 类型 | 必填 | 验证规则 |
|------|------|------|----------|
| customerName | string | ✅ | 1-50字符 |
| customerPhone | string | ✅ | 11位手机号 |
| customerIdCard | string | ❌ | 18位身份证号 |
| contractType | enum | ✅ | 见合同类型枚举 |
| startDate | string | ✅ | YYYY-MM-DD格式 |
| endDate | string | ✅ | YYYY-MM-DD格式，必须大于startDate |
| workerName | string | ✅ | 1-50字符 |
| workerPhone | string | ✅ | 11位手机号 |
| workerIdCard | string | ✅ | 18位身份证号 |
| workerSalary | number | ✅ | ≥0整数 |
| customerServiceFee | number | ✅ | ≥0整数 |
| workerServiceFee | number | ❌ | ≥0整数 |
| deposit | number | ❌ | ≥0整数 |
| salaryPaymentDay | number | ❌ | 1-31整数 |

**合同类型枚举 (ContractType)**:
| 枚举值 | 说明 | 常见服务周期 |
|--------|------|------------|
| `月嫂` | 产后护理服务 | 26-52天 |
| `住家育儿嫂` | 住家照顾婴幼儿 | 长期 |
| `保洁` | 家庭清洁服务 | 按次 |
| `住家保姆` | 住家家务服务 | 长期 |
| `养宠` | 宠物照料 | 按次/长期 |
| `小时工` | 按小时计费 | 按次 |
| `白班育儿` | 白天照顾婴幼儿 | 长期 |
| `白班保姆` | 白天家务服务 | 长期 |
| `住家护老` | 住家老人照护 | 长期 |

**合同状态枚举 (ContractStatus)**:
| 状态 | 说明 | 可执行操作 |
|------|------|------------|
| `draft` | 草稿 | 编辑、删除、发起签约 |
| `signing` | 签约中 | 撤销签约、查看状态 |
| `active` | 生效中 | 作废、换人 |
| `replaced` | 已被替换 | 查看历史 |
| `cancelled` | 已作废 | 查看历史 |

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "contractNumber": "HT20250131001",
    "customerName": "张三",
    "customerPhone": "13800138000",
    "workerName": "李阿姨",
    "workerPhone": "13900139000",
    "contractType": "月嫂",
    "startDate": "2025-03-01T00:00:00.000Z",
    "endDate": "2025-04-30T00:00:00.000Z",
    "workerSalary": 15000,
    "customerServiceFee": 2000,
    "status": "draft",
    "isLatest": true,
    "createdBy": "60d5ec49f1b2c8001f8e4e1b",
    "createdAt": "2025-01-31T10:30:00.000Z",
    "updatedAt": "2025-01-31T10:30:00.000Z"
  },
  "message": "合同创建成功"
}
```

---

#### GET /contracts - 获取合同列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 10 | 每页条数 (1-100) |
| search | string | - | 搜索关键词(客户名/合同号/家政员名) |
| showAll | boolean | false | 是否显示所有合同(包括已替换的) |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "contracts": [...],
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  },
  "message": "获取合同列表成功"
}
```

---

#### GET /contracts/statistics - 获取合同统计

**成功响应**:
```json
{
  "success": true,
  "data": {
    "totalContracts": 150,
    "activeContracts": 80,
    "signingContracts": 15,
    "draftContracts": 10,
    "monthlyNew": 25,
    "totalServiceFee": 500000,
    "totalWorkerSalary": 1200000,
    "averageServiceFee": 6250,
    "conversionRate": 85.5
  },
  "message": "获取统计信息成功"
}
```

---

#### GET /contracts/customer/:customerId - 根据客户ID获取合同

---

#### GET /contracts/worker/:workerId - 根据服务人员ID获取合同

---

#### GET /contracts/number/:contractNumber - 根据合同编号获取合同

---

#### GET /contracts/search-by-worker - 根据服务人员信息查询 (公开接口)

**说明**: 无需认证，用于保险投保页面自动填充合同信息

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | 服务人员姓名 |
| idCard | string | 服务人员身份证 |
| phone | string | 服务人员电话 |

---

#### GET /contracts/check-customer/:customerPhone - 检查客户现有合同 (公开接口)

**成功响应**:
```json
{
  "success": true,
  "data": {
    "hasContract": true,
    "latestContract": {
      "_id": "60d5ec49f1b2c8001f8e4e1a",
      "contractNumber": "HT20250131001",
      "workerName": "李阿姨",
      "status": "active"
    }
  },
  "message": "客户已有合同"
}
```

---

#### POST /contracts/change-worker/:originalContractId - 创建换人合同

**说明**: 为现有客户更换服务人员，自动合并合同历史

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| originalContractId | string | 原合同ID (MongoDB ObjectId) |

**换人流程**:
1. 查询原合同，验证状态为 `active`
2. 计算原合同实际服务天数
3. 创建新合同，建立替换关系
4. 更新原合同状态为 `replaced`
5. 更新客户合同历史记录

**成功响应**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1b",
    "contractNumber": "HT20250215001",
    "customerName": "张三",
    "workerName": "王阿姨",
    "replacesContractId": "60d5ec49f1b2c8001f8e4e1a",
    "changeDate": "2025-02-15T00:00:00.000Z",
    "isLatest": true
  },
  "message": "换人合同创建成功"
}
```

---

#### GET /contracts/history/:customerPhone - 获取客户合同历史 (公开接口)

**成功响应**:
```json
{
  "success": true,
  "data": {
    "customerPhone": "13800138000",
    "customerName": "张三",
    "totalWorkers": 3,
    "latestContractId": "60d5ec49f1b2c8001f8e4e1c",
    "contracts": [
      {
        "contractId": "60d5ec49f1b2c8001f8e4e1a",
        "contractNumber": "HT20250101001",
        "workerName": "李阿姨",
        "startDate": "2025-01-01",
        "endDate": "2025-02-14",
        "serviceDays": 45,
        "status": "replaced",
        "changeReason": "客户要求更换"
      },
      {
        "contractId": "60d5ec49f1b2c8001f8e4e1c",
        "contractNumber": "HT20250301001",
        "workerName": "赵阿姨",
        "startDate": "2025-03-01",
        "endDate": "2025-04-30",
        "status": "active",
        "isLatest": true
      }
    ]
  },
  "message": "获取客户合同历史成功"
}
```

---

#### GET /contracts/:id/esign-info - 获取爱签合同信息

**说明**: 获取合同关联的爱签电子签约状态和预览链接

**成功响应**:
```json
{
  "success": true,
  "data": {
    "contractNo": "CONTRACT_1706700000000",
    "templateNo": "TPL001",
    "status": {
      "code": 1,
      "name": "签约中",
      "signers": [
        {"name": "张三", "signed": true, "signedAt": "2025-01-31T10:00:00.000Z"},
        {"name": "李阿姨", "signed": false}
      ]
    },
    "preview": {
      "previewUrl": "https://esign.example.com/preview/..."
    }
  },
  "message": "获取爱签信息成功"
}
```

---

#### POST /contracts/:id/download-contract - 下载已签约合同

**请求参数**:
```json
{
  "force": 1,              // 可选，强制重新生成
  "downloadFileType": 1   // 可选，文件类型 (1-PDF)
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://esign.example.com/download/...",
    "expireTime": "2025-01-31T12:00:00.000Z"
  },
  "message": "合同下载成功"
}
```

---

### 4.6 电子签约接口 (/esign)

#### POST /esign/create-contract-flow - 创建完整签约流程

**请求参数**:
```json
{
  "contractName": "月嫂服务合同",                // 必填，合同名称
  "templateNo": "TPL001",                      // 必填，爱签模板编号
  "templateParams": {                          // 必填，模板填充参数
    "customerName": "张三",
    "customerIdCard": "110101199001011234",
    "workerName": "李阿姨",
    "workerIdCard": "410102197501011234",
    "startDate": "2025-03-01",
    "endDate": "2025-04-30",
    "salary": "15000",
    "serviceFee": "2000"
  },
  "signers": [                                 // 必填，签署方列表
    {
      "name": "张三",                          // 必填，签署人姓名
      "mobile": "13800138000",                // 必填，签署人手机号
      "idCard": "110101199001011234",         // 必填，签署人身份证
      "signType": "manual",                   // 可选，签署方式(auto/manual)
      "validateType": "sms"                   // 可选，验证方式(sms/password/face)
    },
    {
      "name": "李阿姨",
      "mobile": "13900139000",
      "idCard": "410102197501011234"
    }
  ],
  "validityTime": 30,                          // 可选，签约有效期(天)，默认30
  "signOrder": 1                               // 可选，签署顺序(1-顺序签，0-不限)
}
```

**签署方式说明**:
| signType | 说明 | 用户操作 |
|----------|------|----------|
| `auto` | 无感知签约 | 自动完成，无需用户操作 |
| `manual` | 有感知签约 | 需要用户点击确认签署 |

**验证方式说明**:
| validateType | 说明 | 安全级别 |
|--------------|------|----------|
| `sms` | 短信验证码 | 标准 |
| `password` | 签约密码 | 标准 |
| `face` | 人脸识别 | 高 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "contractNo": "CONTRACT_1706700000000",
    "signUrl": "https://esign.example.com/sign/...",
    "signUrls": [
      {
        "signerName": "张三",
        "signerMobile": "138****8000",
        "signUrl": "https://esign.example.com/sign/party1/..."
      },
      {
        "signerName": "李阿姨",
        "signerMobile": "139****9000",
        "signUrl": "https://esign.example.com/sign/party2/..."
      }
    ],
    "message": "合同创建成功"
  },
  "message": "合同创建成功"
}
```

---

#### GET /esign/contract-status/:contractNo - 查询签约状态

**签约状态码对照表**:
| 状态码 | 状态名称 | 颜色建议 | 说明 |
|--------|----------|----------|------|
| `0` | 等待签约 | 橙色 | 合同已创建，等待签署方签约 |
| `1` | 签约中 | 蓝色 | 合同正在签署过程中 |
| `2` | 已签约 | 绿色 | 合同已完成签署 |
| `3` | 过期 | 红色 | 合同已过期 |
| `4` | 拒签 | 红色 | 签署方拒绝签署合同 |
| `6` | 作废 | 灰色 | 合同已作废 |
| `7` | 撤销 | 灰色 | 合同已撤销 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "contractNo": "CONTRACT_1706700000000",
    "status": 1,
    "statusName": "签约中",
    "signers": [
      {
        "account": "13800138000",
        "name": "张三",
        "signed": true,
        "signedAt": "2025-01-31T10:00:00.000Z"
      },
      {
        "account": "13900139000",
        "name": "李阿姨",
        "signed": false
      }
    ],
    "createTime": "2025-01-31T09:00:00.000Z"
  },
  "detailedStatus": {
    "code": 1,
    "name": "签约中",
    "color": "blue",
    "description": "合同正在签署过程中"
  },
  "message": "获取合同状态成功"
}
```

---

#### GET /esign/download-contract/:contractNo - 下载已签约合同

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| force | number | 是否强制重新生成 (0/1) |
| downloadFileType | number | 文件类型 (1-PDF) |
| outfile | string | 输出文件名 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://esign.example.com/download/...",
    "fileType": "pdf",
    "fileName": "月嫂服务合同_张三.pdf",
    "expireTime": "2025-01-31T12:00:00.000Z"
  },
  "message": "下载合同成功"
}
```

---

#### GET /esign/preview-contract/:contractNo - 预览合同

**成功响应**:
```json
{
  "success": true,
  "data": {
    "previewUrl": "https://esign.example.com/preview/...",
    "signUrls": [
      {
        "signerName": "张三",
        "signUrl": "https://..."
      }
    ]
  },
  "message": "获取预览链接成功"
}
```

---

#### POST /esign/withdraw-contract/:contractNo - 撤销合同

**请求参数**:
```json
{
  "withdrawReason": "客户要求取消",    // 可选，撤销原因
  "isNoticeSignUser": true           // 可选，是否通知签署方
}
```

---

#### POST /esign/invalidate-contract/:contractNo - 作废合同

**请求参数**:
```json
{
  "invalidReason": "信息填写错误",    // 可选，作废原因
  "isNoticeSignUser": true          // 可选，是否通知签署方
}
```

---

#### GET /esign/templates - 获取模板列表

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "templateNo": "TPL001",
      "templateName": "月嫂服务合同",
      "createTime": "2025-01-01T00:00:00.000Z",
      "status": 1
    },
    {
      "templateNo": "TPL002",
      "templateName": "育儿嫂服务合同",
      "createTime": "2025-01-01T00:00:00.000Z",
      "status": 1
    }
  ],
  "message": "获取模板列表成功"
}
```

---

#### POST /esign/template/data - 获取模板控件信息

**请求参数**:
```json
{
  "templateIdent": "TPL001"    // 模板标识
}
```

**成功响应**:
```json
{
  "code": 100000,
  "data": {
    "templateNo": "TPL001",
    "templateName": "月嫂服务合同",
    "components": [
      {
        "key": "customerName",
        "label": "客户姓名",
        "type": "text",
        "required": true
      },
      {
        "key": "startDate",
        "label": "开始日期",
        "type": "date",
        "required": true
      }
    ]
  },
  "msg": "成功"
}
```

---

### 4.7 视频面试接口 (/interview)

#### 模块概述

视频面试模块基于ZEGO即构音视频SDK实现，提供完整的视频面试功能，包括面试间管理、参与者管理、提词器功能等。

#### 面试间数据模型

```typescript
// 面试间实体 (interview_rooms collection)
interface InterviewRoom {
  _id: ObjectId;                    // MongoDB文档ID
  roomId: string;                   // 房间ID（唯一，格式: room_timestamp）
  roomName: string;                 // 房间名称
  hostUserId: ObjectId;             // 主持人用户ID（关联User表）
  hostName: string;                 // 主持人姓名
  hostZegoUserId: string;           // 主持人ZEGO用户ID（格式: user_xxx）
  status: 'active' | 'ended';       // 房间状态
  source: 'pc' | 'miniprogram';     // 创建来源
  hostUrl?: string;                 // 主持人重新进入URL
  participants: Participant[];      // 参与者列表
  duration?: number;                // 持续时长（秒）
  createdAt: Date;                  // 创建时间
  endedAt?: Date;                   // 结束时间
}

// 参与者子文档
interface Participant {
  userId: string;                   // ZEGO用户ID（guest_xxx 或 user_xxx）
  userName: string;                 // 用户名
  role: 'host' | 'guest';           // 角色
  identity?: string;                // 访客身份（求职者填写）
  joinedAt: Date;                   // 加入时间
  leftAt?: Date;                    // 离开时间
}
```

#### 面试间状态枚举

| 状态 | 值 | 说明 | 颜色建议 |
|------|-----|------|----------|
| 活跃 | `active` | 面试间正在进行中 | 绿色 |
| 已结束 | `ended` | 面试间已关闭 | 灰色 |

#### 创建来源枚举

| 来源 | 值 | 说明 |
|------|-----|------|
| PC端 | `pc` | CRM后台创建 |
| 小程序 | `miniprogram` | 小程序H5页面创建 |

#### 业务规则详解

1. **单例模式**:
   - 每个CRM用户同时只能有一个活跃面试间
   - 创建新面试间时自动将旧的设为ended状态
   - 防止资源浪费和混乱

2. **自动关闭机制**:
   - 3分钟无任何参与者自动关闭房间
   - 主持人离开后房间进入等待状态
   - 超时后自动设置status为ended

3. **访客权限**:
   - 访客通过分享链接加入，无需CRM账号
   - 访客需填写身份信息（姓名、角色）
   - 访客离开后可重新加入（房间未关闭时）

4. **参与者管理**:
   - 主持人可踢出任意参与者
   - 主持人可解散房间（强制踢出所有人）
   - 参与者列表实时更新

---

#### POST /interview/rooms - 创建面试间

**请求头**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**请求参数**:
| 字段 | 类型 | 必填 | 验证规则 | 说明 |
|------|------|------|----------|------|
| roomId | string | ✅ | @IsString @IsNotEmpty | 房间ID（唯一） |
| roomName | string | ✅ | @IsString @IsNotEmpty | 房间名称 |
| hostName | string | ✅ | @IsString @IsNotEmpty | 主持人姓名 |
| hostZegoUserId | string | ✅ | @IsString @IsNotEmpty | 主持人ZEGO用户ID |
| source | enum | ❌ | @IsEnum(['pc', 'miniprogram']) | 创建来源，默认pc |
| hostUrl | string | ❌ | @IsString | 主持人重新进入URL |

**请求示例**:
```json
{
  "roomId": "room_1706700000000",
  "roomName": "张三-李阿姨面试",
  "hostName": "销售顾问张经理",
  "hostZegoUserId": "user_123456789",
  "source": "pc",
  "hostUrl": "https://crm.andejiazheng.com/miniprogram/video-interview.html?roomId=room_1706700000000&token=xxx"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "roomId": "room_1706700000000",
    "roomName": "张三-李阿姨面试",
    "hostUserId": "60d5ec49f1b2c8001f8e4e1b",
    "hostName": "销售顾问张经理",
    "hostZegoUserId": "user_123456789",
    "status": "active",
    "source": "pc",
    "hostUrl": "https://crm.andejiazheng.com/miniprogram/video-interview.html?roomId=room_1706700000000&token=xxx",
    "participants": [],
    "createdAt": "2025-01-31T10:30:00.000Z",
    "updatedAt": "2025-01-31T10:30:00.000Z"
  },
  "message": "面试间创建成功"
}
```

**错误响应**:
| 状态码 | 错误信息 | 原因 |
|--------|----------|------|
| 400 | 创建面试间失败 | 参数验证失败 |
| 401 | Unauthorized | JWT Token无效或过期 |
| 500 | 服务器内部错误 | 数据库操作失败 |

---

#### GET /interview/active-room - 获取当前活跃面试间

**说明**: 获取当前登录用户的活跃面试间（如果有）

**成功响应**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "roomId": "room_1706700000000",
    "roomName": "张三-李阿姨面试",
    "status": "active",
    "createdAt": "2025-01-31T10:30:00.000Z"
  },
  "message": "找到活跃面试间"
}
```

**无活跃面试间响应**:
```json
{
  "success": true,
  "data": null,
  "message": "没有活跃的面试间"
}
```

---

#### GET /interview/rooms - 获取面试间列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 10 | 每页条数 |
| status | string | - | 状态筛选(active/ended) |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "60d5ec49f1b2c8001f8e4e1a",
        "roomId": "room_1706700000000",
        "roomName": "张三-李阿姨面试",
        "status": "active",
        "participants": [
          {
            "userId": "guest_abc123",
            "userName": "张三",
            "role": "guest",
            "joinedAt": "2025-01-31T10:35:00.000Z"
          }
        ],
        "createdAt": "2025-01-31T10:30:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  }
}
```

---

#### GET /interview/rooms/:roomId - 获取面试间详情

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| roomId | string | 房间ID |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "roomId": "room_1706700000000",
    "roomName": "张三-李阿姨面试",
    "hostUserId": "60d5ec49f1b2c8001f8e4e1b",
    "hostName": "销售顾问张经理",
    "hostZegoUserId": "user_123456789",
    "status": "active",
    "source": "pc",
    "participants": [
      {
        "userId": "guest_abc123",
        "userName": "张三（客户）",
        "role": "guest",
        "identity": "客户",
        "joinedAt": "2025-01-31T10:35:00.000Z"
      },
      {
        "userId": "guest_def456",
        "userName": "李阿姨",
        "role": "guest",
        "identity": "阿姨",
        "joinedAt": "2025-01-31T10:36:00.000Z"
      }
    ],
    "createdAt": "2025-01-31T10:30:00.000Z"
  }
}
```

---

#### POST /interview/rooms/:roomId/end - 结束面试间

**说明**: 主持人结束面试间，会将房间状态设为ended，并记录持续时长

**成功响应**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8001f8e4e1a",
    "roomId": "room_1706700000000",
    "status": "ended",
    "duration": 1800,
    "endedAt": "2025-01-31T11:00:00.000Z"
  },
  "message": "面试间已结束"
}
```

---

#### GET /interview/rooms/:roomId/status - 检查面试间状态

**成功响应**:
```json
{
  "success": true,
  "data": {
    "roomId": "room_1706700000000",
    "status": "active",
    "participantCount": 3,
    "isHost": true,
    "canJoin": true
  }
}
```

---

#### POST /interview/create-room - 简化版创建面试间（小程序专用）

**说明**: 仅需roomId和inviteLink即可快速创建，用于小程序H5页面

**请求参数**:
```json
{
  "roomId": "room_1706700000000",
  "inviteLink": "https://crm.andejiazheng.com/miniprogram/video-interview-guest.html?roomId=room_1706700000000"
}
```

**成功响应**:
```json
{
  "success": true,
  "message": "保存成功",
  "data": {
    "roomId": "room_1706700000000",
    "inviteLink": "https://crm.andejiazheng.com/miniprogram/video-interview-guest.html?roomId=room_1706700000000"
  }
}
```

---

#### GET /interview/latest-room - 获取最新活跃面试间

**说明**: 获取当前用户最新创建的活跃面试间

**成功响应**:
```json
{
  "success": true,
  "data": {
    "roomId": "room_1706700000000",
    "inviteLink": "https://crm.andejiazheng.com/miniprogram/video-interview-guest.html?roomId=room_1706700000000",
    "roomName": "张经理的面试间",
    "createdAt": "2025-01-31T10:30:00.000Z"
  }
}
```

---

### 4.7.1 ZEGO音视频接口 (/zego)

#### 模块概述

ZEGO模块提供音视频通话的底层支持，包括Token生成、房间管理、提词器功能、远程控制等。

---

#### POST /zego/generate-token - 生成主持人Token（需登录）

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | ✅ | ZEGO用户ID（格式: user_xxx） |
| roomId | string | ✅ | 房间ID |
| userName | string | ✅ | 用户名 |
| expireTime | number | ❌ | 过期时间（秒），默认7200 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "token": "04AAABJ...",
    "appId": 123456789
  }
}
```

---

#### POST /zego/generate-guest-token - 生成访客Token（公开接口）

**说明**: 访客无需登录，通过此接口获取Token加入面试

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | ✅ | ZEGO用户ID（格式: guest_xxx） |
| roomId | string | ✅ | 房间ID |
| userName | string | ✅ | 访客姓名 |
| role | string | ❌ | 访客角色（客户/阿姨） |
| expireTime | number | ❌ | 过期时间（秒） |

**请求示例**:
```json
{
  "userId": "guest_abc123def456",
  "roomId": "room_1706700000000",
  "userName": "张三（客户）",
  "role": "guest"
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "token": "04AAABJ...",
    "appId": 123456789
  }
}
```

**错误响应**:
| 错误码 | 错误信息 | 原因 |
|--------|----------|------|
| 404 | 房间不存在 | roomId无效 |
| 403 | 该房间已结束，无法加入 | 房间已关闭 |
| 403 | 该房间已被解散，无法加入 | 主持人解散了房间 |
| 403 | 无法加入房间 | 被踢出或其他原因 |

---

#### GET /zego/config - 获取ZEGO配置

**成功响应**:
```json
{
  "success": true,
  "data": {
    "appId": 123456789,
    "serverUrl": "wss://webliveroom-xxx.zegocloud.com/ws"
  }
}
```

---

#### POST /zego/kick-user - 踢出用户（主持人专用）

**请求参数**:
```json
{
  "roomId": "room_1706700000000",
  "hostUserId": "user_123456789",
  "userId": "guest_abc123def456"
}
```

**成功响应**:
```json
{
  "success": true,
  "message": "用户已被踢出房间"
}
```

---

#### POST /zego/dismiss-room - 解散房间（主持人专用）

**说明**: 强制踢出所有用户并解散房间

**请求参数**:
```json
{
  "roomId": "room_1706700000000",
  "hostUserId": "user_123456789"
}
```

**成功响应**:
```json
{
  "success": true,
  "message": "房间已解散，所有用户已被强制踢出"
}
```

---

#### POST /zego/check-room - 检查房间状态（公开接口）

**请求参数**:
```json
{
  "roomId": "room_1706700000000"
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "exists": true,
    "isDismissed": false,
    "hostId": "user_123456789",
    "userCount": 3,
    "users": ["user_123456789", "guest_abc123", "guest_def456"]
  }
}
```

---

#### POST /zego/leave-room - 用户离开房间（公开接口）

**说明**: 支持sendBeacon发送（Content-Type: text/plain）

**请求参数**:
```json
{
  "roomId": "room_1706700000000",
  "userId": "guest_abc123def456"
}
```

---

#### POST /zego/push-teleprompter - 推送提词器内容

**说明**: 主持人向指定参与者推送提词内容

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | ✅ | 房间ID |
| content | string | ✅ | 提词内容（支持多行） |
| targetUserIds | string[] | ❌ | 目标用户ID列表，空则广播 |
| scrollSpeed | number | ❌ | 滚动速度（1-10），默认3 |

**请求示例**:
```json
{
  "roomId": "room_1706700000000",
  "content": "面试问题1：请介绍一下您的工作经历\n\n面试问题2：您有什么特长？\n\n面试问题3：您的期望薪资是多少？",
  "targetUserIds": ["guest_abc123"],
  "scrollSpeed": 3
}
```

---

#### POST /zego/control-teleprompter - 控制提词器

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | ✅ | 房间ID |
| targetUserIds | string[] | ❌ | 目标用户ID列表 |
| action | enum | ✅ | 操作：play/pause/stop/reset |

**action枚举说明**:
| 值 | 说明 |
|-----|------|
| `play` | 开始/继续播放 |
| `pause` | 暂停 |
| `stop` | 停止并重置到开始 |
| `reset` | 重置到开始位置 |

---

#### POST /zego/quick-start-teleprompter - 一键启动提词器

**说明**: 推送内容并自动开始播放

**请求参数**:
```json
{
  "roomId": "room_1706700000000",
  "content": "提词内容...",
  "targetUserIds": ["guest_abc123"],
  "scrollSpeed": 3,
  "autoPlay": true
}
```

---

#### POST /zego/get-teleprompter - 获取提词器消息（轮询）

**请求参数**:
```json
{
  "roomId": "room_1706700000000",
  "userId": "guest_abc123",
  "lastTimestamp": 1706700000000
}
```

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "type": "content",
      "content": "提词内容...",
      "scrollSpeed": 3,
      "timestamp": 1706700001000
    },
    {
      "type": "control",
      "action": "play",
      "timestamp": 1706700002000
    }
  ]
}
```

---

#### POST /zego/remote-control - 远程控制设备

**说明**: 主持人远程控制参与者的摄像头/麦克风

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | ✅ | 房间ID |
| hostUserId | string | ✅ | 主持人ZEGO用户ID |
| targetUserId | string | ✅ | 目标用户ZEGO ID |
| controlType | enum | ✅ | camera/microphone |
| enabled | boolean | ✅ | true开启/false关闭 |

**请求示例**:
```json
{
  "roomId": "room_1706700000000",
  "hostUserId": "user_123456789",
  "targetUserId": "guest_abc123",
  "controlType": "camera",
  "enabled": false
}
```

---

### 4.8 文件上传接口 (/upload)

#### 模块概述

文件上传模块集成腾讯云COS对象存储，提供图片、视频文件的上传、获取、删除功能，支持视频自动转码。

#### 支持的文件类型

| 类型标识 | 中文名称 | 用途 | 最大数量 |
|----------|----------|------|----------|
| `idCardFront` | 身份证正面 | 简历身份证正面照 | 1 |
| `idCardBack` | 身份证反面 | 简历身份证反面照 | 1 |
| `personalPhoto` | 个人照片 | 简历形象照 | 30 |
| `certificate` | 证书照片 | 资质证书 | 30 |
| `report` | 报告文件 | 一般报告 | - |
| `medicalReport` | 体检报告 | 健康证明 | 10 |
| `confinementMealPhoto` | 月子餐照片 | 展示月子餐制作能力 | 30 |
| `cookingPhoto` | 烹饪照片 | 展示烹饪能力 | 30 |
| `complementaryFoodPhoto` | 辅食照片 | 展示辅食制作能力 | 30 |
| `positiveReviewPhoto` | 好评照片 | 客户好评截图 | 30 |
| `workExperiencePhoto` | 工作经历照片 | 工作经历证明 | 30 |
| `banner` | Banner图片 | 小程序轮播图 | - |
| `article` | 文章图片 | 文章配图 | - |
| `selfIntroductionVideo` | 自我介绍视频 | 简历视频介绍 | 1 |

#### 文件限制详解

**图片文件**:
| 项目 | 限制 |
|------|------|
| 最大大小 | 5MB |
| 支持格式 | jpg, jpeg, png, webp, pdf |
| 验证方式 | 扩展名 + MIME类型 |

**视频文件**:
| 项目 | 限制 |
|------|------|
| 最大大小 | 50MB（转码前） |
| 支持格式 | mp4, mov, avi, wmv, webm, mpeg, 3gpp |
| 输出格式 | H.264 MP4（自动转码） |
| 转码规格 | 720p, 30fps, AAC音频 |

---

#### POST /upload/file - 上传图片文件

**请求格式**: `multipart/form-data`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | ✅ | 图片文件（最大5MB） |
| type | string | ✅ | 文件类型标识 |

**cURL示例**:
```bash
curl -X POST 'https://crm.andejiazheng.com/api/upload/file' \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@/path/to/image.jpg' \
  -F 'type=personalPhoto'
```

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://your-bucket.cos.ap-guangzhou.myqcloud.com/resume/photos/1706700000000_abc123.jpg",
    "filename": "photo.jpg",
    "mimeType": "image/jpeg",
    "size": 102400
  }
}
```

**错误响应**:
| HTTP状态 | 错误类型 | 错误信息 | 原因 |
|----------|----------|----------|------|
| 400 | VALIDATION_FAILED | 无效的文件类型 | type参数不在允许列表中 |
| 400 | FILE_TOO_LARGE | 文件大小超过限制 | 文件超过5MB |
| 400 | INVALID_FILE_TYPE | 不支持的文件格式 | 格式不在jpg/jpeg/png/webp/pdf中 |
| 400 | UPLOAD_FAILED | 文件上传失败 | COS上传失败 |

---

#### POST /upload/video - 上传视频文件

**说明**: 上传视频到腾讯云COS，自动转码为H.264格式

**请求格式**: `multipart/form-data`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | ✅ | 视频文件（最大50MB） |
| type | string | ✅ | 目前仅支持: selfIntroductionVideo |

**支持的视频MIME类型**:
```
video/mp4
video/quicktime
video/x-msvideo
video/x-ms-wmv
video/webm
video/mpeg
video/3gpp
```

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://your-bucket.cos.ap-guangzhou.myqcloud.com/resume/videos/1706700000000_abc123.mp4",
    "filename": "self_introduction_transcoded.mp4",
    "originalFilename": "video.mov",
    "mimeType": "video/mp4",
    "size": 5242880,
    "originalSize": 10485760
  }
}
```

**转码流程**:
1. 接收原始视频文件
2. 使用FFmpeg转码为H.264格式
3. 输出参数: 720p, 30fps, AAC音频
4. 上传转码后的文件到COS
5. 返回新文件URL

---

#### GET /upload/file/:fileUrl - 获取文件

**说明**: 通过文件URL获取文件，返回307重定向到COS签名URL

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| fileUrl | string | URL编码后的文件URL |

**响应**:
- 状态码: 307 Temporary Redirect
- Location: COS签名URL（有效期1小时）
- Cache-Control: max-age=31536000

**错误响应**:
| HTTP状态 | 错误类型 | 说明 |
|----------|----------|------|
| 404 | FILE_NOT_FOUND | 文件不存在 |
| 400 | DOWNLOAD_FAILED | 获取文件失败 |

---

#### DELETE /upload/file/:fileUrl - 删除文件

**说明**: 通过文件URL删除COS上的文件

**成功响应**:
```json
{
  "success": true,
  "message": "文件删除成功"
}
```

---

### 4.9 保险接口 (/dashubao)

#### 模块概述

大树保保险模块提供完整的家政人员保险服务，包括投保、查询、退保、发票等功能。

#### 保单数据模型

```typescript
// 保单实体 (insurance_policies collection)
interface InsurancePolicy {
  _id: ObjectId;                    // MongoDB文档ID
  agencyPolicyRef: string;          // 渠道流水号（唯一标识）
  policyNo?: string;                // 大树保保单号
  orderId?: string;                 // 大树保订单ID
  productCode?: string;             // 产品代码
  planCode: string;                 // 计划代码
  issueDate?: string;               // 出单日期
  effectiveDate: string;            // 生效日期 (yyyyMMddHHmmss)
  expireDate: string;               // 结束日期 (yyyyMMddHHmmss)
  groupSize: number;                // 被保险人数量
  totalPremium: number;             // 总保费（元）
  status: PolicyStatus;             // 保单状态
  policyHolder: PolicyHolder;       // 投保人信息
  insuredList: InsuredPerson[];     // 被保险人列表
  rebateInfo?: RebateInfo;          // 返佣信息
  policyPdfUrl?: string;            // 电子保单URL
  resumeId?: ObjectId;              // 关联阿姨简历ID
  createdBy?: ObjectId;             // 创建人ID
  createdAt: Date;                  // 创建时间
  updatedAt: Date;                  // 更新时间
}
```

#### 保单状态枚举 (PolicyStatus)

| 状态 | 值 | 说明 | 颜色建议 |
|------|-----|------|----------|
| 待支付 | `pending` | 保单已创建，等待支付 | 橙色 |
| 处理中 | `processing` | 支付成功，等待大树保处理 | 蓝色 |
| 已生效 | `active` | 保单已生效 | 绿色 |
| 已过期 | `expired` | 保单已到期 | 灰色 |
| 已注销 | `cancelled` | 保单已注销（未生效前） | 红色 |
| 已退保 | `surrendered` | 保单已退保（生效后） | 红色 |

#### 投保人类型枚举

| 值 | 说明 |
|-----|------|
| `I` | 个人 (Individual) |
| `C` | 企业/机构 (Company) |

#### 被保险人类型枚举

| 值 | 说明 |
|-----|------|
| `1` | 成人 |
| `2` | 儿童 |
| `3` | 老人 |

#### 证件类型枚举

| 值 | 说明 |
|-----|------|
| `1` | 身份证 |
| `2` | 护照 |
| `3` | 军官证 |
| `4` | 士兵证 |
| `5` | 户口簿 |
| `6` | 港澳通行证 |
| `7` | 台湾通行证 |
| `8` | 其他 |

#### 性别枚举

| 值 | 说明 |
|-----|------|
| `M` | 男 (Male) |
| `F` | 女 (Female) |
| `O` | 其他 (Other) |

---

#### POST /dashubao/policy - 创建保单（投保确认）

**请求参数详解**:

| 字段 | 类型 | 必填 | 验证规则 | 说明 |
|------|------|------|----------|------|
| productCode | string | ❌ | @IsString | 产品代码 |
| planCode | string | ✅ | @IsString @IsNotEmpty | 计划代码 |
| effectiveDate | string | ✅ | @IsString @IsNotEmpty | 生效日期 (yyyyMMddHHmmss) |
| expireDate | string | ✅ | @IsString @IsNotEmpty | 结束日期 (yyyyMMddHHmmss) |
| groupSize | number | ✅ | @IsNumber @Min(1) | 被保险人数量 |
| totalPremium | number | ✅ | @IsNumber @Min(0) | 总保费（元） |
| premiumCalType | string | ❌ | @IsString | 保费计算方式 |
| destination | string | ❌ | @IsString | 目的地 |
| remark | string | ❌ | @IsString | 备注 |
| serviceAddress | string | ❌ | @IsString | 服务地址（工单险必传） |
| workOrderId | string | ❌ | @IsString | 订单编号（工单险必传） |
| policyHolder | PolicyHolderDto | ✅ | @ValidateNested | 投保人信息 |
| insuredList | InsuredPersonDto[] | ✅ | @IsArray @ValidateNested | 被保险人列表 |
| rebateInfo | RebateInfoDto | ❌ | @ValidateNested | 返佣信息 |
| resumeId | string | ❌ | @IsString | 关联阿姨简历ID |

**投保人信息 (PolicyHolderDto)**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| policyHolderType | string | ✅ | 投保人类型: I-个人, C-企业 |
| policyHolderName | string | ✅ | 投保人名称 |
| phIdType | string | ✅ | 证件类型 |
| phIdNumber | string | ✅ | 证件号码 |
| phBirthDate | string | ❌ | 出生日期 (yyyyMMddHHmmss) |
| gender | string | ❌ | 性别: M/F/O |
| phTelephone | string | ❌ | 联系电话 |
| phAddress | string | ❌ | 地址 |
| phPostCode | string | ❌ | 邮编 |
| phEmail | string | ❌ | 邮箱 |
| reqFaPiao | string | ❌ | 是否打印发票: 0-否, 1-是 |
| reqMail | string | ❌ | 是否邮寄发票: 0-否, 1-是 |
| phProvinceCode | string | ❌ | 省级编码（工单险必传） |
| phCityCode | string | ❌ | 市级编码（工单险必传） |
| phDistrictCode | string | ❌ | 区级编码（工单险必传） |

**被保险人信息 (InsuredPersonDto)**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| insuredId | string | ❌ | 被保险人唯一ID |
| insuredName | string | ✅ | 被保险人姓名 |
| insuredType | string | ❌ | 被保险人类型: 1-成人, 2-儿童, 3-老人 |
| idType | string | ✅ | 证件类型 |
| idNumber | string | ✅ | 证件号码 |
| birthDate | string | ✅ | 出生日期 (yyyyMMddHHmmss) |
| gender | string | ✅ | 性别: M-男, F-女, O-其他 |
| mobile | string | ❌ | 联系电话 |
| email | string | ❌ | 电子邮件 |
| occupationCode | string | ❌ | 职业类别代码 |
| occupationName | string | ❌ | 职业类别名称 |
| relationShip | string | ❌ | 与投保人关系: 01-本人, 40-子女等 |

**请求示例**:
```json
{
  "planCode": "JZBX001",
  "effectiveDate": "20250201000000",
  "expireDate": "20250301000000",
  "groupSize": 1,
  "totalPremium": 100.00,
  "policyHolder": {
    "policyHolderType": "I",
    "policyHolderName": "李阿姨",
    "phIdType": "1",
    "phIdNumber": "410102197501011234",
    "phTelephone": "13900139000"
  },
  "insuredList": [
    {
      "insuredName": "李阿姨",
      "idType": "1",
      "idNumber": "410102197501011234",
      "birthDate": "19750101000000",
      "gender": "F",
      "mobile": "13900139000",
      "relationShip": "01"
    }
  ],
  "resumeId": "60d5ec49f1b2c8001f8e4e1a"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "agencyPolicyRef": "ANDEJZ1706700000000",
    "policyNo": "DSB20250131001",
    "status": "pending",
    "wechatPayInfo": {
      "appId": "wx986d99b2dab1b026",
      "timeStamp": "1706700000",
      "nonceStr": "abc123def456",
      "packageValue": "prepay_id=xxx",
      "sign": "...",
      "webUrl": "https://pay.weixin.qq.com/..."
    }
  },
  "message": "保单创建成功"
}
```

---

#### POST /dashubao/policy/query - 查询保单状态

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agencyPolicyRef | string | ❌ | 渠道流水号 |
| policyNo | string | ❌ | 大树保保单号 |

**注**: agencyPolicyRef和policyNo至少填一个

**成功响应**:
```json
{
  "success": true,
  "data": {
    "policyNo": "DSB20250131001",
    "status": "active",
    "effectiveDate": "20250201000000",
    "expireDate": "20250301000000",
    "totalPremium": 100.00,
    "insuredList": [...]
  },
  "message": "查询成功"
}
```

---

#### POST /dashubao/policy/cancel - 注销保单

**说明**: 注销未生效的保单

**请求参数**:
```json
{
  "policyNo": "DSB20250131001"
}
```

**业务规则**:
- 只能注销未生效的保单
- 已生效保单需走退保流程

---

#### POST /dashubao/policy/surrender - 退保

**说明**: 已生效保单退保

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| policyNo | string | ✅ | 保单号 |
| removeReason | string | ✅ | 退保原因 |

**退保原因枚举**:
| 值 | 说明 |
|-----|------|
| `13` | 退票退保 |
| `14` | 航班取消 |
| `15` | 航班改签 |

---

#### POST /dashubao/policy/print - 打印保单PDF

**响应类型**: `application/pdf`

**请求参数**:
```json
{
  "policyNo": "DSB20250131001",
  "reasonRemark": "客户要求打印"
}
```

**响应头**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="policy-DSB20250131001.pdf"
```

---

#### POST /dashubao/policy/invoice - 申请电子发票

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| policyNo | string | ✅ | 保单号 |
| amount | number | ✅ | 开票金额 |
| phone | string | ❌ | 手机号码 |
| mail | string | ❌ | 邮箱 |
| invoiceHead | string | ❌ | 发票抬头 |
| invoiceHeadType | string | ✅ | 抬头类型 |
| invoiceTaxpayerId | string | ❌ | 纳税识别号（企业必传） |

**抬头类型枚举**:
| 值 | 说明 |
|-----|------|
| `01` | 个人 |
| `02` | 公司/企业 |
| `03` | 政府机构 |

---

#### POST /dashubao/policy/payment/:policyRef - 获取支付信息

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| policyRef | string | 渠道流水号 |

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| tradeType | string | MWEB | 支付类型: MWEB/JSAPI |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "webUrl": "https://pay.weixin.qq.com/...",
    "appId": "wx986d99b2dab1b026",
    "timeStamp": "1706700000",
    "nonceStr": "abc123",
    "packageValue": "prepay_id=xxx",
    "sign": "..."
  },
  "message": "获取支付信息成功"
}
```

---

#### POST /dashubao/payment/callback - 支付回调（大树保调用）

**说明**: 大树保支付成功后的回调通知

**请求格式**: XML

**响应**: 成功返回 "OK"

---

#### POST /dashubao/policy/amend - 批改（替换被保险人）

**请求参数**:
```json
{
  "policyNo": "DSB20250131001",
  "oldInsured": {
    "insuredName": "李阿姨",
    "idType": "1",
    "idNumber": "410102197501011234",
    "birthDate": "19750101000000",
    "gender": "F"
  },
  "newInsured": {
    "insuredName": "王阿姨",
    "idType": "1",
    "idNumber": "410102198001011234",
    "birthDate": "19800101000000",
    "gender": "F"
  }
}
```

---

#### POST /dashubao/policy/add-insured - 批增（增加被保险人）

**请求参数**:
```json
{
  "policyNo": "DSB20250131001",
  "totalPremium": 50.00,
  "insuredList": [
    {
      "insuredName": "赵阿姨",
      "idType": "1",
      "idNumber": "410102198501011234",
      "birthDate": "19850101000000",
      "gender": "F"
    }
  ]
}
```

---

#### GET /dashubao/policies - 获取本地保单列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| status | enum | - | 保单状态筛选 |
| resumeId | string | - | 关联简历ID筛选 |
| page | number | 1 | 页码 |
| limit | number | 10 | 每页条数 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "60d5ec49f1b2c8001f8e4e1a",
        "agencyPolicyRef": "ANDEJZ1706700000000",
        "policyNo": "DSB20250131001",
        "planCode": "JZBX001",
        "status": "active",
        "totalPremium": 100.00,
        "effectiveDate": "20250201000000",
        "expireDate": "20250301000000",
        "insuredList": [...]
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  },
  "message": "获取成功"
}
```

---

#### GET /dashubao/policy/:id - 根据ID获取保单详情

---

#### GET /dashubao/policy/by-policy-no/:policyNo - 根据保单号获取

---

#### GET /dashubao/policy/by-policy-ref/:policyRef - 根据渠道流水号获取

---

#### GET /dashubao/policy/rebate/:policyNo - 返佣查询

**成功响应**:
```json
{
  "success": true,
  "data": {
    "policyNo": "DSB20250131001",
    "rebateRate": 0.1,
    "rebateMoney": "10.00",
    "executeDate": "20250301",
    "taskState": "completed"
  },
  "message": "查询成功"
}
```

---

#### POST /dashubao/policy/sync/:policyNo - 同步保单状态

**说明**: 从大树保同步最新保单状态到本地数据库

---

### 4.10 通知接口 (/notifications)

#### 模块概述

通知系统提供实时消息推送，支持WebSocket和HTTP轮询两种方式。

#### 通知状态枚举 (NotificationStatus)

| 状态 | 值 | 说明 |
|------|-----|------|
| 待发送 | `PENDING` | 等待发送 |
| 已发送 | `SENT` | 已成功发送 |
| 已读 | `READ` | 用户已阅读 |
| 发送失败 | `FAILED` | 发送失败 |

#### 通知优先级枚举 (Priority)

| 优先级 | 值 | 说明 |
|--------|-----|------|
| 低 | `LOW` | 普通通知 |
| 中 | `MEDIUM` | 重要通知 |
| 高 | `HIGH` | 紧急通知 |
| 最高 | `URGENT` | 紧急通知（弹窗提醒） |

---

#### GET /notifications - 获取通知列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页条数 |
| status | enum | - | 状态筛选 |
| type | string | - | 类型筛选 |
| unreadOnly | boolean | false | 只看未读 |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "60d5ec49f1b2c8001f8e4e1a",
        "type": "CUSTOMER_ASSIGNED",
        "title": "新客户分配",
        "content": "已为您分配新客户:张三",
        "priority": "HIGH",
        "status": "SENT",
        "data": {
          "customerId": "60d5ec49f1b2c8001f8e4e1b",
          "customerName": "张三"
        },
        "actionUrl": "/customers/60d5ec49f1b2c8001f8e4e1b",
        "actionText": "查看详情",
        "sentAt": "2025-01-31T10:30:00.000Z",
        "createdAt": "2025-01-31T10:30:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "unreadCount": 5
  },
  "message": "获取通知列表成功"
}
```

---

#### GET /notifications/unread-count - 获取未读数量

**成功响应**:
```json
{
  "success": true,
  "data": {
    "count": 5
  },
  "message": "获取未读数量成功"
}
```

---

#### PUT /notifications/mark-read - 标记通知为已读

**请求参数**:
```json
{
  "notificationIds": ["60d5ec49f1b2c8001f8e4e1a", "60d5ec49f1b2c8001f8e4e1b"]
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "count": 2
  },
  "message": "成功标记 2 条通知为已读"
}
```

---

#### PUT /notifications/mark-all-read - 标记全部已读

**成功响应**:
```json
{
  "success": true,
  "data": {
    "count": 15
  },
  "message": "成功标记 15 条通知为已读"
}
```

---

### 4.11 其他接口详解

#### 4.11.1 仪表盘统计 (/dashboard)

##### GET /dashboard/statistics - 获取统计概览

**成功响应**:
```json
{
  "success": true,
  "data": {
    "customers": {
      "total": 1500,
      "new": 50,
      "matching": 200,
      "interviewed": 80,
      "signed": 120,
      "lost": 30
    },
    "resumes": {
      "total": 500,
      "active": 350,
      "available": 200
    },
    "contracts": {
      "total": 800,
      "active": 150,
      "signing": 20,
      "draft": 10,
      "monthlyNew": 25
    },
    "revenue": {
      "totalServiceFee": 500000,
      "monthlyServiceFee": 50000,
      "averageServiceFee": 6250
    },
    "conversion": {
      "leadToSigned": 8.5,
      "interviewToSigned": 60.0
    }
  },
  "message": "获取统计概览成功"
}
```

##### GET /dashboard/trends - 获取趋势数据

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| period | enum | month | week/month/quarter/year |
| startDate | string | - | 开始日期 (YYYY-MM-DD) |
| endDate | string | - | 结束日期 (YYYY-MM-DD) |

**成功响应**:
```json
{
  "success": true,
  "data": {
    "labels": ["2025-01-01", "2025-01-08", "2025-01-15", "2025-01-22", "2025-01-29"],
    "datasets": {
      "newCustomers": [12, 15, 18, 20, 25],
      "signedContracts": [5, 8, 6, 10, 12],
      "revenue": [30000, 48000, 36000, 60000, 72000]
    }
  },
  "message": "获取趋势数据成功"
}
```

---

#### 4.11.2 文章管理 (/article)

##### POST /article - 创建文章

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 文章标题 |
| content | string | ✅ | 文章内容(HTML) |
| summary | string | ❌ | 摘要 |
| coverImage | string | ❌ | 封面图URL |
| category | string | ❌ | 分类 |
| tags | string[] | ❌ | 标签列表 |
| status | enum | ❌ | draft/published |
| publishAt | Date | ❌ | 定时发布时间 |

##### GET /article - 获取文章列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 10 | 每页条数 |
| category | string | - | 分类筛选 |
| status | enum | - | 状态筛选 |
| search | string | - | 标题搜索 |

---

#### 4.11.3 Banner管理 (/banner)

##### POST /banner - 创建Banner

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | Banner标题 |
| imageUrl | string | ✅ | 图片URL |
| linkUrl | string | ❌ | 点击跳转URL |
| linkType | enum | ❌ | none/article/external |
| articleId | string | ❌ | 关联文章ID |
| sort | number | ❌ | 排序权重 |
| isActive | boolean | ❌ | 是否启用 |
| startDate | Date | ❌ | 开始展示日期 |
| endDate | Date | ❌ | 结束展示日期 |

---

#### 4.11.4 线索管理 (/training-leads)

##### POST /training-leads - 创建线索

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 姓名 |
| phone | string | ✅ | 手机号 |
| leadSource | enum | ❌ | 线索来源 |
| currentStage | enum | ❌ | 当前阶段 |
| learningIntention | enum | ❌ | 学习意向 |
| nativePlace | string | ❌ | 籍贯 |
| age | number | ❌ | 年龄 |
| remarks | string | ❌ | 备注 |

##### POST /training-leads/assign - 分配线索

**请求参数**:
```json
{
  "leadIds": ["60d5ec49f1b2c8001f8e4e1a"],
  "assigneeId": "60d5ec49f1b2c8001f8e4e1b"
}
```

##### POST /training-leads/transfer - 转移线索

**请求参数**:
```json
{
  "leadIds": ["60d5ec49f1b2c8001f8e4e1a"],
  "fromUserId": "60d5ec49f1b2c8001f8e4e1b",
  "toUserId": "60d5ec49f1b2c8001f8e4e1c",
  "reason": "员工离职"
}
```

##### GET /training-leads/pool - 线索公海池

**说明**: 获取未分配或被回收的线索

---

#### 4.11.5 OCR识别 (/ocr)

##### POST /ocr/id-card - 身份证OCR识别

**请求格式**: `multipart/form-data`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | File | ✅ | 身份证图片 |
| side | enum | ❌ | front/back，默认自动识别 |

**成功响应**（正面）:
```json
{
  "success": true,
  "data": {
    "name": "张三",
    "sex": "男",
    "nation": "汉",
    "birth": "1990/01/01",
    "address": "浙江省杭州市...",
    "idNum": "330102199001011234"
  },
  "message": "识别成功"
}
```

**成功响应**（反面）:
```json
{
  "success": true,
  "data": {
    "authority": "杭州市公安局",
    "validDate": "2020.01.01-2040.01.01"
  },
  "message": "识别成功"
}
```

---

#### 4.11.6 用户管理 (/users)

##### POST /users - 创建用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名（登录账号） |
| password | string | ✅ | 密码（最少6位） |
| name | string | ✅ | 姓名 |
| phone | string | ❌ | 手机号 |
| email | string | ❌ | 邮箱 |
| role | string | ❌ | 角色ID |
| isActive | boolean | ❌ | 是否启用 |

##### GET /users - 获取用户列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 10 | 每页条数 |
| search | string | - | 用户名/姓名搜索 |
| isActive | boolean | - | 是否启用 |

##### GET /users/assignable - 获取可分配用户列表

**说明**: 获取可以被分配客户/线索的用户列表

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c8001f8e4e1a",
      "username": "zhangsan",
      "name": "张三",
      "customerCount": 50
    }
  ],
  "message": "获取成功"
}
```

---

#### 4.11.7 角色管理 (/roles)

##### GET /roles - 获取角色列表

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c8001f8e4e1a",
      "name": "admin",
      "displayName": "管理员",
      "permissions": ["customer:read", "customer:write", "resume:read", "resume:write"]
    },
    {
      "_id": "60d5ec49f1b2c8001f8e4e1b",
      "name": "sales",
      "displayName": "销售顾问",
      "permissions": ["customer:read", "customer:write"]
    }
  ],
  "message": "获取角色列表成功"
}
```

---

### 4.12 WebSocket接口 (/socket.io)

#### 连接方式

```javascript
import { io } from 'socket.io-client';

const socket = io('https://crm.andejiazheng.com', {
  transports: ['websocket'],
  auth: {
    token: 'Bearer <jwt_token>'
  }
});

socket.on('connect', () => {
  console.log('连接成功');
});

socket.on('notification', (data) => {
  console.log('收到通知:', data);
});
```

#### 事件列表

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `connect` | 客户端→服务端 | 连接建立 |
| `disconnect` | 客户端→服务端 | 连接断开 |
| `notification` | 服务端→客户端 | 推送通知 |
| `customer:created` | 服务端→客户端 | 新客户创建 |
| `customer:assigned` | 服务端→客户端 | 客户分配通知 |
| `contract:signed` | 服务端→客户端 | 合同签署完成 |
| `resume:status_changed` | 服务端→客户端 | 简历状态变更 |

#### 通知数据结构

```typescript
interface NotificationEvent {
  id: string;           // 通知ID
  type: string;         // 通知类型
  title: string;        // 标题
  content: string;      // 内容
  priority: string;     // 优先级
  data?: object;        // 附加数据
  actionUrl?: string;   // 跳转URL
  timestamp: string;    // 时间戳
}
```

---

### 4.13 全局错误码列表

#### HTTP状态码说明

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 200 | 成功 | 请求处理成功 |
| 201 | 创建成功 | 资源创建成功 |
| 400 | 请求错误 | 参数验证失败、业务规则不允许 |
| 401 | 未授权 | Token无效、过期或缺失 |
| 403 | 禁止访问 | 无权限访问该资源 |
| 404 | 未找到 | 资源不存在 |
| 409 | 冲突 | 数据重复、状态冲突 |
| 422 | 实体无法处理 | 业务逻辑错误 |
| 500 | 服务器错误 | 系统内部错误 |
| 502 | 网关错误 | 上游服务不可用 |
| 503 | 服务不可用 | 服务正在维护 |

#### 业务错误码详解

##### 认证相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| AUTH_TOKEN_MISSING | 缺少认证Token | 在请求头添加Authorization |
| AUTH_TOKEN_INVALID | Token无效 | 重新登录获取新Token |
| AUTH_TOKEN_EXPIRED | Token已过期 | 重新登录获取新Token |
| AUTH_USER_DISABLED | 用户已禁用 | 联系管理员 |
| AUTH_PERMISSION_DENIED | 权限不足 | 申请相应权限 |

##### 客户相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| CUSTOMER_NOT_FOUND | 客户不存在 | 检查客户ID |
| CUSTOMER_PHONE_EXISTS | 手机号已存在 | 使用其他手机号 |
| CUSTOMER_ALREADY_ASSIGNED | 客户已被分配 | - |
| CUSTOMER_IN_PUBLIC_POOL | 客户在公海中 | 先领取再操作 |

##### 简历相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| RESUME_NOT_FOUND | 简历不存在 | 检查简历ID |
| RESUME_PHONE_EXISTS | 手机号已存在 | 使用其他手机号 |
| RESUME_ID_NUMBER_EXISTS | 身份证号已存在 | 检查身份证号 |
| RESUME_UNAVAILABLE | 阿姨不可用 | 检查档期状态 |

##### 合同相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| CONTRACT_NOT_FOUND | 合同不存在 | 检查合同ID |
| CONTRACT_ALREADY_SIGNED | 合同已签署 | - |
| CONTRACT_CANCELLED | 合同已作废 | - |
| CONTRACT_WORKER_CHANGE_FAILED | 换人失败 | 检查原合同状态 |
| CONTRACT_DATE_INVALID | 日期无效 | 结束日期必须大于开始日期 |

##### 电子签约相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| ESIGN_CONTRACT_NOT_FOUND | 爵签合同不存在 | 检查合同编号 |
| ESIGN_CREATE_FAILED | 创建签约失败 | 检查模板和参数 |
| ESIGN_SIGN_FAILED | 签署失败 | 检查签署链接是否过期 |
| ESIGN_TEMPLATE_NOT_FOUND | 模板不存在 | 检查模板编号 |

##### 文件上传相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| FILE_TOO_LARGE | 文件过大 | 压缩文件后重试 |
| FILE_TYPE_INVALID | 文件类型无效 | 使用支持的格式 |
| FILE_NOT_FOUND | 文件不存在 | 检查文件URL |
| UPLOAD_FAILED | 上传失败 | 重试或检查网络 |
| DELETE_FAILED | 删除失败 | 检查文件是否存在 |

##### 保险相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| POLICY_NOT_FOUND | 保单不存在 | 检查保单号 |
| POLICY_ALREADY_CANCELLED | 保单已注销 | - |
| POLICY_NOT_ACTIVE | 保单未生效 | 检查保单状态 |
| PAYMENT_FAILED | 支付失败 | 重试支付 |
| SURRENDER_FAILED | 退保失败 | 检查退保条件 |

##### 视频面试相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| ROOM_NOT_FOUND | 房间不存在 | 检查房间ID |
| ROOM_ENDED | 房间已结束 | 创建新的面试间 |
| ROOM_DISMISSED | 房间已解散 | 创建新的面试间 |
| CANNOT_JOIN_ROOM | 无法加入房间 | 检查房间状态 |
| KICK_FAILED | 踢出用户失败 | 检查是否为主持人 |
| DISMISS_FAILED | 解散房间失败 | 检查是否为主持人 |

---

### 4.14 API调用示例

#### JavaScript/TypeScript示例

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://crm.andejiazheng.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加认证拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 登录
async function login(username: string, password: string) {
  const response = await api.post('/auth/login', { username, password });
  if (response.data.success) {
    localStorage.setItem('token', response.data.data.token);
  }
  return response.data;
}

// 获取客户列表
async function getCustomers(page = 1, limit = 10) {
  const response = await api.get('/customers', { params: { page, limit } });
  return response.data;
}

// 创建简历
async function createResume(formData: FormData) {
  const response = await api.post('/resumes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

// 创建合同并发起签约
async function createAndSignContract(contractData: any) {
  // 1. 创建合同
  const contractRes = await api.post('/contracts', contractData);
  const contractId = contractRes.data.data._id;
  
  // 2. 发起签约
  const esignRes = await api.post('/esign/create-contract-flow', {
    contractName: '服务合同',
    templateNo: 'TPL001',
    templateParams: contractData,
    signers: [
      { name: contractData.customerName, mobile: contractData.customerPhone, idCard: contractData.customerIdCard },
      { name: contractData.workerName, mobile: contractData.workerPhone, idCard: contractData.workerIdCard }
    ]
  });
  
  return {
    contract: contractRes.data,
    esign: esignRes.data
  };
}
```

#### cURL示例

```bash
# 登录
curl -X POST 'https://crm.andejiazheng.com/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "123456"}'

# 获取客户列表
curl -X GET 'https://crm.andejiazheng.com/api/customers?page=1&limit=10' \
  -H 'Authorization: Bearer <token>'

# 上传文件
curl -X POST 'https://crm.andejiazheng.com/api/upload/file' \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@/path/to/image.jpg' \
  -F 'type=personalPhoto'

# 创建合同
curl -X POST 'https://crm.andejiazheng.com/api/contracts' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "customerName": "张三",
    "customerPhone": "13800138000",
    "workerName": "李阿姨",
    "workerPhone": "13900139000",
    "workerIdCard": "410102197501011234",
    "contractType": "月嫂",
    "startDate": "2025-03-01",
    "endDate": "2025-04-30",
    "workerSalary": 15000,
    "customerServiceFee": 2000
  }'
```

#### 仪表盘统计 (/dashboard)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /dashboard/statistics | 获取统计概览 |
| GET | /dashboard/trends | 获取趋势数据 |

#### 文章管理 (/article)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /article | 获取文章列表 |
| POST | /article | 创建文章 |
| GET | /article/:id | 获取文章详情 |
| PUT | /article/:id | 更新文章 |
| DELETE | /article/:id | 删除文章 |

#### Banner管理 (/banner)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /banner | 获取Banner列表 |
| POST | /banner | 创建Banner |
| PUT | /banner/:id | 更新Banner |
| DELETE | /banner/:id | 删除Banner |

#### 线索管理 (/training-leads)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /training-leads | 获取线索列表 |
| POST | /training-leads | 创建线索 |
| POST | /training-leads/assign | 分配线索 |
| POST | /training-leads/transfer | 转移线索 |
| GET | /training-leads/pool | 线索公海池 |

#### OCR识别 (/ocr)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /ocr/id-card | 身份证OCR识别 |

#### 用户管理 (/users)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /users | 获取用户列表 |
| POST | /users | 创建用户 |
| GET | /users/:id | 获取用户详情 |
| PUT | /users/:id | 更新用户 |
| DELETE | /users/:id | 删除用户 |

#### 角色管理 (/roles)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /roles | 获取角色列表 |
| POST | /roles | 创建角色 |

---

> **提示**: 更完整的API文档请访问 Swagger: https://crm.andejiazheng.com/api/docs

---

## 五、第三方服务集成

### 5.1 爱签电子签约 (esign)

#### 集成概述
爱签是一个专业的电子合同签署平台，提供在线合同创建、签署、存证服务。

#### 配置参数
| 参数 | 环境变量 | 说明 |
|--------|----------|------|
| AppID | `ESIGN_APP_ID` | 爱签应用ID |
| 私钥 | `ESIGN_PRIVATE_KEY` | RSA私钥 |
| 公钥 | `ESIGN_PUBLIC_KEY` | 爱签提供的公钥 |
| API地址 | `ESIGN_HOST` | https://oapi.asign.cn |
| 回调地址 | `ESIGN_NOTIFY_URL` | 签约状态回调 |

#### 主要接口
| 接口 | 说明 |
|------|------|
| 创建签约流程 | 创建合同并发起签约 |
| 查询签约状态 | 获取合同签署状态 |
| 下载合同 | 下载签署完成的PDF |
| 预览合同 | 获取合同预览链接 |
| 撤销签约 | 撤销进行中的签约流程 |

#### 签约状态码
| 状态码 | 说明 |
|--------|------|
| 0 | 待签约 |
| 1 | 签约中 |
| 2 | 已完成 |
| 3 | 已撤销 |
| 4 | 已作废 |

---

### 5.2 大树保保险 (dashubao)

#### 集成概述
大树保是家政行业专业保险平台，提供家政人员意外险、责任险等保险产品。

#### 配置参数
| 参数 | 环境变量 | 说明 |
|--------|----------|------|
| AppKey | `DASHUBAO_APP_KEY` | 应用Key |
| AppSecret | `DASHUBAO_APP_SECRET` | 应用密钥 |
| API地址 | `DASHUBAO_API_URL` | 接口地址 |

#### 主要接口
| 接口 | 说明 |
|------|------|
| 产品查询 | 获取可用保险产品列表 |
| 创建投保 | 为家政人员投保 |
| 查询保单 | 查询保单状态和详情 |
| 退保申请 | 申请保单退保 |

#### 保单状态
| 状态 | 说明 |
|------|------|
| pending | 待支付 |
| processing | 处理中 |
| active | 已生效 |
| expired | 已过期 |
| cancelled | 已注销 |
| surrendered | 已退保 |

---

### 5.3 ZEGO即构音视频

#### 集成概述
ZEGO即构提供实时音视频通话SDK，用于实现客户与阿姨的视频面试功能。

#### 配置参数
| 参数 | 环境变量 | 说明 |
|--------|----------|------|
| AppID | `ZEGO_APP_ID` | ZEGO应用ID |
| ServerSecret | `ZEGO_SERVER_SECRET` | 服务端密钥 |

#### 技术特性
- **实时视频**: 支持720P/1080P视频通话
- **多人通话**: 支持主持人+多个访客
- **智能美颜**: 内置美颜、滤镜效果
- **提词器**: 面试问题提示功能

#### 业务流程
1. 主持人创建面试间 → 获取roomId
2. 生成访客邀请链接 → 分享给客户/阿姨
3. 访客通过链接加入 → 开始视频面试
4. 主持人关闭面试间 → 结束面试

---

### 5.4 腾讯云服务

#### 对象存储 (COS)
| 参数 | 环境变量 | 说明 |
|--------|----------|------|
| SecretId | `TENCENT_SECRET_ID` | 访问ID |
| SecretKey | `TENCENT_SECRET_KEY` | 访问密钥 |
| Bucket | `COS_BUCKET` | 存储桶名称 |
| Region | `COS_REGION` | 地域 (ap-guangzhou) |

**存储分类**:
- `/resume/photos/` - 简历照片
- `/resume/videos/` - 简历视频
- `/resume/certificates/` - 证书照片
- `/article/images/` - 文章图片
- `/banner/` - Banner图片

#### OCR识别
| 功能 | 说明 |
|------|------|
| 身份证OCR | 识别身份证正反面信息 |
| 通用文字OCR | 识别证书文字内容 |

---

## 六、部署运维

### 6.1 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.x | 运行时环境 |
| MongoDB | >= 6.x | 数据库 |
| PM2 | >= 5.x | 进程管理 |
| Nginx | >= 1.18 | 反向代理 |
| Git | >= 2.x | 版本控制 |

### 6.2 完整环境变量配置

创建 `backend/.env` 文件：

```bash
# ====== 基础配置 ======
NODE_ENV=production
PORT=3000

# ====== 数据库配置 ======
MONGODB_URI=mongodb://localhost:27017/housekeeping
# 或使用认证连接
MONGODB_URI=mongodb://username:password@localhost:27017/housekeeping?authSource=admin

# ====== JWT认证 ======
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
JWT_EXPIRES_IN=7d

# ====== 爱签电子签约 ======
ESIGN_APP_ID=your-esign-app-id
ESIGN_HOST=https://oapi.asign.cn
ESIGN_PRIVATE_KEY=MIIEvQIBADANBgkqhkiG9w0BAQEFA...
ESIGN_PUBLIC_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOC...
ESIGN_NOTIFY_URL=https://crm.andejiazheng.com/api/esign/callback

# ====== 大树保保险 ======
DASHUBAO_APP_KEY=your-dashubao-app-key
DASHUBAO_APP_SECRET=your-dashubao-app-secret
DASHUBAO_API_URL=https://api.dashubao.com

# ====== ZEGO音视频 ======
ZEGO_APP_ID=your-zego-app-id
ZEGO_SERVER_SECRET=your-zego-server-secret

# ====== 腾讯云COS对象存储 ======
TENCENT_SECRET_ID=your-tencent-secret-id
TENCENT_SECRET_KEY=your-tencent-secret-key
COS_BUCKET=your-bucket-name-1234567890
COS_REGION=ap-guangzhou
COS_BASE_URL=https://your-bucket.cos.ap-guangzhou.myqcloud.com

# ====== 腾讯云OCR ======
OCR_SECRET_ID=your-ocr-secret-id
OCR_SECRET_KEY=your-ocr-secret-key

# ====== 微信配置 ======
WECHAT_APPID=your-wechat-appid
WECHAT_APPSECRET=your-wechat-appsecret
WECHAT_TOKEN=andejiazheng2025

# ====== 小程序API认证 ======
MINIPROGRAM_API_TOKEN=your-miniprogram-api-token

# ====== 日志配置 ======
LOG_LEVEL=info
LOG_DIR=../logs
```

### 6.3 PM2详细配置

`ecosystem.config.js` 完整配置：

```javascript
module.exports = {
  apps: [
    {
      // 生产环境后端服务
      name: 'backend-prod',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/andejiazhengcrm/backend',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 进程配置
      instances: 1,              // 实例数量
      exec_mode: 'fork',         // 执行模式: fork/cluster
      max_memory_restart: '500M', // 内存限制重启
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '../logs/backend-prod-error.log',
      out_file: '../logs/backend-prod-out.log',
      merge_logs: true,
      
      // 重启策略
      autorestart: true,         // 自动重启
      watch: false,              // 文件监听
      max_restarts: 10,          // 最大重启次数
      min_uptime: '10s',         // 最小运行时间
      restart_delay: 4000,       // 重启延迟(ms)
      
      // 环境文件
      env_file: '.env'
    },
    {
      // 开发环境后端服务
      name: 'backend-dev',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/andejiazhengcrm/backend',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true
    }
  ]
};
```

#### PM2常用命令

```bash
# 启动服务
pm2 start ecosystem.config.js
pm2 start ecosystem.config.js --only backend-prod

# 停止服务
pm2 stop all
pm2 stop backend-prod

# 重启服务
pm2 restart all
pm2 reload backend-prod  # 无缝重启

# 查看状态
pm2 list
pm2 status
pm2 monit               # 实时监控

# 查看日志
pm2 logs
pm2 logs backend-prod --lines 100
pm2 logs --json          # JSON格式

# 保存进程列表
pm2 save
pm2 startup              # 设置开机自启

# 清理
pm2 delete all
pm2 flush                # 清空日志
```

### 6.4 Nginx完整配置

`/etc/nginx/sites-available/crm.andejiazheng.com` 完整配置：

```nginx
# 上游后端服务器配置
upstream backend_api {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# 上游前端服务器配置
upstream frontend_app {
    server 127.0.0.1:4173 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP重定向到HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name crm.andejiazheng.com;
    
    # 允许Let's Encrypt验证
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # 其他请求重定向到HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name crm.andejiazheng.com;
    
    # SSL证书配置
    ssl_certificate /path/to/crm.andejiazheng.com_bundle.crt;
    ssl_certificate_key /path/to/crm.andejiazheng.com.key;
    
    # SSL优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # 安全头部
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 日志配置
    access_log /var/log/nginx/crm_access.log;
    error_log /var/log/nginx/crm_error.log warn;
    
    # 客户端上传限制
    client_max_body_size 50M;
    client_body_buffer_size 128k;
    client_body_timeout 60s;
    
    # 后端API代理
    location /api/ {
        proxy_pass http://backend_api/api/;
        proxy_http_version 1.1;
        
        # 连接保持
        proxy_set_header Connection "";
        proxy_set_header Upgrade $http_upgrade;
        
        # 请求头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # WebSocket支持
    location /socket.io/ {
        proxy_pass http://backend_api/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket超时设置 (长连接)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # 前端静态资源
    location / {
        proxy_pass http://frontend_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 支持HTML5 History模式
        proxy_intercept_errors on;
        error_page 404 = @fallback;
    }
    
    # HTML5 History模式回退
    location @fallback {
        proxy_pass http://frontend_app;
    }
    
    # 静态资源缓存优化
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

#### Nginx常用命令

```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo nginx -s reload

# 启动/停止
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
tail -f /var/log/nginx/crm_access.log
tail -f /var/log/nginx/crm_error.log
```

### 6.5 快速部署

#### 新环境部署步骤

```bash
# 1. 克隆代码
git clone <repo-url>
cd andejiazhengcrm

# 2. 安装后端依赖
cd backend
npm install
cp .env.example .env
# 编辑.env配置环境变量

# 3. 构建后端
npm run build

# 4. 安装前端依赖
cd ../frontend
npm install

# 5. 构建前端
npm run build

# 6. 启动服务
cd ..
./scripts/manage.sh start
```

#### 更新部署步骤

```bash
# 方式1: 使用管理脚本
./scripts/manage.sh deploy

# 方式2: 手动操作
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart all

# 方式3: 快速重启（不重新构建）
pm2 restart all
```

### 6.6 管理命令

#### 统一管理脚本 (scripts/manage.sh)

```bash
# 启动所有服务
./scripts/manage.sh start

# 停止所有服务
./scripts/manage.sh stop

# 重启所有服务
./scripts/manage.sh restart

# 查看服务状态
./scripts/manage.sh status

# 查看日志
./scripts/manage.sh logs
./scripts/manage.sh logs backend-prod

# 清理冗余进程和旧日志
./scripts/manage.sh clean

# 构建前后端
./scripts/manage.sh build

# 完整部署（构建+重启）
./scripts/manage.sh deploy
```

### 6.7 服务端口分配

| 服务 | 端口 | 说明 | 访问方式 |
|------|------|------|----------|
| 前端生产 | 4173 | Vite preview | 通过Nginx代理 |
| 后端API生产 | 3000 | NestJS API | /api/* |
| 后端API开发 | 3001 | NestJS API (dev) | 直接访问 |
| MongoDB | 27017 | 数据库 | 仅本地 |
| WebSocket | 3000 | Socket.IO | /socket.io/* |

### 6.8 监控与日志

#### 日志文件位置

```
andejiazhengcrm/
├── logs/
│   ├── backend-prod-out.log      # 生产环境输出日志
│   ├── backend-prod-error.log    # 生产环境错误日志
│   ├── backend-dev-out.log       # 开发环境输出日志
│   └── backend-dev-error.log     # 开发环境错误日志
├── /var/log/nginx/
│   ├── crm_access.log            # Nginx访问日志
│   └── crm_error.log             # Nginx错误日志
```

#### 日志查看命令

```bash
# PM2日志
pm2 logs                          # 实时查看所有日志
pm2 logs backend-prod             # 查看指定服务日志
pm2 logs --lines 100              # 查看最后100行
pm2 logs --err                    # 只看错误日志

# Nginx日志
tail -f /var/log/nginx/crm_access.log
tail -f /var/log/nginx/crm_error.log

# 组合查看
tail -f logs/*.log
```

#### 常用监控命令

```bash
# 查看服务状态
pm2 list
pm2 monit                         # 实时监控界面

# 查看系统资源
htop                              # CPU/内存
df -h                             # 磁盘空间
free -h                           # 内存使用

# 查看端口占用
netstat -tlnp | grep -E '3000|4173|27017'
lsof -i :3000

# MongoDB状态
mongosh --eval "db.serverStatus()"
```

#### 常见问题排查

```bash
# 检查服务是否运行
pm2 status

# 检查端口是否监听
curl -I http://localhost:3000/api/health
curl -I http://localhost:4173

# 检查MongoDB连接
mongosh --eval "db.runCommand({ping:1})"

# 检查Nginx配置
sudo nginx -t

# 清理日志放开磁盘
pm2 flush
find logs/ -name "*.log" -mtime +7 -delete
```

### 6.9 备份与恢复

#### 数据库备份

```bash
# 全库备份
mongodump --uri="mongodb://localhost:27017/housekeeping" --out=/backup/$(date +%Y%m%d)

# 单集合备份
mongodump --uri="mongodb://localhost:27017/housekeeping" --collection=customers --out=/backup/customers

# 定时备份 (crontab -e)
0 2 * * * /usr/bin/mongodump --uri="mongodb://localhost:27017/housekeeping" --out=/backup/$(date +\%Y\%m\%d)
```

#### 数据库恢复

```bash
# 全库恢复
mongorestore --uri="mongodb://localhost:27017/housekeeping" /backup/20260131

# 单集合恢复
mongorestore --uri="mongodb://localhost:27017/housekeeping" --collection=customers /backup/customers/housekeeping/customers.bson
```

---

## 6.10 前端集成代码示例与工具函数

> **说明**: 以下是前端集成常用的代码示例和工具函数，可直接复用。

### 6.10.1 Axios 封装与API服务

```typescript
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

// API 基础配置
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? `https://${window.location.hostname}`
  : ''; // 开发环境使用代理

// 创建axios实例
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// 请求拦截器 - 自动添加Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => {
    // blob类型直接返回
    if (response.config.responseType === 'blob') return response;
    
    // 业务错误处理
    if (response.data?.success === false) {
      throw new Error(response.data.message || '请求失败');
    }
    return response.data;
  },
  (error: AxiosError) => {
    // 401未授权 - 跳转登录
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(new Error('认证失败，请重新登录'));
    }
    return Promise.reject(error);
  }
);

// API响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; details?: any };
  timestamp: number;
}

// 封装请求方法
export const apiService = {
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> => 
    api.request({ method: 'GET', url, params }),
  
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> => 
    api.request({ method: 'POST', url, data }),
  
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> => 
    api.request({ method: 'PUT', url, data }),
  
  delete: <T>(url: string): Promise<ApiResponse<T>> => 
    api.request({ method: 'DELETE', url }),
  
  // 文件上传专用
  upload: <T>(url: string, formData: FormData): Promise<ApiResponse<T>> => 
    api.request({
      method: 'POST', url, data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // 健康检查
  checkHealth: async (): Promise<boolean> => {
    try {
      const res = await apiService.get<{status: string}>('/api/health');
      return res.data?.status === 'ok';
    } catch { return false; }
  }
};
```

---

### 6.10.2 统一错误处理工具

```typescript
/**
 * 从错误对象中提取错误消息
 */
export const extractErrorMessage = (
  error: any, 
  defaultMessage: string = '操作失败'
): string => {
  // 1. 从 axios 响应中获取
  const responseData = error?.response?.data;
  if (responseData) {
    if (responseData.message && 
        typeof responseData.message === 'string' && 
        responseData.message !== 'Bad Request') {
      return responseData.message;
    }
    // NestJS验证错误数组
    if (Array.isArray(responseData.message)) {
      return responseData.message.join('; ');
    }
  }

  // 2. 从 Error 对象获取
  if (error?.message && typeof error.message === 'string') {
    const genericMessages = ['Bad Request', 'Request failed', 'Network Error'];
    if (!genericMessages.some(gm => error.message.includes(gm))) {
      return error.message;
    }
  }

  // 3. 字符串错误
  if (typeof error === 'string') return error;

  return defaultMessage;
};

/**
 * 错误类型判断工具函数
 */
export const isNetworkError = (error: any): boolean => 
  error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error');

export const isAuthError = (error: any): boolean => 
  error?.response?.status === 401;

export const isPermissionError = (error: any): boolean => 
  error?.response?.status === 403;

export const isValidationError = (error: any): boolean => 
  error?.response?.status === 400;

/**
 * 统一错误处理 (React 组件中使用)
 */
import { message } from 'antd';

export const handleApiError = (error: any, customMessage?: string) => {
  const msg = customMessage || extractErrorMessage(error);
  
  if (isAuthError(error)) {
    message.error('登录已过期，请重新登录');
    // 跳转登录页由拦截器处理
  } else if (isPermissionError(error)) {
    message.error('无权限执行此操作');
  } else if (isNetworkError(error)) {
    message.error('网络连接失败，请检查网络');
  } else {
    message.error(msg);
  }
};
```

---

### 6.10.3 WebSocket通知服务

```typescript
import { io, Socket } from 'socket.io-client';

// 通知类型定义
interface Notification {
  _id: string;
  type: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'SENT' | 'READ';
  data?: Record<string, any>;
  actionUrl?: string;
  createdAt: string;
}

class NotificationSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * 连接到通知服务器
   */
  connect(token: string) {
    if (this.socket?.connected) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const wsURL = baseURL.replace(/^http/, 'ws');

    this.socket = io(`${wsURL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // 事件监听
    this.socket.on('connect', () => console.log('✅ WebSocket connected'));
    this.socket.on('disconnect', (reason) => console.log('❌ WebSocket disconnected:', reason));
    this.socket.on('connect_error', (error) => console.error('WebSocket error:', error));

    // 通知事件
    this.socket.on('notification', (notification: Notification) => {
      console.log('📬 New notification:', notification);
      this.emit('notification', notification);
    });

    // 未读数量更新
    this.socket.on('unreadCount', (count: number) => {
      console.log('🔔 Unread count:', count);
      this.emit('unreadCount', count);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  requestUnreadCount() {
    if (this.socket?.connected) {
      this.socket.emit('getUnreadCount');
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default new NotificationSocketService();
```

---

### 6.10.4 文件上传工具

```typescript
import { message } from 'antd';
import { apiService } from './api';

// 文件上传配置
const UPLOAD_CONFIG = {
  image: {
    maxSize: 5 * 1024 * 1024,  // 5MB
    acceptTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    errorMessage: '图片大小不能超过5MB'
  },
  video: {
    maxSize: 50 * 1024 * 1024, // 50MB
    acceptTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    errorMessage: '视频大小不能超过50MB'
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    acceptTypes: ['application/pdf'],
    errorMessage: '文档大小不能超过10MB'
  }
};

/**
 * 文件上传前检查
 */
export const validateFile = (
  file: File, 
  type: 'image' | 'video' | 'document'
): boolean => {
  const config = UPLOAD_CONFIG[type];
  
  // 检查文件大小
  if (file.size > config.maxSize) {
    message.error(config.errorMessage);
    return false;
  }
  
  // 检查文件类型
  if (!config.acceptTypes.includes(file.type)) {
    message.error('不支持的文件格式');
    return false;
  }
  
  return true;
};

/**
 * 上传文件到服务器
 */
export const uploadFile = async (
  file: File,
  fieldName: string = 'file',
  additionalData?: Record<string, any>
): Promise<{url: string; filename: string}> => {
  const formData = new FormData();
  formData.append(fieldName, file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  const response = await apiService.upload<{url: string; filename: string}>(
    '/api/upload',
    formData
  );
  
  if (!response.data) {
    throw new Error('上传失败');
  }
  
  return response.data;
};

/**
 * 图片压缩工具 (Canvas)
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('压缩失败')),
          'image/jpeg',
          quality
        );
      };
    };
    reader.onerror = reject;
  });
};
```

---

### 6.10.5 常用枚举定义与映射

```typescript
// 工作类型枚举
export const JOB_TYPE_MAP: Record<string, string> = {
  'yuexin': '月嫂',
  'zhujia-yuer': '住家育儿嫂',
  'baiban-yuer': '白班育儿嫂',
  'baojie': '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  'yangchong': '养宠',
  'xiaoshi': '小时工',
  'zhujia-hulao': '住家护老',
};

// 学历枚举
export const EDUCATION_MAP: Record<string, string> = {
  'no': '无学历',
  'primary': '小学',
  'middle': '初中',
  'secondary': '中专',
  'vocational': '职高',
  'high': '高中',
  'college': '大专',
  'bachelor': '本科',
  'graduate': '研究生',
};

// 月嫂档位枚举
export const MATERNITY_NURSE_LEVEL_MAP: Record<string, {name: string; salary: string}> = {
  'junior': { name: '初级月嫂', salary: '10000-12000' },
  'silver': { name: '银牌月嫂', salary: '12000-15000' },
  'gold': { name: '金牌月嫂', salary: '15000-18000' },
  'platinum': { name: '铂金月嫂', salary: '18000-22000' },
  'diamond': { name: '钻石月嫂', salary: '22000-28000' },
  'crown': { name: '皇冠月嫂', salary: '28000+' },
};

// 技能枚举
export const SKILL_MAP: Record<string, string> = {
  'chanhou': '产后护理',
  'teshu-yinger': '特殊婴儿护理',
  'yiliaobackground': '医疗背景',
  'yuying': '育婴',
  'zaojiao': '早教',
  'fushi': '辅食制作',
  'ertui': '小儿推拿',
  'waiyu': '外语能力',
  'zhongcan': '中餐烹饪',
  'xican': '西餐烹饪',
  'mianshi': '面食制作',
  'jiashi': '驾驶技能',
  'shouyi': '收纳整理',
  'muying': '母婴用品',
  'cuiru': '催乳',
  'yuezican': '月子餐',
  'yingyang': '营养搭配',
  'shuangtai-huli': '双胎护理',
  'yanglao-huli': '养老护理',
};

// 客户状态枚举
export const CONTRACT_STATUS_OPTIONS = [
  { label: '已签约', value: '已签约', color: 'green' },
  { label: '匹配中', value: '匹配中', color: 'blue' },
  { label: '已面试', value: '已面试', color: 'cyan' },
  { label: '流失客户', value: '流失客户', color: 'default' },
  { label: '已退款', value: '已退款', color: 'red' },
  { label: '退款中', value: '退款中', color: 'orange' },
  { label: '待定', value: '待定', color: 'gold' },
];

// 线索等级枚举
export const LEAD_LEVEL_OPTIONS = [
  { label: 'O类', value: 'O类', color: 'red', desc: '超高意向，转化率>80%' },
  { label: 'A类', value: 'A类', color: 'orange', desc: '高意向，转化率60-80%' },
  { label: 'B类', value: 'B类', color: 'gold', desc: '中等意向，转化率30-60%' },
  { label: 'C类', value: 'C类', color: 'blue', desc: '低意向，转化率10-30%' },
  { label: 'D类', value: 'D类', color: 'default', desc: '待定，转化率<10%' },
  { label: '流失', value: '流失', color: 'default', desc: '已流失' },
];

/**
 * 枚举值转换工具函数
 */
export const getJobTypeLabel = (value: string): string => 
  JOB_TYPE_MAP[value] || value;

export const getEducationLabel = (value: string): string => 
  EDUCATION_MAP[value] || value;

export const getSkillLabel = (value: string): string => 
  SKILL_MAP[value] || value;

export const getSkillLabels = (values: string[]): string[] => 
  values.map(v => getSkillLabel(v));
```

---

### 6.10.6 日期和格式化工具

```typescript
import dayjs from 'dayjs';

/**
 * 日期格式化
 */
export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD'): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatRelativeTime = (date: string | Date): string => {
  if (!date) return '-';
  const d = dayjs(date);
  const now = dayjs();
  const diffMinutes = now.diff(d, 'minute');
  
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}小时前`;
  if (diffMinutes < 43200) return `${Math.floor(diffMinutes / 1440)}天前`;
  return d.format('MM-DD HH:mm');
};

/**
 * 金额格式化
 */
export const formatMoney = (amount: number): string => {
  if (amount === undefined || amount === null) return '-';
  return `¥${amount.toLocaleString('zh-CN')}`;
};

/**
 * 手机号脱敏
 */
export const maskPhone = (phone: string): string => {
  if (!phone || phone.length !== 11) return phone || '-';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
};

/**
 * 身份证号脱敏
 */
export const maskIdCard = (idCard: string): string => {
  if (!idCard || idCard.length < 10) return idCard || '-';
  return `${idCard.slice(0, 6)}****${idCard.slice(-4)}`;
};
```

---

### 6.10.7 React Hooks 示例

```typescript
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { apiService, ApiResponse } from '../services/api';
import { extractErrorMessage } from '../utils/errorHandler';

/**
 * 通用分页数据获取Hook
 */
export function usePaginatedData<T>(
  fetchUrl: string,
  initialFilters: Record<string, any> = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState(initialFilters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get<{list: T[]; total: number}>(fetchUrl, {
        page,
        pageSize,
        ...filters
      });
      setData(response.data?.list || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      message.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, page, pageSize, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) setPageSize(newPageSize);
  };

  const handleSearch = (newFilters: Record<string, any>) => {
    setPage(1);
    setFilters({ ...filters, ...newFilters });
  };

  const handleReset = () => {
    setPage(1);
    setFilters(initialFilters);
  };

  return {
    data,
    loading,
    total,
    page,
    pageSize,
    filters,
    refresh: fetchData,
    handlePageChange,
    handleSearch,
    handleReset,
  };
}

/**
 * 通知订阅Hook
 */
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // 导入WebSocket服务
    import('../services/notification-socket.service').then(({ default: socketService }) => {
      const token = localStorage.getItem('token');
      if (token) {
        socketService.connect(token);
        
        socketService.on('unreadCount', setUnreadCount);
        socketService.on('notification', (notification: any) => {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        });
      }
    });

    return () => {
      import('../services/notification-socket.service').then(({ default: socketService }) => {
        socketService.disconnect();
      });
    };
  }, []);

  return { unreadCount, notifications };
}
```

---

## 七、小程序集成

### 7.1 接口说明

小程序通过云函数调用CRM后端API，主要接口：

| 功能 | 接口 | 说明 |
|------|------|------|
| 自助注册 | POST /resume/self-register | 阿姨注册 |
| 简历更新 | PUT /resume/:id | 更新简历 |
| 客户创建 | POST /miniprogram/customers | 创建客户 |
| 文章列表 | GET /article | 获取文章 |
| 阿姨列表 | GET /miniprogram/resumes | 获取阿姨 |

### 7.2 认证方式

小程序使用特殊的API Token认证：
```
X-API-Token: <miniprogram-token>
```

---

## 八、常见问题与错误排查指南

### 8.1 基础操作问题

#### Q1: 如何添加新用户？

**操作步骤**:
1. 登录系统后，进入「系统设置」-「用户管理」
2. 点击右上角「新增用户」按钮
3. 填写用户信息:
   - 用户名: 登录账号，必须唯一
   - 密码: 至少6位字符
   - 姓名: 显示名称
   - 角色: 选择合适的权限角色
4. 点击「保存」

**常见错误**:
| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| 用户名已存在 | 用户名重复 | 更换用户名 |
| 密码不符合要求 | 密码少于6位 | 设置更长密码 |
| 无权限操作 | 非管理员角色 | 联系管理员操作 |

---

#### Q2: 合同签约流程？

**完整流程图**:
```
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│ 创建合同 │─▶│ 发起签约 │─▶│ 客户签署 │─▶│ 阿姨签署 │─▶│ 签署完成 │
│  draft  │   │ signing │   │ 等待中  │   │ 等待中  │   │  active │
└────────┘   └────────┘   └────────┘   └────────┘   └────────┘
```

**详细步骤**:
1. **创建合同** (状态: draft)
   - 填写客户信息: 姓名、手机号、身份证(可选)
   - 填写服务人员信息: 姓名、手机号、身份证
   - 设置合同期限: 开始日期、结束日期
   - 填写费用信息: 工资、服务费、定金

2. **发起签约** (状态: draft → signing)
   - 点击「发起签约」按钮
   - 系统调用爱签API创建电子合同
   - 生成签署链接发送给各方

3. **各方签署** (状态: signing, 爱签状态: 0→1)
   - 客户收到短信链接
   - 点击链接进入签署页面
   - 确认合同内容并签名
   - 验证身份(短信验证码)

4. **签署完成** (状态: active, 爱签状态: 2)
   - 所有签署方完成签署
   - 系统收到爱签回调通知
   - 自动更新合同状态
   - 可下载已签署的PDF合同

**常见问题排查**:
| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 发起签约失败 | 爱签API调用异常 | 检查爱签配置、查看后端日志 |
| 签署链接过期 | 签约有效期30天 | 重新发起签约 |
| 回调未收到 | 回调URL不可达 | 检查Nginx配置、防火墙设置 |
| 状态未同步 | 回调处理异常 | 手动查询爱签状态同步 |

---

#### Q3: 如何处理换阿姨？

**换人流程详解**:

```
┌─────────────────────────────────────────────────────────────┐
│                     合同换人流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ 原合同(active)  │    │ 新合同(draft)  │    │ 历史记录更新 │   │
│  │ 张三-李阿姨    │──▶│ 张三-王阿姨    │──▶│ totalWorkers++ │   │
│  │ status:active │    │ isLatest:true │    │ contracts[]++ │   │
│  └──────┬───────┘    └──────────────┘    └──────────────┘   │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────┐                                              │
│  │ status:replaced│                                              │
│  │ isLatest:false │                                              │
│  │ serviceDays:45 │  ← 自动计算实际服务天数                       │
│  └──────────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**操作步骤**:
1. 在合同管理中找到需要换人的合同
2. 点击「换人」按钮
3. 选择新的服务人员(阿姨)
4. 设置换人生效日期
5. 系统自动:
   - 创建新合同并关联原合同
   - 将原合同状态改为`replaced`
   - 更新客户合同历史记录
   - 计算原合同实际服务天数

**API调用示例**:
```bash
# 检查客户现有合同
curl -X GET 'https://crm.andejiazheng.com/api/contracts/check-customer/13800138000' \
  -H 'Authorization: Bearer <token>'

# 创建换人合同
curl -X POST 'https://crm.andejiazheng.com/api/contracts/change-worker/60d5ec49f1b2c8001f8e4e1a' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "customerName": "张三",
    "customerPhone": "13800138000",
    "workerName": "王阿姨",
    "workerPhone": "13900139000",
    "workerIdCard": "410102197501011234",
    "contractType": "月嫂",
    "startDate": "2025-02-15",
    "endDate": "2025-04-30",
    "workerSalary": 15000,
    "customerServiceFee": 2000
  }'
```

---

#### Q4: 视频面试如何使用？

**完整使用流程**:

1. **创建面试间**
   - CRM端进入「视频面试」模块
   - 点击「创建面试间」
   - 系统自动生成房间ID和ZEGO Token
   - 自动关闭用户之前的活跃面试间

2. **邀请参与方**
   - 复制邀请链接发送给客户/阿姨
   - 链接格式: `https://crm.andejiazheng.com/miniprogram/video-interview-guest.html?roomId=xxx`
   - 访客无需登录，直接点击链接加入
   - 访客需填写姓名和身份(客户/阿姨)

3. **开始面试**
   - 主持人可控制参与者的摄像头/麦克风
   - 主持人可推送提词器内容
   - 主持人可踢出参与者
   - 参与者可随时离开/重新加入

4. **结束面试**
   - 点击「结束面试」或关闭页面
   - 系统自动记录面试时长
   - 3分钟无人会自动关闭房间

**提词器功能使用**:
```typescript
// 主持人推送提词内容
POST /api/zego/push-teleprompter
{
  "roomId": "room_1706700000000",
  "content": "问题1: 请介绍一下您的工作经历\n\n问题2: 您有什么特长？",
  "targetUserIds": ["guest_abc123"],
  "scrollSpeed": 3
}

// 控制提词器播放
POST /api/zego/control-teleprompter
{
  "roomId": "room_1706700000000",
  "targetUserIds": ["guest_abc123"],
  "action": "play"  // play/pause/stop/reset
}
```

---

### 8.2 报错排查指南

#### 后端服务报错

**查看日志命令**:
```bash
# 查看PM2实时日志
pm2 logs backend --lines 100

# 查看错误日志
pm2 logs backend --err --lines 100

# 查看全部日志
tail -f /root/.pm2/logs/backend-out.log
tail -f /root/.pm2/logs/backend-error.log
```

**常见错误代码**:

| HTTP状态码 | 错误类型 | 可能原因 | 解决方案 |
|------------|----------|----------|----------|
| 400 | Bad Request | 参数校验失败 | 检查请求参数格式 |
| 401 | Unauthorized | JWT Token无效 | 重新登录获取Token |
| 403 | Forbidden | 权限不足 | 检查用户角色权限 |
| 404 | Not Found | 资源不存在 | 检查ID是否正确 |
| 409 | Conflict | 资源冲突 | 手机号/身份证重复 |
| 500 | Server Error | 内部异常 | 查看后端日志定位问题 |

---

#### 数据库连接问题

**错误现象**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**排查步骤**:
```bash
# 1. 检查MongoDB服务状态
sudo systemctl status mongod

# 2. 启动MongoDB
sudo systemctl start mongod

# 3. 检查端口占用
netstat -tlnp | grep 27017

# 4. 检查连接字符串
cat /home/ubuntu/andejiazhengcrm/backend/.env | grep MONGODB_URI

# 5. 测试连接
mongosh mongodb://127.0.0.1:27017/housekeeping
```

---

#### 爱签集成问题

**错误现象**: 签约失败、回调未收到

**调试步骤**:
```bash
# 1. 检查爱签配置
cat /home/ubuntu/andejiazhengcrm/backend/.env | grep ESIGN

# 2. 测试API连接
curl -X GET 'https://crm.andejiazheng.com/api/esign/debug-config' \
  -H 'Authorization: Bearer <token>'

# 3. 检查回调URL是否可达
curl -X POST 'https://crm.andejiazheng.com/api/esign/callback' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# 4. 查看爱签请求日志
pm2 logs backend --lines 200 | grep '爱签'
```

**爱签错误码对照**:
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 100001 | 参数错误 | 检查请求参数格式 |
| 100002 | 签名验证失败 | 检查私钥配置 |
| 100003 | 模板不存在 | 检查模板编号 |
| 100004 | 合同不存在 | 检查合同编号 |
| 200001 | 认证失败 | 检查AppID配置 |

---

#### 视频面试问题

**错误现象**: 无法连接、黑屏、无声音

**排查步骤**:

1. **检查ZEGO配置**:
```bash
cat /home/ubuntu/andejiazhengcrm/backend/.env | grep ZEGO
```

2. **验证Token生成**:
```bash
curl -X POST 'https://crm.andejiazheng.com/api/zego/generate-token' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user_test",
    "roomId": "room_test",
    "userName": "测试用户"
  }'
```

3. **检查房间状态**:
```bash
curl -X POST 'https://crm.andejiazheng.com/api/zego/check-room' \
  -H 'Content-Type: application/json' \
  -d '{"roomId": "room_1706700000000"}'
```

**常见问题说明**:
| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 无法加入房间 | 房间已解散或Token过期 | 重新创建房间 |
| 摄像头黑屏 | 浏览器未授权 | 允许浏览器访问摄像头 |
| 音频无声 | 麦克风未开启 | 检查静音设置 |
| 网络不稳定 | 网络质量差 | 切换网络或降低画质 |
| 访客无法加入 | 链接已过期 | 重新获取邀请链接 |

---

#### 文件上传问题

**错误现象**: 上传失败、图片无法显示

**排查步骤**:

1. **检查COS配置**:
```bash
cat /home/ubuntu/andejiazhengcrm/backend/.env | grep COS
```

2. **检查文件大小限制**:
   - 图片: 最大5MB
   - 视频: 最奇50MB
   - 请确认文件未超过限制

3. **检查文件格式**:
   - 图片: jpg, jpeg, png, webp, pdf
   - 视频: mp4, mov, avi, wmv, webm

4. **检查COS权限**:
```bash
# 测试上传
curl -X POST 'https://crm.andejiazheng.com/api/upload/file' \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@test.jpg' \
  -F 'type=personalPhoto'
```

---

### 8.3 性能优化建议

#### 数据库查询优化

**常用索引建议**:
```javascript
// customers 集合
db.customers.createIndex({ "phone": 1 }, { unique: true })
db.customers.createIndex({ "assignedTo": 1, "contractStatus": 1 })
db.customers.createIndex({ "leadSource": 1, "createdAt": -1 })
db.customers.createIndex({ "inPublicPool": 1, "createdAt": -1 })

// resumes 集合
db.resumes.createIndex({ "phone": 1 }, { unique: true })
db.resumes.createIndex({ "jobType": 1, "orderStatus": 1 })
db.resumes.createIndex({ "idNumber": 1 }, { sparse: true })

// contracts 集合
db.contracts.createIndex({ "contractNumber": 1 }, { unique: true })
db.contracts.createIndex({ "customerPhone": 1, "isLatest": 1 })
db.contracts.createIndex({ "workerIdCard": 1 })
```

#### 分页查询优化

```typescript
// 推荐做法: 使用游标分页
const cursor = await this.customerModel
  .find(filter)
  .sort({ _id: -1 })
  .skip(skip)
  .limit(limit)
  .lean()  // 返回纯对象，性能更好
  .exec();

// 避免的做法: 不要使用大偏移量
const skip = (page - 1) * limit;  // page很大时性能差
```

#### API响应时间监控

```bash
# 测试API响应时间
curl -w "\n应应时间: %{time_total}s\n" \
  'https://crm.andejiazheng.com/api/customers?page=1&limit=10' \
  -H 'Authorization: Bearer <token>'

# 监控延迟较高的接口
pm2 logs backend | grep '耗时'
```

---

## 九、更新日志

### v1.0.0 (2026-01-31)
- 完整的客户管理功能
- 简历管理与档期系统
- 合同管理与换人功能
- 爱签电子签约集成
- 大树保保险集成
- ZEGO视频面试
- 线索管理与自动转移
- 通知系统
- 微信小程序集成

---

## 十、联系方式

- **技术支持**: 请联系系统管理员
- **API文档**: https://crm.andejiazheng.com/api/docs

---

*本文档由系统自动生成，如有疑问请联系技术团队。*

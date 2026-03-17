# 安得家政 CRM 系统 - 完整项目文档 (终极版)

> **版本**: 3.0.0  
> **更新日期**: 2026-03-16  
> **项目地址**: https://crm.andejiazheng.com  
> **API文档**: https://crm.andejiazheng.com/api/docs  
> **技术栈**: NestJS + React + MongoDB + PM2

---

# 目录

1. [项目概述](#一项目概述)
2. [技术架构](#二技术架构)
3. [功能模块详解](#三功能模块详解)
4. [数据库设计](#四数据库设计)
5. [API接口文档(完整版)](#五api接口文档完整版)
6. [第三方服务集成](#六第三方服务集成)
7. [小程序集成](#七小程序集成)
8. [部署运维](#八部署运维)
9. [更新日志](#九更新日志)

---

# 一、项目概述

## 1.1 系统简介

安得家政 CRM 系统是一套面向家政服务行业的现代化客户关系管理平台，提供从客户获取、阿姨简历管理、智能匹配、合同签约、保险投保到视频面试的全流程数字化解决方案。

## 1.2 核心价值

| 价值点 | 描述 | 实现方式 |
|--------|------|----------|
| **客户全生命周期管理** | 从线索获取到签约服务的完整跟踪 | 状态流转机制、跟进记录、自动流转规则 |
| **数字化签约** | 在线电子合同签署 | 集成爱签电子签约平台 |
| **智能匹配** | 客户需求与阿姨档期自动匹配 | 档期日历系统、多维度筛选 |
| **视频面试** | 远程视频面试，提升沟通效率 | 集成ZEGO即构音视频SDK |
| **保险服务** | 家政人员保险一键投保 | 集成大树保保险平台 |
| **背景调查** | 候选人背景调查 | 集成芝麻背调平台 |
| **多端协同** | CRM后台 + 微信小程序协同工作 | 统一API接口、数据同步 |

## 1.3 目标用户与权限矩阵

| 角色 | 英文标识 | 数据范围 | 说明 |
|------|---------|---------|------|
| **超级管理员** | `admin` | 全部数据 | 可查看和操作所有记录 |
| **运营经理** | `manager` | 全部数据 | 可查看和操作所有记录 |
| **普通员工** | `employee` | 仅自己的数据 | 只能查看和操作自己创建的记录（按 `createdBy` 过滤） |

## 1.4 项目结构

```
andejiazhengcrm/
├── backend/                    # NestJS 后端服务
│   ├── src/
│   │   ├── auth/              # 认证模块
│   │   ├── customers/         # 客户管理模块
│   │   ├── resumes/           # 简历管理模块
│   │   ├── contracts/         # 合同管理模块
│   │   ├── insurance/         # 保险管理模块
│   │   ├── interview/         # 视频面试模块
│   │   ├── users/             # 用户管理模块
│   │   ├── roles/             # 角色权限模块
│   │   ├── docs/              # 技术文档
│   │   │   ├── API_SPEC.md    # API 规范
│   │   │   └── DATABASE_SCHEMA.md  # 数据库结构
│   │   └── ...
│   ├── docs/                  # 产品文档
│   └── ...
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   ├── components/        # 公共组件
│   │   ├── services/          # API 服务
│   │   ├── utils/             # 工具函数
│   │   └── ...
│   └── ...
├── miniprogram-pages/          # 微信小程序页面
├── docs/                      # 项目文档
├── scripts/                   # 管理脚本
└── ...
```

---

# 二、技术架构

## 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **后端框架** | NestJS | Node.js 企业级框架 |
| **数据库** | MongoDB | NoSQL 文档数据库 |
| **ORM** | TypeORM/Mongoose | 数据持久化 |
| **前端框架** | React 18 | UI 框架 |
| **构建工具** | Vite | 快速构建 |
| **UI 组件库** | Ant Design | 企业级组件库 |
| **状态管理** | Redux Toolkit | 状态管理 |
| **进程管理** | PM2 | 生产环境进程管理 |
| **Web服务器** | Nginx | 反向代理 |

## 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              客户端层                                   │
├─────────────────┬──────────────────┬────────────────────────────────────┤
│   CRM Web 端    │   微信小程序      │        阿姨/客户小程序             │
│   React + Vite  │   微信原生        │        微信原生                    │
└────────┬────────┴────────┬─────────┴──────────────┬───────────────────────┘
         │                │                        │
         └────────────────┼────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API 网关层                                    │
│                         Nginx (反向代理)                                 │
│                   https://crm.andejiazheng.com                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           应用服务层 (NestJS)                            │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────┤
│  客户管理    │   简历管理   │   合同管理   │   保险管理   │   视频面试      │
│  Customers  │   Resumes   │  Contracts  │  Insurance  │   Interview     │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────────┤
│  背调管理    │   用户管理   │   文章管理   │   评价管理   │   Banner管理   │
│  ZMDB       │   Users     │   Articles  │  Evaluations│   Banners       │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            数据存储层                                    │
├──────────────────────────┬───────────────────────────────────────────────┤
│     MongoDB             │              腾讯云 COS                        │
│     主数据库            │              文件存储                          │
│     27017               │              (图片/视频/文档)                 │
└──────────────────────────┴───────────────────────────────────────────────┘
```

## 2.3 服务端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端开发 | 4173 | Vite 开发服务器 |
| 前端生产 | 80/443 | Nginx |
| 后端 API | 3000 | NestJS 服务 |
| 数据库 | 27017 | MongoDB |
| PM2 管理 | - | 进程管理 |

---

# 三、功能模块详解

## 3.1 客户管理模块 (customers)

### 模块概述
客户管理是CRM系统的核心模块，管理所有客户的全生命周期数据。

### 核心功能
- 客户信息管理（姓名、手机、微信号、身份证）
- 线索来源跟踪（美团、抖音、小红书、转介绍等）
- 客户状态流转（新线索 → 匹配中 → 已面试 → 已签约）
- 线索等级评定（O类、A类、B类、C类、D类）
- 公海池机制（自动流转、重新分配）
- 跟进记录管理

### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | String | ✅ | 客户姓名 |
| phone | String | ❌ | 手机号 |
| wechatId | String | ❌ | 微信号 |
| idCardNumber | String | ❌ | 身份证号 |
| leadSource | String | ✅ | 线索来源 |
| serviceCategory | String | ❌ | 需求服务品类 |
| contractStatus | String | ✅ | 客户状态 |
| leadLevel | String | ✅ | 线索等级 |
| salaryBudget | Number | ❌ | 薪资预算 |
| expectedStartDate | Date | ❌ | 期望上户日期 |
| assignedTo | ObjectId | ❌ | 当前负责人 |
| inPublicPool | Boolean | ❌ | 是否在公海中 |

### 枚举值

**线索来源**: 美团、抖音、快手、小红书、转介绍、杭州同馨、握个手平台、线索购买、莲心、美家、天机鹿、孕妈联盟、高阁、星星、妈妈网、犀牛、宝宝网、其他

**客户状态**: 已签约、匹配中、已面试、流失客户、已退款、退款中、待定

**线索等级**: 
- O类: 超高意向，立即签约
- A类: 高意向，近期签约
- B类: 中等意向
- C类: 低意向
- D类: 待定

**需求品类**: 月嫂、住家育儿嫂、保洁、住家保姆、养宠、小时工、白班育儿、白班保姆、住家护老

---

## 3.2 简历管理模块 (resumes)

### 模块概述
管理家政服务人员（阿姨）的完整简历信息，包括基本信息、工作经历、技能证书、照片、档期等。

### 核心功能
- 阿姨基本信息管理
- 多工种支持（月嫂、育儿嫂、保姆、保洁等）
- 技能标签管理
- 档期管理（可接单、不可接单、已占用）
- 工作经验记录
- 证书照片管理
- 体检报告管理
- 月嫂档位评级（初级→皇冠）

### 基本信息字段
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | String | ✅ | 姓名 |
| phone | String | ✅ | 手机号 |
| gender | Enum | ✅ | 性别 |
| age | Number | ✅ | 年龄 |
| jobType | Enum | ✅ | 工种 |
| education | Enum | ✅ | 学历 |
| experienceYears | Number | ✅ | 工作经验年限 |
| nativePlace | String | ✅ | 籍贯 |
| idNumber | String | ❌ | 身份证号 |
| expectedSalary | Number | ❌ | 期望薪资 |
| maternityNurseLevel | Enum | ❌ | 月嫂档位 |
| skills | Array | ❌ | 技能列表 |
| serviceArea | Array | ❌ | 服务区域 |

### 工种枚举
| 枚举值 | 中文名称 |
|--------|----------|
| yuexin | 月嫂 |
| zhujia-yuer | 住家育儿嫂 |
| baiban-yuer | 白班育儿嫂 |
| baojie | 保洁 |
| baiban-baomu | 白班保姆 |
| zhujia-baomu | 住家保姆 |
| yangchong | 养宠 |
| xiaoshi | 小时工 |
| zhujia-hulao | 住家护老 |

### 月嫂档位
| 档位 | 薪资范围 |
|------|----------|
| junior (初级) | 8000-12000 |
| silver (银牌) | 12000-15000 |
| gold (金牌) | 15000-18000 |
| platinum (铂金) | 18000-22000 |
| diamond (钻石) | 22000-28000 |
| crown (皇冠) | 28000+ |

### 技能标签
产后修复、特殊婴儿护理、医疗背景、育婴、早教、辅食添加、小儿推拿、外语、中餐烹饪、西餐烹饪、面食制作、家务整理、收纳整理、母婴护理、催乳、月子餐、营养配餐、理疗康复、双胎护理、养老护理

---

## 3.3 合同管理模块 (contracts)

### 模块概述
管理客户与家政服务人员之间的服务合同，支持电子签约、换人功能、合同历史追溯。

### 核心功能
- 电子合同创建与签署（爱签集成）
- 合同模板管理
- 合同状态跟踪
- 换人功能
- 合同历史记录
- 自动提醒功能

### 字段详解
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| contractNumber | String | ✅ | 合同编号 |
| customerName | String | ✅ | 客户姓名 |
| customerPhone | String | ✅ | 客户手机号 |
| contractType | Enum | ✅ | 合同类型 |
| startDate | Date | ✅ | 开始日期 |
| endDate | Date | ✅ | 结束日期 |
| workerName | String | ✅ | 服务人员姓名 |
| workerPhone | String | ✅ | 服务人员电话 |
| workerSalary | Number | ✅ | 家政员工资 |
| customerServiceFee | Number | ✅ | 客户服务费 |
| deposit | Number | ❌ | 定金 |

### 合同类型枚举
| 值 | 说明 |
|------|------|
| 月嫂 | 月嫂服务 |
| 住家育儿嫂 | 住家育儿嫂服务 |
| 保洁 | 保洁服务 |
| 住家保姆 | 住家保姆服务 |
| 养宠 | 养宠服务 |
| 小时工 | 小时工服务 |
| 白班育儿 | 白班育儿服务 |
| 白班保姆 | 白班保姆服务 |
| 住家护老 | 住家护老服务 |

### 合同状态
| 值 | 说明 |
|------|------|
| draft | 草稿 |
| signing | 签约中 |
| active | 生效中 |
| replaced | 已被替换 |
| cancelled | 已作废 |

---

## 3.4 保险管理模块 (insurance)

### 模块概述
集成大树保保险平台，提供家政人员保险在线投保服务。

### 核心功能
- 保险产品查询
- 在线投保
- 保单管理
- 理赔进度查询

### 保单状态
| 状态值 | 说明 |
|--------|------|
| pending | 待支付 |
| processing | 处理中 |
| active | 已生效 |
| expired | 已过期 |
| cancelled | 已注销 |
| surrendered | 已退保 |

---

## 3.5 视频面试模块 (interview)

### 模块概述
集成 ZEGO 即构科技音视频服务，提供远程视频面试功能。

### 核心功能
- 视频面试房间创建
- 实时音视频通话
- 面试记录保存
- 美颜功能
- 提词器功能

---

## 3.6 背景调查模块 (background-check)

### 模块概述
集成芝麻背调服务，提供候选人背景调查功能。

### 核心功能
- 身份信息核验
- 社会风险查询
- 诉讼及处罚风险查询
- 金融信用风险查询
- 报告生成

### 背调状态
| 状态值 | 说明 | 结果判定 |
|--------|------|----------|
| 0 | 待发起 | - |
| 1 | 授权中 | - |
| 2 | 背调中 | - |
| 3 | 已取消 | ❌ 未通过 |
| 4 | 已完成 | ✅ 通过 |
| 15 | 终止 | ❌ 未通过 |
| 16 | 完成（深度版） | ✅ 通过 |

---

## 3.7 员工评价模块

### 模块概述
内部员工评价管理，支持创建评价、查询评价列表和统计分析。

### 核心功能
- 创建员工评价
- 获取评价列表
- 获取评价统计

### 评价类型
| 值 | 说明 |
|------|------|
| daily | 日常评价 |
| monthly | 月度评价 |
| contract_end | 合同结束评价 |
| special | 特别评价 |

---

# 四、数据库设计

## 4.1 核心集合

### customers（客户集合）
```javascript
{
  _id: ObjectId,
  name: String,           // 客户姓名
  phone: String,         // 手机号
  wechatId: String,       // 微信号
  idCardNumber: String,   // 身份证号
  leadSource: String,     // 线索来源
  serviceCategory: String,// 需求品类
  contractStatus: String, // 客户状态
  leadLevel: String,      // 线索等级
  salaryBudget: Number,   // 薪资预算
  expectedStartDate: Date,// 期望上户日期
  familySize: Number,     // 家庭人口
  address: String,        // 地址
  assignedTo: ObjectId,  // 负责人
  lastActivityAt: Date,  // 最后活动时间
  autoTransferEnabled: Boolean, // 自动流转
  inPublicPool: Boolean, // 公海池
  createdAt: Date,
  updatedAt: Date
}
```

### resumes（简历集合）
```javascript
{
  _id: ObjectId,
  name: String,           // 姓名
  phone: String,          // 手机号
  gender: String,         // 性别
  age: Number,            // 年龄
  jobType: String,        // 工种
  education: String,      // 学历
  experienceYears: Number,// 工作经验
  nativePlace: String,    // 籍贯
  idNumber: String,       // 身份证号
  expectedSalary: Number, // 期望薪资
  maternityNurseLevel: String, // 月嫂档位
  skills: String[],       // 技能列表
  serviceArea: String[],   // 服务区域
  orderStatus: String,    // 接单状态
  photoUrls: String[],    // 照片
  certificateUrls: String[], // 证书
  workExperience: Object[], // 工作经验
  availability: Object[], // 档期
  createdAt: Date,
  updatedAt: Date
}
```

### contracts（合同集合）
```javascript
{
  _id: ObjectId,
  contractNumber: String, // 合同编号
  customerName: String,   // 客户姓名
  customerPhone: String,  // 客户手机号
  contractType: String,   // 合同类型
  startDate: Date,        // 开始日期
  endDate: Date,          // 结束日期
  workerName: String,     // 服务人员
  workerPhone: String,    // 服务人员电话
  workerSalary: Number,   // 家政员工资
  customerServiceFee: Number, // 客户服务费
  status: String,         // 合同状态
  esignContractId: String, // 爱签合同ID
  createdAt: Date,
  updatedAt: Date
}
```

### users（用户集合）
```javascript
{
  _id: ObjectId,
  username: String,       // 用户名
  password: String,      // 密码（加密）
  name: String,          // 姓名
  email: String,         // 邮箱
  phone: String,         // 手机号
  role: String,          // 角色
  permissions: String[], // 权限列表
  active: Boolean,       // 是否激活
  createdAt: Date,
  updatedAt: Date
}
```

---

# 五、API接口文档(完整版)

## 5.1 通用响应格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  },
  "timestamp": 1626342025123
}
```

## 5.2 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如手机号重复） |
| 413 | 请求体过大 |
| 500 | 服务器内部错误 |

## 5.3 认证要求

### JWT认证
- **Header**: `Authorization: Bearer {token}`
- **公开接口**: 无需token
- **业务接口**: 需要JWT认证

### 角色权限控制（RBAC）
| 角色 | 英文标识 | 数据范围 |
|------|---------|---------|
| 系统管理员 | admin | 全部数据 |
| 经理 | manager | 全部数据 |
| 普通员工 | employee | 仅自己的数据 |

---

## 5.4 小程序端API详细接口

### 5.4.1 用户注册与登录

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 用户注册或更新 | POST | `/api/miniprogram-users/register` | ❌ | 注册新用户或更新现有用户信息 |
| 记录用户登录 | POST | `/api/miniprogram-users/login` | ❌ | 使用 OpenID 或手机号登录 |
| 账号密码登录 | POST | `/api/miniprogram-users/login-with-password` | ❌ | 使用账号和密码登录 |

### 5.4.2 Banner轮播图

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 获取活跃Banner列表 | GET | `/api/banners/miniprogram/active` | ❌ | 获取所有启用状态的Banner |

### 5.4.3 文章内容

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 获取文章列表 | GET | `/api/articles/miniprogram/list` | ❌ | 获取已发布文章列表 |
| 获取文章详情 | GET | `/api/articles/miniprogram/:id` | ❌ | 获取文章详情 |

### 5.4.4 简历管理

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 创建简历 | POST | `/api/resumes/miniprogram/create` | ✅ | 创建新简历 |
| 获取简历详情 | GET | `/api/resumes/miniprogram/:id` | ✅ | 获取简历详情 |
| 更新简历 | PUT | `/api/resumes/miniprogram/:id` | ✅ | 更新简历 |
| 上传文件 | POST | `/api/resumes/miniprogram/:id/upload-file` | ✅ | 上传简历相关文件 |
| 删除文件 | DELETE | `/api/resumes/miniprogram/:id/delete-file` | ✅ | 删除简历文件 |

### 5.4.5 员工评价

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 创建员工评价 | POST | `/api/employee-evaluations/miniprogram/create` | ✅ | 创建评价 |
| 获取评价列表 | GET | `/api/employee-evaluations/miniprogram/list` | ✅ | 获取评价列表 |
| 获取评价统计 | GET | `/api/employee-evaluations/miniprogram/statistics/:employeeId` | ✅ | 获取评价统计 |

### 5.4.6 客户管理

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 获取客户统计信息 | GET | `/api/customers/miniprogram/statistics` | ✅ | 获取客户统计 |
| 获取客户列表 | GET | `/api/customers/miniprogram/list` | ✅ | 获取客户列表 |
| 创建客户 | POST | `/api/customers/miniprogram/create` | ✅ | 创建客户 |
| 获取客户详情 | GET | `/api/customers/miniprogram/:id` | ✅ | 获取客户详情 |
| 更新客户 | PATCH | `/api/customers/miniprogram/:id` | ✅ | 更新客户 |
| 分配客户 | PATCH | `/api/customers/miniprogram/:id/assign` | ✅ | 分配负责人 |
| 新增跟进记录 | POST | `/api/customers/miniprogram/:id/follow-ups` | ✅ | 添加跟进记录 |
| 获取跟进记录 | GET | `/api/customers/miniprogram/:id/follow-ups` | ✅ | 获取跟进列表 |
| 获取分配历史 | GET | `/api/customers/miniprogram/:id/assignment-logs` | ✅ | 获取分配历史 |
| 获取员工列表 | GET | `/api/customers/miniprogram/employees/list` | ✅ | 获取可分配员工 |

### 5.4.7 合同管理

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 获取合同列表 | GET | `/api/contracts/miniprogram/list` | ✅ | 获取合同列表 |
| 获取合同详情 | GET | `/api/contracts/miniprogram/detail/:id` | ✅ | 获取合同详情 |
| 根据合同编号获取 | GET | `/api/contracts/miniprogram/by-number/:contractNumber` | ✅ | 获取合同详情 |
| 根据客户ID获取 | GET | `/api/contracts/miniprogram/by-customer/:customerId` | ✅ | 获取客户合同 |
| 根据服务人员ID获取 | GET | `/api/contracts/miniprogram/by-worker-id/:workerId` | ✅ | 获取服务人员合同 |
| 搜索服务人员合同 | GET | `/api/contracts/miniprogram/search-worker` | ✅ | 搜索合同 |
| 检查客户现有合同 | GET | `/api/contracts/miniprogram/check-customer/:customerPhone` | ✅ | 检查合同 |
| 获取客户合同历史 | GET | `/api/contracts/miniprogram/history/:customerPhone` | ✅ | 合同历史 |
| 获取合同统计 | GET | `/api/contracts/miniprogram/statistics` | ✅ | 合同统计 |
| 创建合同 | POST | `/api/contracts/miniprogram/create` | ✅ | 创建合同 |
| 更新合同 | PUT | `/api/contracts/miniprogram/update/:id` | ✅ | 更新合同 |
| 创建换人合同 | POST | `/api/contracts/miniprogram/change-worker/:originalContractId` | ✅ | 换人合同 |
| 触发保险同步 | POST | `/api/contracts/miniprogram/sync-insurance/:id` | ✅ | 同步保险 |
| 同步爱签状态 | POST | `/api/contracts/miniprogram/sync-esign-status/:id` | ✅ | 同步状态 |
| 批量同步状态 | POST | `/api/contracts/miniprogram/sync-all-esign-status` | ✅ | 批量同步 |
| 获取爱签信息 | GET | `/api/contracts/miniprogram/esign-info/:id` | ✅ | 爱签信息 |
| 重新获取签署链接 | POST | `/api/contracts/miniprogram/resend-sign-urls/:id` | ✅ | 签署链接 |
| 下载合同 | POST | `/api/contracts/miniprogram/download-contract/:id` | ✅ | 下载合同 |

### 5.4.8 保险保单管理

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 获取保单列表 | GET | `/api/dashubao/miniprogram/policies` | ✅ | 保单列表 |
| 身份证查保单 | GET | `/api/dashubao/miniprogram/policy/by-id-card/:idCard` | ✅ | 身份证查询 |
| 保单号查询 | GET | `/api/dashubao/miniprogram/policy/by-policy-no/:policyNo` | ✅ | 保单号查询 |
| 商户单号查询 | GET | `/api/dashubao/miniprogram/policy/by-policy-ref/:policyRef` | ✅ | 商户单查询 |
| 获取保单详情 | GET | `/api/dashubao/miniprogram/policy/:id` | ✅ | 保单详情 |
| 创建保单 | POST | `/api/dashubao/miniprogram/policy` | ✅ | 投保 |
| 查询保单状态 | POST | `/api/dashubao/miniprogram/policy/query` | ✅ | 状态查询 |
| 创建支付订单 | POST | `/api/dashubao/miniprogram/policy/payment/:policyRef` | ✅ | 支付 |
| 注销保单 | POST | `/api/dashubao/miniprogram/policy/cancel` | ✅ | 注销 |
| 退保 | POST | `/api/dashubao/miniprogram/policy/surrender` | ✅ | 退保 |
| 获取电子保单 | POST | `/api/dashubao/miniprogram/policy/print` | ✅ | 电子保单 |
| 批改保单 | POST | `/api/dashubao/miniprogram/policy/amend` | ✅ | 批改 |
| 批增被保险人 | POST | `/api/dashubao/miniprogram/policy/add-insured` | ✅ | 批增 |
| 同步保单状态 | POST | `/api/dashubao/miniprogram/policy/sync/:identifier` | ✅ | 同步状态 |

### 5.4.9 背调管理

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 获取背调列表 | GET | `/api/zmdb/miniprogram/reports` | ✅ | 背调列表 |
| 身份证号查询 | GET | `/api/zmdb/miniprogram/reports/by-idno/:idNo` | ✅ | 身份证查询 |
| 获取背调详情 | GET | `/api/zmdb/miniprogram/reports/:id` | ✅ | 背调详情 |
| 准备授权书 | POST | `/api/zmdb/miniprogram/prepare-auth` | ✅ | 授权书 |
| 发起背调 | POST | `/api/zmdb/miniprogram/reports` | ✅ | 发起背调 |
| 取消背调 | POST | `/api/zmdb/miniprogram/reports/:id/cancel` | ✅ | 取消背调 |
| 拉取风险数据 | POST | `/api/zmdb/miniprogram/reports/:reportId/fetch-result` | ✅ | 拉取数据 |
| 下载报告 | GET | `/api/zmdb/miniprogram/reports/:reportId/download` | ✅ | 下载报告 |

---

# 六、第三方服务集成

## 6.1 爱签电子签约

**功能**: 电子合同在线签署

**API文档**: `爱签技术文档.md`

**核心接口**:
- 创建合同
- 获取签署链接
- 查询签署状态
- 下载合同文件

## 6.2 大树保保险

**功能**: 家政人员保险投保

**API文档**: `大树保保险api接口文档.md`

**核心接口**:
- 产品列表查询
- 投保申请
- 保单查询
- 理赔申请

## 6.3 ZEGO 即构科技

**功能**: 视频面试实时音视频

**API文档**: `ZEGO-视频面试技术文档.md`

**核心功能**:
- 视频通话
- 语音通话
- 美颜滤镜
- 屏幕共享
- 提词器

## 6.4 芝麻背调

**功能**: 候选人背景调查

**API文档**: `芝麻背调技术文档.md`

**核心接口**:
- 创建背调任务
- 获取报告数据
- 风险评估查询

---

# 七、小程序集成

## 7.1 小程序端功能

- 简历创建与完善
- 简历列表与详情查看
- 阿姨信息浏览
- 合同签署
- 视频面试入口
- 档期管理
- 保险投保
- 背景调查

## 7.2 数据字典汇总

### 学历枚举
| 枚举值 | 中文 |
|--------|------|
| no | 无学历 |
| primary | 小学 |
| middle | 初中 |
| secondary | 中专 |
| vocational | 职高 |
| high | 高中 |
| college | 大专 |
| bachelor | 本科 |
| graduate | 研究生+ |

### 婚姻状况
| 枚举值 | 中文 |
|--------|------|
| single | 未婚 |
| married | 已婚 |
| divorced | 离异 |
| widowed | 丧偶 |

### 接单状态
| 枚举值 | 中文 |
|--------|------|
| available | 可接单 |
| busy | 忙碌中 |
| unavailable | 暂不接单 |

---

# 八、部署运维

## 8.1 服务管理命令

```bash
# 启动所有服务
./scripts/manage.sh start

# 停止所有服务
./scripts/manage.sh stop

# 重启服务
./scripts/manage.sh restart

# 查看状态
./scripts/manage.sh status

# 查看日志
./scripts/manage.sh logs
```

## 8.2 PM2 管理

```bash
# 查看进程状态
pm2 status

# 重启指定进程
pm2 restart backend-prod

# 查看日志
pm2 logs backend-prod

# 监控
pm2 monit
```

## 8.3 Nginx 配置

生产环境使用 Nginx 作为反向代理，配置文件: `nginx-production.conf`

## 8.4 备份策略

- 数据库每日自动备份
- 备份文件保留 30 天
- 备份位置: `/home/ubuntu/backups/`

---

# 九、更新日志

### 2026-03-16 v3.0.0
- ✅ 整合所有API文档
- ✅ 完善项目文档结构
- ✅ 新增背调管理API（8个接口）
- ✅ 新增保险管理API（14个接口）
- ✅ 新增合同管理API（17个接口）
- ✅ 新增客户管理API（10个接口）
- ✅ 新增简历管理API（5个接口）
- ✅ 新增员工评价API（3个接口）
- ✅ 实施RBAC角色权限控制

### 2026-01-31 v2.0.0
- ✅ 发布 2.0.0 版本
- ✅ 完善技术架构文档
- ✅ 整合所有模块文档

### 历史版本
详见 `DOCUMENTATION.md` 历史更新记录

---

**文档版本**: 3.0.0  
**最后更新**: 2026-03-16  
**维护者**: Lisa 🦋

---

> 📖 详细API接口参数和返回值请参阅: `backend/docs/小程序API完整文档.md` (6753行)

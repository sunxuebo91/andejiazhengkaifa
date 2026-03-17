# 安得家政 CRM 系统 - 完整项目文档

> **版本**: 2.0.0  
> **更新日期**: 2026-03-16  
> **项目地址**: https://crm.andejiazheng.com  
> **API文档**: https://crm.andejiazheng.com/api/docs  
> **技术栈**: NestJS + React + MongoDB + PM2

---

## 目录

1. [项目概述](#一项目概述)
2. [技术架构](#二技术架构)
3. [功能模块详解](#三功能模块详解)
4. [数据库设计](#四数据库设计)
5. [API接口文档](#五api接口文档)
6. [第三方服务集成](#六第三方服务集成)
7. [小程序集成](#七小程序集成)
8. [部署运维](#八部署运维)
9. [更新日志](#九更新日志)

---

## 一、项目概述

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

### 1.4 项目结构

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

## 二、技术架构

### 2.1 技术栈

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

### 2.2 系统架构图

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
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           应用服务层                                      │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────┤
│  客户管理    │   简历管理   │   合同管理   │   保险管理   │   视频面试      │
│  Customers  │   Resumes   │  Contracts  │  Insurance  │   Interview     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            数据存储层                                    │
├──────────────────────────┬───────────────────────────────────────────────┤
│     MongoDB             │              腾讯云 COS                      │
│     主数据库            │              文件存储                          │
└──────────────────────────┴───────────────────────────────────────────────┘
```

### 2.3 服务端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端开发 | 4173 | Vite 开发服务器 |
| 前端生产 | 80/443 | Nginx |
| 后端 API | 3000 | NestJS 服务 |
| 数据库 | 27017 | MongoDB |
| PM2 管理 | - | 进程管理 |

---

## 三、功能模块详解

### 3.1 客户管理模块 (customers)

#### 模块概述
客户管理是CRM系统的核心模块，管理所有客户的全生命周期数据。

#### 核心功能
- 客户信息管理（姓名、手机、微信号、身份证）
- 线索来源跟踪（美团、抖音、小红书、转介绍等）
- 客户状态流转（新线索 → 匹配中 → 已面试 → 已签约）
- 线索等级评定（O类、A类、B类、C类、D类）
- 公海池机制（自动流转、重新分配）
- 跟进记录管理

#### 字段详解
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

#### 枚举值

**线索来源**: 美团、抖音、快手、小红书、转介绍、杭州同馨、握个手平台、线索购买、莲心、美家、天机鹿、孕妈联盟、高阁、星星、妈妈网、犀牛、宝宝网、其他

**客户状态**: 已签约、匹配中、已面试、流失客户、已退款、退款中、待定

**线索等级**: 
- O类: 超高意向，立即签约
- A类: 高意向，近期签约
- B类: 中等意向
- C类: 低意向
- D类: 待定

**需求品类**: 月嫂、住家育儿嫂、保洁、住家保姆、养宠、小时工、白班育儿、白班保姆、住家护老

### 3.2 简历管理模块 (resumes)

#### 模块概述
管理家政服务人员（阿姨）的完整简历信息，包括基本信息、工作经历、技能证书、照片、档期等。

#### 核心功能
- 阿姨基本信息管理
- 多工种支持（月嫂、育儿嫂、保姆、保洁等）
- 技能标签管理
- 档期管理（可接单、不可接单、已占用）
- 工作经验记录
- 证书照片管理
- 体检报告管理
- 月嫂档位评级（初级→皇冠）

#### 基本信息字段
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

#### 工种枚举
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

#### 月嫂档位
| 档位 | 薪资范围 |
|------|----------|
| junior (初级) | 8000-12000 |
| silver (银牌) | 12000-15000 |
| gold (金牌) | 15000-18000 |
| platinum (铂金) | 18000-22000 |
| diamond (钻石) | 22000-28000 |
| crown (皇冠) | 28000+ |

#### 技能标签
产后修复、特殊婴儿护理、医疗背景、育婴、早教、辅食添加、小儿推拿、外语、中餐烹饪、西餐烹饪、面食制作、家务整理、收纳整理、母婴护理、催乳、月子餐、营养配餐、理疗康复、双胎护理、养老护理

### 3.3 合同管理模块 (contracts)

#### 模块概述
管理客户与家政服务人员之间的服务合同，支持电子签约、换人功能、合同历史追溯。

#### 核心功能
- 电子合同创建与签署
- 合同模板管理
- 合同状态跟踪
- 换人功能
- 合同历史记录
- 自动提醒功能

#### 字段详解
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

#### 合同状态
draft → signing → signed → executing → completed / cancelled

### 3.4 保险管理模块 (insurance)

#### 模块概述
集成大树保保险平台，提供家政人员保险在线投保服务。

#### 核心功能
- 保险产品查询
- 在线投保
- 保单管理
- 理赔进度查询

### 3.5 视频面试模块 (interview)

#### 模块概述
集成 ZEGO 即构科技音视频服务，提供远程视频面试功能。

#### 核心功能
- 视频面试房间创建
- 实时音视频通话
- 面试记录保存
- 美颜功能
- 提词器功能

### 3.6 背景调查模块 (background-check)

#### 模块概述
集成芝麻背调服务，提供候选人背景调查功能。

#### 核心功能
- 身份信息核验
- 社会风险查询
- 诉讼及处罚风险查询
- 金融信用风险查询
- 报告生成

### 3.7 用户权限模块 (users/roles)

#### 模块概述
系统用户管理和角色权限控制。

#### 角色定义
- admin: 超级管理员
- manager: 运营经理
- employee: 普通员工

---

## 四、数据库设计

### 4.1 核心集合

#### customers（客户集合）
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

#### resumes（简历集合）
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

#### contracts（合同集合）
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

#### users（用户集合）
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

## 五、API接口文档

### 5.1 通用响应格式

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

### 5.2 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 5.3 认证接口

#### 登录
- URL: `/api/auth/login`
- Method: POST
- Body: `{ "username": "xxx", "password": "xxx" }`

#### 获取当前用户
- URL: `/api/auth/me`
- Method: GET
- Header: `Authorization: Bearer [token]`

#### 上传头像
- URL: `/api/auth/avatar`
- Method: POST
- Header: `Authorization: Bearer [token]`

### 5.4 简历管理接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/resumes | GET | 获取所有简历 |
| /api/resumes/:id | GET | 获取简历详情 |
| /api/resumes | POST | 创建简历 |
| /api/resumes/:id | PUT | 更新简历 |
| /api/resumes/:id | DELETE | 删除简历 |

### 5.5 客户管理接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/customers | GET | 获取所有客户 |
| /api/customers/:id | GET | 获取客户详情 |
| /api/customers | POST | 创建客户 |
| /api/customers/:id | PUT | 更新客户 |
| /api/customers/:id | DELETE | 删除客户 |

### 5.6 合同管理接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/contracts | GET | 获取所有合同 |
| /api/contracts/:id | GET | 获取合同详情 |
| /api/contracts | POST | 创建合同 |
| /api/contracts/:id | PUT | 更新合同 |
| /api/contracts/:id/sign | POST | 签署合同 |

### 5.7 保险接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/insurance/products | GET | 获取保险产品 |
| /api/insurance/apply | POST | 申请投保 |
| /api/insurance/policies | GET | 获取保单列表 |

### 5.8 视频面试接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/interview/token | POST | 获取ZEGO token |
| /api/interview/rooms | POST | 创建面试房间 |

---

## 六、第三方服务集成

### 6.1 爱签电子签约

**功能**: 电子合同在线签署

**API文档**: `爱签技术文档.md`

**核心接口**:
- 创建合同
- 获取签署链接
- 查询签署状态
- 下载合同文件

### 6.2 大树保保险

**功能**: 家政人员保险投保

**API文档**: `大树保保险api接口文档.md`

**核心接口**:
- 产品列表查询
- 投保申请
- 保单查询
- 理赔申请

### 6.3 ZEGO 即构科技

**功能**: 视频面试实时音视频

**API文档**: `ZEGO-视频面试技术文档.md`

**核心功能**:
- 视频通话
- 语音通话
- 美颜滤镜
- 屏幕共享
- 提词器

### 6.4 芝麻背调

**功能**: 候选人背景调查

**API文档**: `芝麻背调技术文档.md`

**核心接口**:
- 创建背调任务
- 获取报告数据
- 风险评估查询

---

## 七、小程序集成

### 7.1 小程序端功能

- 简历创建与完善
- 简历列表与详情查看
- 阿姨信息浏览
- 合同签署
- 视频面试入口
- 档期管理

### 7.2 API 文档

详细小程序 API 文档见: `backend/docs/小程序API完整文档.md`

### 7.3 核心接口

| 接口 | 说明 |
|------|------|
| /miniprogram/auth/login | 小程序登录 |
| /miniprogram/resumes/create | 创建简历 |
| /miniprogram/resumes/list | 简历列表 |
| /miniprogram/resumes/detail | 简历详情 |
| /miniprogram/contracts/create | 创建合同 |
| /miniprogram/files/upload | 文件上传 |

---

## 八、部署运维

### 8.1 服务管理命令

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

### 8.2 PM2 管理

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

### 8.3 Nginx 配置

生产环境使用 Nginx 作为反向代理，配置文件: `nginx-production.conf`

### 8.4 备份策略

- 数据库每日自动备份
- 备份文件保留 30 天
- 备份位置: `/home/ubuntu/backups/`

---

## 九、更新日志

### 2026-03-16
- 新增背景调查 API 文档
- 完善小程序 API 文档
- 优化文档结构

### 2026-01-31
- 发布 2.0.0 版本
- 完善技术架构文档
- 整合所有模块文档

### 历史版本
详见 `DOCUMENTATION.md` 历史更新记录

---

## 附录

### A. 数据字典

#### 学历枚举
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

#### 婚姻状况
| 枚举值 | 中文 |
|--------|------|
| single | 未婚 |
| married | 已婚 |
| divorced | 离异 |
| widowed | 丧偶 |

#### 接单状态
| 枚举值 | 中文 |
|--------|------|
| accepting | 想接单 |
| not-accepting | 不接单 |
| on-service | 已上户 |

### B. 联系方式

- 技术支持: 技术团队
- 项目地址: https://crm.andejiazheng.com

---

**文档版本**: 2.0.0  
**最后更新**: 2026-03-16  
**维护者**: Lisa 🦋

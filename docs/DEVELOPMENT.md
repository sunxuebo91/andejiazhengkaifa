# 安得家政CRM系统开发文档

最后更新：2024-03-xx

## 最近变更 (2024-03-xx)
- scripts/update-docs.js
- package.json
- docs/CHANGELOG.md
- docs/DEVELOPMENT.md

## 目录
1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [开发环境搭建](#开发环境搭建)
4. [项目结构](#项目结构)
5. [核心功能模块](#核心功能模块)
6. [数据库设计](#数据库设计)
7. [API接口规范](#api接口规范)
8. [部署指南](#部署指南)
9. [开发规范](#开发规范)

## 项目概述

安得家政CRM系统是一个专业的家政服务管理平台，主要用于管理家政服务人员的简历、订单和服务信息。系统采用前后端分离架构，提供完整的家政服务人员管理、简历管理、文件上传等功能。

### 主要功能
- 简历管理：创建、查询、更新、删除家政服务人员简历
- 文件管理：支持上传身份证、证书、体检报告等文件
- 用户管理：系统用户权限管理
- 数据统计：简历数据统计和分析

## 技术架构

### 前端技术栈
- 框架：React 18
- 语言：TypeScript
- 构建工具：Vite
- UI组件库：Ant Design
- 状态管理：Redux Toolkit
- 路由：React Router
- HTTP客户端：Axios

### 后端技术栈
- 框架：NestJS
- 语言：TypeScript
- 数据库：MongoDB
- ORM：TypeORM
- 文件存储：腾讯云对象存储 COS
- 第三方服务：
  - 百度OCR API（身份证识别）
  - 百度地图API（地址服务）

## 开发环境搭建

### 系统要求
- Node.js v18+
- MongoDB v6+
- Git

### 环境配置步骤

1. 克隆项目
```bash
git clone [项目地址]
cd andejiazhengkaifa
```

2. 安装依赖
```bash
# 安装所有依赖（包括前端和后端）
npm run install:all
```

3. 配置环境变量
在`backend`目录创建`.env`文件，配置以下环境变量：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=27017
DB_NAME=andejiazhengkaifa

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h

# 腾讯云COS配置
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=your_cos_bucket
COS_REGION=your_cos_region

# 百度API配置
BAIDU_OCR_APP_ID=your_baidu_ocr_app_id
BAIDU_OCR_API_KEY=your_baidu_ocr_api_key
BAIDU_OCR_SECRET_KEY=your_baidu_ocr_secret_key
```

4. 启动开发服务器
```bash
# 同时启动前端和后端
npm run dev

# 仅启动前端
npm run dev:frontend

# 仅启动后端
npm run dev:backend
```

## 项目结构

```
andejiazhengkaifa/
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/         # 页面
│   │   ├── services/      # API服务
│   │   ├── store/         # 状态管理
│   │   └── utils/         # 工具函数
│   └── package.json
│
├── backend/                # 后端项目
│   ├── src/
│   │   ├── modules/       # 功能模块
│   │   ├── common/        # 公共模块
│   │   ├── config/        # 配置文件
│   │   └── docs/          # 文档
│   └── package.json
│
├── docs/                   # 项目文档
├── docker-compose.yml      # Docker配置
└── package.json           # 项目根配置
```

## 核心功能模块

### 1. 简历管理模块
- 简历创建：支持基本信息录入、文件上传
- 简历查询：支持分页、筛选、搜索
- 简历更新：支持信息修改、文件更新
- 简历删除：支持单条删除、批量删除
- 查重功能：支持手机号、身份证号查重

### 2. 文件管理模块
- 文件上传：支持身份证、证书、体检报告等文件上传
- 文件预览：支持图片预览、PDF预览
- 文件存储：使用腾讯云COS进行文件存储
- 文件管理：支持文件删除、更新

### 3. 用户管理模块
- 用户认证：JWT token认证
- 权限控制：基于角色的权限管理
- 用户管理：支持用户创建、修改、删除

## 数据库设计

### 主要集合

1. 简历集合（resumes）
   - 基本信息：姓名、手机号、年龄等
   - 工作信息：工种、期望薪资、服务区域等
   - 文件信息：身份证、证书、体检报告等
   - 时间信息：创建时间、更新时间

2. 用户集合（users）
   - 基本信息：用户名、密码、姓名等
   - 权限信息：角色、权限列表
   - 状态信息：是否激活、创建时间等

详细的数据模型定义请参考 `backend/src/docs/DATABASE_SCHEMA.md`

## API接口规范

### 通用规范
- 基础路径：`/api`
- 认证方式：Bearer Token
- 响应格式：统一的JSON格式
- 状态码：遵循HTTP标准状态码

### 主要接口
1. 简历管理接口
   - GET /api/resumes - 获取简历列表
   - POST /api/resumes - 创建简历
   - GET /api/resumes/:id - 获取单个简历
   - PUT /api/resumes/:id - 更新简历
   - DELETE /api/resumes/:id - 删除简历

2. 文件上传接口
   - POST /api/upload/id-card/:type - 上传身份证
   - POST /api/upload/file/:category - 上传其他文件
   - GET /api/upload/preview/:key - 获取文件预览

详细接口文档请参考 `backend/src/docs/API_SPEC.md`

## 部署指南

### Docker部署
1. 构建镜像
```bash
docker-compose build
```

2. 启动服务
```bash
docker-compose up -d
```

### 手动部署
1. 构建前端
```bash
npm run build:frontend
```

2. 构建后端
```bash
npm run build:backend
```

3. 启动服务
```bash
npm run start
```

## 开发规范

### 代码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循TypeScript严格模式
- 使用统一的代码风格

### Git提交规范
提交信息格式：
```
<type>(<scope>): <subject>

<body>

<footer>
```

type类型：
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 构建过程或辅助工具的变动

### 分支管理
- main: 主分支，用于生产环境
- develop: 开发分支，用于开发环境
- feature/*: 功能分支，用于开发新功能
- hotfix/*: 修复分支，用于修复生产环境bug

### 文档维护
- 及时更新API文档
- 保持数据库文档的同步
- 记录重要的开发决策
- 维护更新日志

### 自动更新机制
项目文档采用自动更新机制，在以下情况下会自动更新：
1. 执行 git commit 时（通过 husky pre-commit hook）
2. 执行 git push 时（通过 husky pre-push hook）
3. 手动运行 `npm run docs:update` 命令

自动更新会：
- 更新文档的最后修改时间
- 记录最近的变更文件
- 更新 CHANGELOG.md 文件
- 保持文档的版本历史

### 文档更新内容
每次更新会记录：
- 变更日期和提交哈希
- 提交信息
- 作者信息
- 变更文件列表

### 手动更新文档
如果需要手动更新文档，可以：
1. 直接编辑相应的文档文件
2. 运行 `npm run docs:update` 更新变更记录
3. 提交更改到版本控制系统

## 常见问题

### 开发环境问题
1. 端口占用
   - 前端默认端口：5173
   - 后端默认端口：3000
   - MongoDB默认端口：27017

2. 环境变量配置
   - 确保所有必需的环境变量都已正确配置
   - 注意敏感信息的安全性

### 部署问题
1. 文件上传失败
   - 检查COS配置是否正确
   - 确认文件大小是否超限
   - 验证文件类型是否支持

2. 数据库连接失败
   - 检查MongoDB服务是否运行
   - 验证数据库连接配置
   - 确认数据库用户权限

## 更新日志

### v1.0.0 (2024-03-xx)
- 初始版本发布
- 实现基础简历管理功能
- 支持文件上传和管理
- 完成用户认证和权限管理 
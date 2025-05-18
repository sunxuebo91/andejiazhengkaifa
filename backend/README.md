# 安德佳政后端服务

本项目是安德佳政家政服务平台的后端API服务，基于NestJS框架开发。

## 技术栈

- NestJS - 基于Node.js的服务端框架
- TypeORM - 数据库ORM
- MongoDB - 数据库
- JWT - 身份验证
- Swagger - API文档

## 环境要求

- Node.js 16+
- MongoDB 4.4+
- npm 或 yarn

## 安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件并根据需要修改：

```bash
cp .env.example .env
```

### 3. 启动开发环境

使用提供的脚本启动开发环境：

```bash
./start-dev.sh
```

如需同时创建管理员账户：

```bash
./start-dev.sh --with-admin
```

### 4. 生产环境部署

```bash
./start-prod.sh
```

## API文档

启动服务后，访问以下地址查看API文档：

```
http://localhost:3001/api/docs
```

## 项目结构

```
src/
├── common/            # 通用工具和服务
├── config/            # 配置相关
├── filters/           # 全局异常过滤器
├── interceptors/      # 全局拦截器
├── modules/           # 功能模块
│   ├── auth/          # 认证模块
│   ├── baidu/         # 百度API集成模块
│   ├── resume/        # 简历模块
│   ├── system/        # 系统管理模块
│   ├── upload/        # 文件上传模块
│   └── user/          # 用户模块
├── scripts/           # 脚本工具
└── main.ts            # 应用程序入口
```

## 主要功能

- 用户认证与授权
- 简历管理
- 文件上传
- OCR识别
- 系统状态监控

## 标准化说明

本项目已经完成了从Express框架到NestJS框架的完全迁移，并实现了以下标准化工作：

1. **统一技术栈**: 使用NestJS作为唯一的后端框架，提高了代码质量和可维护性
2. **统一数据访问**: 使用TypeORM统一管理MongoDB数据库访问，避免直接驱动调用
3. **标准化设计模式**: 采用控制器-服务-仓库三层架构，符合SOLID原则
4. **统一认证与授权**: 使用JWT实现统一的认证与基于角色的授权
5. **统一异常处理**: 通过异常过滤器统一处理错误响应格式
6. **统一响应格式**: 通过响应拦截器确保API响应格式一致
7. **API文档化**: 使用Swagger自动生成API文档

## 迁移历史

项目从以下方面进行了标准化改进：

- 移除了Express路由和中间件，替换为NestJS控制器和拦截器
- 替换了直接的Mongoose调用，统一使用TypeORM
- 引入了依赖注入和模块化设计
- 增强了类型安全性和错误处理
- 统一了配置管理和环境变量处理 
# 安得家政CRM开发项目

## 项目简介

安得家政CRM系统是一个家政服务管理平台，采用前后端分离架构。

## 技术栈

- 前端：React, TypeScript, Vite
- 后端：NestJS, TypeScript, TypeORM
- 数据库：MongoDB
- 存储：腾讯云对象存储 COS
- API集成：百度OCR API

## 目录结构

- `/frontend` - 前端项目
- `/backend` - 后端项目

## 开发环境设置

### 前提条件

- Node.js v18+
- MongoDB v6+

### 安装依赖

```bash
npm run install:all
```

### 配置环境变量

1. 在`backend`目录创建`.env`文件，参考已有的环境变量配置

### 启动开发服务器

```bash
# 启动前端和后端
npm run dev

# 仅启动前端
npm run dev:frontend

# 仅启动后端
npm run dev:backend
```

## 部署

### 使用Docker部署

```bash
docker-compose up -d
```

## 注意事项

- MongoDB默认使用端口27017，确保该端口可用
- 前端默认运行在端口5173，后端默认运行在端口3000

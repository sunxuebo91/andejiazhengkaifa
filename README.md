# 安得家政 CRM 系统

> 基于 NestJS + React 的现代化家政服务管理平台

## 快速开始

```bash
# 启动所有服务
./scripts/manage.sh start

# 查看服务状态
./scripts/manage.sh status

# 查看日志
./scripts/manage.sh logs
```

## 系统架构

| 服务 | 技术栈 | 端口 |
|------|-------|------|
| 前端 | React + Vite + TypeScript | 4173 |
| 后端 | NestJS + MongoDB | 3000 |
| 数据库 | MongoDB | 27017 |

## 核心功能

- 客户管理 - 客户信息、跟进记录、批量导入
- 线索管理 - 线索池、自动分配、转移规则
- 简历管理 - 阿姨档案、档期管理、技能证书
- 合同管理 - 电子签约、换人功能、历史追溯
- 视频面试 - ZEGO音视频、提词器、美颜
- 保险管理 - 大树保集成、在线投保
- 通知系统 - 实时推送、微信通知

## 管理命令

```bash
# 日常操作
./scripts/manage.sh start     # 启动服务
./scripts/manage.sh stop      # 停止服务
./scripts/manage.sh restart   # 重启服务
./scripts/manage.sh status    # 查看状态
./scripts/manage.sh logs      # 查看日志

# 部署操作
./scripts/deploy.sh deploy    # 完整部署
./scripts/deploy.sh quick     # 快速重启
./scripts/deploy.sh backup    # 手动备份
```

## 访问地址

- **前端**: https://crm.andejiazheng.com
- **API**: https://crm.andejiazheng.com/api
- **Swagger文档**: https://crm.andejiazheng.com/api/docs

## 详细文档

完整的产品和技术文档请查看 [DOCUMENTATION.md](DOCUMENTATION.md)

## 技术栈

**后端**: NestJS, MongoDB, Mongoose, JWT, Socket.IO  
**前端**: React, TypeScript, Vite, Ant Design, Redux Toolkit  
**第三方**: 爱签电子签约, 大树保保险, ZEGO音视频, 腾讯云OCR/COS 
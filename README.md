# 🏠 安得家政CRM系统

> **基于PM2的现代化家政服务管理平台**

## 🚀 快速开始

```bash
# 启动所有服务
./scripts/manage.sh start

# 查看服务状态
./scripts/manage.sh status

# 查看日志
./scripts/manage.sh logs
```

## 📦 系统架构

| 服务 | 技术栈 | 端口 | 说明 |
|------|-------|------|------|
| 前端 | React + Vite | 4173 | 用户界面 |
| 后端 | NestJS | 3000 | API服务 |
| 数据库 | MongoDB | 27017 | 数据存储 |

## 🛠️ 管理命令

### 日常操作
```bash
./scripts/manage.sh start     # 启动服务
./scripts/manage.sh stop      # 停止服务
./scripts/manage.sh restart   # 重启服务
./scripts/manage.sh status    # 查看状态
./scripts/manage.sh logs      # 查看日志
```

### 部署操作
```bash
./scripts/deploy.sh deploy   # 完整部署
./scripts/deploy.sh quick    # 快速重启
./scripts/deploy.sh backup   # 手动备份
```

## 🌐 访问地址

- **前端**: https://crm.andejiazheng.com
- **API**: https://crm.andejiazheng.com/api
- **文档**: https://crm.andejiazheng.com/api/docs

## 📚 详细文档

- [项目管理指南](PROJECT_MANAGEMENT.md)
- [开发工作流](DEVELOPMENT_WORKFLOW.md)

## 🎯 技术特点

- ✅ **PM2集群管理** - 高可用，自动重启
- ✅ **无缝部署** - 零停机更新
- ✅ **实时监控** - 性能和日志监控
- ✅ **自动备份** - 数据安全保障
- ✅ **统一脚本** - 简化运维操作

---

💡 **建议**: 使用统一管理脚本进行所有操作，确保系统稳定运行。 
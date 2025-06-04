# 📋 安得家政CRM项目管理指南

## 🎯 统一管理方案：PM2

**✅ 系统已完全统一使用PM2管理，Docker已清理**

### 为什么选择PM2？
- 🏢 **适合项目规模** - 小型CRM系统，单机部署
- 💰 **资源效率高** - 直接运行在宿主机，无容器开销  
- 🚀 **运维简单** - 学习成本低，调试方便
- 📊 **实时监控** - 内置进程监控和日志管理
- 🔄 **集群支持** - 后端服务轻松扩展多实例

## 📦 服务架构

| 服务 | 实例数 | 端口 | 模式 | 内存限制 |
|------|-------|------|------|----------|
| backend | 2 | 3000 | cluster | 512MB |
| frontend | 1 | 4173 | fork | 256MB |
| mongodb | 1 | 27017 | fork | 无限制 |

## 🛠️ 统一管理命令

### 基础操作
```bash
# 启动所有服务
./scripts/manage.sh start

# 停止所有服务
./scripts/manage.sh stop

# 重启所有服务
./scripts/manage.sh restart

# 查看服务状态
./scripts/manage.sh status
```

### 日志管理
```bash
# 查看所有日志
./scripts/manage.sh logs

# 查看特定服务日志
./scripts/manage.sh logs backend
./scripts/manage.sh logs frontend
./scripts/manage.sh logs mongodb
```

### 部署命令
```bash
# 完整部署流程
./scripts/deploy.sh deploy

# 快速重启（不更新代码）
./scripts/deploy.sh quick

# 回滚到指定版本
./scripts/deploy.sh rollback 20240604_102530

# 手动备份
./scripts/deploy.sh backup
```

## 🔍 监控和调试

### PM2内置监控
```bash
# 服务列表
pm2 list

# 实时监控面板
pm2 monit

# 服务详情
pm2 show backend
```

### 日志调试
```bash
# 实时日志
pm2 logs

# 错误日志
pm2 logs --err

# 指定行数
pm2 logs backend --lines 100
```

## 🚀 部署流程

### 自动化部署
1. **代码检查** → 质量检查和测试
2. **构建项目** → 前端和后端构建
3. **备份当前版本** → 自动创建备份点
4. **无缝部署** → PM2集群逐个重启
5. **健康检查** → 验证服务正常
6. **清理备份** → 保留7天内备份

### 回滚机制
- 自动备份：每次部署前自动创建
- 快速回滚：一键恢复到指定版本
- 状态保存：PM2进程状态完整备份

## 📊 性能监控

### 资源使用
- **CPU监控**: 实时CPU使用率
- **内存监控**: 自动重启超限进程
- **重启统计**: 异常重启次数追踪

### 性能指标
| 指标 | 正常范围 | 告警阈值 |
|------|----------|----------|
| CPU使用率 | < 70% | > 80% |
| 内存使用 | < 80% | > 90% |
| 响应时间 | < 200ms | > 500ms |

## 🛡️ 数据安全

### 备份策略
- **自动备份**: 部署前自动创建快照
- **定期备份**: 每日凌晨2点数据备份
- **版本控制**: Git代码版本管理
- **配置备份**: PM2状态文件备份

### 恢复机制
- **快速回滚**: 1分钟内恢复服务
- **数据恢复**: MongoDB备份还原
- **配置恢复**: PM2状态快速恢复

## 🔧 配置文件

### ecosystem.config.js
PM2服务配置文件，定义所有服务的运行参数。

### scripts/manage.sh
日常管理脚本，提供统一的操作接口。

### scripts/deploy.sh
部署脚本，支持完整部署、快速重启、版本回滚。

## 🌐 访问入口

- **前端应用**: https://crm.andejiazheng.com
- **后端API**: https://crm.andejiazheng.com/api
- **API文档**: https://crm.andejiazheng.com/api/docs

## 📈 扩展计划

当前配置支持：
- **并发用户**: 100-500人
- **数据量**: 千万级记录
- **文件上传**: 50MB限制
- **服务器要求**: 2GB内存

未来扩展可考虑：
- 增加服务器节点
- MongoDB集群部署
- Redis缓存层
- CDN静态资源

---

💡 **总结**: PM2方案简单高效，完全满足当前业务需求，建议保持现有架构。 
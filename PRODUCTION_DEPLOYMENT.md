# 生产环境部署指南

## 📋 概述

本项目使用PM2进行生产环境的进程管理，提供了一套完整的部署、更新、监控和回滚脚本。

## 🚀 快速开始

### 当前服务状态
```bash
# 查看PM2服务状态
pm2 list

# 执行健康检查
./monitor-production.sh check
```

### 更新生产环境
```bash
# 更新全部（前后端）
./update-production.sh

# 只更新后端
./update-production.sh backend

# 只更新前端
./update-production.sh frontend
```

## 📜 脚本说明

### 1. `update-production.sh` - 生产环境更新脚本

**功能：**
- 拉取最新代码
- 自动备份当前状态
- 安装依赖并构建
- 重启PM2服务
- 执行健康检查

**用法：**
```bash
./update-production.sh [backend|frontend|all]
```

**更新流程：**
1. 检查Git状态
2. 拉取最新代码
3. 创建备份（代码版本 + PM2状态）
4. 安装依赖
5. 构建应用
6. 重启服务
7. 健康检查

### 2. `rollback-production.sh` - 生产环境回滚脚本

**功能：**
- 回滚到指定备份版本
- 恢复Git代码
- 重新构建应用
- 恢复PM2服务

**用法：**
```bash
# 查看可用备份
./rollback-production.sh

# 回滚到指定备份
./rollback-production.sh backups/20241220_143022
```

### 3. `monitor-production.sh` - 生产环境监控脚本

**功能：**
- 服务状态检查
- 端口监听检查
- HTTP响应检查
- 系统资源监控
- 错误日志分析

**用法：**
```bash
# 执行一次检查
./monitor-production.sh check

# 持续监控（30秒间隔）
./monitor-production.sh watch

# 查看日志
./monitor-production.sh logs
```

## 🔧 PM2 配置

### 当前运行的服务
- `backend-prod` - 后端生产服务 (端口3000)
- `frontend-prod` - 前端生产服务 (端口8080)
- `backend-dev` - 后端开发服务
- `frontend-dev` - 前端开发服务

### 常用PM2命令
```bash
# 查看服务状态
pm2 list

# 查看日志
pm2 logs
pm2 logs backend-prod
pm2 logs frontend-prod

# 重启服务
pm2 restart backend-prod
pm2 restart frontend-prod

# 停止服务
pm2 stop backend-prod
pm2 stop frontend-prod

# 查看详细信息
pm2 show backend-prod
pm2 monit
```

## 📁 目录结构

```
├── backend/                 # 后端代码
├── frontend/                # 前端代码
├── backups/                 # 自动备份目录
│   └── YYYYMMDD_HHMMSS/    # 按时间戳命名的备份
├── ecosystem.config.js      # PM2配置文件
├── update-production.sh     # 更新脚本
├── rollback-production.sh   # 回滚脚本
├── monitor-production.sh    # 监控脚本
└── pm2-deploy.sh           # 原有的PM2部署脚本
```

## 🔄 典型工作流程

### 日常更新流程
1. **开发完成后推送代码到仓库**
2. **在生产服务器执行更新**
   ```bash
   ./update-production.sh
   ```
3. **检查服务状态**
   ```bash
   ./monitor-production.sh check
   ```

### 紧急回滚流程
1. **查看可用备份**
   ```bash
   ./rollback-production.sh
   ```
2. **选择备份进行回滚**
   ```bash
   ./rollback-production.sh backups/20241220_143022
   ```
3. **验证回滚结果**
   ```bash
   ./monitor-production.sh check
   ```

## 🚨 故障排除

### 服务无法启动
```bash
# 查看详细错误日志
pm2 logs backend-prod --lines 50

# 检查端口占用
netstat -tuln | grep :3000
netstat -tuln | grep :8080

# 手动重启服务
pm2 restart backend-prod
pm2 restart frontend-prod
```

### 构建失败
```bash
# 清理node_modules重新安装
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install

# 检查磁盘空间
df -h

# 检查内存使用
free -h
```

### 数据库连接问题
```bash
# 检查数据库服务状态
systemctl status mysql
# 或
systemctl status postgresql

# 查看数据库连接配置
cat backend/.env
```

## 📊 监控指标

### 关键指标
- **服务状态**: PM2进程是否在线
- **端口监听**: 3000(后端) 和 8080(前端) 端口
- **HTTP响应**: API健康检查和前端页面访问
- **系统资源**: CPU、内存、磁盘使用率
- **错误日志**: 应用程序错误和异常

### 告警阈值
- 磁盘使用率 > 80%
- 内存使用率 > 80%
- 服务离线
- HTTP响应异常

## 🔐 安全注意事项

1. **备份管理**: 定期清理旧备份，避免磁盘空间不足
2. **权限控制**: 确保脚本具有适当的执行权限
3. **环境变量**: 敏感信息存储在.env文件中
4. **日志轮转**: 使用PM2的日志轮转功能避免日志文件过大

## 📞 支持

如果遇到问题，请：
1. 查看监控脚本的输出
2. 检查PM2日志
3. 查看系统资源使用情况
4. 必要时执行回滚操作

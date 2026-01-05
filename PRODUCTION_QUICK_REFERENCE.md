# 生产环境快速参考指南

## 🚀 服务管理

### 查看服务状态
```bash
pm2 list
pm2 status
```

### 重启服务
```bash
# 重启生产环境后端
pm2 restart backend-prod

# 重启生产环境前端
pm2 restart frontend-prod

# 重启所有服务
pm2 restart all
```

### 查看日志
```bash
# 实时查看所有日志
pm2 logs

# 查看后端日志
pm2 logs backend-prod

# 查看前端日志
pm2 logs frontend-prod

# 查看最近50行日志
pm2 logs backend-prod --lines 50
```

### 停止/启动服务
```bash
# 停止服务
pm2 stop backend-prod
pm2 stop frontend-prod

# 启动服务
pm2 start ecosystem.config.js --only backend-prod
pm2 start ecosystem.config.js --only frontend-prod
```

## 🔧 部署更新

### 完整部署流程
```bash
# 1. 备份数据库
./scripts/db_backup.sh backup

# 2. 拉取最新代码
git pull origin main

# 3. 构建后端
cd backend
npm install
npm run build
cd ..

# 4. 构建前端
cd frontend
npm install
npm run build
cd ..

# 5. 重启服务
pm2 reload ecosystem.config.js --only backend-prod
pm2 reload ecosystem.config.js --only frontend-prod

# 6. 保存PM2配置
pm2 save
```

### 快速更新（仅代码变更）
```bash
# 后端更新
cd backend && npm run build && cd .. && pm2 reload backend-prod

# 前端更新
cd frontend && npm run build && cd .. && pm2 reload frontend-prod
```

## 🔍 健康检查

### API健康检查
```bash
curl http://localhost:3000/api/health
```

### 前端服务检查
```bash
curl -I http://localhost:4173
```

### 完整服务检查
```bash
# 检查后端
curl -s http://localhost:3000/api/health | jq

# 检查前端
curl -I http://localhost:4173 | head -5

# 检查PM2状态
pm2 list

# 检查Nginx状态
sudo systemctl status nginx
```

## 📊 监控命令

### 实时监控
```bash
# PM2实时监控
pm2 monit

# 系统资源监控
htop

# 查看端口占用
sudo netstat -tulpn | grep -E ':(3000|4173|80|443)'
```

### 日志监控
```bash
# 监控错误日志
tail -f logs/backend-prod-error.log
tail -f logs/frontend-prod-error.log

# 监控Nginx日志
sudo tail -f /var/log/nginx/crm_access.log
sudo tail -f /var/log/nginx/crm_error.log
```

## 🗄️ 数据库管理

### 备份数据库
```bash
./scripts/db_backup.sh backup
```

### 恢复数据库
```bash
# 恢复最新备份
./scripts/db_backup.sh restore

# 恢复指定备份
./scripts/db_backup.sh restore housekeeping_20251229_102848.tar.gz
```

### 查看备份列表
```bash
./scripts/db_backup.sh list
```

## 🌐 Nginx管理

### 测试配置
```bash
sudo nginx -t
```

### 重新加载配置
```bash
sudo systemctl reload nginx
```

### 重启Nginx
```bash
sudo systemctl restart nginx
```

### 查看Nginx状态
```bash
sudo systemctl status nginx
```

## 🔐 环境配置

### 生产环境配置文件
- 后端: `backend/.env`
- 前端: `frontend/.env.production`
- PM2: `ecosystem.config.js`
- Nginx: `/etc/nginx/sites-enabled/crm.andejiazheng.com.conf`

### 查看环境变量
```bash
# 后端环境变量
cat backend/.env

# 前端环境变量
cat frontend/.env.production
```

## 🚨 故障排查

### 服务无法启动
```bash
# 1. 查看错误日志
pm2 logs backend-prod --err --lines 50

# 2. 检查端口占用
sudo lsof -i :3000
sudo lsof -i :4173

# 3. 检查进程状态
pm2 describe backend-prod
```

### 内存不足
```bash
# 查看内存使用
free -h

# 查看PM2进程内存
pm2 list

# 重启占用内存过多的服务
pm2 restart backend-prod
```

### 数据库连接失败
```bash
# 检查MongoDB状态
sudo systemctl status mongod

# 重启MongoDB
sudo systemctl restart mongod

# 查看MongoDB日志
sudo tail -f /var/log/mongodb/mongod.log
```

## 📱 服务端口

- **后端生产**: 3000
- **后端开发**: 3001
- **前端生产**: 4173
- **前端开发**: 5173
- **HTTP**: 80
- **HTTPS**: 443

## 🔗 重要URL

- **生产环境**: https://crm.andejiazheng.com
- **API健康检查**: https://crm.andejiazheng.com/api/health
- **本地后端**: http://localhost:3000
- **本地前端**: http://localhost:4173

## 📞 紧急操作

### 快速回滚
```bash
# 1. 停止当前服务
pm2 stop all

# 2. 恢复数据库备份
./scripts/db_backup.sh restore

# 3. 切换到上一个版本
git checkout <previous-commit>

# 4. 重新构建和启动
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart all
```

### 清理缓存
```bash
# 清理后端缓存
rm -rf backend/cache/*

# 清理前端构建缓存
rm -rf frontend/dist
rm -rf frontend/node_modules/.vite

# 重新构建
cd frontend && npm run build && cd ..
```


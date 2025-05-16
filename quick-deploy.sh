#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "开始启动安德家政CRM系统..."

# 停止现有服务
echo "停止现有服务..."
pm2 stop all || true
pm2 delete all || true

# 确保目录存在
mkdir -p /home/ubuntu/andejiazhengcrm/backend/temp-uploads
mkdir -p /home/ubuntu/andejiazhengcrm/backend/uploads
mkdir -p /home/ubuntu/andejiazhengcrm/backend/public

# 启动后端服务
echo "启动后端服务..."
cd /home/ubuntu/andejiazhengcrm/backend
PM2_HOME="/home/ubuntu/.pm2" pm2 start simple-server.js --name andejiazhengcrm-backend

# 启动前端服务(开发模式)
echo "启动前端服务(开发模式)..."
cd /home/ubuntu/andejiazhengcrm/frontend
PM2_HOME="/home/ubuntu/.pm2" pm2 start "npm run dev" --name andejiazhengcrm-frontend

echo "部署完成！安德家政CRM系统已启动"
echo "前端访问地址: http://localhost:5173"
echo "后端API地址: http://localhost:3001" # 注意simple-server.js使用的是3001端口 
#!/bin/bash

echo "🚀 启动生产环境前后端服务..."

# 创建日志目录
mkdir -p backend/logs
mkdir -p frontend/logs

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2未安装，正在安装..."
    npm install -g pm2
fi

# 构建后端
echo "📦 构建后端应用..."
cd backend
npm install --production
npm run build

# 启动后端生产环境
echo "🔧 启动后端生产服务..."
pm2 start ecosystem.config.js --only backend-prod

cd ..

# 构建前端
echo "📦 构建前端应用..."
cd frontend
npm install --production
npm run build

# 启动前端生产环境 (使用PM2管理)
echo "🔧 启动前端生产服务..."
pm2 start --name "frontend-prod" --interpreter none npm -- run start:prod

cd ..

# 显示PM2状态
echo "📊 PM2进程状态:"
pm2 list

echo "✅ 生产环境启动完成!"
echo "🌐 后端服务: http://localhost:3000"
echo "🌐 前端服务: http://localhost:8080" 
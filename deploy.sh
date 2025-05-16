#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "开始部署安德家政CRM系统..."

# 停止现有服务
echo "停止现有服务..."
pm2 stop all || true
pm2 delete all || true

# 构建前端
echo "构建前端..."
cd /home/ubuntu/andejiazhengcrm/frontend
npm install
npm run build

# 确保前端构建成功并将构建产物复制到后端的public目录
if [ -d "dist" ]; then
  echo "前端构建成功！"
  # 确保后端public目录存在
  mkdir -p /home/ubuntu/andejiazhengcrm/backend/public
  # 复制前端构建产物到后端public目录
  cp -R dist/* /home/ubuntu/andejiazhengcrm/backend/public/
else
  echo "前端构建失败！"
  exit 1
fi

# 构建后端
echo "构建后端..."
cd /home/ubuntu/andejiazhengcrm/backend

# 修复.env文件中的路径
if [ -f ".env" ]; then
  # 备份原始.env文件
  cp .env .env.bak
  # 更新路径
  sed -i 's|/home/ubuntu/andejiazhengkaifa|/home/ubuntu/andejiazhengcrm|g' .env
fi

# 创建临时上传目录
mkdir -p temp-uploads
mkdir -p uploads

npm install
npm run build

# 确保后端构建成功
if [ -d "dist" ]; then
  echo "后端构建成功！"
else
  echo "后端构建失败！"
  exit 1
fi

# 启动后端服务
echo "启动后端服务..."
# 使用 pm2 启动
PM2_HOME="/home/ubuntu/.pm2" pm2 start dist/main.js --name andejiazhengcrm-backend

# 启动前端服务(如果需要独立部署前端)
echo "启动前端服务(开发模式)..."
cd /home/ubuntu/andejiazhengcrm/frontend
PM2_HOME="/home/ubuntu/.pm2" pm2 start "npm run dev" --name andejiazhengcrm-frontend

echo "部署完成！安德家政CRM系统已启动"
echo "前端访问地址: http://localhost:5173"
echo "后端API地址: http://localhost:3000" 
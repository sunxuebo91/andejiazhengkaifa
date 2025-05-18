#!/bin/bash
# 生产环境启动脚本

echo "安德佳政后端生产环境启动脚本"
echo "=============================="

# 检查.env文件
if [ ! -f .env ]; then
    echo "错误: .env文件不存在，请先配置环境变量"
    exit 1
fi

# 安装依赖
echo "正在检查依赖..."
npm ci --only=production --silent || { echo "安装依赖失败"; exit 1; }

# 构建项目
echo "正在构建项目..."
npm run build || { echo "构建失败"; exit 1; }

# 创建管理员（如果需要）
if [ "$1" = "--with-admin" ]; then
    echo "正在初始化管理员用户..."
    npm run create:admin || { echo "创建管理员失败"; exit 1; }
fi

# 启动生产环境 (使用PM2)
echo "正在启动生产服务器..."
if command -v pm2 &> /dev/null; then
    pm2 start dist/main.js --name andejiazheng-backend
else
    echo "警告: PM2未安装，使用Node直接启动"
    NODE_ENV=production node dist/main.js
fi 
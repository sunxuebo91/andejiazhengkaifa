#!/bin/bash
# 开发环境启动脚本

echo "安德佳政后端开发环境启动脚本"
echo "=============================="

# 检查.env文件
if [ ! -f .env ]; then
    echo "警告: .env文件不存在，将基于.env.example创建"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "已创建.env文件"
    else
        echo "错误: .env.example文件也不存在，无法继续"
        exit 1
    fi
fi

# 安装依赖
echo "正在检查依赖..."
npm install --silent || { echo "安装依赖失败"; exit 1; }

# 构建项目
echo "正在构建项目..."
npm run build || { echo "构建失败"; exit 1; }

# 创建管理员（如果需要）
if [ "$1" = "--with-admin" ]; then
    echo "正在初始化管理员用户..."
    npm run create:admin || { echo "创建管理员失败"; exit 1; }
fi

# 启动开发环境
echo "正在启动开发服务器..."
npm run start:dev 
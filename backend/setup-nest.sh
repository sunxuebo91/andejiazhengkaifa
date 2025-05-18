#!/bin/bash

echo "安德佳政后端 - NestJS设置脚本"
echo "=============================="

# 构建项目
echo "正在编译TypeScript代码..."
npm run build || { echo "编译失败"; exit 1; }

# 启动NestJS应用
echo "正在启动NestJS应用..."
echo "使用以下环境变量:"
echo "- 数据库主机: $(grep DB_HOST .env | cut -d= -f2)"
echo "- 数据库端口: $(grep DB_PORT .env | cut -d= -f2)"
echo "- 数据库名称: $(grep DB_NAME .env | cut -d= -f2)"
echo "- 应用端口: $(grep PORT .env | cut -d= -f2)"

# 启动应用
node dist/main.js 
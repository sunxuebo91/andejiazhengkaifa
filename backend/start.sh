#!/bin/bash

echo "启动NestJS应用"
echo "=============="

NODE_ENV=${NODE_ENV:-development}
echo "环境: $NODE_ENV"

# 启动NestJS应用
if [ "$NODE_ENV" = "production" ]; then
  echo "生产环境启动..."
  node dist/main.js
else
  echo "开发环境启动..."
  npm run start:dev
fi

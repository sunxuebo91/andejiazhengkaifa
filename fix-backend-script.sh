#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "修复后端服务器问题..."

# 确保.env文件存在（如果不存在则创建）
if [ ! -f "/home/ubuntu/andejiazhengcrm/backend/.env" ]; then
  echo "创建.env文件..."
  cat > /home/ubuntu/andejiazhengcrm/backend/.env << EOF
PORT=3001
MONGODB_URI=mongodb://localhost:27017/housekeeping
JWT_SECRET=andejiazheng-crm-jwt-secret-key
JWT_EXPIRES_IN=24h
NODE_ENV=production
EOF
fi

# 停止当前的后端服务
echo "停止当前后端服务..."
pm2 stop andejiazhengcrm-backend

# 重启后端服务，使用新的server.js文件
echo "使用新的server.js重启服务..."
cd /home/ubuntu/andejiazhengcrm/backend
pm2 delete andejiazhengcrm-backend
pm2 start server.js --name andejiazhengcrm-backend

# 检查服务状态
echo "检查服务状态..."
pm2 status

# 测试API连接
echo "测试API连接..."
sleep 3
curl -X GET https://crm.andejiazheng.com/api/auth/test || echo "API连接测试失败"

echo "后端服务修复完成！"
echo "现在您应该可以使用真实数据库认证系统登录了"
echo "默认管理员账户："
echo "用户名: admin"
echo "密码: admin123" 
#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "开始更新认证系统，从模拟登录切换到数据库认证..."

# 安装必要的依赖
cd /home/ubuntu/andejiazhengcrm/backend
npm install bcrypt jsonwebtoken dotenv --save

# 创建.env文件
cat > /home/ubuntu/andejiazhengcrm/backend/.env << EOF
PORT=3001
MONGODB_URI=mongodb://localhost:27017/housekeeping
JWT_SECRET=andejiazheng-crm-jwt-secret-key
JWT_EXPIRES_IN=24h
NODE_ENV=production
EOF

# 创建必要的目录
mkdir -p /home/ubuntu/andejiazhengcrm/backend/middlewares
mkdir -p /home/ubuntu/andejiazhengcrm/backend/controllers
mkdir -p /home/ubuntu/andejiazhengcrm/backend/routes
mkdir -p /home/ubuntu/andejiazhengcrm/backend/models

# 停止PM2服务
pm2 stop andejiazhengcrm-backend

# 移除模拟登录功能
cd /home/ubuntu/andejiazhengcrm/backend
if [ -f "mock-login.js" ]; then
  rm mock-login.js
  echo "移除了模拟登录文件"
fi

# 从simple-server.js中移除模拟登录路由
if [ -f "simple-server.js" ]; then
  # 备份原始文件
  cp simple-server.js simple-server.js.bak
  
  # 移除模拟登录路由
  sed -i '/\/\/ 引入模拟登录路由/,/app.use/d' simple-server.js
  sed -i '/\/\/ 添加测试路由/,/});/d' simple-server.js
  
  echo "从simple-server.js移除了模拟登录路由"
fi

# 创建管理员用户
cd /home/ubuntu/andejiazhengcrm
node create-admin-user.js

# 重启后端服务
cd /home/ubuntu/andejiazhengcrm
pm2 restart andejiazhengcrm-backend

echo "认证系统更新完成！"
echo "系统现在使用MongoDB数据库进行用户认证"
echo ""
echo "已创建默认管理员用户:"
echo "用户名: admin"
echo "密码: admin123"
echo ""
echo "请登录后立即修改密码!"
echo ""
echo "您可以使用以下命令检查现有用户："
echo "mongosh \"mongodb://localhost:27017/housekeeping\" --eval \"db.users.find().pretty()\"" 
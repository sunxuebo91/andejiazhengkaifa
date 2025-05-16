#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "开始全面修复认证系统..."

# 安装必要的依赖
cd /home/ubuntu/andejiazhengcrm/backend
npm install mongoose bcrypt jsonwebtoken dotenv --save

# 创建.env文件
cat > /home/ubuntu/andejiazhengcrm/backend/.env << EOF
PORT=3001
MONGODB_URI=mongodb://localhost:27017/housekeeping
JWT_SECRET=andejiazheng-crm-jwt-secret-key
JWT_EXPIRES_IN=24h
NODE_ENV=production
EOF

# 停止当前的后端服务
echo "停止当前后端服务..."
pm2 stop andejiazhengcrm-backend || true
pm2 delete andejiazhengcrm-backend || true

# 更新前端服务URL配置
cat > /home/ubuntu/andejiazhengcrm/frontend/.env << EOF
VITE_API_URL=https://crm.andejiazheng.com
VITE_UPLOADS_URL=https://crm.andejiazheng.com/uploads
EOF

# 更新Nginx配置
echo "更新Nginx配置..."
sudo tee /etc/nginx/sites-available/crm.andejiazheng.com.conf > /dev/null << EOF
server {
    listen 80;
    server_name crm.andejiazheng.com;
    
    # 将HTTP重定向到HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name crm.andejiazheng.com;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/crm.andejiazheng.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.andejiazheng.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 前端静态文件 - 直接从后端服务器提供的公共目录
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API路由 - 透明代理到后端服务器
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # 允许跨域
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # 处理OPTIONS预检请求
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 重新构建前端
cd /home/ubuntu/andejiazhengcrm/frontend
npm run build

# 更新静态文件
mkdir -p /home/ubuntu/andejiazhengcrm/backend/public
cp -R dist/* /home/ubuntu/andejiazhengcrm/backend/public/

# 转到项目根目录
cd /home/ubuntu/andejiazhengcrm

# 创建管理员和测试用户
node create-admin-direct.js

# 启动后端服务
cd /home/ubuntu/andejiazhengcrm/backend
pm2 start simple-auth-server.js --name andejiazhengcrm-backend

# 重启前端服务
pm2 restart andejiazhengcrm-frontend || true

# 检查服务状态
pm2 status

# 等待服务启动
sleep 3

# 测试API连接
echo "测试API连接..."
curl -X GET https://crm.andejiazheng.com/api/auth/test

echo "全面修复完成！"
echo ""
echo "系统现在使用MongoDB数据库进行用户认证"
echo ""
echo "已创建两个用户："
echo "1. 管理员用户"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "2. 测试用户"
echo "   用户名: test"
echo "   密码: test123"
echo ""
echo "请立即登录并修改密码!" 
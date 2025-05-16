#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "修复前后端连接问题..."

# 创建更新的前端环境配置文件
cat > /home/ubuntu/andejiazhengcrm/frontend/.env << EOF
# 使用本地连接，解决跨域问题
VITE_API_URL=http://localhost:3001
VITE_UPLOADS_URL=http://localhost:3001/uploads
EOF

# 更新Nginx配置以解决CORS问题
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
    
    # 前端配置
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 后端API配置 - 没有/api前缀，直接代理到端口
    location ~ ^/(api|uploads|resumes|users|auth|login) {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # 允许所有跨域请求
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;
        
        # 处理OPTIONS预检请求
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
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

# 重启前端服务
pm2 restart andejiazhengcrm-frontend

# 重启后端服务
pm2 restart andejiazhengcrm-backend

echo "前后端连接问题修复完成!"
echo "请使用 https://crm.andejiazheng.com 重新访问并尝试登录" 
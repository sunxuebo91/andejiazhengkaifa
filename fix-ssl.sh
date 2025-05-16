#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "修复SSL证书问题..."

# 更新Nginx配置，将crm子域名重定向到主域名
sudo tee /etc/nginx/sites-available/crm.andejiazheng.com.conf > /dev/null << EOF
server {
    listen 80;
    server_name crm.andejiazheng.com;
    
    # 将HTTP重定向到主域名HTTPS
    location / {
        return 301 https://andejiazheng.com\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name crm.andejiazheng.com;
    
    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/crm.andejiazheng.com.pem;
    ssl_certificate_key /etc/nginx/ssl/crm.andejiazheng.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 重定向所有访问到主域名
    location / {
        return 301 https://andejiazheng.com\$request_uri;
    }
}

# 配置主域名服务器
server {
    listen 80;
    server_name andejiazheng.com www.andejiazheng.com;
    
    # 将HTTP重定向到HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name andejiazheng.com www.andejiazheng.com;
    
    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/crm.andejiazheng.com.pem;
    ssl_certificate_key /etc/nginx/ssl/crm.andejiazheng.com.key;
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
    
    # 后端API配置
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 静态文件配置
    location /uploads {
        alias /home/ubuntu/andejiazhengcrm/backend/uploads;
        expires 30d;
    }
}
EOF

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 更新前端环境配置为主域名
cat > /home/ubuntu/andejiazhengcrm/frontend/.env << EOF
VITE_API_URL=https://andejiazheng.com/api
VITE_UPLOADS_URL=https://andejiazheng.com/uploads
EOF

# 重新构建前端
cd /home/ubuntu/andejiazhengcrm/frontend
npm run build

# 更新静态文件
mkdir -p /home/ubuntu/andejiazhengcrm/backend/public
cp -R dist/* /home/ubuntu/andejiazhengcrm/backend/public/

# 重启前端服务
pm2 restart andejiazhengcrm-frontend || true

echo "SSL证书问题修复完成!"
echo "现在请使用 https://andejiazheng.com 访问您的网站" 
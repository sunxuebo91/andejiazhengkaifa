#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "开始配置域名和SSL证书..."

# 设置实际域名
DOMAIN="crm.andejiazheng.com"
EMAIL="admin@andejiazheng.com"

# 安装Nginx和Certbot (用于SSL证书)
echo "安装必要的软件..."
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 创建Nginx配置文件
echo "配置Nginx..."
sudo tee /etc/nginx/sites-available/${DOMAIN}.conf > /dev/null << EOF
server {
    server_name ${DOMAIN};
    
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
    
    # SSL配置将由Certbot自动添加
}
EOF

# 启用站点配置
sudo ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t

# 重新加载Nginx配置
sudo systemctl reload nginx

# 获取SSL证书
echo "获取SSL证书..."
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

# 设置自动续期
echo "设置证书自动续期..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo "域名和SSL证书配置完成!"
echo "您的网站现在可通过 https://${DOMAIN} 访问"
echo "前端: https://${DOMAIN}"
echo "后端API: https://${DOMAIN}/api" 
#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "更新前端API配置..."

# 设置实际域名
DOMAIN="crm.andejiazheng.com"

# 创建或更新前端环境配置文件
cat > /home/ubuntu/andejiazhengcrm/frontend/.env << EOF
VITE_API_URL=https://${DOMAIN}/api
VITE_UPLOADS_URL=https://${DOMAIN}/uploads
EOF

# 重新构建前端
cd /home/ubuntu/andejiazhengcrm/frontend
npm run build

# 更新静态文件
mkdir -p /home/ubuntu/andejiazhengcrm/backend/public
cp -R dist/* /home/ubuntu/andejiazhengcrm/backend/public/

# 重启前端服务
pm2 restart andejiazhengcrm-frontend

echo "前端API配置已更新！"
echo "前端现在将使用 https://${DOMAIN}/api 作为API端点" 
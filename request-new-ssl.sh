#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "申请新的SSL证书..."

# 设置域名
DOMAIN="crm.andejiazheng.com"
EMAIL="admin@andejiazheng.com"

# 使用Let's Encrypt申请新证书
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

echo "新SSL证书申请完成!"
echo "如果申请成功，您的网站现在可通过 https://$DOMAIN 安全访问"
echo "如果失败，请考虑使用我们的临时解决方案 fix-ssl.sh" 
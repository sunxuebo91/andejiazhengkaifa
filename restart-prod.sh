#!/bin/bash

echo "重启生产环境服务..."

# 重启前端
cd /home/ubuntu/andejiazhengcrm/frontend
pm2 restart ecosystem.config.js --only frontend-prod

echo "前端生产服务已重启"

# 显示PM2状态
pm2 list

echo "生产环境服务重启完成！"


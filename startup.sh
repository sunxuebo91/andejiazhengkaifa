#!/bin/bash

# 记录启动时间
echo "启动脚本运行于 $(date)" >> /home/ubuntu/andejiazhengcrm/logs/startup.log

# 确保目录存在
cd /home/ubuntu/andejiazhengcrm

# 使用PM2启动所有应用
echo "正在启动所有应用..." >> /home/ubuntu/andejiazhengcrm/logs/startup.log
pm2 start ecosystem.config.js

# 保存PM2进程列表
echo "保存PM2进程列表..." >> /home/ubuntu/andejiazhengcrm/logs/startup.log
pm2 save

echo "启动脚本完成!" >> /home/ubuntu/andejiazhengcrm/logs/startup.log 
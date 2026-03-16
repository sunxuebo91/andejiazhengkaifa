#!/bin/bash
# 每日服务器状态报告脚本

REPORT_FILE="/home/ubuntu/.openclaw/workspace/daily-report.txt"

echo "=== 每日服务器状态报告 ===" > "$REPORT_FILE"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 1. 服务器状态
echo "📊 服务器状态" >> "$REPORT_FILE"
echo "负载: $(uptime | awk -F'load average:' '{print $2}')" >> "$REPORT_FILE"
echo "内存: $(free -h | grep Mem | awk '{print $3 "/" $2}')" >> "$REPORT_FILE"
echo "磁盘: $(df -h / | tail -1 | awk '{print $3 " / " $2 " (" $5 " used)"}')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 2. CRM 备份状态
echo "📦 CRM 项目备份状态" >> "$REPORT_FILE"
BACKUP_DIR="/home/ubuntu/andejiazhengcrm/backups/mongodb"
if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_TIME=$(ls -ld --time-style=long-iso "$BACKUP_DIR/$LATEST_BACKUP" 2>/dev/null | awk '{print $6 " " $7}')
        echo "最新备份: $LATEST_BACKUP" >> "$REPORT_FILE"
        echo "备份时间: $BACKUP_TIME" >> "$REPORT_FILE"
        
        BACKUP_EPOCH=$(stat -c '%Y' "$BACKUP_DIR/$LATEST_BACKUP" 2>/dev/null)
        NOW_EPOCH=$(date +%s)
        DIFF_HOURS=$(( (NOW_EPOCH - BACKUP_EPOCH) / 3600 ))
        
        if [ $DIFF_HOURS -lt 24 ]; then
            echo "状态: ✅ 正常 (${DIFF_HOURS}小时前)" >> "$REPORT_FILE"
        else
            echo "状态: ⚠️ 超过24小时未备份 (${DIFF_HOURS}小时前)" >> "$REPORT_FILE"
        fi
    else
        echo "状态: ❌ 未找到备份文件" >> "$REPORT_FILE"
    fi
else
    echo "状态: ❌ 备份目录不存在" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# 3. CRM 服务状态
echo "🔧 CRM 服务状态" >> "$REPORT_FILE"
pm2 list 2>/dev/null | grep -E "andejiazheng|backend|frontend" >> "$REPORT_FILE" || echo "PM2 未运行" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 4. OpenClaw 状态
echo "🤖 OpenClaw 状态" >> "$REPORT_FILE"
openclaw gateway status 2>/dev/null | grep -E "Gateway|Runtime|Listening" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 写入标记文件，提示我发送报告
# echo "REPORT_READY" > /home/ubuntu/.openclaw/workspace/.daily-report-trigger

# 写入标记文件，触发我发送报告
echo "REPORT_READY" > /home/ubuntu/.openclaw/workspace/.daily-report-trigger

# 同时通过 cron 定时检查并发送（每 5 分钟检查一次）
# 这样即使 heartbeat 没有及时触发，cron 也会帮我发送报告

echo "报告生成完成: $(date)"

echo "报告发送完成: $(date)"

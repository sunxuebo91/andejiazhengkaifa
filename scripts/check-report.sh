#!/bin/bash
# 检查是否有待发送的报告并发送

TRIGGER_FILE="/home/ubuntu/.openclaw/workspace/.daily-report-trigger"
REPORT_FILE="/home/ubuntu/.openclaw/workspace/daily-report.txt"

if [ -f "$TRIGGER_FILE" ] && [ -f "$REPORT_FILE" ]; then
    echo "发现待发送报告，尝试发送..."
    
    # 尝试发送报告
    REPORT_CONTENT=$(cat "$REPORT_FILE")
    RESULT=$(openclaw message send --channel wecom --target SunXueBo --message "$REPORT_CONTENT" 2>&1)
    
    if echo "$RESULT" | grep -q "messageId"; then
        echo "报告发送成功!"
        rm -f "$TRIGGER_FILE"
    else
        echo "发送失败: $RESULT"
    fi
fi

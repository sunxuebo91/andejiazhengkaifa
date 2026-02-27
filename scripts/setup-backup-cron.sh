#!/bin/bash

###############################################################################
# 设置 MongoDB 自动备份定时任务
###############################################################################

SCRIPT_DIR="/home/ubuntu/andejiazhengcrm/scripts"
BACKUP_SCRIPT="$SCRIPT_DIR/mongodb-backup.sh"

echo "=========================================="
echo "🕐 设置 MongoDB 自动备份定时任务"
echo "=========================================="
echo ""

# 检查备份脚本是否存在
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ 错误: 备份脚本不存在: $BACKUP_SCRIPT"
    exit 1
fi

# 检查脚本是否有执行权限
if [ ! -x "$BACKUP_SCRIPT" ]; then
    echo "⚠️  备份脚本没有执行权限，正在添加..."
    chmod +x "$BACKUP_SCRIPT"
fi

echo "📋 可选的备份计划:"
echo ""
echo "1) 每天凌晨 2:00 备份（推荐）"
echo "2) 每天凌晨 3:00 备份"
echo "3) 每天凌晨 4:00 备份"
echo "4) 每 6 小时备份一次"
echo "5) 每 12 小时备份一次"
echo "6) 自定义时间"
echo "7) 查看当前定时任务"
echo "8) 删除定时任务"
echo ""

read -p "请选择 (1-8): " CHOICE

case $CHOICE in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="每天凌晨 2:00"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="每天凌晨 3:00"
        ;;
    3)
        CRON_SCHEDULE="0 4 * * *"
        DESCRIPTION="每天凌晨 4:00"
        ;;
    4)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="每 6 小时"
        ;;
    5)
        CRON_SCHEDULE="0 */12 * * *"
        DESCRIPTION="每 12 小时"
        ;;
    6)
        echo ""
        echo "Cron 表达式格式: 分 时 日 月 周"
        echo "例如: 0 2 * * * (每天凌晨2点)"
        echo "     30 14 * * * (每天下午2:30)"
        echo "     0 */4 * * * (每4小时)"
        echo ""
        read -p "请输入 cron 表达式: " CRON_SCHEDULE
        DESCRIPTION="自定义时间"
        ;;
    7)
        echo ""
        echo "当前的 MongoDB 备份定时任务:"
        crontab -l 2>/dev/null | grep "mongodb-backup.sh" || echo "  (无)"
        echo ""
        exit 0
        ;;
    8)
        echo ""
        echo "正在删除定时任务..."
        crontab -l 2>/dev/null | grep -v "mongodb-backup.sh" | crontab -
        echo "✅ 定时任务已删除"
        echo ""
        exit 0
        ;;
    *)
        echo "❌ 无效的选择"
        exit 1
        ;;
esac

# 确认设置
echo ""
echo "将设置以下定时任务:"
echo "  时间: $DESCRIPTION"
echo "  Cron: $CRON_SCHEDULE"
echo "  脚本: $BACKUP_SCRIPT"
echo ""
read -p "确认设置? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

# 删除旧的定时任务（如果存在）
crontab -l 2>/dev/null | grep -v "mongodb-backup.sh" | crontab - 2>/dev/null

# 添加新的定时任务
(crontab -l 2>/dev/null; echo "$CRON_SCHEDULE $BACKUP_SCRIPT >> /home/ubuntu/mongodb_backups/logs/cron.log 2>&1") | crontab -

echo ""
echo "✅ 定时任务设置成功！"
echo ""
echo "📋 当前定时任务:"
crontab -l | grep "mongodb-backup.sh"
echo ""
echo "💡 提示:"
echo "  - 查看备份日志: tail -f /home/ubuntu/mongodb_backups/logs/backup_*.log"
echo "  - 查看 cron 日志: tail -f /home/ubuntu/mongodb_backups/logs/cron.log"
echo "  - 手动执行备份: bash $BACKUP_SCRIPT"
echo "  - 管理备份文件: bash $SCRIPT_DIR/mongodb-backup-manager.sh"
echo ""

exit 0


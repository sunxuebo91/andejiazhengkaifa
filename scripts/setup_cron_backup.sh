#!/bin/bash

# 设置数据库自动备份的定时任务
# 用法: ./scripts/setup_cron_backup.sh [daily|weekly|monthly]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    exit 1
}

# 获取项目根目录的绝对路径
PROJECT_ROOT="/home/ubuntu/andejiazhengcrm"
BACKUP_SCRIPT="$PROJECT_ROOT/scripts/db_backup.sh"

# 确保备份脚本存在
if [ ! -f "$BACKUP_SCRIPT" ]; then
    error "备份脚本不存在: $BACKUP_SCRIPT"
fi

# 确保脚本有执行权限
chmod +x "$BACKUP_SCRIPT"

# 设置不同频率的定时任务
setup_daily_backup() {
    local cron_job="0 2 * * * $BACKUP_SCRIPT backup >> $PROJECT_ROOT/logs/db_backup.log 2>&1"
    log "设置每天凌晨2点自动备份数据库..."
    
    # 检查是否已存在此任务
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT backup"; then
        warn "自动备份任务已存在，将更新..."
        crontab -l | grep -v "$BACKUP_SCRIPT backup" | crontab -
    fi
    
    # 添加新任务
    (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
    log "✅ 每日备份已设置"
}

setup_weekly_backup() {
    local cron_job="0 3 * * 0 $BACKUP_SCRIPT backup >> $PROJECT_ROOT/logs/db_backup.log 2>&1"
    log "设置每周日凌晨3点自动备份数据库..."
    
    # 检查是否已存在此任务
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT backup"; then
        warn "自动备份任务已存在，将更新..."
        crontab -l | grep -v "$BACKUP_SCRIPT backup" | crontab -
    fi
    
    # 添加新任务
    (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
    log "✅ 每周备份已设置"
}

setup_monthly_backup() {
    local cron_job="0 4 1 * * $BACKUP_SCRIPT backup >> $PROJECT_ROOT/logs/db_backup.log 2>&1"
    log "设置每月1日凌晨4点自动备份数据库..."
    
    # 检查是否已存在此任务
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT backup"; then
        warn "自动备份任务已存在，将更新..."
        crontab -l | grep -v "$BACKUP_SCRIPT backup" | crontab -
    fi
    
    # 添加新任务
    (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
    log "✅ 每月备份已设置"
}

show_help() {
    echo "设置MongoDB数据库自动备份定时任务"
    echo ""
    echo "用法: $0 [频率]"
    echo ""
    echo "频率选项:"
    echo "  daily    - 每天凌晨2点自动备份"
    echo "  weekly   - 每周日凌晨3点自动备份"
    echo "  monthly  - 每月1日凌晨4点自动备份"
    echo ""
    echo "示例:"
    echo "  $0 daily   # 设置每日备份"
}

# 主函数
main() {
    case "$1" in
        daily)
            setup_daily_backup
            ;;
        weekly)
            setup_weekly_backup
            ;;
        monthly)
            setup_monthly_backup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
    
    log "您可以通过运行以下命令检查当前的定时任务:"
    log "  crontab -l"
    log ""
    log "您可以通过运行以下命令手动触发备份:"
    log "  $BACKUP_SCRIPT backup"
}

# 执行主函数
main "$@" 
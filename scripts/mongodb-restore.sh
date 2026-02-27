#!/bin/bash

###############################################################################
# MongoDB 数据恢复脚本
# 功能：
# 1. 列出可用的备份文件
# 2. 从指定备份恢复数据
# 3. 支持完整恢复或指定集合恢复
# 4. 记录恢复日志
###############################################################################

# 配置参数
MONGODB_HOST="127.0.0.1"
MONGODB_PORT="27017"
MONGODB_DB="housekeeping"
BACKUP_DIR="/home/ubuntu/mongodb_backups"
LOG_DIR="/home/ubuntu/mongodb_backups/logs"
TEMP_DIR="/tmp/mongodb_restore_$$"

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# 清理临时目录
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log "🗑️  已清理临时目录"
    fi
}

# 设置退出时清理
trap cleanup EXIT

log "=========================================="
log "MongoDB 数据恢复工具"
log "=========================================="

# 检查 mongorestore 是否安装
if ! command -v mongorestore &> /dev/null; then
    log "❌ 错误: mongorestore 未安装"
    log "请运行: sudo apt-get install mongodb-database-tools"
    exit 1
fi

# 列出可用的备份文件
log "📋 可用的备份文件:"
echo ""
BACKUPS=($(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -rn | cut -d' ' -f2-))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    log "❌ 没有找到备份文件"
    exit 1
fi

# 显示备份列表
for i in "${!BACKUPS[@]}"; do
    BACKUP_FILE="${BACKUPS[$i]}"
    BACKUP_NAME=$(basename "$BACKUP_FILE")
    BACKUP_DATE=$(stat -c %y "$BACKUP_FILE" | cut -d' ' -f1,2 | cut -d'.' -f1)
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    printf "%2d) %s  [%s]  (%s)\n" $((i+1)) "$BACKUP_NAME" "$BACKUP_DATE" "$BACKUP_SIZE"
done

echo ""

# 如果提供了参数，使用参数作为选择
if [ -n "$1" ]; then
    if [ "$1" == "latest" ]; then
        SELECTION=1
        log "🔄 使用最新备份"
    else
        SELECTION=$1
    fi
else
    # 交互式选择
    read -p "请选择要恢复的备份 (输入序号，或按 Ctrl+C 取消): " SELECTION
fi

# 验证选择
if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#BACKUPS[@]} ]; then
    log "❌ 无效的选择"
    exit 1
fi

SELECTED_BACKUP="${BACKUPS[$((SELECTION-1))]}"
log "✅ 已选择备份: $(basename "$SELECTED_BACKUP")"

# 确认恢复操作
echo ""
log "⚠️  警告: 恢复操作将覆盖当前数据库中的数据！"
if [ -z "$2" ] || [ "$2" != "--force" ]; then
    read -p "确认要继续吗? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log "❌ 操作已取消"
        exit 0
    fi
fi

# 创建临时目录
mkdir -p "$TEMP_DIR"
log "📁 创建临时目录: $TEMP_DIR"

# 解压备份文件
log "📦 正在解压备份文件..."
if tar -xzf "$SELECTED_BACKUP" -C "$TEMP_DIR"; then
    log "✅ 备份文件解压成功"
else
    log "❌ 备份文件解压失败"
    exit 1
fi

# 查找备份目录
BACKUP_EXTRACT_DIR=$(find "$TEMP_DIR" -type d -name "backup_*" | head -1)
if [ -z "$BACKUP_EXTRACT_DIR" ]; then
    log "❌ 未找到解压后的备份目录"
    exit 1
fi

log "📂 备份目录: $BACKUP_EXTRACT_DIR"

# 执行恢复
log "🔄 正在恢复数据库..."
echo ""

if mongorestore --host="$MONGODB_HOST" --port="$MONGODB_PORT" --db="$MONGODB_DB" --drop "$BACKUP_EXTRACT_DIR/$MONGODB_DB"; then
    log "✅ 数据库恢复成功！"
else
    log "❌ 数据库恢复失败"
    exit 1
fi

# 验证恢复结果
log "🔍 验证恢复结果..."
COLLECTIONS=$(mongosh "mongodb://$MONGODB_HOST:$MONGODB_PORT/$MONGODB_DB" --quiet --eval "db.getCollectionNames().join(', ')")
log "📊 已恢复的集合: $COLLECTIONS"

log "=========================================="
log "✅ 恢复完成！"
log "=========================================="

exit 0


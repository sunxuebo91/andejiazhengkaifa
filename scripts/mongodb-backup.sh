#!/bin/bash

###############################################################################
# MongoDB 自动备份脚本
# 功能：
# 1. 备份指定的MongoDB数据库
# 2. 压缩备份文件
# 3. 保留最近N天的备份
# 4. 记录备份日志
###############################################################################

# 配置参数
MONGODB_HOST="127.0.0.1"
MONGODB_PORT="27017"
MONGODB_DB="housekeeping"
BACKUP_DIR="/home/ubuntu/mongodb_backups"
LOG_DIR="/home/ubuntu/mongodb_backups/logs"
RETENTION_DAYS=30  # 保留30天的备份

# 创建备份目录
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

# 生成备份文件名（包含日期和时间）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${MONGODB_DB}_${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
LOG_FILE="$LOG_DIR/backup_$(date +"%Y%m%d").log"

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "开始备份 MongoDB 数据库: $MONGODB_DB"
log "=========================================="

# 检查 mongodump 是否安装
if ! command -v mongodump &> /dev/null; then
    log "❌ 错误: mongodump 未安装"
    log "请运行: sudo apt-get install mongodb-database-tools"
    exit 1
fi

# 执行备份
log "📦 正在备份数据库..."
if mongodump --host="$MONGODB_HOST" --port="$MONGODB_PORT" --db="$MONGODB_DB" --out="$BACKUP_PATH" >> "$LOG_FILE" 2>&1; then
    log "✅ 数据库备份成功: $BACKUP_PATH"
else
    log "❌ 数据库备份失败"
    exit 1
fi

# 压缩备份文件
log "🗜️  正在压缩备份文件..."
cd "$BACKUP_DIR" || exit 1
if tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" >> "$LOG_FILE" 2>&1; then
    log "✅ 备份文件压缩成功: ${BACKUP_NAME}.tar.gz"
    # 删除未压缩的备份目录
    rm -rf "$BACKUP_NAME"
    log "🗑️  已删除未压缩的备份目录"
else
    log "❌ 备份文件压缩失败"
    exit 1
fi

# 计算备份文件大小
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log "📊 备份文件大小: $BACKUP_SIZE"

# 清理旧备份（保留最近N天）
log "🧹 清理超过 ${RETENTION_DAYS} 天的旧备份..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    log "🗑️  已删除 $DELETED_COUNT 个旧备份文件"
else
    log "ℹ️  没有需要删除的旧备份"
fi

# 列出当前所有备份
log "📋 当前备份列表:"
find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -printf "%T@ %Tc %p\n" | sort -rn | cut -d' ' -f2- | head -10 | while read -r line; do
    log "   $line"
done

# 统计备份数量和总大小
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "📊 备份统计: 共 $BACKUP_COUNT 个备份文件，总大小 $TOTAL_SIZE"

log "=========================================="
log "✅ 备份完成！"
log "=========================================="

# 发送备份成功通知（可选，需要配置邮件或webhook）
# 这里可以添加通知逻辑，例如发送邮件或调用webhook
# curl -X POST "your-webhook-url" -d "MongoDB backup completed: $BACKUP_NAME"

exit 0


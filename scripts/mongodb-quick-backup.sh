#!/bin/bash

###############################################################################
# MongoDB 快速备份脚本
# 用于手动执行即时备份，带有备份说明标签
###############################################################################

MONGODB_HOST="127.0.0.1"
MONGODB_PORT="27017"
MONGODB_DB="housekeeping"
BACKUP_DIR="/home/ubuntu/mongodb_backups"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 获取备份说明（可选）
BACKUP_LABEL=""
if [ -n "$1" ]; then
    BACKUP_LABEL="_$1"
fi

# 生成备份文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${MONGODB_DB}_${TIMESTAMP}${BACKUP_LABEL}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "=========================================="
echo "🚀 快速备份 MongoDB 数据库"
echo "=========================================="
echo "数据库: $MONGODB_DB"
echo "备份名称: $BACKUP_NAME"
echo ""

# 检查 mongodump 是否安装
if ! command -v mongodump &> /dev/null; then
    echo "❌ 错误: mongodump 未安装"
    echo "请运行: sudo apt-get install mongodb-database-tools"
    exit 1
fi

# 执行备份
echo "📦 正在备份..."
if mongodump --host="$MONGODB_HOST" --port="$MONGODB_PORT" --db="$MONGODB_DB" --out="$BACKUP_PATH" --quiet; then
    echo "✅ 备份成功"
else
    echo "❌ 备份失败"
    exit 1
fi

# 压缩备份
echo "🗜️  正在压缩..."
cd "$BACKUP_DIR" || exit 1
if tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" 2>/dev/null; then
    rm -rf "$BACKUP_NAME"
    BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    echo "✅ 压缩完成"
    echo ""
    echo "=========================================="
    echo "✅ 备份完成！"
    echo "=========================================="
    echo "📁 备份文件: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo "📊 文件大小: $BACKUP_SIZE"
    echo "⏰ 备份时间: $(date +'%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "💡 恢复命令:"
    echo "   bash scripts/mongodb-restore.sh"
    echo ""
else
    echo "❌ 压缩失败"
    exit 1
fi

exit 0


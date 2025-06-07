#!/bin/bash

# MongoDB 数据库备份和恢复脚本
# 用法: ./scripts/db_backup.sh [backup|restore|list|help]

set -e

# 配置
PROJECT_ROOT="/home/ubuntu/andejiazhengcrm"
BACKUP_DIR="$PROJECT_ROOT/backups/mongodb"
DATE_FORMAT=$(date +"%Y%m%d_%H%M%S")

# 数据库配置 - 默认值（如果没有环境变量）
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"27017"}
DB_NAME=${DB_NAME:-"housekeeping"}
DB_USER=${DB_USER:-""}
DB_PASS=${DB_PASS:-""}

# 如果存在.env文件，加载配置
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    source <(grep -o '^MONGO_URI=.*' "$PROJECT_ROOT/backend/.env" | sed 's/^MONGO_URI=//')
    
    # 解析MongoDB URI (mongodb://user:pass@host:port/db)
    if [[ $MONGO_URI =~ mongodb://([^:@]+)?(:([^@]+))?@?([^:/]+)?(:([0-9]+))?/([^/?]+) ]]; then
        DB_USER=${BASH_REMATCH[1]:-$DB_USER}
        DB_PASS=${BASH_REMATCH[3]:-$DB_PASS}
        DB_HOST=${BASH_REMATCH[4]:-$DB_HOST}
        DB_PORT=${BASH_REMATCH[6]:-$DB_PORT}
        DB_NAME=${BASH_REMATCH[7]:-$DB_NAME}
    fi
fi

# 如果存在环境变量，优先使用环境变量
DB_HOST=${MONGO_HOST:-$DB_HOST}
DB_PORT=${MONGO_PORT:-$DB_PORT}
DB_NAME=${MONGO_DB:-$DB_NAME}
DB_USER=${MONGO_USER:-$DB_USER}
DB_PASS=${MONGO_PASS:-$DB_PASS}

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 认证参数
AUTH_PARAMS=""
if [ -n "$DB_USER" ] && [ -n "$DB_PASS" ]; then
    AUTH_PARAMS="--username $DB_USER --password $DB_PASS --authenticationDatabase admin"
fi

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

# 检查依赖
check_dependencies() {
    if ! command -v mongodump &> /dev/null; then
        error "未找到 mongodump 命令。请安装 MongoDB 数据库工具: sudo apt-get install mongodb-org-tools"
    fi
    
    if ! command -v mongorestore &> /dev/null; then
        error "未找到 mongorestore 命令。请安装 MongoDB 数据库工具: sudo apt-get install mongodb-org-tools"
    fi
}

# 备份数据库
backup_database() {
    local backup_name="$DB_NAME"_"$DATE_FORMAT"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log "开始备份数据库 $DB_NAME 到 $backup_path..."
    
    # 确保备份目录存在
    mkdir -p "$backup_path"
    
    # 执行mongodump
    mongodump --host "$DB_HOST" --port "$DB_PORT" $AUTH_PARAMS \
        --db "$DB_NAME" --out "$backup_path" \
        --quiet
    
    # 压缩备份文件
    cd "$BACKUP_DIR"
    tar -czf "$backup_name.tar.gz" "$backup_name"
    rm -rf "$backup_name"  # 删除未压缩的目录
    
    log "✅ 数据库备份完成: $BACKUP_DIR/$backup_name.tar.gz"
    
    # 保留最近30天的备份，删除更早的
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +30 -delete
    log "已清理超过30天的旧备份"
}

# 恢复数据库
restore_database() {
    local backup_file="$1"
    
    # 检查备份文件是否存在
    if [ -z "$backup_file" ]; then
        # 如果没有指定备份文件，使用最新的备份
        backup_file=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
        if [ -z "$backup_file" ]; then
            error "没有找到备份文件"
        fi
        log "使用最新备份: $(basename "$backup_file")"
    elif [ ! -f "$backup_file" ]; then
        # 检查是否是绝对路径
        if [ ! -f "$BACKUP_DIR/$backup_file" ]; then
            error "备份文件不存在: $backup_file"
        else
            backup_file="$BACKUP_DIR/$backup_file"
        fi
    fi
    
    # 解压备份文件
    local temp_dir="$BACKUP_DIR/temp_restore_$(date +%s)"
    mkdir -p "$temp_dir"
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # 找到备份目录
    local backup_dir=$(find "$temp_dir" -type d -name "$DB_NAME" | head -1)
    if [ -z "$backup_dir" ]; then
        backup_dir=$(find "$temp_dir" -type d | head -1)
    fi
    
    if [ -z "$backup_dir" ]; then
        rm -rf "$temp_dir"
        error "备份文件中未找到数据库目录"
    fi
    
    log "开始恢复数据库 $DB_NAME 从 $backup_file..."
    
    # 警告并确认
    warn "⚠️ 警告: 恢复操作将覆盖现有数据库 $DB_NAME"
    read -p "是否继续? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        rm -rf "$temp_dir"
        log "已取消恢复操作"
        return
    fi
    
    # 执行mongorestore
    mongorestore --host "$DB_HOST" --port "$DB_PORT" $AUTH_PARAMS \
        --db "$DB_NAME" --drop "$backup_dir" \
        --quiet
    
    # 清理临时目录
    rm -rf "$temp_dir"
    
    log "✅ 数据库恢复完成"
}

# 列出所有备份
list_backups() {
    log "可用备份列表:"
    
    if [ ! "$(ls -A "$BACKUP_DIR")" ]; then
        log "没有找到备份文件"
        return
    fi
    
    # 列出所有备份文件，按时间排序
    find "$BACKUP_DIR" -name "*.tar.gz" -type f | sort -r | while read backup; do
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -c %y "$backup" | cut -d. -f1)
        echo "$(basename "$backup") ($size) - $date"
    done
}

# 显示帮助
show_help() {
    echo "MongoDB 数据库备份和恢复工具"
    echo ""
    echo "用法: $0 [命令] [参数]"
    echo ""
    echo "命令:"
    echo "  backup              创建新的数据库备份"
    echo "  restore [文件名]     恢复指定的备份文件 (不指定则使用最新备份)"
    echo "  list                列出所有可用备份"
    echo "  help                显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 backup           # 创建新备份"
    echo "  $0 restore          # 恢复最新备份"
    echo "  $0 restore housekeeping_20250607_120000.tar.gz  # 恢复指定备份"
    echo "  $0 list             # 列出所有备份"
}

# 主函数
main() {
    check_dependencies
    
    case "$1" in
        backup)
            backup_database
            ;;
        restore)
            restore_database "$2"
            ;;
        list)
            list_backups
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 
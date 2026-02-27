#!/bin/bash

###############################################################################
# MongoDB 备份管理工具
# 功能：列出、删除、查看备份信息
###############################################################################

BACKUP_DIR="/home/ubuntu/mongodb_backups"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo "MongoDB 备份管理工具"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  list, ls          列出所有备份"
    echo "  info <序号>       查看备份详细信息"
    echo "  delete <序号>     删除指定备份"
    echo "  clean <天数>      删除N天前的备份"
    echo "  stats             显示备份统计信息"
    echo "  help              显示此帮助信息"
    echo ""
}

# 列出所有备份
list_backups() {
    echo -e "${BLUE}=========================================="
    echo "📋 备份文件列表"
    echo -e "==========================================${NC}"
    echo ""
    
    BACKUPS=($(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -rn | cut -d' ' -f2-))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠️  没有找到备份文件${NC}"
        return
    fi
    
    printf "%-4s %-50s %-20s %-10s\n" "序号" "文件名" "创建时间" "大小"
    echo "--------------------------------------------------------------------------------"
    
    for i in "${!BACKUPS[@]}"; do
        BACKUP_FILE="${BACKUPS[$i]}"
        BACKUP_NAME=$(basename "$BACKUP_FILE")
        BACKUP_DATE=$(stat -c %y "$BACKUP_FILE" | cut -d' ' -f1,2 | cut -d'.' -f1)
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        printf "%-4s %-50s %-20s %-10s\n" "$((i+1))" "$BACKUP_NAME" "$BACKUP_DATE" "$BACKUP_SIZE"
    done
    
    echo ""
    echo -e "${GREEN}总计: ${#BACKUPS[@]} 个备份文件${NC}"
}

# 查看备份详细信息
show_backup_info() {
    local selection=$1
    
    BACKUPS=($(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -rn | cut -d' ' -f2-))
    
    if [ -z "$selection" ] || ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#BACKUPS[@]} ]; then
        echo -e "${RED}❌ 无效的序号${NC}"
        return 1
    fi
    
    BACKUP_FILE="${BACKUPS[$((selection-1))]}"
    
    echo -e "${BLUE}=========================================="
    echo "📊 备份详细信息"
    echo -e "==========================================${NC}"
    echo ""
    echo "文件名: $(basename "$BACKUP_FILE")"
    echo "完整路径: $BACKUP_FILE"
    echo "创建时间: $(stat -c %y "$BACKUP_FILE" | cut -d'.' -f1)"
    echo "文件大小: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo "文件权限: $(stat -c %A "$BACKUP_FILE")"
    echo ""
    
    # 尝试列出备份内容
    echo "备份内容:"
    tar -tzf "$BACKUP_FILE" 2>/dev/null | head -20
    echo ""
}

# 删除指定备份
delete_backup() {
    local selection=$1
    
    BACKUPS=($(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -rn | cut -d' ' -f2-))
    
    if [ -z "$selection" ] || ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#BACKUPS[@]} ]; then
        echo -e "${RED}❌ 无效的序号${NC}"
        return 1
    fi
    
    BACKUP_FILE="${BACKUPS[$((selection-1))]}"
    BACKUP_NAME=$(basename "$BACKUP_FILE")
    
    echo -e "${YELLOW}⚠️  确认要删除以下备份吗？${NC}"
    echo "   $BACKUP_NAME"
    read -p "输入 'yes' 确认删除: " CONFIRM
    
    if [ "$CONFIRM" == "yes" ]; then
        rm -f "$BACKUP_FILE"
        echo -e "${GREEN}✅ 备份已删除${NC}"
    else
        echo -e "${YELLOW}❌ 操作已取消${NC}"
    fi
}

# 清理旧备份
clean_old_backups() {
    local days=$1
    
    if [ -z "$days" ] || ! [[ "$days" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ 请指定天数（数字）${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}⚠️  将删除 ${days} 天前的所有备份${NC}"
    read -p "输入 'yes' 确认: " CONFIRM
    
    if [ "$CONFIRM" == "yes" ]; then
        DELETED_FILES=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +${days} -print)
        DELETED_COUNT=$(echo "$DELETED_FILES" | grep -c "backup_")
        
        if [ "$DELETED_COUNT" -gt 0 ]; then
            echo "$DELETED_FILES"
            find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +${days} -delete
            echo -e "${GREEN}✅ 已删除 $DELETED_COUNT 个备份文件${NC}"
        else
            echo -e "${YELLOW}ℹ️  没有需要删除的备份${NC}"
        fi
    else
        echo -e "${YELLOW}❌ 操作已取消${NC}"
    fi
}

# 显示统计信息
show_stats() {
    echo -e "${BLUE}=========================================="
    echo "📊 备份统计信息"
    echo -e "==========================================${NC}"
    echo ""
    
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f | wc -l)
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    
    echo "备份目录: $BACKUP_DIR"
    echo "备份数量: $BACKUP_COUNT 个"
    echo "总大小: $TOTAL_SIZE"
    echo ""
    
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        OLDEST=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -n | head -1 | cut -d' ' -f2-)
        NEWEST=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -rn | head -1 | cut -d' ' -f2-)
        
        echo "最旧备份: $(basename "$OLDEST")"
        echo "  时间: $(stat -c %y "$OLDEST" | cut -d'.' -f1)"
        echo ""
        echo "最新备份: $(basename "$NEWEST")"
        echo "  时间: $(stat -c %y "$NEWEST" | cut -d'.' -f1)"
    fi
    
    echo ""
}

# 主程序
case "$1" in
    list|ls)
        list_backups
        ;;
    info)
        show_backup_info "$2"
        ;;
    delete)
        delete_backup "$2"
        ;;
    clean)
        clean_old_backups "$2"
        ;;
    stats)
        show_stats
        ;;
    help|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

exit 0


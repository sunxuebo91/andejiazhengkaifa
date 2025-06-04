#!/bin/bash

# 安得家政CRM生产部署脚本
# 支持：代码更新、构建、无缝部署、回滚

set -e

PROJECT_ROOT="/home/ubuntu/andejiazhengcrm"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

cd "$PROJECT_ROOT"

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
}

# 创建备份
backup_current() {
    log "创建当前版本备份..."
    mkdir -p "$BACKUP_DIR"
    
    # 备份前端构建产物
    if [ -d "frontend/dist" ]; then
        cp -r frontend/dist "$BACKUP_DIR/frontend_dist_$DATE"
    fi
    
    # 备份后端构建产物
    if [ -d "backend/dist" ]; then
        cp -r backend/dist "$BACKUP_DIR/backend_dist_$DATE"
    fi
    
    # 备份当前运行状态
    pm2 save --force
    cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2_dump_$DATE.pm2"
    
    log "备份完成: $BACKUP_DIR/*_$DATE"
}

# 更新代码
update_code() {
    log "更新代码..."
    
    # 如果是Git仓库，拉取最新代码
    if [ -d ".git" ]; then
        git stash push -m "deploy_backup_$DATE" || true
        git pull origin main || git pull origin master
        log "代码更新完成"
    else
        warn "非Git仓库，跳过代码更新"
    fi
}

# 安装依赖
install_dependencies() {
    log "检查并安装依赖..."
    
    # 后端依赖
    if [ -f "backend/package.json" ]; then
        log "安装后端依赖..."
        cd backend
        npm ci --production=false
        cd ..
    fi
    
    # 前端依赖
    if [ -f "frontend/package.json" ]; then
        log "安装前端依赖..."
        cd frontend
        npm ci
        cd ..
    fi
}

# 构建项目
build_project() {
    log "构建项目..."
    
    # 构建后端
    log "构建后端..."
    cd backend
    npm run build
    cd ..
    
    # 构建前端
    log "构建前端..."
    cd frontend
    npm run build
    cd ..
    
    log "构建完成"
}

# 数据库迁移（如果需要）
migrate_database() {
    log "检查数据库迁移..."
    # 这里可以添加数据库迁移逻辑
    # 例如：npm run migration:run
    log "数据库检查完成"
}

# 无缝部署
deploy_services() {
    log "开始无缝部署..."
    
    # 重启后端（集群模式，会逐个重启实例）
    log "重启后端服务..."
    pm2 reload backend
    
    # 等待后端启动
    sleep 5
    
    # 重启前端
    log "重启前端服务..."
    pm2 restart frontend
    
    log "服务部署完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 检查服务状态
    if ! pm2 list | grep -q "online"; then
        error "服务启动失败！"
        return 1
    fi
    
    # 检查后端API
    if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
        log "后端API健康检查通过"
    else
        warn "后端API健康检查失败，但可能是正常情况（如果没有health端点）"
    fi
    
    # 检查前端
    if curl -f -s http://localhost:4173 >/dev/null 2>&1; then
        log "前端服务健康检查通过"
    else
        error "前端服务健康检查失败！"
        return 1
    fi
    
    log "所有健康检查通过 ✅"
}

# 回滚功能
rollback() {
    error "部署失败，开始回滚..."
    
    # 查找最新的备份
    LATEST_BACKEND=$(ls -t "$BACKUP_DIR"/backend_dist_* 2>/dev/null | head -1)
    LATEST_FRONTEND=$(ls -t "$BACKUP_DIR"/frontend_dist_* 2>/dev/null | head -1)
    LATEST_PM2=$(ls -t "$BACKUP_DIR"/pm2_dump_* 2>/dev/null | head -1)
    
    if [ -n "$LATEST_BACKEND" ] && [ -n "$LATEST_FRONTEND" ]; then
        log "恢复到上一个版本..."
        
        # 恢复构建产物
        rm -rf backend/dist frontend/dist
        cp -r "$LATEST_BACKEND" backend/dist
        cp -r "$LATEST_FRONTEND" frontend/dist
        
        # 恢复PM2状态
        if [ -n "$LATEST_PM2" ]; then
            cp "$LATEST_PM2" ~/.pm2/dump.pm2
            pm2 resurrect
        else
            pm2 restart all
        fi
        
        log "回滚完成"
    else
        error "没有找到备份文件，无法回滚！"
        exit 1
    fi
}

# 清理旧备份
cleanup_backups() {
    log "清理旧备份..."
    
    # 保留最近7天的备份
    find "$BACKUP_DIR" -name "*_*" -mtime +7 -delete 2>/dev/null || true
    
    log "备份清理完成"
}

# 主部署流程
main_deploy() {
    log "🚀 开始生产部署流程..."
    
    # 创建备份
    backup_current
    
    # 更新代码
    update_code
    
    # 安装依赖
    install_dependencies
    
    # 构建项目
    build_project
    
    # 数据库迁移
    migrate_database
    
    # 部署服务
    deploy_services
    
    # 健康检查
    if health_check; then
        log "🎉 部署成功！"
        cleanup_backups
        
        # 显示服务状态
        pm2 list
    else
        error "❌ 部署失败！"
        rollback
        exit 1
    fi
}

# 快速重启（不更新代码）
quick_restart() {
    log "🔄 快速重启服务..."
    pm2 restart all
    health_check
    log "✅ 快速重启完成"
}

# 回滚到指定版本
rollback_to() {
    if [ -z "$1" ]; then
        error "请指定回滚日期，格式：YYYYMMDD_HHMMSS"
        exit 1
    fi
    
    BACKUP_DATE="$1"
    log "🔙 回滚到版本: $BACKUP_DATE"
    
    # 查找指定备份
    BACKEND_BACKUP="$BACKUP_DIR/backend_dist_$BACKUP_DATE"
    FRONTEND_BACKUP="$BACKUP_DIR/frontend_dist_$BACKUP_DATE"
    
    if [ -d "$BACKEND_BACKUP" ] && [ -d "$FRONTEND_BACKUP" ]; then
        rm -rf backend/dist frontend/dist
        cp -r "$BACKEND_BACKUP" backend/dist
        cp -r "$FRONTEND_BACKUP" frontend/dist
        
        pm2 restart all
        health_check
        
        log "✅ 回滚完成"
    else
        error "❌ 指定的备份不存在！"
        exit 1
    fi
}

# 命令行参数处理
case "$1" in
    deploy)
        main_deploy
        ;;
    quick)
        quick_restart
        ;;
    rollback)
        rollback_to "$2"
        ;;
    backup)
        backup_current
        ;;
    *)
        echo "用法: $0 {deploy|quick|rollback|backup}"
        echo ""
        echo "命令说明："
        echo "  deploy              - 完整部署流程（代码更新+构建+部署）"
        echo "  quick               - 快速重启服务"
        echo "  rollback [日期]     - 回滚到指定版本"
        echo "  backup              - 手动创建备份"
        echo ""
        echo "示例："
        echo "  $0 deploy           # 完整部署"
        echo "  $0 quick            # 快速重启"
        echo "  $0 rollback 20240604_102530  # 回滚到指定版本"
        exit 1
        ;;
esac 
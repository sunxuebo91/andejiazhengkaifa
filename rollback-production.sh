#!/bin/bash

# 生产环境快速回滚脚本
# 用法: ./rollback-production.sh [backup_dir]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BACKUP_DIR=${1}
BACKUPS_ROOT="./backups"

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

# 显示使用帮助
show_usage() {
    echo "生产环境快速回滚脚本"
    echo ""
    echo "用法: ./rollback-production.sh [backup_dir]"
    echo ""
    echo "参数:"
    echo "  backup_dir  备份目录路径 (可选，不提供则显示可用备份)"
    echo ""
    echo "示例:"
    echo "  ./rollback-production.sh                    # 显示可用备份"
    echo "  ./rollback-production.sh backups/20241220_143022  # 回滚到指定备份"
}

# 列出可用备份
list_backups() {
    log "可用的备份:"
    echo ""
    
    if [ ! -d "$BACKUPS_ROOT" ]; then
        warn "没有找到备份目录"
        return
    fi
    
    # 按时间倒序列出备份
    for backup in $(ls -1t "$BACKUPS_ROOT" 2>/dev/null); do
        backup_path="$BACKUPS_ROOT/$backup"
        if [ -d "$backup_path" ]; then
            echo "📦 $backup"
            if [ -f "$backup_path/git_commit.txt" ]; then
                commit=$(cat "$backup_path/git_commit.txt")
                commit_msg=$(git log --format="%s" -n 1 $commit 2>/dev/null || echo "未知提交")
                echo "   Git提交: $commit"
                echo "   提交信息: $commit_msg"
            fi
            if [ -f "$backup_path/pm2_status.txt" ]; then
                echo "   PM2状态: 已保存"
            fi
            echo ""
        fi
    done
}

# 验证备份目录
validate_backup() {
    if [ ! -d "$BACKUP_DIR" ]; then
        error "备份目录不存在: $BACKUP_DIR"
    fi
    
    if [ ! -f "$BACKUP_DIR/git_commit.txt" ]; then
        error "备份目录中没有找到Git提交信息"
    fi
    
    log "✅ 备份目录验证通过: $BACKUP_DIR"
}

# 回滚Git代码
rollback_git() {
    log "回滚Git代码..."
    
    local target_commit=$(cat "$BACKUP_DIR/git_commit.txt")
    info "目标提交: $target_commit"
    
    # 显示当前提交和目标提交的差异
    local current_commit=$(git rev-parse HEAD)
    if [ "$current_commit" != "$target_commit" ]; then
        info "当前提交: $current_commit"
        info "将要回滚到: $target_commit"
        
        # 确认回滚
        read -p "确认回滚到此提交? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消回滚操作"
        fi
        
        # 执行回滚
        git reset --hard $target_commit || error "Git回滚失败"
        log "✅ Git代码回滚成功"
    else
        info "代码已经是目标版本，无需回滚"
    fi
}

# 回滚PM2服务
rollback_pm2() {
    log "回滚PM2服务..."
    
    # 停止当前服务
    pm2 stop all || warn "停止PM2服务时出现警告"
    
    # 如果有PM2备份，恢复它
    if [ -f "$BACKUP_DIR/pm2_dump.json" ]; then
        cp "$BACKUP_DIR/pm2_dump.json" ~/.pm2/dump.pm2
        pm2 resurrect || warn "PM2服务恢复时出现警告"
    else
        warn "没有找到PM2备份，使用默认配置重启"
        pm2 start ecosystem.config.js --only backend-prod,frontend-prod || error "PM2服务启动失败"
    fi
    
    # 保存当前状态
    pm2 save
    
    log "✅ PM2服务回滚成功"
}

# 重新构建应用
rebuild_apps() {
    log "重新构建应用..."
    
    # 构建后端
    log "构建后端..."
    cd backend
    npm install --production || error "后端依赖安装失败"
    npm run build || error "后端构建失败"
    cd ..
    
    # 构建前端
    log "构建前端..."
    cd frontend
    npm install || error "前端依赖安装失败"
    npm run build || error "前端构建失败"
    cd ..
    
    log "✅ 应用重新构建成功"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查PM2服务状态
    pm2 list
    
    # 检查端口
    local backend_ok=false
    local frontend_ok=false
    
    if netstat -tuln | grep -q ":3000 "; then
        log "✅ 后端端口 3000 正常"
        backend_ok=true
    else
        warn "⚠️ 后端端口 3000 异常"
    fi
    
    if netstat -tuln | grep -q ":8080 "; then
        log "✅ 前端端口 8080 正常"
        frontend_ok=true
    else
        warn "⚠️ 前端端口 8080 异常"
    fi
    
    # 简单的HTTP检查
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
        log "✅ 后端API健康检查通过"
    else
        warn "⚠️ 后端API健康检查失败"
    fi
    
    if [ "$backend_ok" = true ] && [ "$frontend_ok" = true ]; then
        log "🎉 回滚成功，服务运行正常"
    else
        warn "⚠️ 回滚完成，但部分服务可能存在问题"
    fi
}

# 主函数
main() {
    info "🔄 开始生产环境回滚流程..."
    
    # 如果没有提供备份目录，显示可用备份
    if [ -z "$BACKUP_DIR" ]; then
        list_backups
        echo "请选择一个备份目录进行回滚:"
        echo "用法: ./rollback-production.sh <backup_dir>"
        exit 0
    fi
    
    # 检查必要命令
    for cmd in git npm pm2 curl netstat; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd 未安装"
        fi
    done
    
    # 验证备份
    validate_backup
    
    # 确认回滚操作
    warn "⚠️ 即将执行回滚操作，这将："
    warn "   1. 重置Git代码到备份时的提交"
    warn "   2. 恢复PM2服务配置"
    warn "   3. 重新构建和启动应用"
    echo ""
    read -p "确认继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "用户取消回滚操作"
        exit 0
    fi
    
    # 执行回滚流程
    rollback_git
    rebuild_apps
    rollback_pm2
    
    # 健康检查
    health_check
    
    log "🎉 生产环境回滚完成！"
}

# 执行主函数
main

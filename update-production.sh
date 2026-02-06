#!/bin/bash

# 生产环境快速更新脚本
# 用法: ./update-production.sh [backend|frontend|all] [--skip-deps] [--skip-backup] [--skip-git]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
TARGET=${1:-all}  # 默认更新全部
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)_prod"
SKIP_DEPS=false
SKIP_BACKUP=false
SKIP_GIT=false

# 解析命令行参数
for arg in "$@"; do
    case $arg in
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-git)
            SKIP_GIT=true
            shift
            ;;
    esac
done

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗ ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠ WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ INFO: $1${NC}"
}

step() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')] ▶ $1${NC}"
}

# 显示使用帮助
show_usage() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  生产环境快速更新脚本"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "用法: ./update-production.sh [TARGET] [OPTIONS]"
    echo ""
    echo "目标 (TARGET):"
    echo "  backend   只更新后端"
    echo "  frontend  只更新前端"
    echo "  all       更新前后端 (默认)"
    echo ""
    echo "选项 (OPTIONS):"
    echo "  --skip-deps     跳过依赖安装"
    echo "  --skip-backup   跳过备份创建"
    echo "  --skip-git      跳过Git拉取"
    echo ""
    echo "示例:"
    echo "  ./update-production.sh                    # 更新全部"
    echo "  ./update-production.sh backend            # 只更新后端"
    echo "  ./update-production.sh frontend           # 只更新前端"
    echo "  ./update-production.sh all --skip-deps    # 更新全部但跳过依赖安装"
    echo "  ./update-production.sh backend --skip-git # 更新后端但跳过Git拉取"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 检查Git状态
check_git_status() {
    if [ "$SKIP_GIT" = true ]; then
        warn "跳过Git状态检查"
        return
    fi

    step "检查Git状态..."

    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        warn "检测到未提交的更改，建议先提交或暂存"
        git status --porcelain
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    log "Git状态检查完成"
}

# 拉取最新代码
pull_latest_code() {
    if [ "$SKIP_GIT" = true ]; then
        warn "跳过Git代码拉取"
        return
    fi

    step "拉取最新代码..."

    # 获取当前分支
    CURRENT_BRANCH=$(git branch --show-current)
    info "当前分支: $CURRENT_BRANCH"

    # 保存当前commit
    BEFORE_COMMIT=$(git rev-parse HEAD)

    # 拉取最新代码
    git pull origin $CURRENT_BRANCH || error "代码拉取失败"

    # 检查是否有更新
    AFTER_COMMIT=$(git rev-parse HEAD)
    if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
        info "代码已是最新版本"
    else
        info "代码已更新: $BEFORE_COMMIT -> $AFTER_COMMIT"
    fi

    # 显示最新的几个提交
    info "最新提交:"
    git log --oneline -5
    log "代码拉取完成"
}

# 创建备份
create_backup() {
    log "创建备份..."
    mkdir -p "$BACKUP_DIR"
    
    # 备份PM2进程状态
    pm2 save
    cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2_dump.json" 2>/dev/null || true
    
    # 备份当前运行的版本信息
    git rev-parse HEAD > "$BACKUP_DIR/git_commit.txt"
    pm2 list > "$BACKUP_DIR/pm2_status.txt"
    
    log "备份已保存到: $BACKUP_DIR"
}

# 更新后端
update_backend() {
    log "更新后端..."
    
    cd backend
    
    # 安装/更新依赖
    if [ -f "package-lock.json" ]; then
        npm ci --production || error "后端依赖安装失败"
    else
        npm install --production || error "后端依赖安装失败"
    fi
    
    # 构建
    npm run build || error "后端构建失败"
    
    # 重启后端服务
    log "重启后端服务..."
    pm2 restart backend-prod || error "后端服务重启失败"
    
    cd ..
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if pm2 list | grep -q "backend-prod.*online"; then
        log "✅ 后端服务重启成功"
    else
        error "❌ 后端服务重启失败"
    fi
}

# 更新前端
update_frontend() {
    log "更新前端..."
    
    cd frontend
    
    # 安装/更新依赖
    if [ -f "package-lock.json" ]; then
        npm ci || error "前端依赖安装失败"
    else
        npm install || error "前端依赖安装失败"
    fi
    
    # 构建
    npm run build || error "前端构建失败"
    
    # 重启前端服务
    log "重启前端服务..."
    pm2 restart frontend-prod || error "前端服务重启失败"
    
    cd ..
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if pm2 list | grep -q "frontend-prod.*online"; then
        log "✅ 前端服务重启成功"
    else
        error "❌ 前端服务重启失败"
    fi
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 检查PM2服务状态
    pm2 list
    
    # 检查端口
    if netstat -tuln | grep -q ":3000 "; then
        log "✅ 后端端口 3000 正常"
    else
        warn "⚠️ 后端端口 3000 异常"
    fi
    
    if netstat -tuln | grep -q ":8080 "; then
        log "✅ 前端端口 8080 正常"
    else
        warn "⚠️ 前端端口 8080 异常"
    fi
    
    # 简单的HTTP检查
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
        log "✅ 后端API健康检查通过"
    else
        warn "⚠️ 后端API健康检查失败"
    fi
}

# 主函数
main() {
    info "🚀 开始生产环境更新流程..."
    info "目标: $TARGET"
    
    # 检查参数
    if [[ "$TARGET" != "backend" && "$TARGET" != "frontend" && "$TARGET" != "all" ]]; then
        show_usage
        exit 1
    fi
    
    # 检查必要命令
    for cmd in git npm pm2 curl netstat; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd 未安装"
        fi
    done
    
    # 执行更新流程
    check_git_status
    pull_latest_code
    create_backup
    
    case "$TARGET" in
        "backend")
            update_backend
            ;;
        "frontend")
            update_frontend
            ;;
        "all")
            update_backend
            update_frontend
            ;;
    esac
    
    # 健康检查
    health_check
    
    log "🎉 生产环境更新完成！"
    log "📦 备份目录: $BACKUP_DIR"
    log "🔍 如有问题，可使用以下命令回滚:"
    log "   git reset --hard \$(cat $BACKUP_DIR/git_commit.txt)"
    log "   pm2 resurrect $BACKUP_DIR/pm2_dump.json"
}

# 执行主函数
main

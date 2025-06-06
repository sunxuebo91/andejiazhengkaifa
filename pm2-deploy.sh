#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
ENV_TYPE=$1  # 参数：dev 或 prod
ACTION=$2    # 参数：start, stop, restart, status, logs

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# 显示使用帮助
show_usage() {
    echo "用法: ./pm2-deploy.sh [dev|prod] [start|stop|restart|status|logs|build]"
    echo ""
    echo "环境:"
    echo "  dev    开发环境"
    echo "  prod   生产环境"
    echo ""
    echo "操作:"
    echo "  start    启动服务"
    echo "  stop     停止服务"
    echo "  restart  重启服务"
    echo "  status   查看服务状态"
    echo "  logs     查看日志"
    echo "  build    构建应用"
    echo ""
    echo "示例:"
    echo "  ./pm2-deploy.sh prod start    启动生产环境"
    echo "  ./pm2-deploy.sh dev logs      查看开发环境日志"
}

# 检查必要的命令是否存在
check_requirements() {
    log "检查必要的命令..."
    for cmd in npm node pm2; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd 未安装"
        fi
    done
}

# 构建前端应用
build_frontend() {
    log "构建前端应用 ($ENV_TYPE)..."
    cd frontend
    if [ "$ENV_TYPE" = "prod" ]; then
        npm run build || error "前端构建失败"
    else
        npm run build:dev || error "前端构建失败"
    fi
    cd ..
}

# 构建后端应用
build_backend() {
    log "构建后端应用 ($ENV_TYPE)..."
    cd backend
    npm run build || error "后端构建失败"
    cd ..
}

# 启动服务
start_services() {
    log "启动 $ENV_TYPE 环境服务..."
    
    # 创建日志目录
    mkdir -p logs
    
    if [ "$ENV_TYPE" = "prod" ]; then
        pm2 start ecosystem.config.js --only backend-prod,frontend-prod || error "服务启动失败"
    else
        pm2 start ecosystem.config.js --only backend-dev,frontend-dev || error "服务启动失败"
    fi
    
    pm2 save
    log "服务已启动，使用 'pm2 list' 查看状态"
}

# 停止服务
stop_services() {
    log "停止 $ENV_TYPE 环境服务..."
    
    if [ "$ENV_TYPE" = "prod" ]; then
        pm2 stop backend-prod frontend-prod || warn "停止服务时出现警告"
    else
        pm2 stop backend-dev frontend-dev || warn "停止服务时出现警告"
    fi
    
    pm2 save
    log "服务已停止"
}

# 重启服务
restart_services() {
    log "重启 $ENV_TYPE 环境服务..."
    
    if [ "$ENV_TYPE" = "prod" ]; then
        pm2 restart backend-prod frontend-prod || warn "重启服务时出现警告"
    else
        pm2 restart backend-dev frontend-dev || warn "重启服务时出现警告"
    fi
    
    pm2 save
    log "服务已重启"
}

# 查看服务状态
check_status() {
    log "$ENV_TYPE 环境服务状态..."
    pm2 list
}

# 查看日志
view_logs() {
    log "查看 $ENV_TYPE 环境服务日志..."
    
    if [ "$ENV_TYPE" = "prod" ]; then
        pm2 logs backend-prod frontend-prod
    else
        pm2 logs backend-dev frontend-dev
    fi
}

# 主函数
main() {
    # 检查参数
    if [[ -z "$ENV_TYPE" || -z "$ACTION" ]]; then
        show_usage
        exit 1
    fi
    
    # 检查环境类型
    if [[ "$ENV_TYPE" != "dev" && "$ENV_TYPE" != "prod" ]]; then
        error "环境类型必须是 dev 或 prod"
    fi
    
    # 检查命令
    check_requirements
    
    # 根据操作执行相应的功能
    case "$ACTION" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            check_status
            ;;
        logs)
            view_logs
            ;;
        build)
            build_frontend
            build_backend
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# 执行主函数
main 
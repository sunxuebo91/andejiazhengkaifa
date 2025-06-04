#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
ENV_TYPE=$1  # 参数：dev 或 prod
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)_${ENV_TYPE}"
CONFIG_FILES=(
    "frontend/.env.${ENV_TYPE}"
    "backend/.env.${ENV_TYPE}"
    "frontend/ecosystem.config.${ENV_TYPE}.js"
    "backend/ecosystem.config.${ENV_TYPE}.js"
    "nginx/conf.d/${ENV_TYPE}.conf"
)

# 环境特定配置
if [ "$ENV_TYPE" = "prod" ]; then
    PORT=4173
    NODE_ENV="production"
    PM2_NAME="frontend-prod"
    BACKEND_PM2_NAME="backend-prod"
elif [ "$ENV_TYPE" = "dev" ]; then
    PORT=3000
    NODE_ENV="development"
    PM2_NAME="frontend-dev"
    BACKEND_PM2_NAME="backend-dev"
else
    echo -e "${RED}错误: 请指定环境类型 (dev 或 prod)${NC}"
    echo "用法: ./deploy.sh [dev|prod]"
    exit 1
fi

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

# 检查必要的命令是否存在
check_requirements() {
    log "检查必要的命令..."
    for cmd in git npm node pm2; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd 未安装"
        fi
    done
}

# 创建备份
create_backup() {
    log "创建${ENV_TYPE}环境备份..."
    mkdir -p "$BACKUP_DIR"
    
    # 备份配置文件
    for config in "${CONFIG_FILES[@]}"; do
        if [ -f "$config" ]; then
            cp "$config" "$BACKUP_DIR/"
            log "已备份: $config"
        fi
    done
    
    # 备份 PM2 进程列表
    pm2 save
    cp ~/.pm2/dump.pm2 "$BACKUP_DIR/"
    log "已备份 PM2 进程列表"
}

# 准备环境配置
prepare_env() {
    log "准备${ENV_TYPE}环境配置..."
    
    # 前端环境配置
    if [ -f "frontend/.env.${ENV_TYPE}" ]; then
        cp "frontend/.env.${ENV_TYPE}" "frontend/.env"
        log "已更新前端环境配置"
    fi
    
    # 后端环境配置
    if [ -f "backend/.env.${ENV_TYPE}" ]; then
        cp "backend/.env.${ENV_TYPE}" "backend/.env"
        log "已更新后端环境配置"
    fi
    
    # PM2 配置文件
    if [ -f "frontend/ecosystem.config.${ENV_TYPE}.js" ]; then
        cp "frontend/ecosystem.config.${ENV_TYPE}.js" "frontend/ecosystem.config.js"
        log "已更新前端 PM2 配置"
    fi
    
    if [ -f "backend/ecosystem.config.${ENV_TYPE}.js" ]; then
        cp "backend/ecosystem.config.${ENV_TYPE}.js" "backend/ecosystem.config.js"
        log "已更新后端 PM2 配置"
    fi
}

# 更新依赖
update_dependencies() {
    log "更新依赖..."
    
    # 前端依赖更新
    if [ -f "frontend/package.json" ]; then
        cd frontend
        log "更新前端依赖..."
        npm ci || warn "前端依赖更新失败"
        cd ..
    fi
    
    # 后端依赖更新
    if [ -f "backend/package.json" ]; then
        cd backend
        log "更新后端依赖..."
        npm ci || warn "后端依赖更新失败"
        cd ..
    fi
}

# 构建和重启服务
rebuild_services() {
    log "重新构建和启动服务..."
    
    # 构建前端
    if [ -f "frontend/package.json" ]; then
        cd frontend
        log "构建前端..."
        NODE_ENV=$NODE_ENV npm run build || error "前端构建失败"
        cd ..
    fi
    
    # 重启服务
    log "重启 PM2 服务..."
    
    # 停止现有服务
    pm2 delete $PM2_NAME 2>/dev/null || true
    pm2 delete $BACKEND_PM2_NAME 2>/dev/null || true
    
    # 启动新服务
    if [ -f "frontend/ecosystem.config.js" ]; then
        cd frontend
        pm2 start ecosystem.config.js --only $PM2_NAME || error "前端服务启动失败"
        cd ..
    fi
    
    if [ -f "backend/ecosystem.config.js" ]; then
        cd backend
        pm2 start ecosystem.config.js --only $BACKEND_PM2_NAME || error "后端服务启动失败"
        cd ..
    fi
    
    # 保存 PM2 进程列表
    pm2 save
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查前端服务
    if pm2 list | grep -q $PM2_NAME; then
        log "✅ 前端服务运行正常"
    else
        error "❌ 前端服务未正常运行"
    fi
    
    # 检查后端服务
    if pm2 list | grep -q $BACKEND_PM2_NAME; then
        log "✅ 后端服务运行正常"
    else
        error "❌ 后端服务未正常运行"
    fi
    
    # 检查端口
    if netstat -tuln | grep -q ":$PORT "; then
        log "✅ 端口 $PORT 监听正常"
    else
        warn "⚠️ 端口 $PORT 未正常监听"
    fi
}

# 主函数
main() {
    log "开始${ENV_TYPE}环境部署流程..."
    
    # 检查环境
    check_requirements
    
    # 创建备份
    create_backup
    
    # 准备环境配置
    prepare_env
    
    # 更新依赖
    update_dependencies
    
    # 重建和重启服务
    rebuild_services
    
    # 健康检查
    health_check
    
    log "✅ ${ENV_TYPE}环境部署完成！"
    log "📦 备份目录: $BACKUP_DIR"
    log "🔍 如果遇到问题，可以使用备份恢复"
}

# 执行主函数
main 
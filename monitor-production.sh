#!/bin/bash

# 生产环境监控脚本
# 用法: ./monitor-production.sh [check|watch|logs]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
ACTION=${1:-check}

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

# 显示使用帮助
show_usage() {
    echo "生产环境监控脚本"
    echo ""
    echo "用法: ./monitor-production.sh [check|watch|logs]"
    echo ""
    echo "选项:"
    echo "  check   执行一次健康检查 (默认)"
    echo "  watch   持续监控服务状态"
    echo "  logs    查看服务日志"
    echo ""
    echo "示例:"
    echo "  ./monitor-production.sh         # 执行一次检查"
    echo "  ./monitor-production.sh watch   # 持续监控"
    echo "  ./monitor-production.sh logs    # 查看日志"
}

# 检查PM2服务状态
check_pm2_status() {
    local backend_status=$(pm2 jlist | jq -r '.[] | select(.name=="backend-prod") | .pm2_env.status' 2>/dev/null)
    local frontend_status=$(pm2 jlist | jq -r '.[] | select(.name=="frontend-prod") | .pm2_env.status' 2>/dev/null)
    
    echo "📊 PM2服务状态:"
    if [ "$backend_status" = "online" ]; then
        echo -e "   后端: ${GREEN}✅ 在线${NC}"
    else
        echo -e "   后端: ${RED}❌ 离线 ($backend_status)${NC}"
    fi
    
    if [ "$frontend_status" = "online" ]; then
        echo -e "   前端: ${GREEN}✅ 在线${NC}"
    else
        echo -e "   前端: ${RED}❌ 离线 ($frontend_status)${NC}"
    fi
}

# 检查端口状态
check_ports() {
    echo "🔌 端口状态:"
    
    if netstat -tuln | grep -q ":3000 "; then
        echo -e "   3000 (后端): ${GREEN}✅ 监听中${NC}"
    else
        echo -e "   3000 (后端): ${RED}❌ 未监听${NC}"
    fi
    
    if netstat -tuln | grep -q ":8080 "; then
        echo -e "   8080 (前端): ${GREEN}✅ 监听中${NC}"
    else
        echo -e "   8080 (前端): ${RED}❌ 未监听${NC}"
    fi
}

# 检查HTTP响应
check_http_status() {
    echo "🌐 HTTP状态:"
    
    # 检查后端API
    local backend_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$backend_code" = "200" ]; then
        echo -e "   后端API: ${GREEN}✅ 正常 (200)${NC}"
    else
        echo -e "   后端API: ${RED}❌ 异常 ($backend_code)${NC}"
    fi
    
    # 检查前端
    local frontend_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
    if [ "$frontend_code" = "200" ]; then
        echo -e "   前端页面: ${GREEN}✅ 正常 (200)${NC}"
    else
        echo -e "   前端页面: ${RED}❌ 异常 ($frontend_code)${NC}"
    fi
}

# 检查系统资源
check_system_resources() {
    echo "💻 系统资源:"
    
    # CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    echo "   CPU使用率: ${cpu_usage}%"
    
    # 内存使用率
    local mem_info=$(free | grep Mem)
    local mem_total=$(echo $mem_info | awk '{print $2}')
    local mem_used=$(echo $mem_info | awk '{print $3}')
    local mem_percent=$((mem_used * 100 / mem_total))
    echo "   内存使用率: ${mem_percent}%"
    
    # 磁盘使用率
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    echo "   磁盘使用率: ${disk_usage}%"
    
    # 警告检查
    if [ "$disk_usage" -gt 80 ]; then
        warn "磁盘使用率过高: ${disk_usage}%"
    fi
    
    if [ "$mem_percent" -gt 80 ]; then
        warn "内存使用率过高: ${mem_percent}%"
    fi
}

# 检查日志错误
check_logs_for_errors() {
    echo "📝 最近错误日志:"
    
    # 检查PM2日志中的错误
    local error_count=$(pm2 logs --lines 100 --nostream 2>/dev/null | grep -i "error\|exception\|failed" | wc -l)
    if [ "$error_count" -gt 0 ]; then
        warn "发现 $error_count 条错误日志"
        echo "   最近的错误:"
        pm2 logs --lines 20 --nostream 2>/dev/null | grep -i "error\|exception\|failed" | tail -3
    else
        echo -e "   ${GREEN}✅ 无明显错误${NC}"
    fi
}

# 执行完整健康检查
health_check() {
    info "🔍 执行生产环境健康检查..."
    echo ""
    
    check_pm2_status
    echo ""
    
    check_ports
    echo ""
    
    check_http_status
    echo ""
    
    check_system_resources
    echo ""
    
    check_logs_for_errors
    echo ""
    
    # 显示PM2详细状态
    echo "📋 PM2详细状态:"
    pm2 list
    echo ""
    
    log "✅ 健康检查完成"
}

# 持续监控
watch_services() {
    info "👀 开始持续监控 (按Ctrl+C停止)..."
    
    while true; do
        clear
        echo "=== 生产环境监控 - $(date) ==="
        echo ""
        
        health_check
        
        echo ""
        info "下次检查将在30秒后进行..."
        sleep 30
    done
}

# 查看日志
view_logs() {
    info "📋 查看服务日志..."
    
    echo "选择要查看的日志:"
    echo "1) 后端日志"
    echo "2) 前端日志"
    echo "3) 所有日志"
    echo "4) 错误日志"
    
    read -p "请选择 (1-4): " -n 1 -r
    echo ""
    
    case $REPLY in
        1)
            pm2 logs backend-prod
            ;;
        2)
            pm2 logs frontend-prod
            ;;
        3)
            pm2 logs
            ;;
        4)
            pm2 logs --lines 100 | grep -i "error\|exception\|failed"
            ;;
        *)
            warn "无效选择"
            ;;
    esac
}

# 主函数
main() {
    # 检查必要命令
    for cmd in pm2 curl netstat; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd 未安装"
            exit 1
        fi
    done
    
    case "$ACTION" in
        "check")
            health_check
            ;;
        "watch")
            watch_services
            ;;
        "logs")
            view_logs
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# 执行主函数
main

#!/bin/bash

# 安得家政CRM项目管理脚本
# 使用方法: ./scripts/manage.sh [start|stop|restart|status|logs|clean]

set -e

PROJECT_ROOT="/home/ubuntu/andejiazhengcrm"
cd "$PROJECT_ROOT"

case "$1" in
  start)
    echo "🚀 启动所有服务..."
    pm2 start ecosystem.config.js
    echo "✅ 所有服务已启动"
    pm2 list
    ;;
  
  stop)
    echo "🛑 停止所有服务..."
    pm2 stop ecosystem.config.js
    echo "✅ 所有服务已停止"
    ;;
  
  restart)
    echo "🔄 重启所有服务..."
    pm2 restart ecosystem.config.js
    echo "✅ 所有服务已重启"
    pm2 list
    ;;
  
  status)
    echo "📊 服务状态："
    pm2 list
    echo ""
    echo "📈 服务监控："
    pm2 monit
    ;;
  
  logs)
    if [ -n "$2" ]; then
      echo "📋 查看 $2 服务日志："
      pm2 logs "$2" --lines 50
    else
      echo "📋 查看所有服务日志："
      pm2 logs --lines 20
    fi
    ;;
  
  clean)
    echo "🧹 清理冗余进程和日志..."
    
    # 停止可能冲突的独立MongoDB
    sudo pkill -f "mongod.*--dbpath.*--logpath" || true
    
    # 清理旧日志
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # 重新加载PM2配置
    pm2 delete all || true
    pm2 start ecosystem.config.js
    
    echo "✅ 清理完成"
    ;;
  
  build)
    echo "🔨 构建项目..."
    
    # 构建后端
    echo "构建后端..."
    cd backend && npm run build && cd ..
    
    # 构建前端
    echo "构建前端..."
    cd frontend && npm run build && cd ..
    
    echo "✅ 构建完成"
    ;;
  
  deploy)
    echo "🚀 部署项目..."
    
    # 构建
    ./scripts/manage.sh build
    
    # 重启服务
    ./scripts/manage.sh restart
    
    echo "✅ 部署完成"
    ;;
  
  *)
    echo "用法: $0 {start|stop|restart|status|logs|clean|build|deploy}"
    echo ""
    echo "命令说明："
    echo "  start    - 启动所有服务"
    echo "  stop     - 停止所有服务"
    echo "  restart  - 重启所有服务"
    echo "  status   - 查看服务状态和监控"
    echo "  logs     - 查看日志 (可指定服务名)"
    echo "  clean    - 清理冗余进程和旧日志"
    echo "  build    - 构建前后端项目"
    echo "  deploy   - 完整部署 (构建+重启)"
    echo ""
    echo "示例："
    echo "  $0 logs backend    # 查看后端日志"
    echo "  $0 status          # 查看所有服务状态"
    exit 1
    ;;
esac 
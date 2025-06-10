#!/bin/bash

# 配置守护状态检查脚本
echo "配置保护服务状态"
echo "=================="

# 检查基础守护
if [ -f .config-guard.pid ]; then
    PID=$(cat .config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "✅ 基础配置守护: 运行中 (PID: $PID)"
    else
        echo "❌ 基础配置守护: 已停止"
        rm -f .config-guard.pid
    fi  
else
    echo "❌ 基础配置守护: 未运行"
fi

# 检查AI守护
if [ -f .ai-config-guard.pid ]; then
    PID=$(cat .ai-config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "✅ AI智能守护: 运行中 (PID: $PID)"
    else
        echo "❌ AI智能守护: 已停止"
        rm -f .ai-config-guard.pid
    fi
else
    echo "❌ AI智能守护: 未运行"
fi

echo ""
echo "详细状态:"
node ai-config-guard.js status

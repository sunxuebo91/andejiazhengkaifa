#!/bin/bash

# 配置守护停止脚本
echo "停止配置保护服务..."

# 停止基础守护
if [ -f .config-guard.pid ]; then
    PID=$(cat .config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "基础配置守护已停止 (PID: $PID)"
    fi
    rm -f .config-guard.pid
fi

# 停止AI守护
if [ -f .ai-config-guard.pid ]; then
    PID=$(cat .ai-config-guard.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "AI智能守护已停止 (PID: $PID)"
    fi
    rm -f .ai-config-guard.pid
fi

echo "配置保护服务已停止"

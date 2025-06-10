#!/bin/bash

# 配置守护启动脚本
echo "启动配置保护服务..."

# 基础配置守护
nohup node config-guard.js watch > config-guard.out 2>&1 &
BASIC_PID=$!
echo $BASIC_PID > .config-guard.pid
echo "基础配置守护已启动 (PID: $BASIC_PID)"

# AI智能守护
nohup node ai-config-guard.js watch > ai-config-guard.out 2>&1 &
AI_PID=$!
echo $AI_PID > .ai-config-guard.pid
echo "AI智能守护已启动 (PID: $AI_PID)"

echo "配置保护服务启动完成"
echo "日志文件:"
echo "  - config-guard.out (基础守护日志)"
echo "  - ai-config-guard.out (AI智能守护日志)"
echo "  - config-guard.log (详细日志)"
echo "  - ai-config-guard.log (AI守护详细日志)"

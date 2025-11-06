#!/bin/bash

# ZEGO API 测试脚本
# 用于测试 ZEGO 后端 API 是否正常工作

echo "=========================================="
echo "ZEGO 视频面试 API 测试"
echo "=========================================="
echo ""

# 配置
API_BASE_URL="http://localhost:3000/api"
TOKEN=""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 提示输入 JWT Token
echo -e "${YELLOW}请先登录系统获取 JWT Token${NC}"
echo "您可以："
echo "1. 在浏览器中登录系统"
echo "2. 打开浏览器开发者工具 (F12)"
echo "3. 在 Console 中输入: localStorage.getItem('token')"
echo "4. 复制 Token 并粘贴到下面"
echo ""
read -p "请输入 JWT Token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${RED}错误：Token 不能为空${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "测试 1: 获取 ZEGO 配置"
echo "=========================================="

CONFIG_RESPONSE=$(curl -s -X GET \
  "${API_BASE_URL}/zego/config" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "响应："
echo "$CONFIG_RESPONSE" | jq '.' 2>/dev/null || echo "$CONFIG_RESPONSE"

if echo "$CONFIG_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ 获取配置成功${NC}"
else
    echo -e "${RED}✗ 获取配置失败${NC}"
fi

echo ""
echo "=========================================="
echo "测试 2: 生成 ZEGO Token"
echo "=========================================="

# 生成测试数据
USER_ID="test_user_$(date +%s)"
ROOM_ID="test_room_$(date +%s)"
USER_NAME="测试用户"

echo "测试参数："
echo "  userId: $USER_ID"
echo "  roomId: $ROOM_ID"
echo "  userName: $USER_NAME"
echo ""

TOKEN_RESPONSE=$(curl -s -X POST \
  "${API_BASE_URL}/zego/generate-token" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"${USER_ID}\",
    \"roomId\": \"${ROOM_ID}\",
    \"userName\": \"${USER_NAME}\",
    \"expireTime\": 7200
  }")

echo "响应："
echo "$TOKEN_RESPONSE" | jq '.' 2>/dev/null || echo "$TOKEN_RESPONSE"

if echo "$TOKEN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ 生成 Token 成功${NC}"
    
    # 提取 Token
    ZEGO_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.token' 2>/dev/null)
    if [ ! -z "$ZEGO_TOKEN" ] && [ "$ZEGO_TOKEN" != "null" ]; then
        echo -e "${GREEN}✓ Token 格式正确${NC}"
        echo "  Token 长度: ${#ZEGO_TOKEN} 字符"
    else
        echo -e "${RED}✗ Token 格式错误${NC}"
    fi
else
    echo -e "${RED}✗ 生成 Token 失败${NC}"
    
    # 检查是否是配置问题
    if echo "$TOKEN_RESPONSE" | grep -q "ZEGO configuration is missing"; then
        echo -e "${YELLOW}⚠ 提示：请先配置 ZEGO AppID 和 ServerSecret${NC}"
        echo "  编辑文件: backend/.env"
        echo "  设置以下变量："
        echo "    ZEGO_APP_ID=your_app_id_here"
        echo "    ZEGO_SERVER_SECRET=your_server_secret_here"
    fi
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "如果测试失败，请检查："
echo "1. ZEGO 配置是否正确 (backend/.env)"
echo "2. 后端服务是否正常运行 (pm2 status)"
echo "3. JWT Token 是否有效"
echo ""
echo "查看后端日志："
echo "  pm2 logs backend-prod"
echo ""


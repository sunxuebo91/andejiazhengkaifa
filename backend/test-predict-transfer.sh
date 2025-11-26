#!/bin/bash

# 测试预测流转接口

BASE_URL="http://localhost:3001"

echo "=== 1. 登录获取 Token ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取 token"
  exit 1
fi

echo ""
echo "✅ Token: $TOKEN"
echo ""

echo "=== 2. 获取规则列表 ==="
RULES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/lead-transfer/rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$RULES_RESPONSE" | jq '.'

RULE_ID=$(echo "$RULES_RESPONSE" | jq -r '.data[0]._id')

if [ "$RULE_ID" == "null" ] || [ -z "$RULE_ID" ]; then
  echo "❌ 没有找到规则"
  exit 1
fi

echo ""
echo "✅ 规则ID: $RULE_ID"
echo ""

echo "=== 3. 预测下次流转 ==="
PREDICT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/lead-transfer/rules/$RULE_ID/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$PREDICT_RESPONSE" | jq '.'

echo ""
echo "=== 预测结果摘要 ==="
echo "下次执行时间: $(echo "$PREDICT_RESPONSE" | jq -r '.data.nextExecutionTime')"
echo "待流转线索数: $(echo "$PREDICT_RESPONSE" | jq -r '.data.pendingLeadsCount')"
echo ""
echo "用户预测:"
echo "$PREDICT_RESPONSE" | jq -r '.data.userPredictions[] | "\(.userName): 当前平衡=\(.currentBalance), 预计流出=\(.estimatedTransferOut), 预计流入=\(.estimatedTransferIn), 新平衡=\(.estimatedNewBalance)"'


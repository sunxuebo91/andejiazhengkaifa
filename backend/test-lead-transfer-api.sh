#!/bin/bash

# 线索流转功能API测试脚本

BASE_URL="http://localhost:3001"
TOKEN=""

echo "========================================="
echo "线索流转功能 API 测试"
echo "========================================="
echo ""

# 1. 登录获取 Token
echo "1. 登录获取 Token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
echo ""

# 2. 获取用户列表（用于测试）
echo "2. 获取用户列表..."
USERS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/users" \
  -H "Authorization: Bearer $TOKEN")

echo "$USERS_RESPONSE" | jq '.data.users[] | {_id, name, username, role}' | head -20
echo ""

# 提取两个用户ID用于测试
USER_ID_1=$(echo $USERS_RESPONSE | jq -r '.data.users[0]._id')
USER_ID_2=$(echo $USERS_RESPONSE | jq -r '.data.users[1]._id')
USER_ID_3=$(echo $USERS_RESPONSE | jq -r '.data.users[2]._id')
USER_ID_4=$(echo $USERS_RESPONSE | jq -r '.data.users[3]._id')

echo "测试用户ID: $USER_ID_1, $USER_ID_2, $USER_ID_3, $USER_ID_4"
echo ""

# 3. 创建流转规则
echo "3. 创建流转规则..."
CREATE_RULE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/lead-transfer/rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ruleName\": \"测试流转规则-$(date +%s)\",
    \"description\": \"这是一个测试规则\",
    \"enabled\": true,
    \"triggerConditions\": {
      \"inactiveHours\": 48,
      \"contractStatuses\": [\"待定\", \"匹配中\"],
      \"createdDateRange\": {
        \"startDate\": \"2024-01-01\",
        \"endDate\": null
      }
    },
    \"executionWindow\": {
      \"enabled\": true,
      \"startTime\": \"09:30\",
      \"endTime\": \"18:30\"
    },
    \"sourceUserIds\": [\"$USER_ID_1\", \"$USER_ID_2\"],
    \"targetUserIds\": [\"$USER_ID_3\", \"$USER_ID_4\"],
    \"distributionConfig\": {
      \"strategy\": \"balanced-random\",
      \"enableCompensation\": true,
      \"compensationPriority\": 5
    }
  }")

RULE_ID=$(echo $CREATE_RULE_RESPONSE | jq -r '.data._id')

if [ "$RULE_ID" == "null" ] || [ -z "$RULE_ID" ]; then
  echo "❌ 创建规则失败"
  echo "$CREATE_RULE_RESPONSE" | jq '.'
else
  echo "✅ 规则创建成功，ID: $RULE_ID"
  echo "$CREATE_RULE_RESPONSE" | jq '.data | {_id, ruleName, enabled, triggerConditions}'
fi
echo ""

# 4. 获取所有规则
echo "4. 获取所有规则..."
GET_RULES_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/rules" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_RULES_RESPONSE" | jq '.data[] | {_id, ruleName, enabled, createdAt}'
echo ""

# 5. 获取规则详情
if [ "$RULE_ID" != "null" ] && [ -n "$RULE_ID" ]; then
  echo "5. 获取规则详情..."
  GET_RULE_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/rules/$RULE_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "$GET_RULE_RESPONSE" | jq '.data | {ruleName, enabled, userQuotas, statistics}'
  echo ""
fi

# 6. 获取流转记录
echo "6. 获取流转记录..."
GET_RECORDS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/records?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_RECORDS_RESPONSE" | jq '.data | {total, page, totalPages}'
echo ""

# 7. 获取流转统计
echo "7. 获取流转统计..."
GET_STATS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/statistics" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_STATS_RESPONSE" | jq '.data'
echo ""

# 8. 切换规则状态
if [ "$RULE_ID" != "null" ] && [ -n "$RULE_ID" ]; then
  echo "8. 禁用规则..."
  TOGGLE_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/lead-transfer/rules/$RULE_ID/toggle" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"enabled": false}')
  
  echo "$TOGGLE_RESPONSE" | jq '.message'
  echo ""
  
  echo "9. 重新启用规则..."
  TOGGLE_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/lead-transfer/rules/$RULE_ID/toggle" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"enabled": true}')
  
  echo "$TOGGLE_RESPONSE" | jq '.message'
  echo ""
fi

echo "========================================="
echo "✅ 测试完成！"
echo "========================================="


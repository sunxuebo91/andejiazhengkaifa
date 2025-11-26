#!/bin/bash

# 简单的线索流转功能测试

BASE_URL="http://localhost:3001"

echo "========================================="
echo "线索流转功能 API 测试"
echo "========================================="
echo ""

# 1. 登录
echo "1. 登录..."
TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | jq -r '.data.access_token')

echo "✅ Token: ${TOKEN:0:30}..."
echo ""

# 2. 获取用户列表
echo "2. 获取用户..."
USERS=$(curl -s -X GET "${BASE_URL}/api/users" -H "Authorization: Bearer $TOKEN")
USER_ID_1=$(echo $USERS | jq -r '.data.items[0]._id')
USER_ID_2=$(echo $USERS | jq -r '.data.items[1]._id')
USER_ID_3=$(echo $USERS | jq -r '.data.items[2]._id')
USER_ID_4=$(echo $USERS | jq -r '.data.items[3]._id')

echo "用户1: $USER_ID_1"
echo "用户2: $USER_ID_2"
echo "用户3: $USER_ID_3"
echo "用户4: $USER_ID_4"
echo ""

# 3. 创建流转规则
echo "3. 创建流转规则..."
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/lead-transfer/rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ruleName\": \"测试规则-$(date +%s)\",
    \"description\": \"测试描述\",
    \"enabled\": true,
    \"triggerConditions\": {
      \"inactiveHours\": 48,
      \"contractStatuses\": [\"待定\", \"匹配中\"]
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

RULE_ID=$(echo $CREATE_RESPONSE | jq -r '.data._id')
echo "$CREATE_RESPONSE" | jq '{success, message, data: {_id: .data._id, ruleName: .data.ruleName, enabled: .data.enabled}}'
echo ""

# 4. 获取规则列表
echo "4. 获取规则列表..."
curl -s -X GET "${BASE_URL}/api/lead-transfer/rules" \
  -H "Authorization: Bearer $TOKEN" | jq '{success, data: [.data[] | {_id, ruleName, enabled}]}'
echo ""

# 5. 获取规则详情
if [ "$RULE_ID" != "null" ]; then
  echo "5. 获取规则详情..."
  curl -s -X GET "${BASE_URL}/api/lead-transfer/rules/$RULE_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '{success, data: {ruleName: .data.ruleName, enabled: .data.enabled, userQuotas: .data.userQuotas}}'
  echo ""
fi

# 6. 获取流转记录
echo "6. 获取流转记录..."
curl -s -X GET "${BASE_URL}/api/lead-transfer/records?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '{success, data: {total: .data.total, page: .data.page}}'
echo ""

# 7. 获取统计
echo "7. 获取流转统计..."
curl -s -X GET "${BASE_URL}/api/lead-transfer/statistics" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "========================================="
echo "✅ 测试完成！"
echo "========================================="


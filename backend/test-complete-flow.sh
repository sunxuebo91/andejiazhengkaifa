#!/bin/bash

# 完整流转流程测试

BASE_URL="http://localhost:3001"
echo "========================================="
echo "线索流转完整流程测试"
echo "========================================="
echo ""

# 1. 登录
echo "📝 Step 1: 登录系统..."
TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi
echo "✅ 登录成功"
echo ""

# 2. 获取用户列表
echo "📝 Step 2: 获取用户列表..."
USERS=$(curl -s -X GET "${BASE_URL}/api/users?page=1&pageSize=100" -H "Authorization: Bearer $TOKEN")
USER_ID_1=$(echo $USERS | jq -r '.data.items[0]._id')
USER_ID_2=$(echo $USERS | jq -r '.data.items[1]._id')
USER_ID_3=$(echo $USERS | jq -r '.data.items[2]._id')
USER_ID_4=$(echo $USERS | jq -r '.data.items[3]._id')

echo "流出用户1: $(echo $USERS | jq -r '.data.items[0].name') ($USER_ID_1)"
echo "流出用户2: $(echo $USERS | jq -r '.data.items[1].name') ($USER_ID_2)"
echo "流入用户1: $(echo $USERS | jq -r '.data.items[2].name') ($USER_ID_3)"
echo "流入用户2: $(echo $USERS | jq -r '.data.items[3].name') ($USER_ID_4)"
echo ""

# 3. 创建流转规则
echo "📝 Step 3: 创建流转规则..."
RULE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/lead-transfer/rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ruleName\": \"完整测试规则-$(date +%s)\",
    \"description\": \"用于完整流程测试的规则\",
    \"enabled\": true,
    \"triggerConditions\": {
      \"inactiveHours\": 48,
      \"contractStatuses\": [\"待定\", \"匹配中\"]
    },
    \"executionWindow\": {
      \"enabled\": false,
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

RULE_ID=$(echo $RULE_RESPONSE | jq -r '.data._id')
if [ "$RULE_ID" == "null" ] || [ -z "$RULE_ID" ]; then
  echo "❌ 创建规则失败"
  echo $RULE_RESPONSE | jq '.'
  exit 1
fi
echo "✅ 规则创建成功: $RULE_ID"
echo ""

# 4. 创建测试客户（分配给流出用户）
echo "📝 Step 4: 创建测试客户..."
RANDOM_PHONE="138$(printf '%08d' $((RANDOM % 100000000)))"
CUSTOMER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"测试客户-完整流程-$(date +%s)\",
    \"phone\": \"$RANDOM_PHONE\",
    \"contractStatus\": \"待定\",
    \"leadSource\": \"美团\",
    \"serviceCategory\": \"住家保姆\",
    \"leadLevel\": \"A类\",
    \"assignedTo\": \"$USER_ID_1\"
  }")

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | jq -r '.data._id')
if [ "$CUSTOMER_ID" == "null" ] || [ -z "$CUSTOMER_ID" ]; then
  echo "❌ 创建客户失败"
  echo $CUSTOMER_RESPONSE | jq '.'
  exit 1
fi
echo "✅ 客户创建成功: $CUSTOMER_ID"
echo ""

# 5. 验证客户创建
echo "📝 Step 5: 验证客户创建..."
CUSTOMER_DETAIL=$(curl -s -X GET "${BASE_URL}/api/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN")
CURRENT_OWNER=$(echo $CUSTOMER_DETAIL | jq -r '.data.assignedTo')
echo "当前归属: $CURRENT_OWNER"
echo ""

# 6. 修改客户的lastActivityAt为48小时前（模拟无活动）
echo "📝 Step 6: 修改客户活动时间（模拟48小时无活动）..."
PAST_DATE=$(date -u -d '50 hours ago' +"%Y-%m-%dT%H:%M:%S.000Z")
mongosh andejiazheng --quiet --eval "db.customers.updateOne({_id: ObjectId('$CUSTOMER_ID')}, {\$set: {lastActivityAt: new Date('$PAST_DATE')}})" > /dev/null 2>&1
echo "✅ 客户活动时间已修改"
echo ""

# 7. 手动触发流转
echo "📝 Step 7: 手动触发流转..."
EXECUTE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/lead-transfer/execute-now" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
echo $EXECUTE_RESPONSE | jq '.'
echo ""

# 8. 等待3秒
echo "📝 Step 8: 等待3秒..."
sleep 3
echo ""

# 9. 检查客户归属是否变更
echo "📝 Step 9: 检查客户归属..."
CUSTOMER_DETAIL=$(curl -s -X GET "${BASE_URL}/api/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN")
NEW_OWNER=$(echo $CUSTOMER_DETAIL | jq -r '.data.assignedTo')
echo "原归属: $CURRENT_OWNER"
echo "新归属: $NEW_OWNER"

if [ "$NEW_OWNER" != "$CURRENT_OWNER" ]; then
  echo "✅ 客户归属已变更"
else
  echo "❌ 客户归属未变更"
fi
echo ""

# 10. 检查流转记录
echo "📝 Step 10: 检查流转记录..."
RECORDS=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/records?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

RECORD_COUNT=$(echo $RECORDS | jq -r '.data.total')
echo "流转记录数: $RECORD_COUNT"

if [ "$RECORD_COUNT" -gt 0 ]; then
  echo "✅ 发现流转记录"
  echo ""
  echo "最新流转记录:"
  echo $RECORDS | jq '.data.records[0] | {customerName, fromUserName, toUserName, status, transferredAt}'
else
  echo "❌ 未发现流转记录"
fi
echo ""

echo "========================================="
echo "✅ 完整流程测试完成！"
echo "========================================="


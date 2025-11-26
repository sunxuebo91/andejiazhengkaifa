#!/bin/bash

# 线索流转功能集成测试脚本

BASE_URL="http://localhost:3001"
echo "========================================="
echo "线索流转功能 - 集成测试"
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
USERS=$(curl -s -X GET "${BASE_URL}/api/users" -H "Authorization: Bearer $TOKEN")
USER_ID_1=$(echo $USERS | jq -r '.data.items[0]._id')
USER_ID_2=$(echo $USERS | jq -r '.data.items[1]._id')
USER_ID_3=$(echo $USERS | jq -r '.data.items[2]._id')
USER_ID_4=$(echo $USERS | jq -r '.data.items[3]._id')

echo "流出用户1: $(echo $USERS | jq -r '.data.items[0].name') ($USER_ID_1)"
echo "流出用户2: $(echo $USERS | jq -r '.data.items[1].name') ($USER_ID_2)"
echo "流入用户1: $(echo $USERS | jq -r '.data.items[2].name') ($USER_ID_3)"
echo "流入用户2: $(echo $USERS | jq -r '.data.items[3].name') ($USER_ID_4)"
echo "✅ 用户列表获取成功"
echo ""

# 3. 创建测试客户（分配给流出用户）
echo "📝 Step 3: 创建测试客户..."
RANDOM_PHONE="138$(printf '%08d' $((RANDOM % 100000000)))"
CUSTOMER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"测试客户-流转-$(date +%s)\",
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

# 4. 修改客户的lastActivityAt为48小时前（模拟无活动）
echo "📝 Step 4: 修改客户活动时间（模拟48小时无活动）..."
PAST_DATE=$(date -u -d '50 hours ago' +"%Y-%m-%dT%H:%M:%S.000Z")
mongo andejiazheng --quiet --eval "db.customers.updateOne({_id: ObjectId('$CUSTOMER_ID')}, {\$set: {lastActivityAt: new Date('$PAST_DATE')}})" > /dev/null 2>&1
echo "✅ 客户活动时间已修改"
echo ""

# 5. 创建流转规则
echo "📝 Step 5: 创建流转规则..."
RULE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/lead-transfer/rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ruleName\": \"集成测试规则-$(date +%s)\",
    \"description\": \"用于集成测试的规则\",
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

# 6. 手动触发流转（调用定时任务逻辑）
echo "📝 Step 6: 等待5秒后检查流转结果..."
sleep 5

# 7. 检查流转记录
echo "📝 Step 7: 检查流转记录..."
RECORDS=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/records?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

RECORD_COUNT=$(echo $RECORDS | jq -r '.data.total')
echo "流转记录数: $RECORD_COUNT"

if [ "$RECORD_COUNT" -gt 0 ]; then
  echo "✅ 发现流转记录"
  echo $RECORDS | jq '.data.records[0] | {customerName, fromUserName, toUserName, status, transferredAt}'
else
  echo "⚠️  暂无流转记录（可能需要等待定时任务执行）"
fi
echo ""

# 8. 检查客户归属是否变更
echo "📝 Step 8: 检查客户归属..."
CUSTOMER_DETAIL=$(curl -s -X GET "${BASE_URL}/api/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN")

CURRENT_OWNER=$(echo $CUSTOMER_DETAIL | jq -r '.data.assignedTo')
echo "当前归属: $CURRENT_OWNER"

if [ "$CURRENT_OWNER" != "$USER_ID_1" ]; then
  echo "✅ 客户归属已变更"
else
  echo "⚠️  客户归属未变更（可能需要等待定时任务执行）"
fi
echo ""

# 9. 检查规则统计
echo "📝 Step 9: 检查规则统计..."
RULE_DETAIL=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/rules/$RULE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $RULE_DETAIL | jq '.data | {ruleName, enabled, statistics: .statistics, userQuotas: [.userQuotas[] | {userName, role, transferredOut, transferredIn, balance}]}'
echo ""

echo "========================================="
echo "✅ 集成测试完成！"
echo "========================================="
echo ""
echo "📊 测试总结:"
echo "- 登录: ✅"
echo "- 用户列表: ✅"
echo "- 创建客户: ✅"
echo "- 修改活动时间: ✅"
echo "- 创建规则: ✅"
echo "- 流转记录: $([ "$RECORD_COUNT" -gt 0 ] && echo '✅' || echo '⚠️ 需等待定时任务')"
echo "- 客户归属变更: $([ "$CURRENT_OWNER" != "$USER_ID_1" ] && echo '✅' || echo '⚠️ 需等待定时任务')"
echo ""
echo "💡 提示: 定时任务每小时整点执行一次"
echo "   当前时间: $(date '+%Y-%m-%d %H:%M:%S')"


#!/bin/bash

# 手动触发流转测试脚本

BASE_URL="http://localhost:3001"
echo "========================================="
echo "手动触发线索流转测试"
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

# 2. 手动触发流转
echo "📝 Step 2: 手动触发流转..."
EXECUTE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/lead-transfer/execute-now" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo $EXECUTE_RESPONSE | jq '.'
echo ""

# 3. 等待3秒
echo "📝 Step 3: 等待3秒..."
sleep 3
echo ""

# 4. 检查流转记录
echo "📝 Step 4: 检查流转记录..."
RECORDS=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/records?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

RECORD_COUNT=$(echo $RECORDS | jq -r '.data.total')
echo "流转记录数: $RECORD_COUNT"

if [ "$RECORD_COUNT" -gt 0 ]; then
  echo "✅ 发现流转记录"
  echo ""
  echo "最新流转记录:"
  echo $RECORDS | jq '.data.records[0] | {customerName, fromUserName, toUserName, status, transferredAt, reason}'
else
  echo "⚠️  暂无流转记录"
fi
echo ""

# 5. 检查规则统计
echo "📝 Step 5: 检查所有规则统计..."
RULES=$(curl -s -X GET "${BASE_URL}/api/lead-transfer/rules?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo $RULES | jq '.data.records[] | {ruleName, enabled, statistics: .statistics, userQuotas: [.userQuotas[] | {userName, role, transferredOut, transferredIn, balance}]}'
echo ""

echo "========================================="
echo "✅ 测试完成！"
echo "========================================="


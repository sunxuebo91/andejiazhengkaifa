#!/bin/bash

# 测试线索流转规则创建和查询

echo "=== 测试线索流转规则 ==="
echo ""

# 1. 登录获取token（需要替换为实际的管理员账号）
echo "1. 登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，请检查用户名和密码"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
echo ""

# 2. 获取用户列表
echo "2. 获取用户列表..."
USERS_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/users?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN")

echo "用户列表响应: $USERS_RESPONSE" | jq '.'
echo ""

# 3. 创建规则
echo "3. 创建线索流转规则..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/lead-transfer/rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleName": "测试规则-'$(date +%H%M%S)'",
    "description": "这是一个测试规则",
    "enabled": true,
    "triggerConditions": {
      "inactiveHours": 48,
      "contractStatuses": ["待定", "匹配中"],
      "leadSources": ["美团", "抖音"],
      "createdDateRange": null
    },
    "executionWindow": {
      "enabled": true,
      "startTime": "09:30",
      "endTime": "18:30"
    },
    "sourceUserIds": [],
    "targetUserIds": [],
    "distributionConfig": {
      "strategy": "balanced-random",
      "enableCompensation": true,
      "compensationPriority": 5
    }
  }')

echo "创建响应: $CREATE_RESPONSE" | jq '.'
echo ""

# 4. 获取规则列表
echo "4. 获取规则列表..."
RULES_RESPONSE=$(curl -s -X GET http://localhost:3000/api/lead-transfer/rules \
  -H "Authorization: Bearer $TOKEN")

echo "规则列表响应: $RULES_RESPONSE" | jq '.'
echo ""

# 5. 检查数据库
echo "5. 检查数据库中的规则..."
mongosh housekeeping --quiet --eval "db.leadtransferrules.find().pretty()"
echo ""

echo "=== 测试完成 ==="


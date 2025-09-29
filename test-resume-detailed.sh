#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "🔍 详细测试小程序简历创建权限"
echo "=================================="

# 1. 管理员登录
echo ""
echo "🔐 管理员登录..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
ADMIN_ROLE=$(echo $ADMIN_RESPONSE | grep -o '"role":"[^"]*"' | cut -d'"' -f4)
ADMIN_PERMISSIONS=$(echo $ADMIN_RESPONSE | grep -o '"permissions":\[[^]]*\]')

echo "✅ 管理员登录成功"
echo "   角色: $ADMIN_ROLE"
echo "   权限: $ADMIN_PERMISSIONS"

# 2. 员工登录
echo ""
echo "🔐 员工登录..."
EMPLOYEE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "employee",
    "password": "employee123"
  }')

EMPLOYEE_TOKEN=$(echo $EMPLOYEE_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
EMPLOYEE_ROLE=$(echo $EMPLOYEE_RESPONSE | grep -o '"role":"[^"]*"' | cut -d'"' -f4)
EMPLOYEE_PERMISSIONS=$(echo $EMPLOYEE_RESPONSE | grep -o '"permissions":\[[^]]*\]')

echo "✅ 员工登录成功"
echo "   角色: $EMPLOYEE_ROLE"
echo "   权限: $EMPLOYEE_PERMISSIONS"

# 3. 测试管理员创建简历（使用新手机号）
echo ""
echo "📝 测试管理员创建简历..."
ADMIN_RESUME_RESPONSE=$(curl -s -X POST "$BASE_URL/resumes/miniprogram/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "管理员测试阿姨",
    "phone": "13900000001",
    "gender": "female",
    "age": 35,
    "jobType": "yuexin",
    "education": "high"
  }')

ADMIN_SUCCESS=$(echo $ADMIN_RESUME_RESPONSE | grep -o '"success":[^,]*' | cut -d':' -f2)
echo "管理员创建结果: success=$ADMIN_SUCCESS"
if [ "$ADMIN_SUCCESS" = "false" ]; then
  ADMIN_ERROR=$(echo $ADMIN_RESUME_RESPONSE | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
  echo "   错误信息: $ADMIN_ERROR"
else
  echo "   ✅ 管理员创建简历成功"
fi

# 4. 测试员工创建简历（使用新手机号）
echo ""
echo "📝 测试员工创建简历..."
EMPLOYEE_RESUME_RESPONSE=$(curl -s -X POST "$BASE_URL/resumes/miniprogram/create" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "员工测试阿姨",
    "phone": "13900000002",
    "gender": "female",
    "age": 30,
    "jobType": "yuexin",
    "education": "middle"
  }')

EMPLOYEE_SUCCESS=$(echo $EMPLOYEE_RESUME_RESPONSE | grep -o '"success":[^,]*' | cut -d':' -f2)
echo "员工创建结果: success=$EMPLOYEE_SUCCESS"
if [ "$EMPLOYEE_SUCCESS" = "false" ]; then
  EMPLOYEE_ERROR=$(echo $EMPLOYEE_RESUME_RESPONSE | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
  echo "   错误信息: $EMPLOYEE_ERROR"
else
  echo "   ✅ 员工创建简历成功"
fi

# 5. 总结
echo ""
echo "📊 测试结果总结:"
echo "=================================="
echo "管理员 ($ADMIN_ROLE): $ADMIN_SUCCESS"
echo "员工 ($EMPLOYEE_ROLE): $EMPLOYEE_SUCCESS"
echo ""

if [ "$ADMIN_SUCCESS" = "true" ] && [ "$EMPLOYEE_SUCCESS" = "true" ]; then
  echo "🎉 结论: 管理员和员工都可以创建简历"
  echo "   这说明小程序简历创建API没有角色限制"
elif [ "$ADMIN_SUCCESS" = "true" ] && [ "$EMPLOYEE_SUCCESS" = "false" ]; then
  echo "🔒 结论: 只有管理员可以创建简历，员工被限制"
  echo "   员工错误: $EMPLOYEE_ERROR"
elif [ "$ADMIN_SUCCESS" = "false" ] && [ "$EMPLOYEE_SUCCESS" = "true" ]; then
  echo "🤔 结论: 员工可以创建但管理员不能（异常情况）"
  echo "   管理员错误: $ADMIN_ERROR"
else
  echo "❌ 结论: 管理员和员工都不能创建简历"
  echo "   管理员错误: $ADMIN_ERROR"
  echo "   员工错误: $EMPLOYEE_ERROR"
fi

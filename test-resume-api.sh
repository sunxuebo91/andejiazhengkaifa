#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "🔐 正在测试管理员登录..."

# 1. 管理员登录
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "管理员登录响应: $ADMIN_RESPONSE"

# 提取管理员token
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ 管理员登录失败，无法获取token"
  exit 1
fi

echo "✅ 管理员登录成功，token: ${ADMIN_TOKEN:0:20}..."

# 2. 管理员创建简历
echo ""
echo "📝 测试管理员创建简历..."

ADMIN_RESUME_RESPONSE=$(curl -s -X POST "$BASE_URL/resumes/miniprogram/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试阿姨-管理员创建",
    "phone": "13800138001",
    "gender": "female",
    "age": 35,
    "jobType": "yuexin",
    "education": "high"
  }')

echo "管理员创建简历响应: $ADMIN_RESUME_RESPONSE"

# 3. 尝试员工登录
echo ""
echo "🔐 正在测试员工登录..."

EMPLOYEE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "employee",
    "password": "employee123"
  }')

echo "员工登录响应: $EMPLOYEE_RESPONSE"

# 检查员工是否存在
if echo "$EMPLOYEE_RESPONSE" | grep -q "用户名或密码错误"; then
  echo "⚠️ 员工账号不存在，尝试创建..."
  
  # 创建员工账号
  CREATE_EMPLOYEE_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "employee",
      "password": "employee123",
      "name": "测试员工",
      "email": "employee@test.com",
      "phone": "13800138002",
      "role": "employee"
    }')
  
  echo "创建员工响应: $CREATE_EMPLOYEE_RESPONSE"
  
  # 重新登录
  EMPLOYEE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "employee",
      "password": "employee123"
    }')
  
  echo "员工重新登录响应: $EMPLOYEE_RESPONSE"
fi

# 提取员工token
EMPLOYEE_TOKEN=$(echo $EMPLOYEE_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$EMPLOYEE_TOKEN" ]; then
  echo "❌ 员工登录失败，无法获取token"
  exit 1
fi

echo "✅ 员工登录成功，token: ${EMPLOYEE_TOKEN:0:20}..."

# 4. 员工创建简历
echo ""
echo "📝 测试员工创建简历..."

EMPLOYEE_RESUME_RESPONSE=$(curl -s -X POST "$BASE_URL/resumes/miniprogram/create" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试阿姨-员工创建",
    "phone": "13800138003",
    "gender": "female",
    "age": 30,
    "jobType": "yuexin",
    "education": "middle"
  }')

echo "员工创建简历响应: $EMPLOYEE_RESUME_RESPONSE"

# 5. 检查结果
echo ""
echo "📊 测试结果总结:"
echo "管理员创建简历: $(echo $ADMIN_RESUME_RESPONSE | grep -o '"success":[^,]*' || echo '未知')"
echo "员工创建简历: $(echo $EMPLOYEE_RESUME_RESPONSE | grep -o '"success":[^,]*' || echo '未知')"

# 检查是否有错误信息
if echo "$EMPLOYEE_RESUME_RESPONSE" | grep -q '"success":false'; then
  echo ""
  echo "❌ 员工创建简历失败，错误信息:"
  echo "$EMPLOYEE_RESUME_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4
fi

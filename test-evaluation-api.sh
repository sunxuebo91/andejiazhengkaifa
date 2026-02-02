#!/bin/bash

# 测试员工评价API

# 1. 登录获取token
echo "1. 登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST https://crm.andejiazheng.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')
echo "Token: ${TOKEN:0:50}..."

# 2. 获取一个简历ID（用于测试）
echo -e "\n2. 获取简历列表..."
RESUME_RESPONSE=$(curl -s -X GET "https://crm.andejiazheng.com/api/resumes?page=1&pageSize=1" \
  -H "Authorization: Bearer $TOKEN")

RESUME_ID=$(echo $RESUME_RESPONSE | jq -r '.data.items[0]._id')
RESUME_NAME=$(echo $RESUME_RESPONSE | jq -r '.data.items[0].name')
echo "简历ID: $RESUME_ID"
echo "简历姓名: $RESUME_NAME"

# 3. 创建员工评价
echo -e "\n3. 创建员工评价..."
EVAL_RESPONSE=$(curl -s -X POST https://crm.andejiazheng.com/api/employee-evaluations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employeeId\": \"$RESUME_ID\",
    \"employeeName\": \"$RESUME_NAME\",
    \"evaluationType\": \"daily\",
    \"overallRating\": 4.5,
    \"serviceAttitudeRating\": 5,
    \"professionalSkillRating\": 4,
    \"workEfficiencyRating\": 4.5,
    \"communicationRating\": 4.5,
    \"comment\": \"工作认真负责，专业技能强，沟通能力好\",
    \"tags\": [\"认真负责\", \"技能熟练\", \"沟通良好\"],
    \"isPublic\": false,
    \"status\": \"published\"
  }")

echo "评价创建结果:"
echo $EVAL_RESPONSE | jq '.'

# 4. 获取简历详情，查看是否包含评价
echo -e "\n4. 获取简历详情..."
DETAIL_RESPONSE=$(curl -s -X GET "https://crm.andejiazheng.com/api/resumes/$RESUME_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "简历详情中的评价数量:"
echo $DETAIL_RESPONSE | jq '.data.employeeEvaluations | length'

echo -e "\n评价列表:"
echo $DETAIL_RESPONSE | jq '.data.employeeEvaluations'


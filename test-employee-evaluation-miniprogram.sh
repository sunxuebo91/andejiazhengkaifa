#!/bin/bash

echo "======================================"
echo "测试员工评价小程序端API接口"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000/api"

# 1. 测试获取评价列表（公开接口）
echo "1. 测试获取评价列表（公开接口）"
echo "GET ${BASE_URL}/employee-evaluations/miniprogram/list"
RESPONSE=$(curl -s "${BASE_URL}/employee-evaluations/miniprogram/list?page=1&pageSize=5")
echo "响应: $(echo $RESPONSE | jq -c '.')"
SUCCESS=$(echo $RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    echo "✅ 获取评价列表成功"
    TOTAL=$(echo $RESPONSE | jq -r '.data.total')
    echo "   总评价数: $TOTAL"
else
    echo "❌ 获取评价列表失败"
fi
echo ""

# 2. 测试获取评价统计（公开接口）
echo "2. 测试获取评价统计（公开接口）"
# 先获取一个员工ID
EMPLOYEE_ID=$(curl -s "${BASE_URL}/resumes/miniprogram/list?page=1&pageSize=1" | jq -r '.data.items[0]._id')
if [ "$EMPLOYEE_ID" != "null" ] && [ -n "$EMPLOYEE_ID" ]; then
    echo "GET ${BASE_URL}/employee-evaluations/miniprogram/statistics/${EMPLOYEE_ID}"
    RESPONSE=$(curl -s "${BASE_URL}/employee-evaluations/miniprogram/statistics/${EMPLOYEE_ID}")
    echo "响应: $(echo $RESPONSE | jq -c '.')"
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo "✅ 获取评价统计成功"
        AVG_RATING=$(echo $RESPONSE | jq -r '.data.averageRating')
        TOTAL_EVALS=$(echo $RESPONSE | jq -r '.data.totalEvaluations')
        echo "   平均评分: $AVG_RATING"
        echo "   总评价数: $TOTAL_EVALS"
    else
        echo "❌ 获取评价统计失败"
    fi
else
    echo "⚠️  未找到员工ID，跳过统计测试"
fi
echo ""

# 3. 测试创建评价（需要登录）
echo "3. 测试创建评价（需要登录）"
echo "先登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "✅ 登录成功，获取到token"
    
    # 获取一个员工信息
    RESUME_RESPONSE=$(curl -s "${BASE_URL}/resumes/miniprogram/list?page=1&pageSize=1")
    EMPLOYEE_ID=$(echo $RESUME_RESPONSE | jq -r '.data.items[0]._id')
    EMPLOYEE_NAME=$(echo $RESUME_RESPONSE | jq -r '.data.items[0].name')
    
    if [ "$EMPLOYEE_ID" != "null" ] && [ -n "$EMPLOYEE_ID" ]; then
        echo "POST ${BASE_URL}/employee-evaluations/miniprogram/create"
        CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/employee-evaluations/miniprogram/create" \
          -H "Authorization: Bearer ${TOKEN}" \
          -H "Content-Type: application/json" \
          -d "{
            \"employeeId\": \"${EMPLOYEE_ID}\",
            \"employeeName\": \"${EMPLOYEE_NAME}\",
            \"evaluationType\": \"daily\",
            \"overallRating\": 4.5,
            \"serviceAttitudeRating\": 5,
            \"professionalSkillRating\": 4,
            \"workEfficiencyRating\": 4.5,
            \"communicationRating\": 4.5,
            \"comment\": \"【测试】工作认真负责，专业技能强\",
            \"tags\": [\"认真负责\", \"技能熟练\"],
            \"isPublic\": false,
            \"status\": \"published\"
          }")
        
        echo "响应: $(echo $CREATE_RESPONSE | jq -c '.')"
        SUCCESS=$(echo $CREATE_RESPONSE | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            echo "✅ 创建评价成功"
            EVAL_ID=$(echo $CREATE_RESPONSE | jq -r '.data._id')
            echo "   评价ID: $EVAL_ID"
            
            # 4. 测试获取评价详情
            echo ""
            echo "4. 测试获取评价详情（公开接口）"
            echo "GET ${BASE_URL}/employee-evaluations/miniprogram/${EVAL_ID}"
            DETAIL_RESPONSE=$(curl -s "${BASE_URL}/employee-evaluations/miniprogram/${EVAL_ID}")
            echo "响应: $(echo $DETAIL_RESPONSE | jq -c '.')"
            SUCCESS=$(echo $DETAIL_RESPONSE | jq -r '.success')
            if [ "$SUCCESS" = "true" ]; then
                echo "✅ 获取评价详情成功"
                RATING=$(echo $DETAIL_RESPONSE | jq -r '.data.overallRating')
                COMMENT=$(echo $DETAIL_RESPONSE | jq -r '.data.comment')
                echo "   综合评分: $RATING"
                echo "   评价内容: $COMMENT"
            else
                echo "❌ 获取评价详情失败"
            fi
        else
            echo "❌ 创建评价失败"
        fi
    else
        echo "⚠️  未找到员工信息，跳过创建测试"
    fi
else
    echo "❌ 登录失败，无法测试创建接口"
fi

echo ""
echo "======================================"
echo "测试完成"
echo "======================================"


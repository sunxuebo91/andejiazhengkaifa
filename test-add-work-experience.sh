#!/bin/bash

# 测试添加工作经历和客户评价

RESUME_ID="694e0a9a8878020d398b7f60"
API_URL="http://localhost:3000/api/resumes/${RESUME_ID}"

echo "=== 为简历添加包含客户评价的工作经历 ==="

# 获取当前简历数据
echo "1. 获取当前简历数据..."
CURRENT_DATA=$(curl -s "${API_URL}")

# 添加工作经历（包含客户评价）
echo "2. 添加工作经历..."
curl -X PATCH "${API_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "workHistory": [
      {
        "startDate": "2023-01-01",
        "endDate": "2023-03-31",
        "description": "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",
        "orderNumber": "CON20230101001",
        "district": "chaoyang",
        "customerName": "张女士",
        "customerReview": "形象气质好，做事认真，好沟通，相处愉快，月子餐好吃，对宝宝有爱心"
      },
      {
        "startDate": "2023-04-01",
        "endDate": "2023-06-30",
        "description": "在北京海淀区某家庭担任月嫂",
        "orderNumber": "CON20230401002",
        "district": "haidian",
        "customerName": "李女士",
        "customerReview": "专业知识丰富，责任心强，服务态度好，形象气质好，沟通能力强"
      },
      {
        "startDate": "2023-07-01",
        "endDate": "2023-09-30",
        "description": "在北京丰台区某家庭担任月嫂",
        "orderNumber": "CON20230701003",
        "district": "fengtai",
        "customerName": "王女士",
        "customerReview": "好沟通，相处愉快，做事仔细认真，个人卫生好，不计较"
      }
    ]
  }' | jq '.'

echo ""
echo "3. 等待5秒后查看推荐理由..."
sleep 5

echo ""
echo "4. 查看更新后的推荐理由标签:"
curl -s "http://localhost:3000/api/resumes/public/${RESUME_ID}" | jq '{
  name: .data.name,
  workHistoryCount: (.data.workHistory | length),
  recommendationTags: .data.recommendationTags
}'

echo ""
echo "=== 测试完成 ==="


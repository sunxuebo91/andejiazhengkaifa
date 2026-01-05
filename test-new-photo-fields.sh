#!/bin/bash

# 测试新增的4个相册字段是否正确返回

echo "🧪 测试新增的4个相册字段"
echo "================================"
echo ""

# 简历ID（从日志中获取）
RESUME_ID="694e0a9a8878020d398b7f60"

# API地址
API_URL="https://crm.andejiazheng.com/api/resumes/${RESUME_ID}"

echo "📋 测试简历ID: ${RESUME_ID}"
echo "🌐 API地址: ${API_URL}"
echo ""

# 获取Token（需要先登录）
echo "🔐 正在登录获取Token..."
LOGIN_RESPONSE=$(curl -s -X POST "https://crm.andejiazheng.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取Token"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功，Token已获取"
echo ""

# 测试获取简历详情
echo "📡 正在获取简历详情..."
RESPONSE=$(curl -s -X GET "${API_URL}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "📦 API响应:"
echo "$RESPONSE" | jq '.'
echo ""

# 检查4个新字段
echo "🔍 检查新增的4个相册字段:"
echo "================================"

# 检查 confinementMealPhotos
CONFINEMENT_MEAL=$(echo "$RESPONSE" | jq '.data.confinementMealPhotos')
echo "1️⃣ confinementMealPhotos (月子餐照片):"
if [ "$CONFINEMENT_MEAL" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $CONFINEMENT_MEAL"
else
  echo "   ❌ 字段不存在"
fi
echo ""

# 检查 cookingPhotos
COOKING=$(echo "$RESPONSE" | jq '.data.cookingPhotos')
echo "2️⃣ cookingPhotos (烹饪照片):"
if [ "$COOKING" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $COOKING"
else
  echo "   ❌ 字段不存在"
fi
echo ""

# 检查 complementaryFoodPhotos
COMPLEMENTARY=$(echo "$RESPONSE" | jq '.data.complementaryFoodPhotos')
echo "3️⃣ complementaryFoodPhotos (辅食添加照片):"
if [ "$COMPLEMENTARY" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $COMPLEMENTARY"
else
  echo "   ❌ 字段不存在"
fi
echo ""

# 检查 positiveReviewPhotos
POSITIVE=$(echo "$RESPONSE" | jq '.data.positiveReviewPhotos')
echo "4️⃣ positiveReviewPhotos (好评展示照片):"
if [ "$POSITIVE" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $POSITIVE"
else
  echo "   ❌ 字段不存在"
fi
echo ""

# 检查URL数组格式
echo "🔍 检查URL数组格式:"
echo "================================"

CONFINEMENT_URLS=$(echo "$RESPONSE" | jq '.data.confinementMealPhotoUrls')
echo "1️⃣ confinementMealPhotoUrls:"
if [ "$CONFINEMENT_URLS" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $CONFINEMENT_URLS"
else
  echo "   ❌ 字段不存在"
fi
echo ""

COOKING_URLS=$(echo "$RESPONSE" | jq '.data.cookingPhotoUrls')
echo "2️⃣ cookingPhotoUrls:"
if [ "$COOKING_URLS" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $COOKING_URLS"
else
  echo "   ❌ 字段不存在"
fi
echo ""

COMPLEMENTARY_URLS=$(echo "$RESPONSE" | jq '.data.complementaryFoodPhotoUrls')
echo "3️⃣ complementaryFoodPhotoUrls:"
if [ "$COMPLEMENTARY_URLS" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $COMPLEMENTARY_URLS"
else
  echo "   ❌ 字段不存在"
fi
echo ""

POSITIVE_URLS=$(echo "$RESPONSE" | jq '.data.positiveReviewPhotoUrls')
echo "4️⃣ positiveReviewPhotoUrls:"
if [ "$POSITIVE_URLS" != "null" ]; then
  echo "   ✅ 字段存在"
  echo "   📊 数据: $POSITIVE_URLS"
else
  echo "   ❌ 字段不存在"
fi
echo ""

echo "✅ 测试完成！"


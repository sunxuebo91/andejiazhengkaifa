#!/bin/bash

echo "=========================================="
echo "测试删除照片功能"
echo "=========================================="
echo ""

# 1. 登录获取 token
echo "1. 登录系统..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. 获取一个有照片的简历
echo "2. 查找有照片的简历..."
RESUMES_RESPONSE=$(curl -s "http://localhost:3000/api/resumes?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN")

# 保存到临时文件以便分析
echo "$RESUMES_RESPONSE" > /tmp/resumes_response.json

# 尝试提取第一个简历ID
RESUME_ID=$(echo "$RESUMES_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RESUME_ID" ]; then
  echo "❌ 未找到简历"
  exit 1
fi

echo "✅ 找到简历: $RESUME_ID"
echo ""

# 3. 获取简历详情
echo "3. 获取简历详情..."
RESUME_DETAIL=$(curl -s "http://localhost:3000/api/resumes/$RESUME_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESUME_DETAIL" > /tmp/resume_detail.json

# 提取照片URL（尝试 photoUrls 和 photos 两个字段）
PHOTO_URL=$(echo "$RESUME_DETAIL" | grep -o '"photoUrls":\[[^]]*\]' | grep -o 'https://[^"]*' | head -1)
if [ -z "$PHOTO_URL" ]; then
  PHOTO_URL=$(echo "$RESUME_DETAIL" | grep -o '"photos":\[[^]]*\]' | grep -o 'https://[^"]*' | head -1)
fi

if [ -z "$PHOTO_URL" ]; then
  echo "⚠️  该简历没有照片，无法测试删除功能"
  echo "简历详情已保存到: /tmp/resume_detail.json"
  echo ""
  echo "建议："
  echo "1. 通过前端界面上传一张照片到简历"
  echo "2. 然后再运行此脚本测试删除功能"
  exit 0
fi

echo "✅ 找到照片: $PHOTO_URL"
echo ""

# 4. 测试删除照片
echo "4. 测试删除照片..."
echo "请求 URL: http://localhost:3000/api/resumes/$RESUME_ID/files/delete"
echo "照片 URL: $PHOTO_URL"
echo ""

DELETE_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/resumes/$RESUME_ID/files/delete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fileUrl\":\"$PHOTO_URL\"}")

echo "删除响应: $DELETE_RESPONSE"
echo ""

# 5. 检查删除结果
if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ 删除成功！"
  echo ""
  echo "5. 验证结果..."
  
  # 查看后端日志
  echo "后端日志（最近10条删除相关）："
  pm2 logs backend-prod --lines 50 --nostream | grep -E "删除文件|物理文件" | tail -10
  
  echo ""
  echo "6. 尝试访问原照片URL（应该返回404）..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PHOTO_URL")
  echo "HTTP 状态码: $HTTP_CODE"
  
  if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✅ 照片已从 COS 删除（返回 $HTTP_CODE）"
  else
    echo "⚠️  照片可能仍然存在（返回 $HTTP_CODE）"
  fi
else
  echo "❌ 删除失败"
  echo "响应: $DELETE_RESPONSE"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="


#!/bin/bash

# 微信校验文件上传脚本
# 使用方法：./upload-wechat-verify.sh <校验文件路径>

echo "=========================================="
echo "微信小程序业务域名校验文件上传脚本"
echo "=========================================="
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "❌ 错误：请提供校验文件路径"
    echo ""
    echo "使用方法："
    echo "  ./upload-wechat-verify.sh /path/to/94xDXO0Tj9.txt"
    echo ""
    exit 1
fi

VERIFY_FILE="$1"

# 检查文件是否存在
if [ ! -f "$VERIFY_FILE" ]; then
    echo "❌ 错误：文件不存在: $VERIFY_FILE"
    exit 1
fi

# 获取文件名
FILENAME=$(basename "$VERIFY_FILE")

echo "📁 校验文件: $FILENAME"
echo ""

# 目标目录
PUBLIC_DIR="frontend/public"
DIST_DIR="frontend/dist"

# 复制到 public 目录
echo "📋 步骤1：复制到 public 目录..."
cp "$VERIFY_FILE" "$PUBLIC_DIR/$FILENAME"
if [ $? -eq 0 ]; then
    echo "✅ 已复制到: $PUBLIC_DIR/$FILENAME"
else
    echo "❌ 复制失败"
    exit 1
fi

# 复制到 dist 目录
echo ""
echo "📋 步骤2：复制到 dist 目录..."
cp "$VERIFY_FILE" "$DIST_DIR/$FILENAME"
if [ $? -eq 0 ]; then
    echo "✅ 已复制到: $DIST_DIR/$FILENAME"
else
    echo "❌ 复制失败"
    exit 1
fi

# 设置权限
echo ""
echo "📋 步骤3：设置文件权限..."
chmod 644 "$PUBLIC_DIR/$FILENAME"
chmod 644 "$DIST_DIR/$FILENAME"
echo "✅ 权限设置完成"

# 验证文件
echo ""
echo "📋 步骤4：验证文件..."
echo "文件内容预览："
echo "----------------------------------------"
head -n 5 "$VERIFY_FILE"
echo "----------------------------------------"

# 测试访问
echo ""
echo "📋 步骤5：测试访问..."
echo "正在测试: https://crm.andejiazheng.com/$FILENAME"
echo ""

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://crm.andejiazheng.com/$FILENAME")

if [ "$RESPONSE" = "200" ]; then
    echo "✅ 文件可以访问！HTTP 状态码: $RESPONSE"
    echo ""
    echo "📥 文件内容："
    curl -s "https://crm.andejiazheng.com/$FILENAME"
    echo ""
else
    echo "⚠️  HTTP 状态码: $RESPONSE"
    echo "可能需要重启 Nginx 或等待几秒钟"
fi

echo ""
echo "=========================================="
echo "✅ 上传完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 在微信小程序后台点击【验证】按钮"
echo "2. 验证成功后点击【保存】"
echo "3. 完成配置！"
echo ""


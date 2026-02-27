#!/bin/bash

# 测试合同数据验证API

BASE_URL="https://crm.andejiazheng.com/api/contracts/miniprogram"

echo "=========================================="
echo "测试1：验证完整数据（应该通过）"
echo "=========================================="

curl -X POST "${BASE_URL}/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "templateNo": "TN84E8C106BFE74FD3AE36AC2CA33A44DE",
    "customerName": "张三",
    "customerPhone": "13800138000",
    "customerIdCard": "110101199001011234",
    "workerName": "李四",
    "workerPhone": "13900139000",
    "workerIdCard": "110101198001011234"
  }' | jq .

echo ""
echo ""
echo "=========================================="
echo "测试2：验证缺少身份证号的数据（应该失败）"
echo "=========================================="

curl -X POST "${BASE_URL}/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "templateNo": "TN84E8C106BFE74FD3AE36AC2CA33A44DE",
    "customerName": "张三",
    "customerPhone": "13800138000",
    "workerName": "李四",
    "workerPhone": "13900139000"
  }' | jq .

echo ""
echo ""
echo "=========================================="
echo "测试3：验证缺少模板编号的数据（应该失败）"
echo "=========================================="

curl -X POST "${BASE_URL}/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "张三",
    "customerPhone": "13800138000",
    "customerIdCard": "110101199001011234",
    "workerName": "李四",
    "workerPhone": "13900139000",
    "workerIdCard": "110101198001011234"
  }' | jq .

echo ""
echo ""
echo "=========================================="
echo "测试4：创建合同（缺少身份证号，应该返回验证错误）"
echo "=========================================="

curl -X POST "${BASE_URL}/create" \
  -H "Content-Type: application/json" \
  -d '{
    "templateNo": "TN84E8C106BFE74FD3AE36AC2CA33A44DE",
    "customerName": "测试客户",
    "customerPhone": "13800138001",
    "workerName": "测试阿姨",
    "workerPhone": "13900139001",
    "templateParams": {
      "客户姓名": "测试客户",
      "客户电话": "13800138001",
      "阿姨姓名": "测试阿姨",
      "阿姨电话": "13900139001"
    }
  }' | jq .

echo ""
echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="


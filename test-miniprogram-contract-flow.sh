#!/bin/bash

# 测试小程序合同创建手动分步流程

BASE_URL="https://crm.andejiazheng.com/api/contracts/miniprogram"

echo "=========================================="
echo "测试：小程序合同创建手动分步流程"
echo "=========================================="
echo ""

# 步骤1：创建合同（不触发爱签）
echo "步骤1：创建合同（不触发爱签流程）"
echo "=========================================="

CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/create" \
  -H "Content-Type: application/json" \
  -d '{
    "templateNo": "TN84E8C106BFE74FD3AE36AC2CA33A44DE",
    "customerName": "测试客户",
    "customerPhone": "13800138888",
    "customerIdCard": "110101199001011234",
    "workerName": "测试阿姨",
    "workerPhone": "13900139999",
    "workerIdCard": "110101198001011234",
    "contractType": "住家保姆",
    "startDate": "2026-02-25",
    "endDate": "2027-02-25",
    "workerSalary": 8000,
    "customerServiceFee": 7000,
    "customerId": "test_customer_id",
    "workerId": "test_worker_id",
    "createdBy": "test_user_id",
    "客户姓名": "测试客户",
    "客户电话": "13800138888",
    "客户身份证": "110101199001011234",
    "阿姨姓名": "测试阿姨",
    "阿姨电话": "13900139999",
    "阿姨身份证": "110101198001011234",
    "阿姨工资": "8000",
    "服务费": "7000",
    "服务时间": "8-18",
    "合同开始时间": "2026-02-25",
    "合同结束时间": "2027-02-25",
    "服务类型": "住家保姆"
  }')

echo "$CREATE_RESPONSE" | jq .

# 提取合同ID
CONTRACT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data._id')
CONTRACT_NUMBER=$(echo "$CREATE_RESPONSE" | jq -r '.data.contractNumber')
CONTRACT_STATUS=$(echo "$CREATE_RESPONSE" | jq -r '.data.contractStatus')

echo ""
echo "📋 创建结果："
echo "  - 合同ID: $CONTRACT_ID"
echo "  - 合同编号: $CONTRACT_NUMBER"
echo "  - 合同状态: $CONTRACT_STATUS"
echo ""

if [ "$CONTRACT_ID" == "null" ] || [ -z "$CONTRACT_ID" ]; then
  echo "❌ 合同创建失败，终止测试"
  exit 1
fi

if [ "$CONTRACT_STATUS" != "draft" ]; then
  echo "⚠️ 警告：合同状态不是 draft，可能自动触发了爱签流程"
fi

echo ""
echo "=========================================="
echo "步骤2：发起签署（触发爱签流程）"
echo "=========================================="

sleep 2

SIGNING_RESPONSE=$(curl -s -X POST "${BASE_URL}/initiate-signing/${CONTRACT_ID}" \
  -H "Content-Type: application/json")

echo "$SIGNING_RESPONSE" | jq .

# 检查是否成功
SUCCESS=$(echo "$SIGNING_RESPONSE" | jq -r '.success')
MESSAGE=$(echo "$SIGNING_RESPONSE" | jq -r '.message')

echo ""
echo "📋 发起签署结果："
echo "  - 成功: $SUCCESS"
echo "  - 消息: $MESSAGE"

if [ "$SUCCESS" == "true" ]; then
  echo ""
  echo "✅ 签署链接："
  echo "$SIGNING_RESPONSE" | jq -r '.data.signUrls[] | "  - \(.role): \(.name)（\(.mobile）)\n    \(.signUrl)"'
  
  ESIGN_CONTRACT_NO=$(echo "$SIGNING_RESPONSE" | jq -r '.data.esignContractNo')
  echo ""
  echo "📋 爱签合同编号: $ESIGN_CONTRACT_NO"
else
  echo ""
  echo "❌ 发起签署失败"
  echo "错误信息："
  echo "$SIGNING_RESPONSE" | jq '.error'
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="


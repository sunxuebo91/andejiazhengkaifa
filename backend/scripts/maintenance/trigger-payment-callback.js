/**
 * 手动触发支付回调 - 模拟大树保发送支付成功通知
 */

const axios = require('axios');

// 生产环境配置
const BACKEND_URL = 'https://crm.andejiazheng.com';
const AGENCY_POLICY_REF = 'ANDE1770195082828a1n4bv';

// 构建支付成功回调的XML（按照handlePaymentCallback期望的格式）
const callbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
  <Success>true</Success>
  <OrderId>19752823</OrderId>
  <AgencyPolicyRef>${AGENCY_POLICY_REF}</AgencyPolicyRef>
  <PolicyList>
    <Policy>
      <Success>true</Success>
      <PolicyNo>14527006800216451812</PolicyNo>
      <OrderId>19752823</OrderId>
      <EffectiveDate>20260205000000</EffectiveDate>
      <ExpireDate>20260304000000</ExpireDate>
      <PolicyPdfUrl>https://example.com/policy.pdf</PolicyPdfUrl>
    </Policy>
  </PolicyList>
</ResultInfo>`;

async function triggerCallback() {
  console.log('\n🚀 手动触发支付回调...');
  console.log('='.repeat(80));
  console.log('目标URL:', `${BACKEND_URL}/api/dashubao/payment/callback`);
  console.log('流水号:', AGENCY_POLICY_REF);
  console.log('');
  console.log('📤 发送回调XML:');
  console.log(callbackXml);
  console.log('');

  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/dashubao/payment/callback`,
      callbackXml,
      {
        headers: {
          'Content-Type': 'application/xml',
        },
        timeout: 30000,
      }
    );

    console.log('✅ 回调成功!');
    console.log('');
    console.log('📥 响应数据:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ 保单状态应该已更新为 active');
    console.log('');
    console.log('💡 请刷新前端页面查看保单状态');
    
  } catch (error) {
    console.error('❌ 回调失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    console.log('');
    console.log('⚠️ 如果看到401错误，说明@Public()装饰器还未生效，请确认：');
    console.log('1. 代码已保存');
    console.log('2. PM2已重启');
    console.log('3. 等待几秒后重试');
  }
}

triggerCallback();


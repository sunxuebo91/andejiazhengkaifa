/**
 * 测试大树保支付回调
 * 用于模拟大树保发送的支付成功回调
 */

const axios = require('axios');

// 根据文档第805-851行的回调示例构建测试数据
const testCallbackXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ResultInfo>
    <OrderId>3156287</OrderId>
    <AgencyPolicyRef>ANDE1770195082828a1n4by</AgencyPolicyRef>
    <PolicyList>
        <Policy>
            <OrderId>3156288</OrderId>
            <Success>true</Success>
            <PolicyNo>PK00029001</PolicyNo>
            <EffectiveDate>20260205000000</EffectiveDate>
            <ExpireDate>20260304000000</ExpireDate>
            <InsuredList>
                <Insured>
                    <InsuredName>赵瑾如</InsuredName>
                    <IdNumber>141034199605090042</IdNumber>
                    <IdType>1</IdType>
                    <Gender>F</Gender>
                    <BirthDate>19960509000000</BirthDate>
                </Insured>
            </InsuredList>
            <PolicyHolder>
                <PolicyHolderName>北京安得家政有限公司</PolicyHolderName>
                <PHIdNumber>企业</PHIdNumber>
                <PHIdType>1</PHIdType>
                <Gender>F</Gender>
                <PHBirthDate>19800101000000</PHBirthDate>
            </PolicyHolder>
        </Policy>
    </PolicyList>
</ResultInfo>`;

async function testPaymentCallback() {
  try {
    console.log('🧪 开始测试支付回调...');
    console.log('='.repeat(80));
    
    // 替换为你的实际服务器地址
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const callbackUrl = `${backendUrl}/api/dashubao/payment/callback`;
    
    console.log(`📤 发送回调到: ${callbackUrl}`);
    console.log('📋 回调数据:');
    console.log(testCallbackXml);
    console.log('='.repeat(80));
    
    const response = await axios.post(callbackUrl, testCallbackXml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
      },
      timeout: 10000,
    });
    
    console.log('✅ 回调成功!');
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(response.data, null, 2));
    console.log('='.repeat(80));
    
    // 查询保单状态验证
    console.log('🔍 查询保单状态验证...');
    const policyRef = 'ANDE1770195082828a1n4by';
    const queryUrl = `${backendUrl}/api/dashubao/policy/by-policy-ref/${policyRef}`;
    
    // 需要登录token，这里先跳过
    console.log(`提示: 请手动访问 ${queryUrl} 查看保单状态是否已更新为 active`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testPaymentCallback();


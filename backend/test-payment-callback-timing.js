/**
 * 测试支付回调时间诊断脚本
 * 用于分析从支付成功到回调处理完成的时间
 */

const axios = require('axios');
const mongoose = require('mongoose');

const BACKEND_URL = 'http://localhost:3000';
const MONGODB_URI = 'mongodb://127.0.0.1:27017/housekeeping';

// 模拟大树保支付回调的XML数据
const createCallbackXml = (agencyPolicyRef) => `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Success>true</Success>
  <Message>支付成功</Message>
  <AgencyPolicyRef>${agencyPolicyRef}</AgencyPolicyRef>
  <PolicyList>
    <Policy>
      <Success>true</Success>
      <PolicyNo>TEST${Date.now()}</PolicyNo>
      <OrderId>ORDER${Date.now()}</OrderId>
      <EffectiveDate>2026-02-06</EffectiveDate>
      <ExpireDate>2027-02-05</ExpireDate>
    </Policy>
  </PolicyList>
</Response>`;

async function testPaymentCallback() {
  console.log('\n🧪 支付回调时间诊断测试');
  console.log('='.repeat(80));
  
  try {
    // 1. 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false, collection: 'insurancepolicies' }));
    
    // 2. 查找最近创建的pending状态保单
    const pendingPolicy = await InsurancePolicy.findOne({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
    
    if (!pendingPolicy) {
      console.log('❌ 未找到待支付的保单');
      console.log('💡 请先创建一个保单，然后再运行此脚本\n');
      process.exit(0);
    }
    
    console.log('📋 找到待支付保单:');
    console.log(`   流水号: ${pendingPolicy.agencyPolicyRef}`);
    console.log(`   被保险人: ${pendingPolicy.insuredName}`);
    console.log(`   保费: ¥${pendingPolicy.totalPremium}`);
    console.log(`   当前状态: ${pendingPolicy.status}`);
    console.log('');
    
    // 3. 记录开始时间
    const startTime = Date.now();
    console.log(`⏱️  开始时间: ${new Date(startTime).toLocaleString()}`);
    console.log('');
    
    // 4. 发送支付回调
    console.log('📤 发送支付回调到后端...');
    const callbackXml = createCallbackXml(pendingPolicy.agencyPolicyRef);
    
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
    
    const callbackTime = Date.now();
    const callbackDuration = callbackTime - startTime;
    
    console.log(`✅ 回调请求完成 (耗时: ${callbackDuration}ms)`);
    console.log('');
    
    // 5. 等待1秒后查询保单状态
    console.log('⏳ 等待1秒后查询保单状态...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedPolicy = await InsurancePolicy.findOne({ 
      agencyPolicyRef: pendingPolicy.agencyPolicyRef 
    }).lean();
    
    const queryTime = Date.now();
    const totalDuration = queryTime - startTime;
    
    console.log('');
    console.log('📊 测试结果:');
    console.log('='.repeat(80));
    console.log(`⏱️  回调处理时间: ${callbackDuration}ms`);
    console.log(`⏱️  总耗时: ${totalDuration}ms`);
    console.log(`📋 保单状态: ${pendingPolicy.status} → ${updatedPolicy.status}`);
    
    if (updatedPolicy.status === 'active') {
      console.log('✅ 支付回调处理成功！保单已生效');
      console.log(`   保单号: ${updatedPolicy.policyNo}`);
      console.log(`   生效日期: ${updatedPolicy.effectiveDate}`);
    } else {
      console.log('❌ 保单状态未更新，可能回调处理失败');
    }
    
    console.log('');
    console.log('💡 分析:');
    if (callbackDuration < 500) {
      console.log('   ✅ 回调处理速度很快（<500ms）');
    } else if (callbackDuration < 2000) {
      console.log('   ⚠️  回调处理速度一般（500ms-2s）');
    } else {
      console.log('   ❌ 回调处理速度较慢（>2s），需要优化');
    }
    
    console.log('');
    console.log('🔍 用户感知延迟 = 大树保回调延迟 + 回调处理时间 + 前端轮询间隔');
    console.log(`   - 回调处理时间: ${callbackDuration}ms`);
    console.log(`   - 前端轮询间隔: 1000ms（已优化）`);
    console.log(`   - 大树保回调延迟: 未知（取决于支付平台）`);
    console.log('');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testPaymentCallback();


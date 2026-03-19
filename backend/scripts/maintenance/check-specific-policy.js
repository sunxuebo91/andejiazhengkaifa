/**
 * 检查特定保单的详细信息
 */

const mongoose = require('mongoose');

// 从环境变量读取配置（生产环境）
require('dotenv').config({ path: '.env' });

// 从截图中获取的保单信息
const POLICY_REF = 'ANDE1770195082828a1n4by';
const POLICY_NO = 'PK00029001';

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';
  await mongoose.connect(mongoUri);
  console.log('✅ 已连接到数据库:', mongoUri);
}

async function checkPolicy() {
  console.log('\n🔍 检查保单详细信息...');
  console.log('='.repeat(80));
  
  const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false }), 'insurance_policies');
  
  // 尝试多种方式查询
  const queries = [
    { agencyPolicyRef: POLICY_REF },
    { policyNo: POLICY_NO },
    { agencyPolicyRef: { $regex: POLICY_REF, $options: 'i' } },
  ];
  
  for (const query of queries) {
    console.log(`\n查询条件:`, query);
    const policy = await InsurancePolicy.findOne(query);
    
    if (policy) {
      console.log('\n✅ 找到保单!');
      console.log('='.repeat(80));
      console.log('📋 保单完整信息:');
      console.log(JSON.stringify(policy.toObject(), null, 2));
      console.log('='.repeat(80));
      
      console.log('\n📊 关键字段:');
      console.log('  _id:', policy._id);
      console.log('  流水号:', policy.agencyPolicyRef);
      console.log('  保单号:', policy.policyNo);
      console.log('  状态:', policy.status);
      console.log('  总保费:', policy.totalPremium);
      console.log('  生效日期:', policy.effectiveDate);
      console.log('  结束日期:', policy.expireDate);
      console.log('  投保人:', policy.policyHolder?.policyHolderName);
      console.log('  被保人:', policy.insuredList?.[0]?.insuredName);
      console.log('  创建时间:', policy.createdAt);
      console.log('  更新时间:', policy.updatedAt);
      console.log('  PDF链接:', policy.policyPdfUrl || '无');
      console.log('  认证URL:', policy.authUrl || '无');
      console.log('  微信支付信息:', policy.wechatPayInfo ? 'YES' : 'NO');
      
      if (policy.wechatPayInfo) {
        console.log('\n💳 微信支付信息:');
        console.log(JSON.stringify(policy.wechatPayInfo, null, 2));
      }
      
      if (policy.rawResponse) {
        console.log('\n📥 大树保原始响应:');
        console.log(JSON.stringify(policy.rawResponse, null, 2));
      }
      
      console.log('\n💡 状态分析:');
      if (policy.status === 'pending') {
        console.log('  ⚠️  当前状态: 待支付(pending)');
        console.log('  🔍 可能原因:');
        console.log('     1. 支付回调未被接收');
        console.log('     2. 支付回调处理失败');
        console.log('     3. 保单创建后未完成支付流程');
        
        if (policy.wechatPayInfo) {
          console.log('  ✅ 有微信支付信息 - 说明已创建支付订单');
        } else {
          console.log('  ❌ 无微信支付信息 - 可能未创建支付订单');
        }
        
        if (policy.policyNo) {
          console.log('  ✅ 有保单号 - 说明大树保已生成保单');
        } else {
          console.log('  ❌ 无保单号 - 大树保可能未生成保单');
        }
      } else {
        console.log(`  ✅ 当前状态: ${policy.status}`);
      }
      
      return policy;
    }
  }
  
  console.log('\n❌ 未找到保单');
  return null;
}

async function main() {
  try {
    await connectDB();
    const policy = await checkPolicy();
    
    if (policy && policy.status === 'pending') {
      console.log('\n🔧 建议操作:');
      console.log('='.repeat(80));
      console.log('1. 使用同步接口更新状态:');
      console.log(`   curl -X POST "http://localhost:3001/api/dashubao/policy/sync/${POLICY_REF}" \\`);
      console.log(`     -H "Authorization: Bearer YOUR_TOKEN"`);
      console.log('');
      console.log('2. 或者手动更新数据库:');
      console.log(`   node fix-policy-status.js`);
      console.log('   (需要先修改脚本中的POLICY_REF)');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

main();


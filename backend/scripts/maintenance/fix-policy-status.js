/**
 * 修复保单状态
 * 用于手动将已支付的保单状态从pending更新为active
 */

const mongoose = require('mongoose');

// 从环境变量读取配置
require('dotenv').config({ path: '.env.dev' });

// 保单流水号（从截图中获取）
const POLICY_REF = 'ANDE1770195082828a1n4by';

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';
  await mongoose.connect(mongoUri);
  console.log('✅ 已连接到数据库');
}

async function fixPolicyStatus() {
  console.log('\n🔧 开始修复保单状态...');
  console.log('='.repeat(80));
  
  const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false }), 'insurance_policies');
  
  // 查找保单
  const policy = await InsurancePolicy.findOne({ agencyPolicyRef: POLICY_REF });
  
  if (!policy) {
    console.log('❌ 未找到该保单');
    return;
  }
  
  console.log('📋 当前保单信息:');
  console.log('  流水号:', policy.agencyPolicyRef);
  console.log('  保单号:', policy.policyNo || '未生成');
  console.log('  当前状态:', policy.status);
  console.log('  总保费:', policy.totalPremium);
  
  if (policy.status === 'active') {
    console.log('✅ 保单状态已经是active，无需修复');
    return;
  }
  
  // 更新状态
  console.log('\n🔄 更新保单状态为active...');
  const result = await InsurancePolicy.updateOne(
    { agencyPolicyRef: POLICY_REF },
    {
      $set: {
        status: 'active',
        // 如果有保单号，也一起更新
        ...(policy.policyNo ? {} : { policyNo: 'PK00029001' }),
      }
    }
  );
  
  console.log('✅ 更新结果:');
  console.log('  匹配数量:', result.matchedCount);
  console.log('  修改数量:', result.modifiedCount);
  
  // 验证更新
  const updatedPolicy = await InsurancePolicy.findOne({ agencyPolicyRef: POLICY_REF });
  console.log('\n📋 更新后的保单信息:');
  console.log('  流水号:', updatedPolicy.agencyPolicyRef);
  console.log('  保单号:', updatedPolicy.policyNo);
  console.log('  状态:', updatedPolicy.status);
  
  console.log('\n✅ 修复完成！');
}

async function main() {
  try {
    await connectDB();
    await fixPolicyStatus();
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

main();


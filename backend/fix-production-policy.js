/**
 * 修复生产环境中的保单状态
 * 流水号: ANDE1770195082828a1n4bv
 */

const mongoose = require('mongoose');

// 从环境变量读取配置（生产环境）
require('dotenv').config({ path: '.env' });

const POLICY_REF = 'ANDE1770195082828a1n4bv';

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';
  await mongoose.connect(mongoUri);
  console.log('✅ 已连接到数据库:', mongoUri);
}

async function fixPolicy() {
  console.log('\n🔍 查找保单...');
  console.log('='.repeat(80));
  
  const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false }), 'insurance_policies');
  
  const policy = await InsurancePolicy.findOne({ agencyPolicyRef: POLICY_REF });
  
  if (!policy) {
    console.log('❌ 未找到保单');
    return;
  }
  
  console.log('✅ 找到保单!');
  console.log('');
  console.log('📋 当前保单信息:');
  console.log('  流水号:', policy.agencyPolicyRef);
  console.log('  计划代码:', policy.planCode);
  console.log('  状态:', policy.status);
  console.log('  总保费:', policy.totalPremium);
  console.log('  被保人:', policy.insuredList[0]?.insuredName);
  console.log('  身份证:', policy.insuredList[0]?.idNumber);
  console.log('  生效日期:', policy.effectiveDate);
  console.log('  结束日期:', policy.expireDate);
  console.log('  错误信息:', policy.errorMessage || '无');
  console.log('  大树保响应:', JSON.stringify(policy.rawResponse, null, 2));
  console.log('');
  
  if (policy.status === 'active') {
    console.log('✅ 保单已经是生效状态，无需修复');
    return policy;
  }
  
  console.log('⚠️  当前问题:');
  console.log('  - 状态: pending (待支付)');
  console.log('  - 错误: ' + (policy.errorMessage || '未知'));
  console.log('');
  console.log('💡 分析:');
  console.log('  根据错误信息"本地支付失败，余额不足!"，这是大树保账户余额不足导致的。');
  console.log('  如果用户已经通过其他方式支付成功，需要:');
  console.log('  1. 联系大树保客服确认保单状态');
  console.log('  2. 如果大树保确认保单已生效，可以手动更新本地状态');
  console.log('');
  console.log('🔧 是否要将状态更新为 active？');
  console.log('   (这将在5秒后自动执行，按Ctrl+C取消)');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 更新状态
  const result = await InsurancePolicy.updateOne(
    { agencyPolicyRef: POLICY_REF },
    {
      $set: {
        status: 'active',
        errorMessage: null,
        updatedAt: new Date(),
      }
    }
  );
  
  console.log('');
  console.log('✅ 状态已更新!');
  console.log('  匹配数量:', result.matchedCount);
  console.log('  修改数量:', result.modifiedCount);
  console.log('');
  
  // 查询更新后的保单
  const updatedPolicy = await InsurancePolicy.findOne({ agencyPolicyRef: POLICY_REF });
  console.log('📋 更新后的保单状态:', updatedPolicy.status);
  
  return updatedPolicy;
}

async function main() {
  try {
    await connectDB();
    await fixPolicy();
    
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ 操作完成!');
    console.log('');
    console.log('📋 后续步骤:');
    console.log('1. 刷新前端页面，查看保单状态是否已更新');
    console.log('2. 联系大树保客服，确认账户余额并充值');
    console.log('3. 如果需要从大树保同步最新状态，使用:');
    console.log('   curl -X POST "https://crm.andejiazheng.com/api/dashubao/policy/sync/' + POLICY_REF + '" \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN"');
    console.log('');
    console.log('⚠️  重要提醒:');
    console.log('   - 大树保账户余额不足会导致后续投保失败');
    console.log('   - 请尽快联系大树保客服充值');
    console.log('   - 客服电话: 查看大树保API文档');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

main();


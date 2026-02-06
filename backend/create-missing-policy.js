/**
 * 手动创建缺失的保单记录
 * 基于用户截图中的保单信息
 */

const mongoose = require('mongoose');

// 从环境变量读取配置
require('dotenv').config({ path: '.env.dev' });

// 从截图中获取的保单信息
const POLICY_DATA = {
  agencyPolicyRef: 'ANDE1770195082828a1n4by',
  policyNo: 'PK00029001',
  planCode: '需要从前端或大树保获取', // 需要补充
  effectiveDate: '20260205000000',
  expireDate: '20260304000000',
  groupSize: 1,
  totalPremium: 12.00,
  status: 'active', // 支付已成功，设置为active
  policyHolder: {
    policyHolderType: 'C',
    policyHolderName: '北京安得家政有限公司',
    phIdType: '14',
    phIdNumber: '企业',
  },
  insuredList: [{
    insuredName: '赵瑾如',
    insuredType: '1',
    idType: '1',
    idNumber: '141034199605090042',
    birthDate: '19960509000000',
    gender: 'F',
  }],
};

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';
  await mongoose.connect(mongoUri);
  console.log('✅ 已连接到数据库:', mongoUri);
}

async function createPolicy() {
  console.log('\n📝 准备创建保单记录...');
  console.log('='.repeat(80));
  
  const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false }), 'insurance_policies');
  
  // 检查是否已存在
  const existing = await InsurancePolicy.findOne({ agencyPolicyRef: POLICY_DATA.agencyPolicyRef });
  if (existing) {
    console.log('⚠️  保单已存在，无需创建');
    console.log('当前状态:', existing.status);
    return existing;
  }
  
  // 创建新保单
  const policy = new InsurancePolicy({
    ...POLICY_DATA,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  await policy.save();
  console.log('✅ 保单创建成功!');
  console.log('='.repeat(80));
  console.log('保单信息:');
  console.log('  流水号:', policy.agencyPolicyRef);
  console.log('  保单号:', policy.policyNo);
  console.log('  状态:', policy.status);
  console.log('  总保费:', policy.totalPremium);
  console.log('  被保人:', policy.insuredList[0].insuredName);
  console.log('='.repeat(80));
  
  return policy;
}

async function main() {
  try {
    await connectDB();
    
    console.log('\n⚠️  注意事项:');
    console.log('1. 此脚本将手动创建保单记录');
    console.log('2. 请确认支付确实已成功');
    console.log('3. 需要补充planCode字段（计划代码）');
    console.log('4. 建议先联系大树保客服确认保单状态');
    console.log('');
    console.log('按Ctrl+C取消，或等待5秒后自动继续...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await createPolicy();
    
    console.log('\n✅ 操作完成!');
    console.log('');
    console.log('📋 后续步骤:');
    console.log('1. 刷新前端页面，查看保单是否显示为"已生效"');
    console.log('2. 如果需要补充planCode，请查看前端投保时使用的计划代码');
    console.log('3. 可以使用同步接口从大树保获取最新状态:');
    console.log('   curl -X POST "http://localhost:3001/api/dashubao/policy/sync/ANDE1770195082828a1n4by" \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN"');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

main();


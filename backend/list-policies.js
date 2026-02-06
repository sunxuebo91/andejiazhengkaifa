/**
 * 列出所有保单
 */

const mongoose = require('mongoose');

// 从环境变量读取配置
require('dotenv').config({ path: '.env.dev' });

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';
  await mongoose.connect(mongoUri);
  console.log('✅ 已连接到数据库:', mongoUri);
}

async function listPolicies() {
  console.log('\n📋 查询所有保单...');
  console.log('='.repeat(80));
  
  const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false }), 'insurance_policies');
  
  const policies = await InsurancePolicy.find({}).sort({ createdAt: -1 }).limit(10);
  
  if (policies.length === 0) {
    console.log('❌ 数据库中没有保单记录');
    return;
  }
  
  console.log(`✅ 找到 ${policies.length} 条保单记录（最近10条）:\n`);
  
  policies.forEach((policy, index) => {
    console.log(`${index + 1}. 保单信息:`);
    console.log(`   流水号: ${policy.agencyPolicyRef}`);
    console.log(`   保单号: ${policy.policyNo || '未生成'}`);
    console.log(`   状态: ${policy.status}`);
    console.log(`   总保费: ¥${policy.totalPremium}`);
    console.log(`   投保人: ${policy.policyHolder?.policyHolderName || '未知'}`);
    console.log(`   被保人: ${policy.insuredList?.[0]?.insuredName || '未知'}`);
    console.log(`   创建时间: ${policy.createdAt}`);
    console.log(`   PDF链接: ${policy.policyPdfUrl || '无'}`);
    console.log('');
  });
  
  // 统计各状态的保单数量
  const statusCounts = await InsurancePolicy.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  console.log('📊 保单状态统计:');
  statusCounts.forEach(item => {
    console.log(`   ${item._id}: ${item.count} 条`);
  });
}

async function main() {
  try {
    await connectDB();
    await listPolicies();
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

main();


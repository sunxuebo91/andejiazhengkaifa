/**
 * 清除已生效保单的错误信息
 * 
 * 问题：保单状态已经是"已生效"，但仍然显示之前的错误信息"本地支付失败，余额不足!"
 * 解决：清除所有已生效保单的errorMessage字段
 */

const mongoose = require('mongoose');

// MongoDB连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/housekeeping_prod';

async function clearErrorMessages() {
  console.log('\n🔧 开始清除已生效保单的错误信息...');
  console.log('='.repeat(80));
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 已连接到数据库:', MONGODB_URI);
    
    const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false }), 'insurance_policies');
    
    // 查找所有已生效但有错误信息的保单
    const policiesWithErrors = await InsurancePolicy.find({
      status: 'active',
      errorMessage: { $ne: null, $exists: true }
    });
    
    console.log(`\n📋 找到 ${policiesWithErrors.length} 个已生效但仍有错误信息的保单:`);
    
    if (policiesWithErrors.length === 0) {
      console.log('✅ 没有需要清理的保单');
      return;
    }
    
    // 显示这些保单的信息
    policiesWithErrors.forEach((policy, index) => {
      console.log(`\n${index + 1}. 保单流水号: ${policy.agencyPolicyRef}`);
      console.log(`   保单号: ${policy.policyNo || '未生成'}`);
      console.log(`   状态: ${policy.status}`);
      console.log(`   错误信息: ${policy.errorMessage}`);
      console.log(`   总保费: ¥${policy.totalPremium}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🔄 开始清除错误信息...');
    
    // 批量更新：清除errorMessage字段
    const result = await InsurancePolicy.updateMany(
      {
        status: 'active',
        errorMessage: { $ne: null, $exists: true }
      },
      {
        $set: {
          errorMessage: null
        }
      }
    );
    
    console.log('\n✅ 更新完成！');
    console.log(`   匹配数量: ${result.matchedCount}`);
    console.log(`   修改数量: ${result.modifiedCount}`);
    
    // 验证更新结果
    const remainingErrors = await InsurancePolicy.countDocuments({
      status: 'active',
      errorMessage: { $ne: null, $exists: true }
    });
    
    console.log(`\n📊 验证结果:`);
    console.log(`   剩余有错误信息的已生效保单: ${remainingErrors}`);
    
    if (remainingErrors === 0) {
      console.log('\n🎉 所有已生效保单的错误信息已清除！');
    } else {
      console.log('\n⚠️  仍有部分保单存在错误信息，请检查');
    }
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
    console.log('='.repeat(80));
  }
}

// 运行脚本
clearErrorMessages()
  .then(() => {
    console.log('\n✅ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  });


/**
 * 数据修复脚本：清除非公海客户的"流失"标签
 * 
 * 问题：之前的逻辑会在客户进入公海时设置 leadLevel 为"流失"
 * 但是从公海领取时没有清除这个标签，导致正常客户显示为"流失"
 * 
 * 解决方案：将所有 inPublicPool=false 且 leadLevel="流失" 的客户的 leadLevel 设置为 null
 */

const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

async function fixLeadLevel() {
  try {
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    const db = mongoose.connection.db;
    const customersCollection = db.collection('customers');

    // 查找所有不在公海但线索等级为"流失"的客户
    const query = {
      inPublicPool: false,
      leadLevel: '流失'
    };

    console.log('\n🔍 查找需要修复的客户...');
    const count = await customersCollection.countDocuments(query);
    console.log(`📊 找到 ${count} 个需要修复的客户`);

    if (count === 0) {
      console.log('✅ 没有需要修复的数据');
      await mongoose.disconnect();
      return;
    }

    // 显示前5个需要修复的客户
    const samples = await customersCollection.find(query).limit(5).toArray();
    console.log('\n📋 示例客户：');
    samples.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name} (${customer.phone}) - 线索等级: ${customer.leadLevel}`);
    });

    // 执行修复
    console.log('\n🔧 开始修复...');
    const result = await customersCollection.updateMany(
      query,
      {
        $set: { leadLevel: null }
      }
    );

    console.log(`✅ 修复完成！`);
    console.log(`   - 匹配的文档数: ${result.matchedCount}`);
    console.log(`   - 修改的文档数: ${result.modifiedCount}`);

    // 验证修复结果
    const remainingCount = await customersCollection.countDocuments(query);
    console.log(`\n✅ 验证：还剩 ${remainingCount} 个需要修复的客户（应该为0）`);

    await mongoose.disconnect();
    console.log('\n🎉 数据修复完成！');
  } catch (error) {
    console.error('❌ 修复失败:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// 执行修复
fixLeadLevel();


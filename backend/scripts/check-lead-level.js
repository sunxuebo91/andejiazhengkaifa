/**
 * 检查脚本：查看数据库中客户的线索等级分布
 */

const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

async function checkLeadLevel() {
  try {
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    const db = mongoose.connection.db;
    const customersCollection = db.collection('customers');

    // 统计所有客户
    const totalCount = await customersCollection.countDocuments({});
    console.log(`\n📊 总客户数: ${totalCount}`);

    // 统计公海客户
    const publicPoolCount = await customersCollection.countDocuments({ inPublicPool: true });
    console.log(`🌊 公海客户数: ${publicPoolCount}`);

    // 统计非公海客户
    const assignedCount = await customersCollection.countDocuments({ inPublicPool: false });
    console.log(`👤 已分配客户数: ${assignedCount}`);

    // 统计线索等级分布
    console.log('\n📋 线索等级分布：');
    const leadLevelStats = await customersCollection.aggregate([
      {
        $group: {
          _id: '$leadLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    leadLevelStats.forEach(stat => {
      console.log(`  ${stat._id || '(未设置)'}: ${stat.count}`);
    });

    // 统计非公海客户的线索等级分布
    console.log('\n📋 非公海客户的线索等级分布：');
    const assignedLeadLevelStats = await customersCollection.aggregate([
      {
        $match: { inPublicPool: false }
      },
      {
        $group: {
          _id: '$leadLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    assignedLeadLevelStats.forEach(stat => {
      console.log(`  ${stat._id || '(未设置)'}: ${stat.count}`);
    });

    // 查找非公海但线索等级为"流失"的客户
    const problematicCustomers = await customersCollection.find({
      inPublicPool: false,
      leadLevel: '流失'
    }).limit(10).toArray();

    if (problematicCustomers.length > 0) {
      console.log(`\n⚠️  发现 ${problematicCustomers.length} 个非公海但标记为"流失"的客户：`);
      problematicCustomers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} (${customer.phone}) - customerId: ${customer.customerId}`);
      });
    } else {
      console.log('\n✅ 没有发现非公海但标记为"流失"的客户');
    }

    await mongoose.disconnect();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 检查失败:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// 执行检查
checkLeadLevel();


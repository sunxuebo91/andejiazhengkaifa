/**
 * 检查脚本：查看数据库中客户的合约状态分布
 */

const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

async function checkContractStatus() {
  try {
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    const db = mongoose.connection.db;
    const customersCollection = db.collection('customers');

    // 统计所有客户
    const totalCount = await customersCollection.countDocuments({});
    console.log(`\n📊 总客户数: ${totalCount}`);

    // 统计合约状态分布
    console.log('\n📋 合约状态分布：');
    const contractStatusStats = await customersCollection.aggregate([
      {
        $group: {
          _id: '$contractStatus',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    contractStatusStats.forEach(stat => {
      console.log(`  ${stat._id || '(未设置)'}: ${stat.count}`);
    });

    // 统计非公海客户的合约状态分布
    console.log('\n📋 非公海客户的合约状态分布：');
    const assignedContractStatusStats = await customersCollection.aggregate([
      {
        $match: { inPublicPool: false }
      },
      {
        $group: {
          _id: '$contractStatus',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    assignedContractStatusStats.forEach(stat => {
      console.log(`  ${stat._id || '(未设置)'}: ${stat.count}`);
    });

    // 查找非公海但合约状态为"流失客户"的客户
    const lostCustomers = await customersCollection.find({
      inPublicPool: false,
      contractStatus: '流失客户'
    }).limit(10).toArray();

    if (lostCustomers.length > 0) {
      console.log(`\n⚠️  发现 ${lostCustomers.length} 个非公海但合约状态为"流失客户"的客户：`);
      lostCustomers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} (${customer.phone}) - customerId: ${customer.customerId}`);
      });
    } else {
      console.log('\n✅ 没有发现非公海但合约状态为"流失客户"的客户');
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
checkContractStatus();


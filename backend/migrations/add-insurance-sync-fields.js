/**
 * 数据库迁移脚本：添加保险同步相关字段
 * 
 * 运行方式：node migrations/add-insurance-sync-fields.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazhengcrm';
    console.log('🔌 连接数据库:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');

    const db = mongoose.connection.db;

    // 1. 为现有合同添加保险同步字段
    console.log('\n📝 为现有合同添加保险同步字段...');
    const contractsResult = await db.collection('contracts').updateMany(
      {},
      {
        $set: {
          insuranceSyncPending: false,
          insuranceSyncStatus: null,
          insuranceSyncError: null,
          insuranceSyncedAt: null
        }
      }
    );
    console.log(`✅ 更新了 ${contractsResult.modifiedCount} 个合同记录`);

    // 2. 为现有保单添加合同关联字段
    console.log('\n📝 为现有保单添加合同关联字段...');
    const policiesResult = await db.collection('insurance_policies').updateMany(
      {},
      {
        $set: {
          contractId: null
        }
      }
    );
    console.log(`✅ 更新了 ${policiesResult.modifiedCount} 个保单记录`);

    // 3. 创建保险同步日志集合（如果不存在）
    console.log('\n📝 检查保险同步日志集合...');
    const collections = await db.listCollections({ name: 'insurance_sync_logs' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('insurance_sync_logs');
      console.log('✅ 创建了 insurance_sync_logs 集合');
    } else {
      console.log('ℹ️  insurance_sync_logs 集合已存在');
    }

    // 4. 创建索引
    console.log('\n📝 创建索引...');
    
    // 合同索引
    await db.collection('contracts').createIndex({ insuranceSyncStatus: 1 });
    console.log('✅ 创建了 contracts.insuranceSyncStatus 索引');

    // 保单索引
    await db.collection('insurance_policies').createIndex({ contractId: 1 });
    console.log('✅ 创建了 insurance_policies.contractId 索引');

    // 同步日志索引
    await db.collection('insurance_sync_logs').createIndex({ contractId: 1, createdAt: -1 });
    await db.collection('insurance_sync_logs').createIndex({ policyId: 1, createdAt: -1 });
    await db.collection('insurance_sync_logs').createIndex({ status: 1, createdAt: -1 });
    console.log('✅ 创建了 insurance_sync_logs 相关索引');

    console.log('\n🎉 迁移完成！');
    console.log('\n📊 迁移统计:');
    console.log(`   - 更新合同记录: ${contractsResult.modifiedCount} 条`);
    console.log(`   - 更新保单记录: ${policiesResult.modifiedCount} 条`);
    console.log(`   - 创建索引: 6 个`);

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
}

// 执行迁移
migrate();


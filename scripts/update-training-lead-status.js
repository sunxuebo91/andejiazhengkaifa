/**
 * 批量更新培训线索状态
 * 将旧状态映射到新状态：
 * - "新线索" → "新客未跟进"
 * - "已放弃" → "无效线索"
 * - "已流失" → "无效线索"
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'housekeeping';

// 状态映射规则
const STATUS_MAPPING = {
  '新线索': '新客未跟进',
  '已放弃': '无效线索',
  '已流失': '无效线索'
};

async function updateTrainingLeadStatus() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔌 连接数据库...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('training_leads');

    console.log('\n📊 检查当前状态分布：');
    const currentStats = await collection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.table(currentStats.map(s => ({ 状态: s._id || '(空)', 数量: s.count })));

    // 统计需要更新的数据
    const oldStatuses = Object.keys(STATUS_MAPPING);
    const needUpdateCount = await collection.countDocuments({
      status: { $in: oldStatuses }
    });

    if (needUpdateCount === 0) {
      console.log('\n✅ 没有需要更新的旧状态数据！');
      return;
    }

    console.log(`\n⚠️  发现 ${needUpdateCount} 条旧状态数据需要更新！`);
    console.log('\n📋 更新映射规则：');
    Object.entries(STATUS_MAPPING).forEach(([old, newStatus]) => {
      console.log(`   "${old}" → "${newStatus}"`);
    });

    // 确认是否继续
    console.log('\n⏳ 开始批量更新...\n');

    let totalUpdated = 0;

    // 逐个更新每种旧状态
    for (const [oldStatus, newStatus] of Object.entries(STATUS_MAPPING)) {
      const count = await collection.countDocuments({ status: oldStatus });
      
      if (count > 0) {
        console.log(`🔄 更新 "${oldStatus}" → "${newStatus}" (${count} 条)`);
        
        const result = await collection.updateMany(
          { status: oldStatus },
          { 
            $set: { 
              status: newStatus,
              updatedAt: new Date()
            }
          }
        );

        console.log(`   ✅ 已更新 ${result.modifiedCount} 条记录`);
        totalUpdated += result.modifiedCount;
      }
    }

    console.log(`\n✨ 批量更新完成！共更新 ${totalUpdated} 条记录\n`);

    // 显示更新后的状态分布
    console.log('📊 更新后状态分布：');
    const newStats = await collection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.table(newStats.map(s => ({ 状态: s._id || '(空)', 数量: s.count })));

    // 验证是否还有旧状态
    const remainingOld = await collection.countDocuments({
      status: { $in: oldStatuses }
    });

    if (remainingOld > 0) {
      console.warn(`\n⚠️  警告：仍有 ${remainingOld} 条旧状态数据未更新！`);
    } else {
      console.log('\n🎉 所有旧状态已成功更新！');
    }

  } catch (error) {
    console.error('❌ 更新失败：', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行更新
if (require.main === module) {
  updateTrainingLeadStatus()
    .then(() => {
      console.log('\n✅ 脚本执行完成！');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ 脚本执行失败：', err);
      process.exit(1);
    });
}

module.exports = { updateTrainingLeadStatus };

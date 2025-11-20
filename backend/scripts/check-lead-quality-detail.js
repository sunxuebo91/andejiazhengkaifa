/**
 * 检查脚本：查看线索质量详细分布
 */

const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

async function checkLeadQualityDetail() {
  try {
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const db = mongoose.connection.db;
    const customersCollection = db.collection('customers');

    // ========== ABCD分类总量统计 ==========
    console.log('📊 ABCD分类总量统计：');
    
    const leadLevelStats = await customersCollection.aggregate([
      {
        $match: {
          leadLevel: { $in: ['A类', 'B类', 'C类', 'D类'] }
        }
      },
      {
        $group: {
          _id: '$leadLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();

    let totalLeads = 0;
    leadLevelStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
      totalLeads += stat.count;
    });
    console.log(`   总计: ${totalLeads}\n`);

    // ========== 每个线索渠道的ABCD分类统计 ==========
    console.log('📋 每个线索渠道的ABCD分类统计：\n');
    
    const leadSourceLevelStats = await customersCollection.aggregate([
      {
        $match: {
          leadLevel: { $in: ['A类', 'B类', 'C类', 'D类'] }
        }
      },
      {
        $group: {
          _id: {
            leadSource: '$leadSource',
            leadLevel: '$leadLevel'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.leadSource': 1, '_id.leadLevel': 1 }
      }
    ]).toArray();

    // 按线索来源分组
    const sourceMap = {};
    leadSourceLevelStats.forEach(stat => {
      const source = stat._id.leadSource || '未设置';
      const level = stat._id.leadLevel;
      const count = stat.count;

      if (!sourceMap[source]) {
        sourceMap[source] = {
          'A类': 0,
          'B类': 0,
          'C类': 0,
          'D类': 0,
          total: 0
        };
      }

      sourceMap[source][level] = count;
      sourceMap[source].total += count;
    });

    // 打印结果
    Object.keys(sourceMap).sort().forEach(source => {
      const stats = sourceMap[source];
      console.log(`📌 ${source}（总计: ${stats.total}）`);
      console.log(`   A类: ${stats['A类']} (${((stats['A类'] / stats.total) * 100).toFixed(1)}%)`);
      console.log(`   B类: ${stats['B类']} (${((stats['B类'] / stats.total) * 100).toFixed(1)}%)`);
      console.log(`   C类: ${stats['C类']} (${((stats['C类'] / stats.total) * 100).toFixed(1)}%)`);
      console.log(`   D类: ${stats['D类']} (${((stats['D类'] / stats.total) * 100).toFixed(1)}%)\n`);
    });

    // ========== 线索来源总量统计（包括未评级） ==========
    console.log('📊 线索来源总量统计（包括未评级）：\n');
    
    const allLeadSourceStats = await customersCollection.aggregate([
      {
        $group: {
          _id: '$leadSource',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    allLeadSourceStats.forEach(stat => {
      const source = stat._id || '未设置';
      console.log(`   ${source}: ${stat.count}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 检查失败:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// 执行检查
checkLeadQualityDetail();


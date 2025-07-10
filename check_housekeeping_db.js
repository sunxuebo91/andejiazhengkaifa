const { MongoClient } = require('mongodb');

async function checkHousekeepingDB() {
  console.log('🔍 检查 housekeeping 数据库中的数据\n');

  const client = new MongoClient('mongodb://localhost:27017/housekeeping');
  
  try {
    await client.connect();
    console.log('✅ 连接到 housekeeping 数据库成功');

    const db = client.db('housekeeping');
    
    // 列出所有集合
    console.log('\n📚 数据库集合列表:');
    const collections = await db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });

    // 检查各集合的数据量
    console.log('\n📊 数据量统计:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count}条记录`);
    }

    // 检查客户数据
    const customerCount = await db.collection('customers').countDocuments();
    if (customerCount > 0) {
      console.log('\n👥 客户数据样本:');
      const customerSample = await db.collection('customers').findOne({});
      console.log('   字段:', Object.keys(customerSample));
      
      // 检查客户时间分布
      const customerTimeDistribution = await db.collection('customers').aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]).toArray();

      console.log('   时间分布:');
      customerTimeDistribution.forEach(item => {
        console.log(`     ${item._id.year}-${String(item._id.month).padStart(2, '0')}: ${item.count}个客户`);
      });
    }

    // 检查合同数据
    const contractCount = await db.collection('contracts').countDocuments();
    if (contractCount > 0) {
      console.log('\n📋 合同数据样本:');
      const contractSample = await db.collection('contracts').findOne({});
      console.log('   字段:', Object.keys(contractSample));
      
      // 检查合同时间分布
      const contractTimeDistribution = await db.collection('contracts').aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]).toArray();

      console.log('   时间分布:');
      contractTimeDistribution.forEach(item => {
        console.log(`     ${item._id.year}-${String(item._id.month).padStart(2, '0')}: ${item.count}份合同`);
      });
    }

    // 检查简历数据
    const resumeCount = await db.collection('resumes').countDocuments();
    if (resumeCount > 0) {
      console.log('\n📄 简历数据样本:');
      const resumeSample = await db.collection('resumes').findOne({});
      console.log('   字段:', Object.keys(resumeSample));
      
      // 检查接单状态分布
      const orderStatusDistribution = await db.collection('resumes').aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]).toArray();
      
      console.log('   接单状态分布:');
      orderStatusDistribution.forEach(item => {
        console.log(`     ${item._id}: ${item.count}份`);
      });
    }

    // 测试特定时间范围的查询
    console.log('\n🧪 测试时间范围查询:');
    
    const july2024Start = new Date('2024-07-01T00:00:00.000Z');
    const july2024End = new Date('2024-07-31T23:59:59.999Z');
    
    const july2024Customers = await db.collection('customers').countDocuments({
      createdAt: { $gte: july2024Start, $lte: july2024End }
    });
    
    const july2024Contracts = await db.collection('contracts').countDocuments({
      createdAt: { $gte: july2024Start, $lte: july2024End }
    });
    
    console.log(`   2024年7月客户: ${july2024Customers}个`);
    console.log(`   2024年7月合同: ${july2024Contracts}份`);

    const june2024Start = new Date('2024-06-01T00:00:00.000Z');
    const june2024End = new Date('2024-06-30T23:59:59.999Z');
    
    const june2024Customers = await db.collection('customers').countDocuments({
      createdAt: { $gte: june2024Start, $lte: june2024End }
    });
    
    const june2024Contracts = await db.collection('contracts').countDocuments({
      createdAt: { $gte: june2024Start, $lte: june2024End }
    });
    
    console.log(`   2024年6月客户: ${june2024Customers}个`);
    console.log(`   2024年6月合同: ${june2024Contracts}份`);

  } catch (error) {
    console.error('❌ 检查数据失败:', error);
  } finally {
    await client.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkHousekeepingDB().catch(console.error); 
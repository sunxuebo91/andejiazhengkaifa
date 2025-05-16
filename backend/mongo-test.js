const { MongoClient } = require('mongodb');

async function main() {
  console.log('尝试连接MongoDB...');
  const uri = 'mongodb://localhost:27017/housekeeping';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('成功连接到MongoDB!');
    
    const db = client.db('housekeeping');
    const collections = await db.listCollections().toArray();
    console.log('数据库中的集合:', collections);
    
    // 尝试读取简历集合
    const resumesCollection = db.collection('resume');
    const count = await resumesCollection.countDocuments();
    console.log('简历集合中的文档数量:', count);
    
    if (count > 0) {
      const sample = await resumesCollection.findOne();
      console.log('简历样本数据:', sample);
    }
  } catch (err) {
    console.error('MongoDB连接错误:', err);
  } finally {
    await client.close();
    console.log('MongoDB连接关闭');
  }
}

main().catch(console.error); 
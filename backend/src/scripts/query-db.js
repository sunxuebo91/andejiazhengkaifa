const { MongoClient } = require('mongodb');

async function main() {
  const uri = 'mongodb://localhost:27017/housekeeping';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('成功连接到数据库');

    const db = client.db('housekeeping');
    
    // 获取所有集合名称
    const collections = await db.listCollections().toArray();
    console.log('\n数据库中的集合：');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // 查询每个集合的内容
    for (const collection of collections) {
      const collectionName = collection.name;
      const documents = await db.collection(collectionName).find().toArray();
      
      console.log(`\n${collectionName} 集合中的文档数量：${documents.length}`);
      if (documents.length > 0) {
        console.log('示例文档：');
        console.log(JSON.stringify(documents[0], null, 2));
      }
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error); 
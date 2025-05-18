// 数据库修复脚本
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// 连接信息
const uri = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}`;
const dbName = process.env.DB_NAME || 'housekeeping';

async function fixDatabase() {
  console.log('开始修复数据库...');
  let client;
  
  try {
    // 连接到MongoDB
    client = new MongoClient(uri);
    await client.connect();
    console.log('成功连接到MongoDB');
    
    const db = client.db(dbName);
    const resumesCollection = db.collection('resumes');
    
    // 1. 检查resumes集合是否存在
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('数据库中的集合:', collectionNames);
    
    if (!collectionNames.includes('resumes')) {
      console.log('创建resumes集合...');
      await db.createCollection('resumes');
      console.log('resumes集合已创建');
    }
    
    // 2. 检查现有简历数据
    const resumesCount = await resumesCollection.countDocuments();
    console.log(`resumes集合中有 ${resumesCount} 条记录`);
    
    // 3. 修复没有ID的记录
    const resumesWithoutId = await resumesCollection.find({ id: { $exists: false } }).toArray();
    console.log(`发现 ${resumesWithoutId.length} 条没有id字段的记录`);
    
    if (resumesWithoutId.length > 0) {
      for (const resume of resumesWithoutId) {
        const newId = new ObjectId().toString();
        console.log(`为记录 ${resume._id} 添加id字段: ${newId}`);
        
        await resumesCollection.updateOne(
          { _id: resume._id },
          { $set: { id: newId } }
        );
      }
      console.log('完成id字段修复');
    }
    
    // 4. 检查必填字段
    const requiredFields = ['name', 'phone', 'age', 'education', 'nativePlace', 'experienceYears', 'jobType'];
    const missingRequiredFields = [];
    
    for (const field of requiredFields) {
      const missingCount = await resumesCollection.countDocuments({ [field]: { $exists: false } });
      if (missingCount > 0) {
        missingRequiredFields.push({ field, count: missingCount });
      }
    }
    
    console.log('缺少必填字段的记录:');
    console.log(missingRequiredFields);
    
    // 5. 添加时间戳
    const missingTimestamps = await resumesCollection.countDocuments({ 
      $or: [
        { createdAt: { $exists: false } },
        { updatedAt: { $exists: false } }
      ] 
    });
    
    if (missingTimestamps > 0) {
      console.log(`有 ${missingTimestamps} 条记录缺少时间戳`);
      
      await resumesCollection.updateMany(
        { $or: [{ createdAt: { $exists: false } }, { updatedAt: { $exists: false } }] },
        { $set: { createdAt: new Date(), updatedAt: new Date() } }
      );
      
      console.log('已添加缺失的时间戳');
    }
    
    // 6. 转换时间格式
    const stringTimestamps = await resumesCollection.countDocuments({ 
      $or: [
        { createdAt: { $type: 'string' } },
        { updatedAt: { $type: 'string' } }
      ] 
    });
    
    if (stringTimestamps > 0) {
      console.log(`有 ${stringTimestamps} 条记录的时间戳是字符串格式`);
      
      // 获取这些记录
      const recordsWithStringDates = await resumesCollection.find({ 
        $or: [
          { createdAt: { $type: 'string' } },
          { updatedAt: { $type: 'string' } }
        ] 
      }).toArray();
      
      for (const record of recordsWithStringDates) {
        const updates = {};
        
        if (typeof record.createdAt === 'string') {
          try {
            updates.createdAt = new Date(record.createdAt);
          } catch (e) {
            updates.createdAt = new Date();
          }
        }
        
        if (typeof record.updatedAt === 'string') {
          try {
            updates.updatedAt = new Date(record.updatedAt);
          } catch (e) {
            updates.updatedAt = new Date();
          }
        }
        
        await resumesCollection.updateOne(
          { _id: record._id },
          { $set: updates }
        );
      }
      
      console.log('已转换字符串时间为日期格式');
    }
    
    console.log('数据库修复完成');
  } catch (err) {
    console.error('数据库修复出错:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB连接已关闭');
    }
  }
}

// 执行修复
fixDatabase().catch(console.error); 
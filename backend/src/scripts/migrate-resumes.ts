import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function migrateResumes() {
  try {
    // 连接到 MongoDB
    const uri = 'mongodb://localhost:27017/housekeeping';
    await mongoose.connect(uri);
    console.log('成功连接到数据库');

    // 获取数据库实例
    const db = mongoose.connection.db;

    // 获取源集合和目标集合
    const sourceCollection = db.collection('resumeentities');
    const targetCollection = db.collection('resumes');

    // 获取所有简历数据
    const resumes = await sourceCollection.find({}).toArray();
    console.log(`找到 ${resumes.length} 条简历记录`);

    if (resumes.length === 0) {
      console.log('没有需要迁移的数据');
      return;
    }

    // 清空目标集合
    await targetCollection.deleteMany({});
    console.log('已清空目标集合');

    // 插入数据到目标集合
    const result = await targetCollection.insertMany(resumes);
    console.log(`成功迁移 ${result.insertedCount} 条记录`);

    // 验证迁移结果
    const targetCount = await targetCollection.countDocuments();
    console.log(`目标集合现在有 ${targetCount} 条记录`);

    if (targetCount === resumes.length) {
      console.log('迁移成功！');
      // 可以选择是否删除源集合
      // await sourceCollection.drop();
      // console.log('已删除源集合');
    } else {
      console.error('迁移可能不完整，请检查数据');
    }

  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    process.exit(0);
  }
}

// 运行迁移
migrateResumes(); 
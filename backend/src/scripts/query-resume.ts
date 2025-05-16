import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function queryDatabase() {
  // 连接到MongoDB
  const uri = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27018'}`;
  console.log(`尝试连接到MongoDB: ${uri}`);
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('连接到MongoDB成功');
    
    const database = client.db(process.env.DB_NAME || 'housekeeping'); // 使用正确的数据库名称
    const collection = database.collection('resumes');
    
    // 查询最新的10条简历数据
    const resumes = await collection.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`找到 ${resumes.length} 条简历记录:`);
    resumes.forEach((resume, index) => {
      console.log(`\n[${index + 1}] 简历ID: ${resume._id}`);
      console.log(`姓名: ${resume.name || '未提供'}`);
      console.log(`电话: ${resume.phone || '未提供'}`);
      console.log(`身份证正面: ${resume.idCardFrontUrl || '未提供'}`);
      console.log(`身份证反面: ${resume.idCardBackUrl || '未提供'}`);
      console.log(`照片数量: ${resume.photoUrls ? resume.photoUrls.length : 0}`);
      console.log(`证书数量: ${resume.certificateUrls ? resume.certificateUrls.length : 0}`);
      console.log(`体检报告数量: ${resume.medicalReportUrls ? resume.medicalReportUrls.length : 0}`);
      console.log(`创建时间: ${resume.createdAt}`);
    });
  } catch (error) {
    console.error('查询数据库出错:', error);
  } finally {
    await client.close();
    console.log('MongoDB连接已关闭');
  }
}

// 执行查询
queryDatabase(); 
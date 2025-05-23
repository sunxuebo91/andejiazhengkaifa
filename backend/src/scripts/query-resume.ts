import { connect, model } from 'mongoose';
import { ResumeEntity, ResumeSchema } from '../modules/resume/models/resume.entity';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function main() {
  try {
    // 连接到 MongoDB
    const uri = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}/${process.env.DB_NAME || 'housekeeping'}`;
    await connect(uri);
    console.log('成功连接到数据库');

    // 创建模型
    const ResumeModel = model<ResumeEntity>('Resume', ResumeSchema);

    // 查询所有简历
    const resumes = await ResumeModel.find()
      .sort({ createdAt: -1 })
      .exec();

    console.log(`找到 ${resumes.length} 条简历记录：`);
    
    // 打印每条简历的基本信息
    resumes.forEach((resume, index) => {
      console.log(`\n简历 #${index + 1}:`);
      console.log(`ID: ${resume._id}`);
      console.log(`姓名: ${resume.name}`);
      console.log(`电话: ${resume.phone}`);
      console.log(`创建时间: ${resume.createdAt}`);
      console.log('------------------------');
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    // 关闭数据库连接
    process.exit(0);
  }
}

main(); 
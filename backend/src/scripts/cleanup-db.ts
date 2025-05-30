import mongoose, { connect, model } from 'mongoose';
import { Resume, ResumeSchema } from '../modules/resume/models/resume.entity';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function cleanupDatabase() {
  try {
    // 连接到 MongoDB
    const uri = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}/${process.env.DB_NAME || 'housekeeping'}`;
    await connect(uri);
    console.log('成功连接到数据库');

    // 创建模型
    const ResumeModel = model<Resume>('Resume', ResumeSchema);

    // 获取所有简历，按创建时间排序
    const allResumes = await ResumeModel.find()
      .sort({ createdAt: -1 })
      .exec();

    console.log(`找到 ${allResumes.length} 条简历记录`);

    // 保留最新的3条记录
    const keepCount = 3;
    const resumesToDelete = allResumes.slice(keepCount);

    if (resumesToDelete.length === 0) {
      console.log('没有需要删除的记录');
      return;
    }

    // 删除旧记录
    const deleteIds = resumesToDelete.map(resume => resume._id);
    const deleteResult = await ResumeModel.deleteMany({ _id: { $in: deleteIds } });

    console.log(`成功删除 ${deleteResult.deletedCount} 条旧记录`);
    console.log('\n保留的记录：');
    
    // 显示保留的记录
    const keptResumes = await ResumeModel.find()
      .sort({ createdAt: -1 })
      .exec();

    keptResumes.forEach((resume, index) => {
      console.log(`\n简历 #${index + 1}:`);
      console.log(`ID: ${resume._id}`);
      console.log(`姓名: ${resume.name}`);
      console.log(`电话: ${resume.phone}`);
      console.log(`创建时间: ${(resume as any).createdAt}`);
      console.log('------------------------');
    });

  } catch (error) {
    console.error('清理数据库失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    process.exit(0);
  }
}

// 运行清理脚本
cleanupDatabase(); 
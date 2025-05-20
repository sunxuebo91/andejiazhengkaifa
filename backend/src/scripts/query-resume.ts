import dataSource from '../typeorm.config';
import { Resume } from '../modules/resume/models/resume.entity';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function queryDatabase() {
  try {
    // 初始化 TypeORM 数据源
    await dataSource.initialize();
    console.log('成功连接到数据库');
    
    // 使用 TypeORM Repository 查询数据
    const resumeRepository = dataSource.getRepository(Resume);
    const resumes = await resumeRepository.find({
      order: { createdAt: 'DESC' },
      take: 10
    });
    
    console.log(`找到 ${resumes.length} 条简历记录:`);
    resumes.forEach((resume, index) => {
      console.log(`\n[${index + 1}] 简历ID: ${resume.id}`);
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
    // 关闭数据库连接
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行查询
queryDatabase(); 
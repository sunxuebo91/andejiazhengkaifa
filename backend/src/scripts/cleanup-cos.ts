import * as mongoose from 'mongoose';
import { connect, model } from 'mongoose';
import { Resume, ResumeSchema } from '../modules/resume/models/resume.entity';
import { CosService } from '../modules/upload/cos.service';
import { ConfigService } from '@nestjs/config';
import { cosConfig } from '../config/cos.config';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupCos() {
  console.log('开始清理COS文件...');
  
  // 连接数据库
  await connect(process.env.MONGODB_URI);
  console.log('成功连接到数据库');
  
  // 获取最新的3条简历记录
  const Resume = model('Resume', ResumeSchema);
  const latestResumes = await Resume.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
  
  console.log(`找到 ${latestResumes.length} 条最新简历记录`);
  
  // 初始化COS服务
  const configService = new ConfigService();
  const cosService = new CosService(configService);
  
  // 获取所有文件列表
  const allFiles = await cosService.listFiles();
  console.log(`COS中找到 ${allFiles.length} 个文件`);
  
  // 提取最新简历中的文件URL
  const latestFileUrls = new Set<string>();
  for (const resume of latestResumes) {
    if (resume.idCardFront?.url) latestFileUrls.add(resume.idCardFront.url);
    if (resume.idCardBack?.url) latestFileUrls.add(resume.idCardBack.url);
    if (resume.personalPhoto?.url) latestFileUrls.add(resume.personalPhoto.url);
    if (resume.certificates) {
      for (const cert of resume.certificates) {
        if (cert.url) latestFileUrls.add(cert.url);
      }
    }
    if (resume.reports) {
      for (const report of resume.reports) {
        if (report.url) latestFileUrls.add(report.url);
      }
    }
    if (resume.photoUrls) {
      for (const url of resume.photoUrls) {
        latestFileUrls.add(url);
      }
    }
    if (resume.certificateUrls) {
      for (const url of resume.certificateUrls) {
        latestFileUrls.add(url);
      }
    }
    if (resume.medicalReportUrls) {
      for (const url of resume.medicalReportUrls) {
        latestFileUrls.add(url);
      }
    }
  }
  
  // 从URL中提取文件key
  const latestFileKeys = new Set<string>();
  for (const url of latestFileUrls) {
    try {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1); // 移除开头的斜杠
      latestFileKeys.add(key);
    } catch (error) {
      console.error(`解析文件URL失败: ${url}`, error);
    }
  }
  
  // 删除不在最新简历中的文件
  let deletedCount = 0;
  for (const file of allFiles) {
    const key = file.Key;
    if (!latestFileKeys.has(key)) {
      try {
        await cosService.deleteFile(key);
        console.log(`成功删除文件: ${key}`);
        deletedCount++;
      } catch (error) {
        console.error(`删除文件失败: ${key}`, error);
      }
    }
  }
  
  console.log(`\n清理完成:`);
  console.log(`- 保留了 ${latestFileKeys.size} 个文件`);
  console.log(`- 删除了 ${deletedCount} 个文件`);
  
  // 关闭数据库连接
  await mongoose.connection.close();
  console.log('数据库连接已关闭');
}

cleanupCos().catch(console.error); 
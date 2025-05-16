import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Resume } from './models/resume.entity';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
  ) {}

  async create(resumeData: Partial<Resume>): Promise<Resume> {
    try {
      console.log('创建简历数据:', resumeData);
      
      // 生成唯一ID
      const id = new ObjectId().toString();
      console.log('生成的简历ID:', id);
      
      const resume = this.resumeRepository.create({
        ...resumeData,
        id, // 设置生成的ID
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log('准备保存简历:', resume);
      const savedResume = await this.resumeRepository.save(resume);
      console.log('简历创建成功:', savedResume);
      return savedResume;
    } catch (error) {
      console.error('创建简历时出错:', error.stack);
      throw error;
    }
  }

  async update(id: string, resumeData: Partial<Resume>): Promise<Resume | null> {
    if (resumeData.idCardFrontUrl || resumeData.idCardBackUrl || resumeData.photoUrls || resumeData.certificateUrls || resumeData.medicalReportUrls) {
      // 文件 URL 相关的更新
    }
    await this.resumeRepository.update({ id }, {
      ...resumeData,
      updatedAt: new Date(),
    });
    return await this.resumeRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.resumeRepository.delete({ id });
  }

  async findOne(idOrCondition: string | Partial<Resume>): Promise<Resume | null> {
    console.log(`正在查询简历:`, idOrCondition);
    try {
      let resume: Resume | null;
      
      if (typeof idOrCondition === 'string') {
        resume = await this.resumeRepository.findOneBy({ id: idOrCondition } as FindOptionsWhere<Resume>);
      } else {
        // 将Partial<Resume>转换为FindOptionsWhere<Resume>
        const conditions: FindOptionsWhere<Resume> = {};
        Object.keys(idOrCondition).forEach(key => {
          conditions[key] = idOrCondition[key];
        });
        resume = await this.resumeRepository.findOneBy(conditions);
      }
      
      if (!resume) {
        console.log(`未找到符合条件的简历`);
        return null;
      }
      return resume;
    } catch (error) {
      console.error(`查询简历时出错:`, error.stack);
      return null;
    }
  }

  async findAll(): Promise<Resume[]> {
    console.log('获取所有简历数据');
    try {
      const resumes = await this.resumeRepository.find();
      console.log(`找到 ${resumes.length} 条简历记录`);
      
      // 打印ID信息
      if (resumes.length > 0) {
        console.log('简历ID示例:');
        resumes.slice(0, 3).forEach((resume, index) => {
          console.log(`[${index}] ID: ${resume.id}`);
        });
      }
      
      return resumes;
    } catch (error) {
      console.error('获取所有简历时出错:', error);
      return [];
    }
  }
}
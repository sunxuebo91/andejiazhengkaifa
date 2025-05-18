import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Resume } from './models/resume.entity';
import { BaseService } from '../../common/base.service';
import { CreateResumeDto } from './dto/create-resume.dto';

@Injectable()
export class ResumeService extends BaseService<Resume> {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
  ) {
    super(resumeRepository);
  }

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
      
      // 打印ID信息并检查简历是否有ID
      if (resumes.length > 0) {
        console.log('简历ID示例:');
        resumes.slice(0, 3).forEach((resume, index) => {
          // 检查ID是否存在
          if (!resume.id) {
            console.warn(`警告: 第${index}条简历缺少ID!`);
          } else {
            console.log(`[${index}] ID: ${resume.id}`);
          }
        });
        
        // 检查并修复没有ID的简历
        const resumesWithoutId = resumes.filter(resume => !resume.id);
        if (resumesWithoutId.length > 0) {
          console.warn(`发现 ${resumesWithoutId.length} 条简历没有ID, 正在修复...`);
          
          // 为每条没有ID的简历生成新ID并更新
          for (const resume of resumesWithoutId) {
            const newId = new ObjectId().toString();
            console.log(`为简历 ${resume.name || '未知姓名'} 生成新ID: ${newId}`);
            
            // 更新内存中的ID
            resume.id = newId;
            
            // 保存到数据库
            try {
              await this.resumeRepository.update({ name: resume.name, phone: resume.phone }, { id: newId });
              console.log(`简历ID更新成功: ${newId}`);
            } catch (error) {
              console.error(`更新简历ID失败:`, error);
            }
          }
        }
      }
      
      return resumes;
    } catch (error) {
      console.error('获取所有简历时出错:', error);
      return [];
    }
  }

  async findByPhone(phone: string): Promise<Resume | null> {
    this.logger.debug(`通过手机号查询简历: ${phone}`);
    return this.resumeRepository.findOne({ where: { phone } });
  }

  async findByIdNumber(idNumber: string): Promise<Resume | null> {
    this.logger.debug(`通过身份证号查询简历: ${idNumber}`);
    return this.resumeRepository.findOne({ where: { idNumber } });
  }

  async checkDuplicate(phone?: string, idNumber?: string): Promise<{
    duplicate: boolean;
    duplicatePhone: boolean;
    duplicateIdNumber: boolean;
    message: string;
  }> {
    this.logger.debug(`检查重复: phone=${phone}, idNumber=${idNumber}`);
    
    let duplicatePhone = false;
    let duplicateIdNumber = false;

    if (phone) {
      const phoneResult = await this.findByPhone(phone);
      duplicatePhone = !!phoneResult;
    }

    if (idNumber) {
      const idNumberResult = await this.findByIdNumber(idNumber);
      duplicateIdNumber = !!idNumberResult;
    }

    const duplicate = duplicatePhone || duplicateIdNumber;
    
    return {
      duplicate,
      duplicatePhone,
      duplicateIdNumber,
      message: duplicate ? '发现重复数据，请勿重复提交' : '未发现重复数据'
    };
  }

  async findByCondition(condition: Partial<Resume>): Promise<Resume | null> {
    this.logger.debug(`按条件查询简历: ${JSON.stringify(condition)}`);
    return this.resumeRepository.findOne({ 
      where: condition as unknown as FindOptionsWhere<Resume> 
    });
  }

  async createWithFiles(resumeData: CreateResumeDto, fileUrls: any): Promise<Resume> {
    this.logger.debug('创建带文件的简历');
    
    const data = {
      ...resumeData,
      ...fileUrls,
    };

    return this.create(data);
  }

  async searchResumes(query: string): Promise<Resume[]> {
    this.logger.debug(`搜索简历: ${query}`);
    
    // 构建查询条件
    return this.resumeRepository
      .createQueryBuilder('resume')
      .where('resume.name LIKE :query OR resume.phone LIKE :query OR resume.idNumber LIKE :query', { 
        query: `%${query}%` 
      })
      .getMany();
  }

  async findWithPagination(page: number = 1, pageSize: number = 10): Promise<{ items: Resume[]; total: number; page: number; pageSize: number }> {
    this.logger.debug(`分页查询简历: page=${page}, pageSize=${pageSize}`);
    
    // 获取总记录数
    const total = await this.resumeRepository.count();
    
    // 获取分页数据
    const skip = (page - 1) * pageSize;
    const items = await this.resumeRepository.find({
      skip,
      take: pageSize,
      order: { 
        createdAt: 'DESC' 
      }
    });
    
    return {
      items,
      total,
      page,
      pageSize
    };
  }
}
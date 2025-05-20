import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Resume } from './models/resume.entity';
import { MongoRepository } from 'typeorm';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(Resume)
    private resumeRepository: MongoRepository<Resume>,
  ) {
    // 自动初始化测试数据
    this.initializeTestData();
  }

  async create(resumeData: Partial<Resume>): Promise<Resume> {
    const newResume = this.resumeRepository.create(resumeData);
    return this.resumeRepository.save(newResume);
  }

  async findAll(page = 1, pageSize = 10): Promise<{ items: Resume[]; total: number }> {
    try {
      const [items, total] = await this.resumeRepository.findAndCount({
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { createdAt: 'DESC' },
      });

      // 确保返回的是数组
      return {
        items: Array.isArray(items) ? items : [],
        total: total || 0
      };
    } catch (error) {
      console.error('获取简历列表失败:', error);
      return {
        items: [],
        total: 0
      };
    }
  }

  async findOne(id: string): Promise<Resume> {
    return this.resumeRepository.findOne({ where: { _id: new ObjectId(id) } });
  }

  async update(id: string, updateData: Partial<Resume>): Promise<Resume> {
    await this.resumeRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.resumeRepository.delete(id);
    return result.affected > 0;
  }

  async checkDuplicate(phone: string, idNumber?: string): Promise<{ duplicate: boolean; existingResume?: Resume }> {
    const query: any = { phone };
    if (idNumber) {
      query.idNumber = idNumber;
    }
    
    const existingResume = await this.resumeRepository.findOne({ where: query });
    
    if (existingResume) {
      return { duplicate: true, existingResume };
    } else {
      return { duplicate: false };
    }
  }
  
  // 添加初始化测试数据的方法
  private async initializeTestData() {
    try {
      // 检查是否有数据
      const count = await this.resumeRepository.count();
      if (count === 0) {
        console.log('正在初始化测试简历数据...');
        // 创建测试数据
        const testResumes = [
          {
            name: '张三',
            phone: '13800138001',
            age: 28,
            education: '大专',
            nativePlace: '广东省广州市',
            experienceYears: 3,
            maritalStatus: 'married',
            currentAddress: '深圳市南山区科技园',
            jobType: 'zhujia-baomu',
            skills: ['zhongcan', 'fushi'],
            orderStatus: 'accepting',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            name: '李四',
            phone: '13900139002',
            age: 35,
            education: '高中',
            nativePlace: '湖南省长沙市',
            experienceYears: 5,
            maritalStatus: 'married',
            currentAddress: '深圳市福田区莲花街道',
            jobType: 'yuexin',
            skills: ['teshu-yinger', 'yuying'],
            orderStatus: 'accepting',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];
        
        await this.resumeRepository.save(testResumes);
        console.log('测试简历数据初始化完成');
      }
    } catch (error) {
      console.error('初始化测试数据失败:', error);
    }
  }
}
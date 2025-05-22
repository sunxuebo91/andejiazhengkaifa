import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ResumeEntity } from './models/resume.entity';  // 修正导入路径

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeEntity)
    private resumeRepository: MongoRepository<ResumeEntity>,
  ) {
    // 自动初始化测试数据
    this.initializeTestData();
  }

  async create(resumeData: Partial<ResumeEntity>): Promise<ResumeEntity> {
    try {
      const newResume = this.resumeRepository.create(resumeData);
      return await this.resumeRepository.save(newResume);
    } catch (error) {
      console.error('创建简历失败:', error);
      throw new Error(`创建简历失败: ${error.message || '未知错误'}`);
    }
  }

  async findAll(page = 1, pageSize = 10, search?: string): Promise<{ items: ResumeEntity[]; total: number }> {
    try {
      console.log('开始查询简历列表，页码:', page, '每页数量:', pageSize, '搜索关键词:', search);
      
      const skip = (page - 1) * pageSize;
      
      // 构建 MongoDB 查询条件
      const query: any = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { nativePlace: { $regex: search, $options: 'i' } },
          { idNumber: { $regex: search, $options: 'i' } }
        ];
      }
      
      // 使用 MongoDB 原生查询方法
      const [items, total] = await Promise.all([
        this.resumeRepository.find({
          where: query,
          skip,
          take: pageSize,
          order: { createdAt: 'DESC' }
        }),
        this.resumeRepository.count(query)
      ]);
      
      console.log('查询成功:', {
        total,
        currentPage: page,
        pageSize,
        itemsCount: items.length
      });

      return {
        items,
        total
      };
    } catch (error) {
      console.error('获取简历列表失败:', error);
      throw new Error(`获取简历列表失败: ${error.message || '未知错误'}`);
    }
  }

  async findOne(id: string): Promise<ResumeEntity> {
    try {
      const resume = await this.resumeRepository.findOne({ where: { _id: new ObjectId(id) } });
      if (!resume) {
        throw new Error(`未找到ID为 ${id} 的简历`);
      }
      return resume;
    } catch (error) {
      console.error('查找简历失败:', error);
      throw error;
    }
  }

  async update(id: string, updateData: Partial<ResumeEntity>): Promise<ResumeEntity> {
    try {
      const resume = await this.findOne(id);
      if (!resume) {
        throw new Error(`未找到ID为 ${id} 的简历`);
      }
      
      Object.assign(resume, updateData);
      return await this.resumeRepository.save(resume);
    } catch (error) {
      console.error('更新简历失败:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const result = await this.resumeRepository.delete({ _id: new ObjectId(id) });
      if (result.affected === 0) {
        throw new Error(`未找到ID为 ${id} 的简历`);
      }
      return true;
    } catch (error) {
      console.error('删除简历失败:', error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await this.resumeRepository.count();
    } catch (error) {
      console.error('获取简历数量失败:', error);
      return 0;
    }
  }

  async checkDuplicate(phone: string, idNumber?: string): Promise<{ duplicate: boolean; existingResume?: ResumeEntity }> {
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
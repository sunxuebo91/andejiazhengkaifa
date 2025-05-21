import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ResumeEntity } from './models/resume.entity';  // 修正导入路径
import { MongoRepository } from 'typeorm';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeEntity)
    private resumeRepository: Repository<ResumeEntity>,
  ) {
    // 自动初始化测试数据
    this.initializeTestData();
  }

  async create(resumeData: Partial<ResumeEntity>): Promise<ResumeEntity> {
    const newResume = this.resumeRepository.create(resumeData);
    // 确保设置 id 字段为 _id 的字符串形式
    if (newResume._id) {
      newResume.id = newResume._id.toString();
      newResume.databaseId = newResume._id.toString();
    }
    return this.resumeRepository.save(newResume);
  }

  // 在findAll方法中添加同样的处理逻辑
  async findAll(page = 1, pageSize = 10, search?: string): Promise<{ items: ResumeEntity[]; total: number }> {
    try {
      console.log('开始查询简历列表，页码:', page, '每页数量:', pageSize, '搜索关键词:', search);
      
      const query: any = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { nativePlace: { $regex: search, $options: 'i' } }
        ];
      }
      
      const [items, total] = await this.resumeRepository.findAndCount({
        where: query,
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { createdAt: 'DESC' },
      });

      // 确保每个简历对象都有正确的 id 字段
      const processedItems = items.map(item => {
        if (item._id) {
          item.id = item._id.toString();
          item.databaseId = item._id.toString();
        }
        return item;
      });

      console.log('数据库查询结果:', {
        itemsCount: processedItems?.length,
        total,
        firstItem: processedItems?.[0] ? {
          _id: processedItems[0]._id?.toString(),
          id: processedItems[0].id,
          databaseId: processedItems[0].databaseId,
          name: processedItems[0].name,
          phone: processedItems[0].phone
        } : null
      });

      return {
        items: processedItems,
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

  async findOne(id: string): Promise<ResumeEntity> {
    try {
      const resume = await this.resumeRepository.findOne({ where: { _id: new ObjectId(id) } });
      return resume;
    } catch (error) {
      console.error('查找简历失败:', error);
      return null;
    }
  }

  async update(id: string, updateData: Partial<ResumeEntity>): Promise<ResumeEntity> {
    try {
      await this.resumeRepository.update({ _id: new ObjectId(id) }, updateData);
      return this.findOne(id);
    } catch (error) {
      console.error('更新简历失败:', error);
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const result = await this.resumeRepository.delete({ _id: new ObjectId(id) });
      return result.affected > 0;
    } catch (error) {
      console.error('删除简历失败:', error);
      return false;
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
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResumeService } from '../resume.service';
import { ResumeEntity, ResumeSchema } from '../models/resume.entity';
import { Education, Gender, JobType } from '../dto/create-resume.dto';
import * as mongoose from 'mongoose';

describe('ResumeService', () => {
  let service: ResumeService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get('MONGODB_URI', 'mongodb://localhost:27017/housekeeping-test'),
            useNewUrlParser: true,
            useUnifiedTopology: true,
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature([
          { name: ResumeEntity.name, schema: ResumeSchema },
        ]),
      ],
      providers: [ResumeService],
    }).compile();

    service = module.get<ResumeService>(ResumeService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('创建简历', () => {
    it('应该成功创建简历', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
      };

      const resume = await service.create(createResumeDto);

      expect(resume).toBeDefined();
      expect(resume.name).toBe(createResumeDto.name);
      expect(resume.phone).toBe(createResumeDto.phone);
      expect(resume.age).toBe(createResumeDto.age);
      expect(resume.gender).toBe(createResumeDto.gender);
      expect(resume.education).toBe(createResumeDto.education);
      expect(resume.jobType).toBe(createResumeDto.jobType);
      expect(resume.experienceYears).toBe(createResumeDto.experienceYears);
    });

    it('应该验证手机号唯一性', async () => {
      const createResumeDto = {
        name: '测试用户1',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
      };

      await service.create(createResumeDto);

      const duplicateDto = {
        ...createResumeDto,
        name: '测试用户2',
      };

      await expect(service.create(duplicateDto)).rejects.toThrow();
    });
  });

  describe('查询简历', () => {
    it('应该支持分页查询', async () => {
      // 创建10条测试数据
      const testData = Array.from({ length: 10 }, (_, i) => ({
        name: `测试用户${i + 1}`,
        phone: `1380013800${i}`,
        age: 25 + i,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
      }));

      for (const data of testData) {
        await service.create(data);
      }

      // 测试第一页
      const page1 = await service.findAll(1, 5);
      expect(page1.items).toHaveLength(5);
      expect(page1.total).toBe(10);

      // 测试第二页
      const page2 = await service.findAll(2, 5);
      expect(page2.items).toHaveLength(5);
      expect(page2.total).toBe(10);
    });

    it('应该支持搜索功能', async () => {
      // 创建测试数据
      const testData = [
        {
          name: '张三',
          phone: '13800138001',
          age: 25,
          gender: Gender.FEMALE,
          education: Education.BACHELOR,
          nativePlace: '北京市',
          jobType: JobType.YUEXIN,
          experienceYears: 3,
        },
        {
          name: '李四',
          phone: '13800138002',
          age: 30,
          gender: Gender.FEMALE,
          education: Education.BACHELOR,
          nativePlace: '上海市',
          jobType: JobType.YUEXIN,
          experienceYears: 5,
        },
      ];

      for (const data of testData) {
        await service.create(data);
      }

      // 按名字搜索
      const result1 = await service.findAll(1, 10, '张三');
      expect(result1.items).toHaveLength(1);
      expect(result1.items[0].name).toBe('张三');

      // 按手机号搜索
      const result2 = await service.findAll(1, 10, '13800138002');
      expect(result2.items).toHaveLength(1);
      expect(result2.items[0].name).toBe('李四');
    });
  });

  describe('更新简历', () => {
    it('应该成功更新简历', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
      };

      const created = await service.create(createResumeDto);
      expect(created).toBeDefined();

      const updateDto = {
        name: '更新后的名字',
        age: 26,
      };

      // 使用toObject()方法获取普通对象
      const createdObj = created.toObject();
      const updated = await service.update(createdObj._id.toString(), updateDto);

      expect(updated).toBeDefined();
      expect(updated.name).toBe(updateDto.name);
      expect(updated.age).toBe(updateDto.age);
      expect(updated.phone).toBe(createResumeDto.phone);
    });

    it('更新不存在的简历应该抛出异常', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updateDto = {
        name: '更新后的名字',
      };

      await expect(service.update(nonExistentId, updateDto)).rejects.toThrow();
    });
  });

  describe('删除简历', () => {
    it('应该成功删除简历', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
      };

      const created = await service.create(createResumeDto);
      const createdObj = created.toObject();
      await service.remove(createdObj._id.toString());

      const found = await service.findOne(createdObj._id.toString());
      expect(found).toBeNull();
    });

    it('删除不存在的简历应该抛出异常', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      await expect(service.remove(nonExistentId)).rejects.toThrow();
    });
  });
});
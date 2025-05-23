import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResumeService } from '../resume.service';
import { ResumeEntity, ResumeSchema } from '../models/resume.entity';
import { Education, Gender, JobType, OrderStatus, Skill } from '../dto/create-resume.dto';
import * as mongoose from 'mongoose';

describe('Resume Relations', () => {
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

  describe('工作经历', () => {
    it('应该正确保存工作经历', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
        workExperiences: [
          {
            startDate: '2020-01',
            endDate: '2021-12',
            description: '在某家政公司担任月嫂，负责照顾新生儿',
          },
          {
            startDate: '2022-01',
            endDate: '2023-12',
            description: '在某家庭担任保姆，负责照顾老人',
          },
        ],
      };

      const resume = await service.create(createResumeDto);
      expect(resume.workExperiences).toBeDefined();
      expect(resume.workExperiences).toHaveLength(2);
      expect(resume.workExperiences[0].description).toContain('月嫂');
      expect(resume.workExperiences[1].description).toContain('保姆');
    });
  });

  describe('技能和证书', () => {
    it('应该正确保存技能信息', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
        skills: [
          Skill.CHANHOU,
          Skill.YUYING,
          Skill.TESHU_YINGER
        ],
        certificateUrls: [
          'https://example.com/cert1.jpg',
          'https://example.com/cert2.jpg'
        ],
      };

      const resume = await service.create(createResumeDto);
      expect(resume.skills).toBeDefined();
      expect(resume.skills).toHaveLength(3);
      expect(resume.skills).toContain(Skill.CHANHOU);
      expect(resume.certificateUrls).toHaveLength(2);
    });
  });

  describe('订单状态', () => {
    it('应该正确处理订单状态变更', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
        orderStatus: OrderStatus.ACCEPTING,
      };

      const resume = await service.create(createResumeDto);
      expect(resume.orderStatus).toBe(OrderStatus.ACCEPTING);

      // 更新订单状态
      const resumeId = resume._id.toString();
      const updated = await service.update(resumeId, {
        orderStatus: OrderStatus.ON_SERVICE
      });

      expect(updated.orderStatus).toBe(OrderStatus.ON_SERVICE);
    });
  });

  describe('文件信息', () => {
    it('应该正确保存各类文件URL', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
        idCardFront: 'https://example.com/idcard-front.jpg',
        idCardBack: 'https://example.com/idcard-back.jpg',
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        certificateUrls: ['https://example.com/cert1.jpg'],
        medicalReportUrls: ['https://example.com/medical1.pdf'],
      };

      const resume = await service.create(createResumeDto);
      expect(resume.idCardFront).toBeDefined();
      expect(resume.idCardBack).toBeDefined();
      expect(resume.photoUrls).toHaveLength(2);
      expect(resume.certificateUrls).toHaveLength(1);
      expect(resume.medicalReportUrls).toHaveLength(1);
    });

    it('应该允许更新文件URL', async () => {
      const createResumeDto = {
        name: '测试用户',
        phone: '13800138000',
        age: 25,
        gender: Gender.FEMALE,
        education: Education.BACHELOR,
        nativePlace: '北京市',
        jobType: JobType.YUEXIN,
        experienceYears: 3,
        photoUrls: ['https://example.com/photo1.jpg'],
      };

      const resume = await service.create(createResumeDto);
      const resumeId = resume._id.toString();
      
      // 更新照片URL列表
      const updated = await service.update(resumeId, {
        photoUrls: [
          ...resume.photoUrls,
          'https://example.com/photo2.jpg'
        ],
      });

      expect(updated.photoUrls).toHaveLength(2);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema } from '../models/resume.entity';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Education, Gender, JobType } from '../dto/create-resume.dto';

describe('Resume Type Tests', () => {
  let model: Model<Resume>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
          { name: Resume.name, schema: ResumeSchema },
        ]),
      ],
    }).compile();

    model = module.get<Model<Resume>>(getModelToken(Resume.name));
  });

  afterAll(async () => {
    await model.deleteMany({});
  });

  it('should create a resume with correct types', async () => {
    const resumeData = {
      name: '测试用户',
      phone: '13800138000',
      age: 25,
      gender: Gender.FEMALE,
      education: Education.BACHELOR,
      nativePlace: '北京市',
      jobType: JobType.YUEXIN,
      experienceYears: 3
    };

    const resume = new model(resumeData);
    const savedResume = await resume.save();

    // 测试必填字段
    expect(savedResume).toBeDefined();
    expect(savedResume._id).toBeDefined();
    expect(typeof savedResume.name).toBe('string');
    expect(typeof savedResume.phone).toBe('string');
    expect(typeof savedResume.age).toBe('number');
    expect(typeof savedResume.gender).toBe('string');
    expect(typeof savedResume.education).toBe('string');
    expect(typeof savedResume.nativePlace).toBe('string');
    expect(typeof savedResume.jobType).toBe('string');
    expect(typeof savedResume.experienceYears).toBe('number');
  });

  it('should handle optional fields correctly', async () => {
    const resumeData = {
      name: '测试用户2',
      phone: '13800138001',
      age: 26,
      gender: Gender.FEMALE,
      education: Education.BACHELOR,
      nativePlace: '上海市',
      jobType: JobType.YUEXIN,
      experienceYears: 3,
      // 可选字段
      wechat: 'test123',
      currentAddress: '北京市朝阳区',
      expectedSalary: 8000
    };

    const resume = new model(resumeData);
    const savedResume = await resume.save();

    expect(savedResume).toBeDefined();
    expect(savedResume._id).toBeDefined();
    expect(typeof savedResume.wechat).toBe('string');
    expect(typeof savedResume.currentAddress).toBe('string');
    expect(typeof savedResume.expectedSalary).toBe('number');
  });

  it('should update resume with correct types', async () => {
    const resume = await model.findOne().exec();
    if (resume) {
      const newName = '更新后的名字';
      resume.name = newName;
      const updatedResume = await resume.save();

      expect(updatedResume.name).toBe(newName);
      expect(updatedResume._id).toBeDefined();
      expect(typeof updatedResume.name).toBe('string');
    }
  });

  it('should handle arrays correctly', async () => {
    const resumeData = {
      name: '测试用户3',
      phone: '13800138002',
      age: 27,
      gender: Gender.FEMALE,
      education: Education.BACHELOR,
      nativePlace: '广州市',
      jobType: JobType.YUEXIN,
      experienceYears: 3,
      // 数组字段
      photoUrls: ['url1', 'url2'],
      workExperiences: [
        {
          startDate: '2020-01',
          endDate: '2021-12',
          description: '测试工作经历'
        }
      ]
    };

    const resume = new model(resumeData);
    const savedResume = await resume.save();

    expect(Array.isArray(savedResume.photoUrls)).toBe(true);
    expect(savedResume.photoUrls).toHaveLength(2);
    expect(Array.isArray(savedResume.workExperiences)).toBe(true);
    expect(savedResume.workExperiences).toHaveLength(1);
    expect(savedResume.workExperiences[0].description).toBe('测试工作经历');
  });
});
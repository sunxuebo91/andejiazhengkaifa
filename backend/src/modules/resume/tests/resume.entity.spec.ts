import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumeEntity, ResumeSchema } from '../models/resume.entity';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('ResumeEntity Type Tests', () => {
  let model: Model<ResumeEntity>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get('MONGODB_URI', 'mongodb://localhost:27017/housekeeping'),
            useNewUrlParser: true,
            useUnifiedTopology: true,
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature([
          { name: ResumeEntity.name, schema: ResumeSchema },
        ]),
      ],
    }).compile();

    model = module.get<Model<ResumeEntity>>(getModelToken(ResumeEntity.name));
  });

  afterAll(async () => {
    await model.deleteMany({});
  });

  it('should create a resume with correct types', async () => {
    const resumeData = {
      name: '测试用户',
      phone: '13800138000',
      age: 25,
      gender: '男',
      education: '本科',
      school: '测试大学',
      major: '计算机科学',
      workExperience: '3年',
      expectedPosition: '前端开发',
      expectedSalary: '15k-20k',
      selfEvaluation: '测试自我介绍',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const resume = new model(resumeData);
    const savedResume = await resume.save();

    // 测试类型
    expect(savedResume).toBeDefined();
    expect(savedResume._id).toBeInstanceOf(Types.ObjectId);
    expect(typeof savedResume.name).toBe('string');
    expect(typeof savedResume.phone).toBe('string');
    expect(typeof savedResume.age).toBe('number');
    expect(typeof savedResume.gender).toBe('string');
    expect(typeof savedResume.education).toBe('string');
    expect(typeof savedResume.school).toBe('string');
    expect(typeof savedResume.major).toBe('string');
    expect(typeof savedResume.workExperience).toBe('string');
    expect(typeof savedResume.expectedPosition).toBe('string');
    expect(typeof savedResume.expectedSalary).toBe('string');
    expect(typeof savedResume.selfEvaluation).toBe('string');
    expect(savedResume.createdAt).toBeInstanceOf(Date);
    expect(savedResume.updatedAt).toBeInstanceOf(Date);
  });

  it('should find resumes with correct types', async () => {
    const resumes = await model.find().exec();
    
    expect(Array.isArray(resumes)).toBe(true);
    if (resumes.length > 0) {
      const resume = resumes[0];
      expect(resume._id).toBeInstanceOf(Types.ObjectId);
      expect(typeof resume.name).toBe('string');
      expect(typeof resume.phone).toBe('string');
      expect(typeof resume.age).toBe('number');
      expect(typeof resume.gender).toBe('string');
      expect(typeof resume.education).toBe('string');
      expect(typeof resume.school).toBe('string');
      expect(typeof resume.major).toBe('string');
      expect(typeof resume.workExperience).toBe('string');
      expect(typeof resume.expectedPosition).toBe('string');
      expect(typeof resume.expectedSalary).toBe('string');
      expect(typeof resume.selfEvaluation).toBe('string');
      expect(resume.createdAt).toBeInstanceOf(Date);
      expect(resume.updatedAt).toBeInstanceOf(Date);
    }
  });

  it('should update resume with correct types', async () => {
    const resume = await model.findOne().exec();
    if (resume) {
      const newName = '更新后的名字';
      resume.name = newName;
      const updatedResume = await resume.save();

      expect(updatedResume.name).toBe(newName);
      expect(updatedResume._id).toBeInstanceOf(Types.ObjectId);
      expect(typeof updatedResume.name).toBe('string');
      expect(updatedResume.updatedAt).toBeInstanceOf(Date);
    }
  });

  it('should handle optional fields correctly', async () => {
    const resumeData = {
      name: '测试用户2',
      phone: '13800138001',
      age: 26,
      gender: '女',
      // 可选字段不提供
    };

    const resume = new model(resumeData);
    const savedResume = await resume.save();

    expect(savedResume).toBeDefined();
    expect(savedResume._id).toBeInstanceOf(Types.ObjectId);
    expect(typeof savedResume.name).toBe('string');
    expect(typeof savedResume.phone).toBe('string');
    expect(typeof savedResume.age).toBe('number');
    expect(typeof savedResume.gender).toBe('string');
    // 可选字段应该存在但可能为 undefined
    expect('education' in savedResume).toBe(true);
    expect('school' in savedResume).toBe(true);
    expect('major' in savedResume).toBe(true);
    expect('workExperience' in savedResume).toBe(true);
    expect('expectedPosition' in savedResume).toBe(true);
    expect('expectedSalary' in savedResume).toBe(true);
    expect('selfEvaluation' in savedResume).toBe(true);
  });
}); 
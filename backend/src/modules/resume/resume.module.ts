import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { Resume, ResumeSchema } from './models/resume.entity';
import { WorkExperienceSchema, WorkExperienceSchemaFactory } from './models/work-experience.schema';
import { FileInfoSchema, FileInfoSchemaFactory } from './models/file-info.schema';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { UploadModule } from '../upload/upload.module';
import { EmployeeEvaluation, EmployeeEvaluationSchema } from '../employee-evaluation/models/employee-evaluation.entity';
import { Contract, ContractSchema } from '../contracts/models/contract.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: WorkExperienceSchema.name, schema: WorkExperienceSchemaFactory },
      { name: FileInfoSchema.name, schema: FileInfoSchemaFactory },
      { name: EmployeeEvaluation.name, schema: EmployeeEvaluationSchema },
      { name: Contract.name, schema: ContractSchema }
    ]),
    UploadModule,
    // 为分享令牌签发/验证提供 JwtService
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'andejiazheng-secret-key',
      signOptions: { algorithm: 'HS256' }
    }),
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
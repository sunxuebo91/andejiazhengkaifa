import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { Resume, ResumeSchema } from './models/resume.entity';
import { WorkExperienceSchema, WorkExperienceSchemaFactory } from './models/work-experience.schema';
import { FileInfoSchema, FileInfoSchemaFactory } from './models/file-info.schema';
import { ResumeController } from './resume.controller';
import { ResumeQueryService } from './resume-query.service';
import { ResumeService } from './resume.service';
import { UploadModule } from '../upload/upload.module';
import { EmployeeEvaluation, EmployeeEvaluationSchema } from '../employee-evaluation/models/employee-evaluation.entity';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { User, UserSchema } from '../users/models/user.entity';
import { DashubaoModule } from '../dashubao/dashubao.module';
import { BackgroundCheck, BackgroundCheckSchema } from '../zmdb/models/background-check.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: WorkExperienceSchema.name, schema: WorkExperienceSchemaFactory },
      { name: FileInfoSchema.name, schema: FileInfoSchemaFactory },
      { name: EmployeeEvaluation.name, schema: EmployeeEvaluationSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
      { name: BackgroundCheck.name, schema: BackgroundCheckSchema },
    ]),
    UploadModule,
    DashubaoModule,
    // 为分享令牌签发/验证提供 JwtService
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { algorithm: 'HS256' } };
      },
    }),
  ],
  controllers: [ResumeController],
  providers: [ResumeService, ResumeQueryService],
  exports: [ResumeService],
})
export class ResumeModule {}

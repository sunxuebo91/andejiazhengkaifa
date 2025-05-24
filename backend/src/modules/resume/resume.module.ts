import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema } from './models/resume.entity';
import { WorkExperienceSchema, WorkExperienceSchemaFactory } from './models/work-experience.schema';
import { FileInfoSchema, FileInfoSchemaFactory } from './models/file-info.schema';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: WorkExperienceSchema.name, schema: WorkExperienceSchemaFactory },
      { name: FileInfoSchema.name, schema: FileInfoSchemaFactory }
    ]),
    UploadModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
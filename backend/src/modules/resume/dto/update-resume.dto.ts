import { PartialType } from '@nestjs/mapped-types';
import { CreateResumeDto } from './create-resume.dto';

export class UpdateResumeDto extends PartialType(CreateResumeDto) {
  // 继承CreateResumeDto的所有字段，但都是可选的
  // PartialType 会自动将所有字段设置为可选
} 
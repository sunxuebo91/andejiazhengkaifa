import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateTrainingLeadDto } from './create-training-lead.dto';
import { LeadStatus } from '../models/training-lead.model';

export class UpdateTrainingLeadDto extends PartialType(CreateTrainingLeadDto) {
  @ApiPropertyOptional({ description: '线索状态', enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus, { message: '状态值不合法' })
  status?: string;
}


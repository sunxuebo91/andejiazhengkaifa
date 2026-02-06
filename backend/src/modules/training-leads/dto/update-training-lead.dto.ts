import { PartialType } from '@nestjs/swagger';
import { CreateTrainingLeadDto } from './create-training-lead.dto';

export class UpdateTrainingLeadDto extends PartialType(CreateTrainingLeadDto) {}


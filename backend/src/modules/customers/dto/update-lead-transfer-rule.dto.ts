import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadTransferRuleDto } from './create-lead-transfer-rule.dto';

export class UpdateLeadTransferRuleDto extends PartialType(CreateLeadTransferRuleDto) {}


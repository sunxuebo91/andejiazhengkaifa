import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { BlacklistEvidence, BlacklistReasonType } from '../models/aunt-blacklist.model';

/**
 * 编辑黑名单记录：不允许修改 phone / idCard 这两个核心命中键，
 * 如需调整必须先释放再重新拉黑，保留审计痕迹。
 */
export class UpdateBlacklistDto {
  @ApiPropertyOptional({ description: '拉黑原因说明' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '原因类型' })
  @IsOptional()
  @IsEnum(['fraud', 'serious_complaint', 'work_quality', 'contract_breach', 'other'])
  reasonType?: BlacklistReasonType;

  @ApiPropertyOptional({ description: '证据材料数组' })
  @IsOptional()
  @IsArray()
  evidence?: BlacklistEvidence[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

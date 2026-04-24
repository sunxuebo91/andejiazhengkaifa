import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { BlacklistEvidence, BlacklistReasonType, BlacklistSourceType } from '../models/aunt-blacklist.model';

export class CreateBlacklistDto {
  @ApiProperty({ description: '阿姨姓名' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '手机号（phone 或 idCard 至少填一个）' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '身份证号（phone 或 idCard 至少填一个）' })
  @IsOptional()
  @IsString()
  idCard?: string;

  @ApiProperty({ description: '拉黑原因说明' })
  @IsString()
  @MinLength(2)
  reason: string;

  @ApiProperty({
    description: '原因类型',
    enum: ['fraud', 'serious_complaint', 'work_quality', 'contract_breach', 'other'],
  })
  @IsEnum(['fraud', 'serious_complaint', 'work_quality', 'contract_breach', 'other'])
  reasonType: BlacklistReasonType;

  @ApiPropertyOptional({ description: '证据材料数组' })
  @IsOptional()
  @IsArray()
  evidence?: BlacklistEvidence[];

  @ApiPropertyOptional({ description: '来源渠道', enum: ['resume', 'referral', 'manual'] })
  @IsOptional()
  @IsEnum(['resume', 'referral', 'manual'])
  sourceType?: BlacklistSourceType;

  @ApiPropertyOptional({ description: '来源简历ID（从简历详情一键拉黑时传入）' })
  @IsOptional()
  @IsString()
  sourceResumeId?: string;

  @ApiPropertyOptional({ description: '来源推荐记录ID' })
  @IsOptional()
  @IsString()
  sourceReferralResumeId?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remarks?: string;

  // phone 与 idCard 至少填一个，在 service 层再做整体校验
  @ValidateIf((o) => !o.phone && !o.idCard)
  @IsString({ message: '手机号和身份证号至少填一个' })
  private readonly _identifierGuard?: string;
}

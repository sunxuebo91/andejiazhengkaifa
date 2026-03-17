import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsString()
  @IsNotEmpty()
  hostName: string;

  @IsString()
  @IsNotEmpty()
  hostZegoUserId: string;

  @IsOptional()
  @IsEnum(['pc', 'miniprogram'])
  source?: 'pc' | 'miniprogram';

  @IsOptional()
  @IsString()
  hostUrl?: string; // 主持人重新进入的URL（带token）

  // ==================== 新增：简历关联 ====================
  @IsOptional()
  @IsMongoId()
  resumeId?: string; // 关联的简历ID

  @IsOptional()
  @IsString()
  candidateName?: string; // 候选人姓名

  @IsOptional()
  @IsString()
  candidatePhone?: string; // 候选人手机号

  @IsOptional()
  @IsString()
  candidatePosition?: string; // 候选人应聘职位
}


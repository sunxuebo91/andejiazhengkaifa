import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class CustomerQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // 支持客户姓名、客户手机号搜索

  @IsOptional()
  @IsString()
  caregiverName?: string; // 阿姨姓名

  @IsOptional()
  @IsString()
  caregiverPhone?: string; // 阿姨手机号

  @IsOptional()
  @IsEnum(['美团', '抖音', '快手', '小红书社群线索', '转介绍', '其他'])
  leadSource?: string;

  @IsOptional()
  @IsEnum(['月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老'])
  serviceCategory?: string;

  @IsOptional()
  @IsEnum(['已签约', '匹配中', '流失客户', '已退款', '退款中', '待定'])
  contractStatus?: string;

  @IsOptional()
  @IsEnum(['A类', 'B类', 'C类', 'D类'])
  leadLevel?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value) || 10)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'name', 'phone'], {
    message: '排序字段必须是：createdAt、updatedAt、name、phone之一'
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: '排序方向必须是：asc或desc'
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
} 
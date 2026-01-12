import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsUrl } from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({ description: 'Banner标题', example: '新春特惠活动' })
  @IsString()
  title: string;

  @ApiProperty({ description: '图片URL', example: 'https://cos.example.com/banner1.jpg' })
  @IsString()
  @IsUrl()
  imageUrl: string;

  @ApiProperty({ description: '跳转链接', required: false, example: '/pages/activity/index' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiProperty({ 
    description: '链接类型', 
    enum: ['none', 'miniprogram', 'h5', 'external'],
    default: 'none',
    required: false
  })
  @IsOptional()
  @IsEnum(['none', 'miniprogram', 'h5', 'external'])
  linkType?: string;

  @ApiProperty({ description: '排序顺序', default: 0, required: false })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ 
    description: '状态', 
    enum: ['active', 'inactive'],
    default: 'active',
    required: false
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;

  @ApiProperty({ description: '生效开始时间', required: false, example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({ description: '生效结束时间', required: false, example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;
}


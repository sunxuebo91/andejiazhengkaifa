import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryArticleDto {
  @ApiProperty({ description: '状态筛选', enum: ['draft', 'published'], required: false })
  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: string;

  @ApiProperty({ description: '搜索关键词（标题/正文/作者/来源）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;
}

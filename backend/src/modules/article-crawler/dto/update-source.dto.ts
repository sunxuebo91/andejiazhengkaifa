import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCrawlerSourceDto } from './create-source.dto';

export class UpdateCrawlerSourceDto extends PartialType(CreateCrawlerSourceDto) {
  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

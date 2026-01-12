import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNumber } from 'class-validator';

export class BannerOrderItem {
  @ApiProperty({ description: 'Banner ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '新的排序值' })
  @IsNumber()
  order: number;
}

export class ReorderBannerDto {
  @ApiProperty({ description: 'Banner排序列表', type: [BannerOrderItem] })
  @IsArray()
  items: BannerOrderItem[];
}


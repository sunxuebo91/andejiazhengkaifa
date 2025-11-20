import { IsArray, IsString, IsNotEmpty, IsOptional, IsMongoId, MaxLength, ArrayMinSize } from 'class-validator';

export class BatchAssignCustomerDto {
  @IsArray({ message: '客户ID列表必须是数组' })
  @ArrayMinSize(1, { message: '至少需要选择一个客户' })
  @IsMongoId({ each: true, message: '客户ID格式不正确' })
  customerIds: string[]; // 要分配的客户ID列表

  @IsMongoId({ message: '负责人ID格式不正确' })
  @IsNotEmpty({ message: '负责人ID不能为空' })
  assignedTo: string; // 新负责人ID

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '分配原因不能超过200字' })
  assignmentReason?: string; // 分配原因/备注
}


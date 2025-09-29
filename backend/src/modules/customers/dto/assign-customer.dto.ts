import { IsString, IsNotEmpty, IsOptional, IsMongoId, MaxLength } from 'class-validator';

export class AssignCustomerDto {
  @IsMongoId({ message: '负责人ID格式不正确' })
  @IsNotEmpty({ message: '负责人ID不能为空' })
  assignedTo: string; // 新负责人ID

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '分配原因不能超过200字' })
  assignmentReason?: string; // 分配原因/备注
}

import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateBackgroundCheckDto {
  @IsOptional()
  @IsString()
  tplId?: string;

  @IsOptional()
  @IsString()
  stuffId?: string;

  @IsString()
  @IsNotEmpty({ message: 'authStuffUrl 授权书地址不能为空' })
  authStuffUrl: string;

  @IsString()
  @IsNotEmpty({ message: 'esignContractNo 爱签合同编号不能为空' })
  esignContractNo: string;

  @IsString()
  @IsNotEmpty({ message: 'name 姓名不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'mobile 手机号不能为空' })
  mobile: string;

  @IsOptional()
  @IsString()
  idNo?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  @IsIn(['1', '2'], { message: 'packageType 必须是 1 或 2' })
  packageType?: string; // 套餐类型: '1' = 标准版, '2' = 深度版
}

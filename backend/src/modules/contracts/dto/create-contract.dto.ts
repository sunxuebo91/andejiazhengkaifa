import { 
  IsString, 
  IsNotEmpty, 
  IsEnum, 
  IsNumber, 
  IsDateString, 
  IsOptional,
  IsPhoneNumber,
  Min,
  Max,
  IsMongoId
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ContractType } from '../models/contract.model';

export class CreateContractDto {
  @IsString()
  @IsNotEmpty({ message: '客户姓名不能为空' })
  customerName: string;

  @IsString()
  @IsNotEmpty({ message: '客户手机号不能为空' })
  @IsPhoneNumber('CN', { message: '请输入有效的中国手机号码' })
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerIdCard?: string;

  @IsEnum(ContractType, {
    message: '合同类型必须是：小时工、保姆/育儿嫂、月嫂之一'
  })
  contractType: ContractType;

  @IsDateString({}, { message: '开始时间格式不正确' })
  startDate: string;

  @IsDateString({}, { message: '结束时间格式不正确' })
  endDate: string;

  @IsString()
  @IsNotEmpty({ message: '劳动者姓名不能为空' })
  workerName: string;

  @IsString()
  @IsNotEmpty({ message: '劳动者电话不能为空' })
  @IsPhoneNumber('CN', { message: '请输入有效的中国手机号码' })
  workerPhone: string;

  @IsString()
  @IsNotEmpty({ message: '劳动者身份证号不能为空' })
  workerIdCard: string;

  @IsNumber({}, { message: '家政员工资必须是数字' })
  @Min(1, { message: '家政员工资必须大于0' })
  @Transform(({ value }) => parseFloat(value))
  workerSalary: number;

  @IsNumber({}, { message: '客户服务费必须是数字' })
  @Min(0, { message: '客户服务费不能小于0' })
  @Transform(({ value }) => parseFloat(value))
  customerServiceFee: number;

  @IsOptional()
  @IsNumber({}, { message: '家政员服务费必须是数字' })
  @Min(0, { message: '家政员服务费不能小于0' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  workerServiceFee?: number;

  @IsOptional()
  @IsNumber({}, { message: '约定定金必须是数字' })
  @Min(0, { message: '约定定金不能小于0' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  deposit?: number;

  @IsOptional()
  @IsNumber({}, { message: '约定尾款必须是数字' })
  @Min(0, { message: '约定尾款不能小于0' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  finalPayment?: number;

  @IsOptional()
  @IsDateString({}, { message: '预产期格式不正确' })
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsNumber({}, { message: '工资发放日必须是数字' })
  @Min(1, { message: '工资发放日必须在1-31之间' })
  @Max(31, { message: '工资发放日必须在1-31之间' })
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  salaryPaymentDay?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsNumber({}, { message: '月工作天数必须是数字' })
  @Min(1, { message: '月工作天数必须在1-31之间' })
  @Max(31, { message: '月工作天数必须在1-31之间' })
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  monthlyWorkDays?: number;

  @IsMongoId({ message: '客户ID格式不正确' })
  customerId: string;

  @IsMongoId({ message: '服务人员ID格式不正确' })
  workerId: string;
} 
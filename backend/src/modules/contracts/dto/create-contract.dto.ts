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

  @IsOptional()
  @IsEnum(ContractType, {
    message: '合同类型必须是：月嫂、住家育儿嫂、保洁、住家保姆、养宠、小时工、白班育儿、白班保姆、住家护老之一'
  })
  contractType?: ContractType;

  @IsOptional()
  @IsDateString({}, { message: '开始时间格式不正确' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束时间格式不正确' })
  endDate?: string;

  @IsOptional()
  @IsString()
  workerName?: string;

  @IsOptional()
  @IsString()
  @IsPhoneNumber('CN', { message: '请输入有效的中国手机号码' })
  workerPhone?: string;

  @IsOptional()
  @IsString()
  workerIdCard?: string;

  @IsOptional()
  @IsString()
  workerAddress?: string; // 服务人员联系地址

  @IsOptional()
  @IsNumber({}, { message: '家政员工资必须是数字' })
  @Min(0, { message: '家政员工资不能小于0' })
  @Transform(({ value }) => value ? parseFloat(value) : 0)
  workerSalary?: number;

  @IsOptional()
  @IsNumber({}, { message: '客户服务费必须是数字' })
  @Min(0, { message: '客户服务费不能小于0' })
  @Transform(({ value }) => value ? parseFloat(value) : 0)
  customerServiceFee?: number;

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

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  workerId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  // 爱签相关字段
  @IsOptional()
  @IsString()
  esignContractNo?: string;

  @IsOptional()
  @IsString()
  esignStatus?: string;

  @IsOptional()
  @IsDateString()
  esignCreatedAt?: string;

  @IsOptional()
  @IsString()
  esignTemplateNo?: string;

  @IsOptional()
  @IsString()
  esignPreviewUrl?: string;

  // 🔥 爱签模板编号
  @IsOptional()
  @IsString()
  templateNo?: string;

  // 🔥 爱签模板参数（用于换人时复制）
  @IsOptional()
  templateParams?: Record<string, any>;

  // 前端发送的附加字段
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  contractAmount?: number;

  @IsOptional()
  @IsString()
  serviceStartDate?: string;

  @IsOptional()
  @IsString()
  serviceEndDate?: string;

  @IsOptional()
  @IsString()
  serviceContent?: string;

  @IsOptional()
  @IsString()
  serviceFrequency?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // 合同合并相关字段
  @IsOptional()
  @IsString()
  contractStatus?: string;

  @IsOptional()
  isLatest?: boolean;

  @IsOptional()
  @IsString()
  replacedByContractId?: string;

  @IsOptional()
  @IsString()
  replacesContractId?: string;

  @IsOptional()
  @IsNumber()
  serviceDays?: number;

  @IsOptional()
  @IsString()
  esignSignUrls?: string;
}
import { 
  IsString, 
  IsNotEmpty, 
  IsEnum, 
  IsNumber, 
  IsDateString, 
  IsOptional,
  IsPhoneNumber,
  Min,
  Max
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: '客户姓名不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '客户电话不能为空' })
  @IsPhoneNumber('CN', { message: '请输入有效的中国手机号码' })
  phone: string;

  @IsOptional()
  @IsString()
  wechatId?: string;

  @IsOptional()
  @IsString()
  idCardNumber?: string;

  @IsEnum(['美团', '抖音', '快手', '小红书社群线索', '转介绍', '其他'], {
    message: '线索来源必须是：美团、抖音、快手、小红书社群线索、转介绍、其他之一'
  })
  leadSource: string;

  @IsEnum(['已签约', '匹配中', '流失客户', '已退款', '退款中', '待定'], {
    message: '客户状态必须是：已签约、匹配中、流失客户、已退款、退款中、待定之一'
  })
  contractStatus: string;

  @IsOptional()
  @IsEnum(['月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老'], {
    message: '需求品类必须在指定选项中选择'
  })
  serviceCategory?: string;

  @IsOptional()
  @IsEnum(['A类', 'B类', 'C类', 'D类'], {
    message: '线索等级必须是：A类、B类、C类、D类之一'
  })
  leadLevel?: string;

  @IsOptional()
  @IsNumber({}, { message: '薪资预算必须是数字' })
  @Min(1000, { message: '薪资预算不能低于1000元' })
  @Max(50000, { message: '薪资预算不能高于50000元' })
  @Transform(({ value }) => parseInt(value))
  salaryBudget?: number;

  @IsOptional()
  @IsDateString({}, { message: '期望上户日期格式不正确' })
  expectedStartDate?: string;

  @IsOptional()
  @IsNumber({}, { message: '家庭面积必须是数字' })
  @Min(10, { message: '家庭面积不能小于10平方米' })
  @Max(1000, { message: '家庭面积不能大于1000平方米' })
  @Transform(({ value }) => parseInt(value))
  homeArea?: number;

  @IsOptional()
  @IsNumber({}, { message: '家庭人口必须是数字' })
  @Min(1, { message: '家庭人口不能少于1人' })
  @Max(20, { message: '家庭人口不能超过20人' })
  @Transform(({ value }) => parseInt(value))
  familySize?: number;

  @IsOptional()
  @IsEnum(['单休', '双休', '无休', '调休', '待定'], {
    message: '休息方式必须是：单休、双休、无休、调休、待定之一'
  })
  restSchedule?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  ageRequirement?: string;

  @IsOptional()
  @IsString()
  genderRequirement?: string;

  @IsOptional()
  @IsString()
  originRequirement?: string;

  @IsOptional()
  @IsEnum(['无学历', '小学', '初中', '中专', '职高', '高中', '大专', '本科', '研究生及以上'], {
    message: '学历要求必须在指定选项中选择'
  })
  educationRequirement?: string;

  @IsOptional()
  @IsDateString({}, { message: '预产期格式不正确' })
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  // 系统自动填充字段，不需要前端传递
  createdBy?: string;
} 
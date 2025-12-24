import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, ValidateNested, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// 被保险人DTO
export class InsuredPersonDto {
  @ApiPropertyOptional({ description: '被保险人唯一ID' })
  @IsString()
  @IsOptional()
  insuredId?: string;

  @ApiProperty({ description: '被保险人姓名' })
  @IsString()
  @IsNotEmpty()
  insuredName: string;

  @ApiPropertyOptional({ description: '被保险人类型：1-成人，2-儿童，3-老人' })
  @IsString()
  @IsOptional()
  insuredType?: string;

  @ApiProperty({ description: '证件类型：1-身份证，2-护照，3-其他等' })
  @IsString()
  @IsNotEmpty()
  idType: string;

  @ApiProperty({ description: '证件号码' })
  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @ApiProperty({ description: '出生日期（yyyyMMddHHmmss）' })
  @IsString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ description: '性别：M-男，F-女，O-其他' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional({ description: '电子邮件' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: '职业类别代码' })
  @IsString()
  @IsOptional()
  occupationCode?: string;

  @ApiPropertyOptional({ description: '职业类别名称' })
  @IsString()
  @IsOptional()
  occupationName?: string;

  @ApiPropertyOptional({ description: '与投保人关系：01-本人，40-子女等' })
  @IsString()
  @IsOptional()
  relationShip?: string;
}

// 投保人DTO
export class PolicyHolderDto {
  @ApiProperty({ description: '投保人类型：I-个人，C-企业' })
  @IsString()
  @IsNotEmpty()
  policyHolderType: string;

  @ApiProperty({ description: '投保人名称' })
  @IsString()
  @IsNotEmpty()
  policyHolderName: string;

  @ApiProperty({ description: '证件类型' })
  @IsString()
  @IsNotEmpty()
  phIdType: string;

  @ApiProperty({ description: '证件号码' })
  @IsString()
  @IsNotEmpty()
  phIdNumber: string;

  @ApiPropertyOptional({ description: '出生日期' })
  @IsString()
  @IsOptional()
  phBirthDate?: string;

  @ApiPropertyOptional({ description: '性别' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsString()
  @IsOptional()
  phTelephone?: string;

  @ApiPropertyOptional({ description: '地址' })
  @IsString()
  @IsOptional()
  phAddress?: string;

  @ApiPropertyOptional({ description: '邮编' })
  @IsString()
  @IsOptional()
  phPostCode?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsString()
  @IsOptional()
  phEmail?: string;

  @ApiPropertyOptional({ description: '是否打印发票：0-否，1-是' })
  @IsString()
  @IsOptional()
  reqFaPiao?: string;

  @ApiPropertyOptional({ description: '是否邮寄发票：0-否，1-是' })
  @IsString()
  @IsOptional()
  reqMail?: string;

  @ApiPropertyOptional({ description: '省级编码（工单险必传）' })
  @IsString()
  @IsOptional()
  phProvinceCode?: string;

  @ApiPropertyOptional({ description: '市级编码（工单险必传）' })
  @IsString()
  @IsOptional()
  phCityCode?: string;

  @ApiPropertyOptional({ description: '区级编码（工单险必传）' })
  @IsString()
  @IsOptional()
  phDistrictCode?: string;
}

// 返佣信息DTO
export class RebateInfoDto {
  @ApiProperty({ description: '返佣比例（小数格式，如0.1表示10%）' })
  @IsNumber()
  rebateRate: number;

  @ApiProperty({ description: '返佣客户姓名' })
  @IsString()
  @IsNotEmpty()
  rebateCusName: string;

  @ApiProperty({ description: '返佣客户身份证号' })
  @IsString()
  @IsNotEmpty()
  rebateCusIdNo: string;

  @ApiProperty({ description: '返佣客户银行卡号' })
  @IsString()
  @IsNotEmpty()
  rebateAccountNo: string;

  @ApiProperty({ description: '返佣客户银行卡留存手机号' })
  @IsString()
  @IsNotEmpty()
  rebateBankKeepMobile: string;

  @ApiPropertyOptional({ description: '返佣延迟天数' })
  @IsNumber()
  @IsOptional()
  rebateDelayDays?: number;
}

// 创建保单DTO
export class CreatePolicyDto {
  @ApiPropertyOptional({ description: '产品代码' })
  @IsString()
  @IsOptional()
  productCode?: string;

  @ApiProperty({ description: '计划代码' })
  @IsString()
  @IsNotEmpty()
  planCode: string;

  @ApiProperty({ description: '生效日期（yyyyMMddHHmmss）' })
  @IsString()
  @IsNotEmpty()
  effectiveDate: string;

  @ApiProperty({ description: '结束日期（yyyyMMddHHmmss）' })
  @IsString()
  @IsNotEmpty()
  expireDate: string;

  @ApiProperty({ description: '被保险人数量' })
  @IsNumber()
  @Min(1)
  groupSize: number;

  @ApiProperty({ description: '总保费' })
  @IsNumber()
  @Min(0)
  totalPremium: number;

  @ApiPropertyOptional({ description: '保费计算方式' })
  @IsString()
  @IsOptional()
  premiumCalType?: string;

  @ApiPropertyOptional({ description: '目的地' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiPropertyOptional({ description: '服务地址（工单险必传）' })
  @IsString()
  @IsOptional()
  serviceAddress?: string;

  @ApiPropertyOptional({ description: '订单编号（工单险必传）' })
  @IsString()
  @IsOptional()
  workOrderId?: string;

  @ApiProperty({ description: '投保人信息' })
  @ValidateNested()
  @Type(() => PolicyHolderDto)
  policyHolder: PolicyHolderDto;

  @ApiProperty({ description: '被保险人列表' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsuredPersonDto)
  insuredList: InsuredPersonDto[];

  @ApiPropertyOptional({ description: '返佣信息' })
  @ValidateNested()
  @Type(() => RebateInfoDto)
  @IsOptional()
  rebateInfo?: RebateInfoDto;

  @ApiPropertyOptional({ description: '关联的阿姨简历ID' })
  @IsString()
  @IsOptional()
  resumeId?: string;
}

// 查询保单DTO
export class QueryPolicyDto {
  @ApiPropertyOptional({ description: '渠道流水号' })
  @IsString()
  @IsOptional()
  agencyPolicyRef?: string;

  @ApiPropertyOptional({ description: '保单号' })
  @IsString()
  @IsOptional()
  policyNo?: string;
}

// 注销保单DTO
export class CancelPolicyDto {
  @ApiProperty({ description: '保单号' })
  @IsString()
  @IsNotEmpty()
  policyNo: string;
}

// 打印保单DTO
export class PrintPolicyDto {
  @ApiProperty({ description: '保单号' })
  @IsString()
  @IsNotEmpty()
  policyNo: string;

  @ApiPropertyOptional({ description: '备注原因' })
  @IsString()
  @IsOptional()
  reasonRemark?: string;
}

// 电子发票DTO
export class InvoiceDto {
  @ApiProperty({ description: '保单号' })
  @IsString()
  @IsNotEmpty()
  policyNo: string;

  @ApiProperty({ description: '开票金额' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: '手机号码' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsString()
  @IsOptional()
  mail?: string;

  @ApiPropertyOptional({ description: '发票抬头' })
  @IsString()
  @IsOptional()
  invoiceHead?: string;

  @ApiProperty({ description: '发票抬头类型：01-个人，02-公司/企业，03-政府机构等' })
  @IsString()
  @IsNotEmpty()
  invoiceHeadType: string;

  @ApiPropertyOptional({ description: '纳税识别号（企业必传）' })
  @IsString()
  @IsOptional()
  invoiceTaxpayerId?: string;
}

// 退保DTO
export class SurrenderPolicyDto {
  @ApiProperty({ description: '保单号' })
  @IsString()
  @IsNotEmpty()
  policyNo: string;

  @ApiProperty({ description: '退保原因：13-退票退保，14-航班取消，15-航班改签' })
  @IsString()
  @IsNotEmpty()
  removeReason: string;
}

// 批改DTO
export class AmendPolicyDto {
  @ApiProperty({ description: '保单号' })
  @IsString()
  @IsNotEmpty()
  policyNo: string;

  @ApiProperty({ description: '原被保人信息' })
  @ValidateNested()
  @Type(() => InsuredPersonDto)
  oldInsured: InsuredPersonDto;

  @ApiProperty({ description: '新被保人信息' })
  @ValidateNested()
  @Type(() => InsuredPersonDto)
  newInsured: InsuredPersonDto;
}

// 批增DTO
export class AddInsuredDto {
  @ApiProperty({ description: '保单号' })
  @IsString()
  @IsNotEmpty()
  policyNo: string;

  @ApiProperty({ description: '总保费' })
  @IsNumber()
  @Min(0)
  totalPremium: number;

  @ApiProperty({ description: '新增被保险人列表' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsuredPersonDto)
  insuredList: InsuredPersonDto[];
}


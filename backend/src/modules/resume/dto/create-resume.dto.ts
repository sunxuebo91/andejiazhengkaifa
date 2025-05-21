import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResumeDto {
  @ApiProperty({ description: '姓名', example: '张三' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '手机号码', example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '年龄', example: 35 })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiProperty({ description: '微信号', example: 'wxid_123456' })
  @IsOptional()
  @IsString()
  wechat?: string;

  @ApiProperty({ description: '身份证号', example: '110101199001011234' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiProperty({ description: '学历', example: '大专' })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiProperty({ description: '婚姻状况', example: '已婚', enum: ['未婚', '已婚', '离异', '丧偶'] })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiProperty({ description: '宗教信仰', example: '无', enum: ['无', '佛教', '基督教', '伊斯兰教', '天主教', '印度教', '道教', '新教', '东正教'] })
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiProperty({ description: '现居地址', example: '北京市朝阳区建国路88号' })
  @IsOptional()
  @IsString()
  currentAddress?: string;

  @ApiProperty({ description: '籍贯', example: '河南省郑州市' })
  @IsOptional()
  @IsString()
  nativePlace?: string;

  @ApiProperty({ description: '户口所在地', example: '河南省郑州市金水区' })
  @IsOptional()
  @IsString()
  hukouAddress?: string;

  @ApiProperty({ description: '出生日期', example: '1990-01-01' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiProperty({ description: '民族', example: '汉族' })
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiProperty({ description: '性别', example: '女', enum: ['男', '女'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: '生肖', example: '龙', enum: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] })
  @IsOptional()
  @IsString()
  zodiac?: string;

  @ApiProperty({ description: '星座', example: '摩羯座', enum: ['摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座'] })
  @IsOptional()
  @IsString()
  zodiacSign?: string;

  @ApiProperty({ description: '工作类型', example: '育儿嫂', enum: ['育儿嫂', '月嫂', '保姆', '护工', '钟点工'] })
  @IsOptional()
  @IsString()
  jobType?: string;

  @ApiProperty({ description: '期望薪资', example: 8000 })
  @IsOptional()
  @IsNumber()
  expectedSalary?: number;

  @ApiProperty({ description: '服务区域', example: '郑州市金水区' })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @ApiProperty({ description: '接单状态', example: '可接单', enum: ['可接单', '不可接单', '已接单'] })
  @IsOptional()
  @IsString()
  orderStatus?: string;

  @ApiProperty({ description: '技能列表', example: ['育儿', '早教', '辅食制作'] })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({ description: '工作经验年限', example: 5 })
  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @ApiProperty({ description: '来源渠道', example: '转介绍', enum: ['转介绍', '付费推广', '自然搜索'] })
  @IsOptional()
  @IsString()
  leadSource?: string;

  @ApiProperty({ 
    description: '工作经历', 
    example: [
      {
        startDate: '2020-01-01',
        endDate: '2022-12-31',
        description: '在郑州市某家庭担任育儿嫂，负责照顾2岁幼儿的日常生活和早教'
      }
    ]
  })
  @IsOptional()
  @IsArray()
  workExperience?: Array<{
    startDate: string;
    endDate: string;
    description: string;
  }>;

  @ApiProperty({ description: '身份证正面照片URL', example: 'https://example.com/idcard_front.jpg' })
  @IsOptional()
  @IsString()
  idCardFrontUrl?: string;

  @ApiProperty({ description: '身份证背面照片URL', example: 'https://example.com/idcard_back.jpg' })
  @IsOptional()
  @IsString()
  idCardBackUrl?: string;

  @ApiProperty({ description: '个人照片URL列表', example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'] })
  @IsOptional()
  @IsArray()
  photoUrls?: string[];

  @ApiProperty({ description: '证书照片URL列表', example: ['https://example.com/cert1.jpg', 'https://example.com/cert2.jpg'] })
  @IsOptional()
  @IsArray()
  certificateUrls?: string[];

  @ApiProperty({ description: '体检报告URL列表', example: ['https://example.com/medical1.pdf', 'https://example.com/medical2.pdf'] })
  @IsOptional()
  @IsArray()
  medicalReportUrls?: string[];
}
// 性别枚举
export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export type GenderType = 'male' | 'female';

// 工种枚举
export enum JobType {
  YUEXIN = 'YUEXIN',           // 月薪
  ZHUJIA_YUER = 'ZHUJIA_YUER', // 住家育儿
  BAIBAN_YUER = 'BAIBAN_YUER', // 白班育儿
  BAOJIE = 'BAOJIE',          // 保洁
  BAIBAN_BAOMU = 'BAIBAN_BAOMU', // 白班保姆
  ZHUJIA_BAOMU = 'ZHUJIA_BAOMU', // 住家保姆
  YANGCHONG = 'YANGCHONG',     // 养宠
  XIAOSHI = 'XIAOSHI'         // 小时工
}

// 工种映射
export const JOB_TYPE_MAP = {
  [JobType.YUEXIN]: '月薪',
  [JobType.ZHUJIA_YUER]: '住家育儿',
  [JobType.BAIBAN_YUER]: '白班育儿',
  [JobType.BAOJIE]: '保洁',
  [JobType.BAIBAN_BAOMU]: '白班保姆',
  [JobType.ZHUJIA_BAOMU]: '住家保姆',
  [JobType.YANGCHONG]: '养宠',
  [JobType.XIAOSHI]: '小时工'
} as const;

// 学历枚举
export enum Education {
  NO = 'NO',                 // 无学历
  PRIMARY = 'PRIMARY',       // 小学
  MIDDLE = 'MIDDLE',         // 初中
  SECONDARY = 'SECONDARY',   // 中专
  VOCATIONAL = 'VOCATIONAL', // 职高
  HIGH = 'HIGH',            // 高中
  COLLEGE = 'COLLEGE',      // 大专
  BACHELOR = 'BACHELOR',    // 本科
  GRADUATE = 'GRADUATE'     // 研究生
}

// 学历映射
export const EDUCATION_MAP = {
  [Education.NO]: '无学历',
  [Education.PRIMARY]: '小学',
  [Education.MIDDLE]: '初中',
  [Education.SECONDARY]: '中专',
  [Education.VOCATIONAL]: '职高',
  [Education.HIGH]: '高中',
  [Education.COLLEGE]: '大专',
  [Education.BACHELOR]: '本科',
  [Education.GRADUATE]: '研究生'
} as const;

// 工作经历接口
export interface WorkExperience {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

// 表单值接口
export interface FormValues {
  name: string;
  age: number;
  phone: string;
  gender: GenderType;
  nativePlace: string;
  jobType: keyof typeof JOB_TYPE_MAP;
  education: keyof typeof Education;
  experienceYears: number;
  idNumber?: string;
  wechat?: string;
  currentAddress?: string;
  hukouAddress?: string;
  birthDate?: string;
  ethnicity?: string;
  zodiac?: string;
  zodiacSign?: string;
  expectedSalary?: number;
  serviceArea?: string[];
  orderStatus?: string;
  skills?: string[];
  leadSource?: string;
  workExperiences?: WorkExperience[];
} 
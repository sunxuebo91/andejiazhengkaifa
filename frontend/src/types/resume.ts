// 性别枚举
export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export type GenderType = 'male' | 'female';

// 工种枚举
export enum JobType {
  ZHUJIA_YUER = 'zhujia-yuer', // 住家育儿
  BAIBAN_YUER = 'baiban-yuer', // 白班育儿
  BAOJIE = 'baojie',          // 保洁
  BAIBAN_BAOMU = 'baiban-baomu', // 白班保姆
  ZHUJIA_BAOMU = 'zhujia-baomu', // 住家保姆
  YANGCHONG = 'yangchong',     // 养宠
  XIAOSHI = 'xiaoshi',         // 小时工
  YUEXIN = 'yuexin'           // 月薪
}

// 工种映射
export const JOB_TYPE_MAP = {
  [JobType.ZHUJIA_YUER]: '住家育儿',
  [JobType.BAIBAN_YUER]: '白班育儿',
  [JobType.BAOJIE]: '保洁',
  [JobType.BAIBAN_BAOMU]: '白班保姆',
  [JobType.ZHUJIA_BAOMU]: '住家保姆',
  [JobType.YANGCHONG]: '养宠',
  [JobType.XIAOSHI]: '小时工',
  [JobType.YUEXIN]: '月薪'
} as const;

// 学历枚举
export enum Education {
  NO = 'no',                 // 无学历
  PRIMARY = 'primary',       // 小学
  MIDDLE = 'middle',         // 初中
  SECONDARY = 'secondary',   // 中专
  VOCATIONAL = 'vocational', // 职高
  HIGH = 'high',            // 高中
  COLLEGE = 'college',      // 大专
  BACHELOR = 'bachelor',    // 本科
  GRADUATE = 'graduate'     // 研究生
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
  startDate: string;
  endDate: string;
  description: string;
  company?: string;
  position?: string;
}

// 表单值接口
export interface FormValues {
  name: string;
  age: number;
  phone: string;
  gender: GenderType;
  nativePlace: string;
  jobType: JobType;
  education: Education;
  experienceYears: number;
  idNumber?: string;
  wechat?: string;
  currentAddress?: string;
  hukouAddress?: string;
  birthDate?: string;
  medicalExamDate?: string;
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
import apiService from './api';

// 简历数据接口
export interface Resume {
  _id?: string; // MongoDB 的 _id 字段
  id?: string; // 前端使用的 id 字段（由 _id 转换而来）
  name: string;
  phone: string;
  age: number;
  wechat?: string;
  idNumber?: string;
  education: string;
  nativePlace: string;
  experienceYears: number;
  maritalStatus?: string;
  religion?: string;
  currentAddress?: string;
  hukouAddress?: string;
  birthDate?: string;
  ethnicity?: string;
  gender?: string;
  zodiac?: string;
  zodiacSign?: string;
  jobType: string;
  expectedSalary?: number;
  serviceArea?: string;
  orderStatus?: string;
  skills?: string[];
  leadSource?: string;
  workExperience?: { startDate: string; endDate: string; description: string }[];
  
  // 文件URL
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  photoUrls?: string[];
  certificateUrls?: string[];
  medicalReportUrls?: string[];
  
  // 时间戳
  createdAt?: Date;
  updatedAt?: Date;
}

// 简历表单数据接口
export interface ResumeFormData extends Omit<Resume, 'id' | 'createdAt' | 'updatedAt'> {
  idCardFront?: File;
  idCardBack?: File;
  photoFiles?: File[];
  certificateFiles?: File[];
  medicalReportFiles?: File[];
}

// API 响应接口
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// 简历服务
export const resumeService = {
  // 获取所有简历
  getAll: async () => {
    const response = await apiService.get<ApiResponse<Resume[]>>('/resumes');
    return response.data;
  },
  
  // 获取单个简历
  getById: async (id: string) => {
    const response = await apiService.get<ApiResponse<Resume>>(`/resumes/${id}`);
    return response.data;
  },
  
  // 创建简历
  create: async (resumeData: ResumeFormData) => {
    // 处理文件上传
    const formData = new FormData();
    
    // 添加基本信息
    Object.entries(resumeData).forEach(([key, value]) => {
      // 跳过文件字段，它们将单独处理
      if (
        key !== 'idCardFront' && 
        key !== 'idCardBack' && 
        key !== 'photoFiles' && 
        key !== 'certificateFiles' && 
        key !== 'medicalReportFiles'
      ) {
        // 处理数组和对象
        if (value !== null && value !== undefined) {
          if (Array.isArray(value) || typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      }
    });
    
    // 添加文件
    if (resumeData.idCardFront) {
      formData.append('idCardFront', resumeData.idCardFront);
    }
    
    if (resumeData.idCardBack) {
      formData.append('idCardBack', resumeData.idCardBack);
    }
    
    if (resumeData.photoFiles && resumeData.photoFiles.length > 0) {
      for (const file of resumeData.photoFiles) {
        formData.append('photoFiles', file);
      }
    }
    
    if (resumeData.certificateFiles && resumeData.certificateFiles.length > 0) {
      for (const file of resumeData.certificateFiles) {
        formData.append('certificateFiles', file);
      }
    }
    
    if (resumeData.medicalReportFiles && resumeData.medicalReportFiles.length > 0) {
      for (const file of resumeData.medicalReportFiles) {
        formData.append('medicalReportFiles', file);
      }
    }
    
    const response = await apiService.upload<ApiResponse<Resume>>('/resumes', formData);
    return response.data;
  },
  
  // 更新简历
  update: async (id: string, resumeData: Partial<ResumeFormData>) => {
    // 处理文件上传
    const formData = new FormData();
    
    // 添加基本信息
    Object.entries(resumeData).forEach(([key, value]) => {
      // 跳过文件字段，它们将单独处理
      if (
        key !== 'idCardFront' && 
        key !== 'idCardBack' && 
        key !== 'photoFiles' && 
        key !== 'certificateFiles' && 
        key !== 'medicalReportFiles'
      ) {
        // 处理数组和对象
        if (value !== null && value !== undefined) {
          if (Array.isArray(value) || typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      }
    });
    
    // 添加文件
    if (resumeData.idCardFront) {
      formData.append('idCardFront', resumeData.idCardFront);
    }
    
    if (resumeData.idCardBack) {
      formData.append('idCardBack', resumeData.idCardBack);
    }
    
    if (resumeData.photoFiles && resumeData.photoFiles.length > 0) {
      for (const file of resumeData.photoFiles) {
        formData.append('photoFiles', file);
      }
    }
    
    if (resumeData.certificateFiles && resumeData.certificateFiles.length > 0) {
      for (const file of resumeData.certificateFiles) {
        formData.append('certificateFiles', file);
      }
    }
    
    if (resumeData.medicalReportFiles && resumeData.medicalReportFiles.length > 0) {
      for (const file of resumeData.medicalReportFiles) {
        formData.append('medicalReportFiles', file);
      }
    }
    
    const response = await apiService.upload<ApiResponse<Resume>>(`/resumes/${id}`, formData);
    return response.data;
  },
  
  // 删除简历
  delete: async (id: string) => {
    return apiService.delete(`/resumes/${id}`);
  },
  
  // 检查简历是否重复
  checkDuplicate: async (phone: string, idNumber?: string) => {
    const params: any = { phone };
    if (idNumber) {
      params.idNumber = idNumber;
    }
    return apiService.get('/resumes/check-duplicate', params);
  }
};

export default resumeService; 
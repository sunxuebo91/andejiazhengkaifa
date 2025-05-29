import imageCompression from 'browser-image-compression';
import axios from 'axios';
import api from './api';
import { AxiosError } from 'axios';

// 优化压缩选项 - 提供不同场景的压缩配置
const compressionOptions = {
  // 身份证等重要文档 - 保持较高质量
  idCard: {
    maxSizeMB: 0.2,      // 200KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    quality: 0.8,
  },
  // 个人照片 - 平衡质量和大小
  photo: {
    maxSizeMB: 0.1,      // 100KB
    maxWidthOrHeight: 800,
    useWebWorker: true,
    quality: 0.7,
  },
  // 证书照片 - 保持清晰度
  certificate: {
    maxSizeMB: 0.15,     // 150KB
    maxWidthOrHeight: 1000,
    useWebWorker: true,
    quality: 0.75,
  },
  // 体检报告 - 保持可读性
  medicalReport: {
    maxSizeMB: 0.3,      // 300KB
    maxWidthOrHeight: 1400,
    useWebWorker: true,
    quality: 0.8,
  },
  // 默认压缩选项
  default: {
    maxSizeMB: 0.1,      // 100KB
    maxWidthOrHeight: 800,
  useWebWorker: true,
    quality: 0.7,
  }
};

export class ImageService {
  static async compressImage(file: File, type: keyof typeof compressionOptions = 'default') {
    try {
      console.log(`开始压缩图片: ${file.name} (${(file.size / 1024).toFixed(2)}KB) - 类型: ${type}`);
      
      // 检查文件类型
      if (!file.type.includes('image')) {
        console.log('非图片文件，不进行压缩');
        return file;
      }
      
      // 如果文件已经很小，跳过压缩
      const targetSize = compressionOptions[type].maxSizeMB * 1024 * 1024;
      if (file.size <= targetSize) {
        console.log('文件已经足够小，跳过压缩');
        return file;
      }
      
      // 压缩图片
      const compressedFile = await imageCompression(file, compressionOptions[type]);
      
      console.log(`图片压缩完成: ${(compressedFile.size / 1024).toFixed(2)}KB (压缩率: ${
        ((1 - compressedFile.size / file.size) * 100).toFixed(1)
      }%)`);
      
      return compressedFile;
    } catch (error) {
      console.error('图片压缩失败:', error);
      // 如果压缩失败，返回原文件
      console.warn('压缩失败，使用原文件');
      return file;
    }
  }

  // 生成缩略图
  static async generateThumbnail(file: File): Promise<File> {
    try {
      const thumbnailOptions = {
        maxSizeMB: 0.02,     // 20KB 缩略图
        maxWidthOrHeight: 200,
        useWebWorker: true,
        quality: 0.6,
      };
      
      const thumbnail = await imageCompression(file, thumbnailOptions);
      console.log(`缩略图生成完成: ${(thumbnail.size / 1024).toFixed(2)}KB`);
      return thumbnail;
    } catch (error) {
      console.error('缩略图生成失败:', error);
      return file;
    }
  }

  // 预加载图片
  static preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }

  // 批量预加载图片
  static async preloadImages(urls: string[]): Promise<void> {
    try {
      await Promise.all(urls.map(url => this.preloadImage(url)));
      console.log(`成功预加载 ${urls.length} 张图片`);
    } catch (error) {
      console.warn('部分图片预加载失败:', error);
    }
  }

  static async uploadIdCard(file: File, type: 'front' | 'back') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`/api/upload/id-card/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || '图片上传失败');
      }
      
      return response.data.data.url;
    } catch (error) {
      console.error('上传身份证图片失败:', error);
      throw error;
    }
  }

  static async ocrIdCard(file: File, type: 'front' | 'back') {
    try {
      console.log('开始OCR识别请求:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        type
      });

      // 如果是身份证反面，直接返回成功
      if (type === 'back') {
        console.log('身份证反面不需要OCR识别，直接返回成功');
        return {
          words_result: {},
          risk_info: []
        };
      }

      const formData = new FormData();
      formData.append('file', file);
      
      console.log('发送OCR请求到:', '/api/ocr/idcard');
      const response = await api.post('/api/ocr/idcard', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        timeout: 30000,
      });
      
      console.log('OCR响应:', response.data);
      
      // 检查响应是否包含 words_result
      if (!response.data?.words_result) {
        console.error('OCR识别失败: 响应中缺少识别结果');
        throw new Error('OCR识别失败: 响应中缺少识别结果');
      }
      
      // 返回成功的结果
      console.log('OCR识别成功，返回结果:', response.data);
      return response.data;
    } catch (error) {
      console.error('OCR识别失败:', error);
      if (error instanceof AxiosError) {
        console.error('OCR请求详情:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            timeout: error.config?.timeout
          }
        });
        throw new Error(error.response?.data?.message || error.message || 'OCR识别失败');
      }
      throw error;
    }
  }

  // 计算年龄
  static calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  // 计算生肖
  static calculateZodiac(birthDate: string): string {
    const zodiacMap: Record<number, string> = {
      0: 'rat',    // 鼠
      1: 'ox',     // 牛
      2: 'tiger',  // 虎
      3: 'rabbit', // 兔
      4: 'dragon', // 龙
      5: 'snake',  // 蛇
      6: 'horse',  // 马
      7: 'goat',   // 羊
      8: 'monkey', // 猴
      9: 'rooster',// 鸡
      10: 'dog',   // 狗
      11: 'pig'    // 猪
    };
    
    const year = new Date(birthDate).getFullYear();
    const zodiacIndex = (year - 4) % 12;
    return zodiacMap[zodiacIndex] || 'rat'; // 添加默认值以防万一
  }

  // 计算星座
  static calculateZodiacSign(birthDate: string): string {
    const date = new Date(birthDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';    // 水瓶座
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';      // 双鱼座
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';       // 白羊座
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';      // 金牛座
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return 'gemini';      // 双子座
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return 'cancer';      // 巨蟹座
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';         // 狮子座
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';       // 处女座
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return 'libra';      // 天秤座
    if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return 'scorpio';   // 天蝎座
    if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return 'sagittarius';// 射手座
    return 'capricorn';                                                                  // 摩羯座
  }

  // 从地址中提取省份/直辖市
  static extractProvince(address: string): string | null {
    const provinces = [
      '北京市', '天津市', '上海市', '重庆市',
      '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省',
      '江苏省', '浙江省', '安徽省', '福建省', '江西省',
      '山东省', '河南省', '湖北省', '湖南省', '广东省',
      '海南省', '四川省', '贵州省', '云南省', '陕西省',
      '甘肃省', '青海省', '台湾省',
      '广西壮族自治区', '内蒙古自治区', '西藏自治区',
      '宁夏回族自治区', '新疆维吾尔自治区',
      '香港特别行政区', '澳门特别行政区'
    ];

    for (const province of provinces) {
      if (address.includes(province)) {
        return province;
      }
    }
    return null;
  }

  // 修改提取身份证信息的函数
  static extractIdCardInfo(ocrResult: any): Record<string, any> {
    const formValues: Record<string, any> = {};
    
    if (ocrResult?.words_result) {
      const words = ocrResult.words_result;
      
      // 提取基本信息
      if (words.姓名?.words) formValues.name = words.姓名.words;
      if (words.公民身份号码?.words) formValues.idNumber = words.公民身份号码.words;
      
      // 直接使用OCR识别的性别
      if (words.性别?.words) {
        formValues.gender = words.性别.words === '男' ? 'male' : 'female';
      }
      
      // 直接使用OCR识别的出生日期
      if (words.出生?.words) {
        const birthDate = words.出生.words.replace(/[年月]/g, '-').replace('日', '');
        formValues.birthDate = birthDate;
        
        // 根据出生日期计算年龄、生肖、星座
        formValues.age = this.calculateAge(birthDate);
        formValues.zodiac = this.calculateZodiac(birthDate);
        formValues.zodiacSign = this.calculateZodiacSign(birthDate);
      }
      
      if (words.民族?.words) formValues.ethnicity = words.民族.words;
      
      // 处理地址信息
      if (words.住址?.words) {
        const address = words.住址.words;
        formValues.hukouAddress = address;
        
        // 提取并填充籍贯
        const province = this.extractProvince(address);
        if (province) {
          formValues.nativePlace = province;
        }
      }
    }
    
    return formValues;
  }
}

export default ImageService;
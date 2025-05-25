import imageCompression from 'browser-image-compression';
import axios from 'axios';
import api from './api';
import { AxiosError } from 'axios';

// 压缩选项
const defaultCompressionOptions = {
  maxSizeMB: 0.05,      // 50KB = 0.05MB
  maxWidthOrHeight: 1024,
  useWebWorker: true,
};

export class ImageService {
  static async compressImage(file: File, options = defaultCompressionOptions) {
    try {
      console.log(`开始压缩图片: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
      
      // 检查文件类型
      if (!file.type.includes('image')) {
        console.log('非图片文件，不进行压缩');
        return file;
      }
      
      // 压缩图片
      const compressedFile = await imageCompression(file, options);
      
      console.log(`图片压缩完成: ${(compressedFile.size / 1024).toFixed(2)}KB (压缩率: ${
        ((1 - compressedFile.size / file.size) * 100).toFixed(1)
      }%)`);
      
      return compressedFile;
    } catch (error) {
      console.error('图片压缩失败:', error);
      throw error;
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

      const formData = new FormData();
      formData.append('file', file);
      
      console.log('发送OCR请求到:', '/ocr/idcard');
      const response = await api.post('/ocr/idcard', formData, {
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

  static extractIdCardInfo(ocrResult: any) {
    try {
      const formValues: any = {};
      
      if (ocrResult.words_result) {
        const result = ocrResult.words_result;
        
        // 提取基本信息
        if (result.姓名?.words) {
          formValues.name = result.姓名.words;
        }
        if (result.民族?.words) {
          formValues.ethnicity = result.民族.words.replace(/族$/, '');
        }
        if (result.公民身份号码?.words) {
          const idCard = result.公民身份号码.words;
          formValues.idNumber = idCard;
          
          // 提取出生日期
          const birthYear = parseInt(idCard.substring(6, 10));
          const birthMonth = parseInt(idCard.substring(10, 12));
          const birthDay = parseInt(idCard.substring(12, 14));
          formValues.birthDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
          
          // 设置性别
          formValues.gender = parseInt(idCard.charAt(16)) % 2 === 1 ? '男' : '女';
        }
        if (result.住址?.words) {
          formValues.currentAddress = result.住址.words;
          formValues.hukouAddress = result.住址.words;
        }
      }
      
      return formValues;
    } catch (error: unknown) {
      console.error('提取身份证信息失败:', error);
      return {};
    }
  }
}

export default ImageService;
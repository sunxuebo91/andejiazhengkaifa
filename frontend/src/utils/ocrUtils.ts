import axios from 'axios';
import { message } from 'antd';
import { compressImage } from './imageUtils';

// 获取OCR服务器地址（基于当前环境动态配置）
const getOcrServerUrl = () => {
  // 使用相对路径作为默认选项，防止跨域问题
  // 尝试优先级顺序
  const testUrls = [
    // 1. 尝试通过相对路径访问（Vite代理）
    '/api/ocr',
    // 2. 直接访问OCR测试服务
    '/ocr-test',
    // 3. 尝试通过专用OCR代理访问
    '/ocr-server',
    // 4. 尝试通过本地地址访问
    'http://localhost:3002'
  ];
  
  return testUrls;
};

// 调试日志
const debugLog = (...args: any[]) => {
  console.log('[OCR工具]', ...args);
};

// 身份证正反面类型定义
export type IdCardSide = 'front' | 'back';

// OCR识别结果接口
export interface OcrResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: any;
}

/**
 * 身份证OCR识别 - 使用百度官方SDK
 * @param file 身份证图片文件
 * @param side 身份证正反面
 * @returns Promise<OcrResult> OCR识别结果
 */
export const recognizeIdCard = async (
  file: File,
  side: IdCardSide = 'front'
): Promise<OcrResult> => {
  debugLog(`开始${side === 'front' ? '正面' : '背面'}身份证OCR识别`);
  
  try {
    // 压缩图片（如果文件太大）
    let processedFile = file;
    if (file.size > 1024 * 1024) { // 如果大于1MB则压缩
      debugLog(`图片大小(${(file.size/1024/1024).toFixed(2)}MB)过大，进行压缩`);
      processedFile = await compressImage(file, 0.8, 1920);
      debugLog(`压缩后图片大小: ${(processedFile.size/1024/1024).toFixed(2)}MB`);
    }
    
    // 创建表单数据
    const formData = new FormData();
    formData.append('idCardImage', processedFile);
    formData.append('idCardSide', side);
    
    debugLog('OCR请求表单字段:', 
      Array.from(formData.entries()).map(e => `${e[0]}=${e[1] instanceof File ? e[1].name : e[1]}`).join(', ')
    );
    
    // 添加额外的请求头，避免缓存问题
    const headers = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
    };
    
    // 添加随机参数防止缓存
    const timestamp = new Date().getTime();
    
    // 尝试多个服务器URL
    let response = null;
    let error = null;
    let lastError = null;
    
    // 遍历所有可能的OCR服务器URL
    for (const baseUrl of getOcrServerUrl()) {
      try {
        debugLog(`尝试OCR服务器URL: ${baseUrl}`);
        
        // 构建完整API路径
        let apiPath = '/idcard';
        // 如果baseUrl末尾有斜杠，而apiPath开头也有斜杠，移除一个
        const url = baseUrl.endsWith('/') && apiPath.startsWith('/') 
          ? `${baseUrl}${apiPath.substring(1)}` 
          : `${baseUrl}${apiPath}`;
        
        // 添加时间戳防止缓存
        const requestUrl = `${url}?_=${timestamp}`;
        
        debugLog('发送OCR请求到:', requestUrl);
        
        // 策略1：使用fetch API
        try {
          debugLog('尝试使用fetch发送OCR请求');
          const fetchResponse = await fetch(requestUrl, {
            method: 'POST',
            body: formData,
            credentials: 'omit',
            mode: 'cors',
            headers: headers
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`HTTP错误: ${fetchResponse.status}`);
          }
          
          response = await fetchResponse.json();
          debugLog(`OCR服务器 ${baseUrl} 请求成功:`, response);
          
          // 如果请求成功，直接返回结果
          if (response && response.success) {
            return {
              success: true,
              data: response.data
            };
          }
        } catch (fetchError) {
          debugLog(`Fetch API请求 ${baseUrl} 失败:`, fetchError);
          lastError = fetchError;
          
          // 尝试策略2：使用Axios
          try {
            debugLog('尝试使用Axios发送OCR请求');
            const axiosResponse = await axios.post(requestUrl, formData, {
              timeout: 30000,
              withCredentials: false,
              headers: {
                'Content-Type': 'multipart/form-data',
                ...headers
              }
            });
            
            response = axiosResponse.data;
            debugLog(`Axios请求 ${baseUrl} 成功:`, response);
            
            // 如果请求成功，直接返回结果
            if (response && response.success) {
              return {
                success: true,
                data: response.data
              };
            }
          } catch (axiosError) {
            debugLog(`Axios请求 ${baseUrl} 失败:`, axiosError);
            lastError = axiosError;
            
            // 继续尝试下一个URL
          }
        }
      } catch (urlError) {
        debugLog(`URL ${baseUrl} 处理失败:`, urlError);
        lastError = urlError;
      }
    }
    
    // 如果所有请求都失败，并且有错误，则抛出最后的错误
    if (!response && lastError) {
      throw lastError;
    }
    
    if (response && response.success) {
      debugLog(`身份证${side === 'front' ? '正面' : '背面'}识别成功`);
      message.success(`身份证${side === 'front' ? '正面' : '背面'}识别成功`);
      return {
        success: true,
        data: response.data
      };
    } else {
      const errorMsg = response?.message || '未知错误';
      debugLog(`身份证${side === 'front' ? '正面' : '背面'}识别失败:`, errorMsg);
      message.error(`身份证${side === 'front' ? '正面' : '背面'}识别失败: ${errorMsg}`);
      return {
        success: false,
        message: errorMsg,
        error: response?.error
      };
    }
  } catch (error) {
    debugLog('OCR识别请求出错:', error);
    
    let errorMessage = '身份证识别服务异常';
    
    if (error.code === 'ECONNABORTED' || error.name === 'TimeoutError') {
      errorMessage = '身份证识别服务响应超时，请稍后重试';
    } else if (error.response) {
      errorMessage = `身份证识别失败: ${error.response.data?.message || '服务器错误'} (${error.response.status})`;
      debugLog('服务器响应错误:', error.response.status, error.response.data);
    } else if (error.request || error.message?.includes('Failed to fetch')) {
      errorMessage = '无法连接到OCR服务器，请确认OCR服务已启动或手动填写信息';
      debugLog('网络请求失败:', error.message);
    } else {
      debugLog('请求错误:', error.message);
    }
    
    message.error(errorMessage);
    
    return {
      success: false,
      message: errorMessage,
      error: error
    };
  }
};

/**
 * 从身份证OCR结果中提取表单数据
 * @param ocrData OCR识别结果数据
 * @returns 表单数据对象
 */
export const extractIdCardFormData = (ocrData: any) => {
  const formValues: any = {};
  
  if (!ocrData?.words_result) {
    debugLog('OCR结果数据格式不正确，无法提取表单数据');
    return formValues;
  }
  
  const wordsResult = ocrData.words_result;
  debugLog('提取身份证数据字段:', Object.keys(wordsResult).join(', '));
  
  // 提取姓名
  if (wordsResult.姓名?.words) {
    formValues.name = wordsResult.姓名.words;
  }
  
  // 提取民族
  if (wordsResult.民族?.words) {
    let ethnicity = wordsResult.民族.words;
    if (ethnicity.endsWith('族')) {
      ethnicity = ethnicity.substring(0, ethnicity.length - 1);
    }
    formValues.ethnicity = ethnicity;
  }
  
  // 提取身份证号码
  if (wordsResult.公民身份号码?.words) {
    formValues.idNumber = wordsResult.公民身份号码.words;
  }
  
  // 提取地址
  if (wordsResult.住址?.words) {
    formValues.hukouAddress = wordsResult.住址.words;
  }
  
  // 提取出生日期
  if (wordsResult.出生?.words) {
    formValues.birthDateString = wordsResult.出生.words;
  }
  
  // 提取签发机关（身份证背面）
  if (wordsResult.签发机关?.words) {
    formValues.issuingAuthority = wordsResult.签发机关.words;
  }
  
  // 提取有效期限（身份证背面）
  if (wordsResult.有效期限?.words) {
    formValues.validPeriod = wordsResult.有效期限.words;
  }
  
  // 记录提取的字段
  debugLog('提取的身份证数据:', formValues);
  
  return formValues;
};

/**
 * 测试OCR服务器连接
 * @returns Promise<boolean> 连接是否成功
 */
export const testOcrConnection = async (): Promise<boolean> => {
  try {
    debugLog('测试OCR服务器连接...');
    
    // 获取所有可能的OCR服务器URL
    const serverUrls = getOcrServerUrl();
    debugLog('将尝试以下OCR服务器:', serverUrls);
    
    // 为每个URL创建测试请求
    for (const baseUrl of serverUrls) {
      try {
        const testUrl = `${baseUrl}${baseUrl === '/ocr-test' ? '' : '/test'}?_=${Date.now()}`;
        debugLog('测试URL:', testUrl);
        
        // 使用fetch API测试
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          debugLog('OCR服务连接成功:', data);
          return true;
        } else {
          const statusText = response.statusText || response.status.toString();
          debugLog(`Fetch请求 ${testUrl} 失败: ${statusText}`);
        }
      } catch (err) {
        debugLog(`Fetch URL ${baseUrl} 连接失败:`, err);
      }
    }
    
    // 所有连接都失败
    debugLog('所有OCR服务连接尝试都失败');
    return false;
  } catch (error) {
    debugLog('测试OCR服务器连接时出错:', error);
    return false;
  }
}; 
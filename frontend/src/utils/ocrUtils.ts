import axios from 'axios';
import { message } from 'antd';
import { compressImage } from './imageUtils';

// 缓存OCR服务可用状态，避免重复检测
let cachedOcrServerAvailable = false;
let lastCheckTime = 0;
const CHECK_INTERVAL = 60000; // 1分钟检查间隔

// 获取OCR服务器地址
const getOcrServerUrl = () => {
  // 只使用正确的API路径
  return '/api/api/upload';
};

// 调试日志
const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[OCR工具]', ...args);
  }
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
    // 压缩图片 - 提高传输和处理速度
    let processedFile = file;
    if (file.size > 50 * 1024) { // 如果大于50KB则压缩
      debugLog(`图片大小(${(file.size/1024).toFixed(2)}KB)过大，进行压缩`);
      // 使用统一的压缩设置，保持50KB以内
      processedFile = await compressImage(file); // 使用默认参数即可，现在是50KB
      debugLog(`压缩后图片大小: ${(processedFile.size/1024).toFixed(2)}KB`);
    }
    
    // 创建表单数据
    const formData = new FormData();
    formData.append('file', processedFile);
    
    // 添加时间戳防止缓存
    const timestamp = new Date().getTime();
    
    const baseUrl = getOcrServerUrl();
    // 构建请求URL
    const requestUrl = `${baseUrl}/id-card/${side}?_=${timestamp}`;
    
    debugLog(`发送OCR请求: ${requestUrl}`);
    
    // 发送请求
    try {
      const response = await axios.post(requestUrl, formData, {
        timeout: 15000, // 15秒超时
        headers: {
          'Content-Type': 'multipart/form-data',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const responseData = response.data;
      
      // 更新服务状态缓存
      cachedOcrServerAvailable = true;
      lastCheckTime = Date.now();
      
      if (responseData && responseData.success) {
        debugLog(`身份证${side === 'front' ? '正面' : '背面'}识别成功`);
        message.success(`身份证${side === 'front' ? '正面' : '背面'}识别成功`);
        return {
          success: true,
          data: responseData.data
        };
      } else {
        const errorMsg = responseData?.message || '未知错误';
        debugLog(`身份证${side === 'front' ? '正面' : '背面'}识别失败:`, errorMsg);
        message.error(`身份证${side === 'front' ? '正面' : '背面'}识别失败: ${errorMsg}`);
        return {
          success: false,
          message: errorMsg,
          error: responseData?.error
        };
      }
    } catch (err) {
      // 记录具体错误，便于调试
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      const errMsg = err.response?.data?.message || err.message;
      debugLog(`OCR请求失败 [${requestUrl}]: ${status} ${statusText}, 错误: ${errMsg}`);
      
      // COS相关错误处理
      if (errMsg.includes('SecretId') || errMsg.includes('COS')) {
        throw new Error('腾讯云COS配置错误: SecretId或SecretKey缺失');
      } else {
        throw err;
      }
    }
  } catch (error) {
    debugLog('OCR识别请求出错:', error);
    
    let errorMessage = '身份证识别服务异常';
    
    if (error.code === 'ECONNABORTED' || error.name === 'TimeoutError') {
      errorMessage = '身份证识别服务响应超时，请稍后重试';
    } else if (error.response) {
      errorMessage = `身份证识别失败: ${error.response.data?.message || '服务器错误'} (${error.response.status})`;
    } else if (error.request || error.message?.includes('Failed to fetch')) {
      errorMessage = '无法连接到OCR服务器，请确认OCR服务已启动或手动填写信息';
    } else if (error.message?.includes('COS') || error.message?.includes('SecretId')) {
      errorMessage = '后端存储服务配置缺失，请联系管理员或手动填写信息';
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
  
  // 检查是否有嵌套的data结构，这是我们后端实际返回的格式
  if (ocrData?.data) {
    debugLog('检测到嵌套的data结构，使用data字段');
    ocrData = ocrData.data;
  }
  
  // 检查后端新格式：成功上传后返回的数据格式
  if (ocrData?.ocrResult) {
    debugLog('检测到后端新OCR结果格式，提取ocrResult');
    ocrData = ocrData.ocrResult;
  }

  // 直接处理腾讯云OCR服务返回的数据（不在Response字段内）
  if (ocrData && typeof ocrData === 'object' && 
      (ocrData.Name || ocrData.IdNum || ocrData.Address) && 
      !ocrData.Response && !ocrData.words_result) {
    debugLog('检测到腾讯云OCR直接返回格式');
    
    // 提取姓名
    if (ocrData.Name) {
      formValues.name = ocrData.Name;
    }
    
    // 提取性别
    if (ocrData.Sex) {
      formValues.gender = ocrData.Sex;
    }
    
    // 提取民族
    if (ocrData.Nation) {
      let ethnicity = ocrData.Nation;
      if (ethnicity && ethnicity.endsWith('族')) {
        ethnicity = ethnicity.substring(0, ethnicity.length - 1);
      }
      formValues.ethnicity = ethnicity;
    }
    
    // 提取出生日期
    if (ocrData.Birth) {
      formValues.birthDateString = ocrData.Birth;
    }
    
    // 提取地址
    if (ocrData.Address) {
      formValues.hukouAddress = ocrData.Address;
    }
    
    // 提取身份证号码
    if (ocrData.IdNum) {
      formValues.idNumber = ocrData.IdNum;
    }
    
    // 提取签发机关（身份证背面）
    if (ocrData.Authority) {
      formValues.issuingAuthority = ocrData.Authority;
    }
    
    // 提取有效期限（身份证背面）
    if (ocrData.ValidDate) {
      formValues.validPeriod = ocrData.ValidDate;
    }
    
    debugLog('从腾讯云OCR直接格式提取数据:', formValues);
    return formValues;
  }
  
  // 处理纯URL情况（上传成功但OCR失败的情况）
  if (typeof ocrData === 'string' && ocrData.startsWith('http')) {
    debugLog('收到了文件URL，但没有OCR结果');
    return formValues; // 返回空对象
  }
  
  // 尝试直接从任何格式的数据中提取信息
  try {
    // 记录收到的数据结构，帮助调试
    debugLog('收到的OCR数据格式:', JSON.stringify(ocrData));
    
    // 尝试各种可能的数据格式
    
    // 1. 腾讯云OCR格式 (Response)
    if (ocrData?.Response) {
      debugLog('检测到腾讯云OCR格式，使用Response字段');
      const response = ocrData.Response;
      
      // 提取姓名
      if (response.Name) {
        formValues.name = response.Name;
      }
      
      // 提取性别
      if (response.Sex) {
        formValues.gender = response.Sex;
      }
      
      // 提取民族
      if (response.Nation) {
        let ethnicity = response.Nation;
        if (ethnicity && ethnicity.endsWith('族')) {
          ethnicity = ethnicity.substring(0, ethnicity.length - 1);
        }
        formValues.ethnicity = ethnicity;
      }
      
      // 提取出生日期
      if (response.Birth) {
        formValues.birthDateString = response.Birth;
      }
      
      // 提取地址
      if (response.Address) {
        formValues.hukouAddress = response.Address;
      }
      
      // 提取身份证号码
      if (response.IdNum) {
        formValues.idNumber = response.IdNum;
      }
      
      // 提取签发机关（身份证背面）
      if (response.Authority) {
        formValues.issuingAuthority = response.Authority;
      }
      
      // 提取有效期限（身份证背面）
      if (response.ValidDate) {
        formValues.validPeriod = response.ValidDate;
      }
      
      return formValues;
    }
    
    // 2. 标准百度OCR格式 (words_result)
    if (ocrData?.words_result) {
      const wordsResult = ocrData.words_result;
      
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
    } 
    // 3. 腾讯云COS上传成功返回的仅有文件URL格式
    else if (typeof ocrData === 'string' && ocrData.includes('cos.')) {
      // 这种情况下只有文件URL，没有OCR结果
      debugLog('收到了文件URL，但没有OCR结果');
      formValues.imageUrl = ocrData;
    }
    // 4. 我们的自定义返回格式
    else if (ocrData?.success === true && ocrData?.data) {
      // 尝试从嵌套的data中获取OCR结果
      debugLog('尝试从嵌套的data中获取OCR结果');
      return extractIdCardFormData(ocrData.data);
    }
    // 5. 直接的结构化数据
    else if (typeof ocrData === 'object') {
      // 尝试直接从对象中提取常见字段
      if (ocrData.name) formValues.name = ocrData.name;
      if (ocrData.idNumber) formValues.idNumber = ocrData.idNumber;
      if (ocrData.ethnicity) formValues.ethnicity = ocrData.ethnicity;
      if (ocrData.address) formValues.hukouAddress = ocrData.address;
      if (ocrData.birthDate) formValues.birthDateString = ocrData.birthDate;
    }
  } catch (error) {
    debugLog('从OCR结果提取数据时出错:', error);
  }
  
  // 记录提取的数据
  debugLog('从OCR结果中提取的表单数据:', formValues);
  
  return formValues;
};

/**
 * 测试OCR服务器连接
 * @returns Promise<boolean> 连接是否成功
 */
export const testOcrConnection = async (): Promise<boolean> => {
  try {
    // 使用缓存结果，如果最近检查过且可用
    const now = Date.now();
    if (cachedOcrServerAvailable && (now - lastCheckTime < CHECK_INTERVAL)) {
      debugLog('使用缓存的OCR服务连接状态:', cachedOcrServerAvailable);
      return cachedOcrServerAvailable;
    }
    
    debugLog('测试OCR服务器连接...');
    
    // 构建测试URL
    const baseUrl = getOcrServerUrl();
    const testUrl = `${baseUrl}/test-connection?_=${Date.now()}`;
    
    debugLog(`测试OCR服务连接: ${testUrl}`);
    
    // 发送请求
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText;
        debugLog(`OCR服务测试失败: ${status} ${statusText}`);
        
        if (status === 400) {
          const text = await response.text();
          if (text.includes('COS') || text.includes('SecretId')) {
            // COS配置错误也算连接成功，因为服务端是工作的
            debugLog('OCR服务连接成功，但存在COS配置问题');
            cachedOcrServerAvailable = true;
            lastCheckTime = now;
            return true;
          }
        }
        
        throw new Error(`HTTP错误 ${status}`);
      }
      
      debugLog('OCR服务连接成功');
      cachedOcrServerAvailable = true;
      lastCheckTime = now;
      return true;
    } catch (error) {
      debugLog('OCR服务测试失败:', error);
      cachedOcrServerAvailable = false;
      lastCheckTime = now;
      return false;
    }
  } catch (error) {
    debugLog('OCR服务测试出错:', error);
    cachedOcrServerAvailable = false;
    lastCheckTime = Date.now();
    return false;
  }
}; 
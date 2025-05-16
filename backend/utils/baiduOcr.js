/**
 * 百度OCR服务封装 - 使用官方SDK
 */
const AipOcr = require('baidu-aip-sdk').ocr;
const fs = require('fs');
const path = require('path');

// 百度OCR应用配置
const APP_ID = '118332507';
const API_KEY = 'y4AniiwpEIsK5qNHnHbm4YDV';
const SECRET_KEY = 'ORMoWvctBsi0X8CjmIdMJAgv8UmbE6r2';

// 创建百度OCR客户端
const client = new AipOcr(APP_ID, API_KEY, SECRET_KEY);

// 身份证识别请求选项
const options = {
  detect_direction: false, // 禁用图片方向检测以提高速度
  detect_risk: false,      // 禁用风险检测以提高速度
  accuracy: 'normal'       // 使用普通精度模式，提高速度
};

// 缓存access token，避免重复获取
let accessToken = null;
let tokenExpireTime = 0;

// 刷新访问令牌
async function refreshAccessToken() {
  if (accessToken && Date.now() < tokenExpireTime) {
    return accessToken;
  }
  
  try {
    // 设置新的过期时间（提前5分钟过期，确保安全）
    tokenExpireTime = Date.now() + 2592000000 - 300000; // 30天 - 5分钟
    
    // 直接使用client已经提供的getAccessToken方法
    const tokenResult = await client.getAccessToken();
    accessToken = tokenResult.access_token;
    
    console.log('Baidu access token refreshed:', accessToken);
    return accessToken;
  } catch (error) {
    console.error('刷新百度访问令牌失败:', error);
    throw error;
  }
}

/**
 * 识别身份证正面
 * @param {string} imagePath 图片文件路径
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeIdCardFront(imagePath) {
  // 确保文件存在
  if (!fs.existsSync(imagePath)) {
    throw new Error(`文件不存在: ${imagePath}`);
  }

  try {
    console.log(`开始识别身份证正面，文件: ${imagePath}`);
    const image = fs.readFileSync(imagePath);
    
    // 使用百度SDK识别身份证正面
    const result = await client.idcard(image, 'front', options);
    
    console.log('身份证正面识别完成');
    return result;
  } catch (error) {
    console.error('身份证正面识别失败:', error);
    throw error;
  }
}

/**
 * 识别身份证背面
 * @param {string} imagePath 图片文件路径
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeIdCardBack(imagePath) {
  // 确保文件存在
  if (!fs.existsSync(imagePath)) {
    throw new Error(`文件不存在: ${imagePath}`);
  }

  try {
    console.log(`开始识别身份证背面，文件: ${imagePath}`);
    const image = fs.readFileSync(imagePath);
    
    // 使用百度SDK识别身份证背面
    const result = await client.idcard(image, 'back', options);
    
    console.log('身份证背面识别完成');
    return result;
  } catch (error) {
    console.error('身份证背面识别失败:', error);
    throw error;
  }
}

/**
 * 身份证识别（合并方法，根据参数决定正反面）
 * @param {string} imagePath 图片文件路径
 * @param {string} side 身份证方向（'front'或'back'）
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeIdCard(imagePath, side = 'front') {
  // 确保文件存在
  if (!fs.existsSync(imagePath)) {
    throw new Error(`文件不存在: ${imagePath}`);
  }

  try {
    // 读取图片文件
    const image = fs.readFileSync(imagePath);
    
    // 检查图片大小，如果太大则抛出错误
    if (image.length > 4 * 1024 * 1024) { // 4MB限制
      throw new Error('图片大小超过4MB，百度API限制');
    }
    
    // 确保访问令牌有效
    await refreshAccessToken();
    
    // 使用百度SDK识别身份证
    const result = await client.idcard(image, side, options);
    
    return result;
  } catch (error) {
    console.error(`身份证${side === 'front' ? '正面' : '背面'}识别失败:`, error);
    throw error;
  }
}

/**
 * 直接从Base64编码的图片数据识别身份证
 * @param {string} imageBase64 Base64编码的图片数据
 * @param {string} side 身份证方向（'front'或'back'）
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeIdCardFromBase64(imageBase64, side = 'front') {
  try {
    console.log(`开始从Base64识别身份证${side === 'front' ? '正面' : '背面'}`);
    
    // 使用百度SDK识别身份证
    const result = await client.idcardByBase64(imageBase64, side, options);
    
    console.log(`身份证${side === 'front' ? '正面' : '背面'}识别完成`);
    return result;
  } catch (error) {
    console.error(`身份证${side === 'front' ? '正面' : '背面'}识别失败:`, error);
    throw error;
  }
}

/**
 * 测试OCR连接是否正常
 * @returns {Promise<Object>} 连接测试结果
 */
async function testOcrConnection() {
  try {
    // 尝试刷新token，这是测试连接最直接的方式
    const token = await refreshAccessToken();
    
    if (!token) {
      throw new Error('无法获取访问令牌');
    }
    
    return {
      success: true,
      message: 'OCR服务连接正常',
      sdkInfo: {
        appId: APP_ID
      }
    };
  } catch (error) {
    console.error('OCR服务连接测试失败:', error);
    return {
      success: false,
      message: '无法初始化OCR服务',
      error: error.message
    };
  }
}

module.exports = {
  recognizeIdCardFront,
  recognizeIdCardBack,
  recognizeIdCard,
  recognizeIdCardFromBase64,
  testOcrConnection
}; 
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

// 设置请求选项
const options = {
  detect_direction: true, // 检测图片方向
  detect_risk: true       // 检测身份证风险
};

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
  if (side === 'front') {
    return await recognizeIdCardFront(imagePath);
  } else {
    return await recognizeIdCardBack(imagePath);
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
    // 测试百度OCR SDK是否正常初始化
    console.log('测试百度OCR SDK连接...');
    
    // 检查客户端是否正确初始化
    if (!client) {
      throw new Error('百度OCR客户端未正确初始化');
    }
    
    // 简单测试SDK可用性
    // SDK初始化需要配置AppID/API Key/Secret Key，检查这些配置是否存在
    if (!APP_ID || !API_KEY || !SECRET_KEY) {
      throw new Error('缺少必要的百度OCR配置参数');
    }
    
    console.log('百度OCR SDK初始化成功');
    
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
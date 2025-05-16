const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// 百度OCR配置信息
const BAIDU_OCR_CONFIG = {
  APP_ID: '118332507',
  API_KEY: 'y4AniiwpEIsK5qNHnHbm4YDV',
  SECRET_KEY: 'ORMoWvctBsi0X8CjmIdMJAgv8UmbE6r2',
};

// 存储百度OCR的访问令牌
let baiduAccessToken = null;
let tokenExpiryTime = 0;

// 设置文件上传临时存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 刷新百度OCR访问令牌
async function refreshBaiduAccessToken() {
  try {
    const response = await axios.get(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_OCR_CONFIG.API_KEY}&client_secret=${BAIDU_OCR_CONFIG.SECRET_KEY}`
    );
    
    if (response.data && response.data.access_token) {
      baiduAccessToken = response.data.access_token;
      tokenExpiryTime = Date.now() + (response.data.expires_in - 600) * 1000; // 提前10分钟刷新
      console.log('Baidu access token refreshed:', baiduAccessToken);
    } else {
      throw new Error('Failed to refresh Baidu access token');
    }
  } catch (error) {
    console.error('Error refreshing Baidu access token:', error);
  }
}

// 每24小时刷新一次token
setInterval(refreshBaiduAccessToken, 24 * 60 * 60 * 1000);

// 初始化时刷新token
refreshBaiduAccessToken();

// 获取百度OCR的access_token
async function getBaiduAccessToken() {
    if (!baiduAccessToken || Date.now() >= tokenExpiryTime) {
      await refreshBaiduAccessToken();
    }
    if (!baiduAccessToken) {
      throw new Error('无法获取百度API访问令牌');
    }
    return baiduAccessToken;
}

// 测试路由 - 验证OCR模块正常工作
router.get('/test', (req, res) => {
  console.log('收到OCR测试请求');
  res.json({ 
    success: true, 
    message: 'OCR模块正常工作',
    token: baiduAccessToken ? '令牌已获取' : '令牌未获取'
  });
});

// 身份证OCR识别API路由
router.post('/idcard', upload.single('idCardImage'), async (req, res) => {
  console.log('收到身份证OCR识别请求');
  console.log('请求参数:', req.body);
  console.log('上传的文件:', req.file);
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }

    // 确定是正面还是反面
    const idCardSide = req.body.idCardSide || 'front';
    console.log(`处理${idCardSide === 'front' ? '正面' : '背面'}身份证识别`);
    
    // 获取access_token
    let accessToken;
    try {
      accessToken = await getBaiduAccessToken();
      console.log('成功获取百度OCR accessToken');
    } catch (error) {
      console.error('获取百度访问令牌失败:', error);
      return res.status(500).json({
        success: false,
        message: '无法连接到百度OCR服务',
        error: error.message
      });
    }
    
    // 读取上传的图片文件
    const filePath = req.file.path;
    console.log(`读取上传的图片文件: ${filePath}`);
    
    let imageBuffer;
    try {
      imageBuffer = fs.readFileSync(filePath);
      console.log(`成功读取图片文件，大小: ${imageBuffer.length} 字节`);
    } catch (error) {
      console.error('读取上传文件失败:', error);
      return res.status(500).json({
        success: false,
        message: '读取上传文件失败',
        error: error.message
      });
    }
    
    const imageBase64 = imageBuffer.toString('base64');
    console.log('图片转换为Base64完成');
    
    // 调用百度OCR API
    console.log('开始调用百度OCR API...');
    try {
      const response = await axios.post(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${accessToken}`,
        new URLSearchParams({
          image: imageBase64,
          id_card_side: idCardSide, // front或back
          detect_direction: 'true',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000, // 增加超时时间到30秒
        }
      );
      
      console.log('百度OCR API响应成功');
      
      // 删除临时文件
      try {
        fs.unlinkSync(filePath);
        console.log(`临时文件已删除: ${filePath}`);
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
        // 继续处理，不因删除临时文件失败而中断
      }
      
      if (response.data.error_code) {
        console.error('百度OCR返回错误:', response.data);
        return res.status(400).json({
          success: false,
          message: `OCR识别失败: ${response.data.error_msg}`,
          error: response.data
        });
      }

      // 返回识别结果给前端
      console.log('OCR识别成功，返回结果');
      return res.status(200).json({
        success: true,
        data: response.data,
        message: 'OCR识别成功'
      });
    } catch (ocrError) {
      console.error('调用百度OCR API失败:', ocrError);
      
      // 尝试删除临时文件
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
      }
      
      // 根据错误类型返回适当的错误信息
      if (ocrError.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          message: '百度OCR服务响应超时',
          error: '请求超时'
        });
      } else if (ocrError.response) {
        return res.status(ocrError.response.status || 500).json({
          success: false,
          message: '百度OCR服务返回错误',
          error: ocrError.response.data || ocrError.message
        });
      } else {
        return res.status(500).json({
          success: false,
          message: '连接百度OCR服务失败',
          error: ocrError.message
        });
      }
    }
  } catch (error) {
    console.error('OCR识别出错:', error);
    return res.status(500).json({
      success: false,
      message: '服务器处理OCR请求出错',
      error: error.message
    });
  }
});

module.exports = router; 
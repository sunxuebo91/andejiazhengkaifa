const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// 百度OCR配置信息
const BAIDU_OCR_CONFIG = {
  APP_ID: '118332507',
  API_KEY: 'y4AniiwpEIsK5qNHnHbm4YDV',
  SECRET_KEY: 'ORMoWvctBsi0X8CjmIdMJAgv8UmbE6r2',
};

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

// 定时刷新access_token
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
  return baiduAccessToken;
}

// 身份证OCR识别API路由
router.post('/idcard', upload.single('idCardImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }

    // 确定是正面还是反面
    const idCardSide = req.body.idCardSide || 'front';
    
    // 获取access_token
    const accessToken = await getBaiduAccessToken();
    
    // 读取上传的图片文件
    const filePath = req.file.path;
    const imageBuffer = fs.readFileSync(filePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    // 调用百度OCR API
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
      }
    );

    // 删除临时文件
    fs.unlinkSync(filePath);
    
    if (response.data.error_code) {
      return res.status(400).json({
        success: false,
        message: `OCR识别失败: ${response.data.error_msg}`,
        error: response.data
      });
    }

    // 返回识别结果给前端
    return res.status(200).json({
      success: true,
      data: response.data,
      message: 'OCR识别成功'
    });
    
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
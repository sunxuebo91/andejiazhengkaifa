const express = require('express');
const router = express.Router();
const axios = require('axios');
const Resume = require('../models/Resume');
const { authenticateToken } = require('../middleware/auth');

// 百度地图API代理
router.get('/baidu/place/suggestion', async (req, res) => {
  try {
    const { query, ak, region, output, city_limit } = req.query;
    
    // 构建请求URL
    const url = 'https://api.map.baidu.com/place/v2/suggestion';
    
    // 发送请求到百度地图API
    const response = await axios.get(url, {
      params: {
        query,
        ak,
        output: output || 'json',
        ...(region ? { region } : {}),
        ...(city_limit ? { city_limit } : {})
      }
    });
    
    // 返回百度地图API的响应
    res.json(response.data);
  } catch (error) {
    console.error('百度地图API转发错误:', error);
    res.status(500).json({ 
      status: 500, 
      message: '百度地图API请求失败',
      error: error.message 
    });
  }
});

// 导出路由
module.exports = router; 
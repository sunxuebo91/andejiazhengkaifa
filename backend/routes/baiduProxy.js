const axios = require('axios');
const express = require('express');
const router = express.Router();
const cache = require('memory-cache');

// 百度地图API密钥
const BAIDU_MAP_AK = process.env.BAIDU_MAP_AK || 'AEvmuH5FnLIDYWcAA4whRPTAcwkv3L06';

// 代理百度地图建议API
router.get('/suggestion', async (req, res) => {
  const { query, region = '全国' } = req.query;
  const cacheKey = `baidu_suggestion_${query}_${region}`;
  
  try {
    // 检查缓存
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // 调用百度地图API
    const response = await axios.get('https://api.map.baidu.com/place/v2/suggestion', {
      params: {
        query,
        region,
        output: 'json',
        ak: BAIDU_MAP_AK
      }
    });

    // 缓存结果（5分钟）
    cache.put(cacheKey, response.data, 5 * 60 * 1000);
    
    res.json(response.data);
  } catch (error) {
    console.error('百度地图API代理失败:', error);
    res.status(500).json({ 
      error: '百度地图服务暂时不可用',
      fallback: true
    });
  }
});

module.exports = router;

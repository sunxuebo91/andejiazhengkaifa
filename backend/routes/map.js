const express = require('express');
const router = express.Router();
const axios = require('axios');

// 百度地图API地址建议接口代理
router.get('/suggestion', async (req, res) => {
  try {
    // 从请求中获取参数
    const { query, region = '全国' } = req.query;

    // 调用百度地图API
    const response = await axios.get('https://api.map.baidu.com/place/v2/suggestion', {
      params: {
        query,
        region,
        output: 'json',
        ak: 'AEvmuH5FnLIDYWcAA4whRPTAcwkv3L06'
      }
    });

    // 将百度地图API的响应转换为我们需要的格式
    const result = [];
    if (response.data.status === 0 && response.data.result) {
      response.data.result.forEach(item => {
        // 解析地址信息
        const district = item.city || '北京市';
        const street = item.district || '';
        const name = item.name || '';
        const fullAddress = `${district}${street}${name}`;

        result.push({
          name,
          district,
          street,
          fullAddress,
          key: `${name}_${district}_${street}_${item.uid || Math.random().toString(36).substring(2, 10)}`
        });
      });
    }

    // 返回格式化后的结果
    res.json({
      status: 0,
      message: 'success',
      result
    });
  } catch (error) {
    console.error('百度地图API代理请求失败:', error);
    res.status(500).json({
      status: 500,
      message: '百度地图API代理请求失败',
      error: error.message
    });
  }
});

module.exports = router; 
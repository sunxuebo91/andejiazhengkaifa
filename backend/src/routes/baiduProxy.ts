import { Router } from 'express';
import axios from 'axios';
import { Request, Response, Router as ExpressRouter } from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

const router: ExpressRouter = Router();

// 百度地图AK密钥，从环境变量获取
const BAIDU_AK = process.env.BAIDU_MAP_AK || 'VTbVdzUtKzhAgCxMvonJkfOJROIAZ4VX';

// 百度地图API代理路由
router.get('/place/suggestion', async (req: Request, res: Response) => {
  try {
    const { query, region, city_limit, output } = req.query;
    
    // 验证必要参数
    if (!query) {
      return res.status(400).json({ 
        status: 400,
        message: '缺少必要参数: query' 
      });
    }

    // 调用百度地图API
    const response = await axios.get('https://api.map.baidu.com/place/v2/suggestion', {
      params: {
        query,
        region: region || '',
        city_limit: city_limit || 'false',
        output: output || 'json',
        ak: BAIDU_AK
      },
      timeout: 5000
    });

    // 返回百度地图API的响应
    res.json(response.data);
  } catch (error) {
    console.error('百度地图API代理错误:', error);
    res.status(500).json({
      status: 500,
      message: '百度地图服务暂时不可用'
    });
  }
});

export default router;

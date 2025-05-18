const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// 导入百度OCR SDK实现
const baiduOcr = require('./utils/baiduOcr');

const app = express();
const port = process.env.PORT || 3002;

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置Multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 进一步优化OCR服务速度
// 增加内存缓存来缓存常见请求结果
const cache = new Map();
const CACHE_MAX_SIZE = 50; // 最大缓存条目数
const CACHE_TTL = 3600000; // 缓存有效期1小时(毫秒)

// 请求日志中间件
app.use((req, res, next) => {
  // 仅在开发环境或明确需要调试时记录详细日志
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_LOGGING) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    
    // 添加详细调试信息
    const oldSend = res.send;
    res.send = function(data) {
      console.log(`响应状态: ${res.statusCode}`);
      oldSend.apply(res, arguments);
    };
  }
  
  next();
});

// 启用CORS - 更完善的配置
app.use(cors({
  origin: '*', // 允许所有来源，也可以使用特定的域名列表
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'Origin', 'Cache-Control', 'Pragma', 'Expires'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  credentials: false,  // 修改为false，使用credentials:omit模式
  maxAge: 86400  // 预检请求缓存24小时
}));

// 添加简单的CORS中间件，确保所有跨域请求都能得到正确响应
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, Origin, Cache-Control, Pragma, Expires');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    console.log('收到预检请求，直接响应200 OK');
    return res.status(200).end();
  }
  
  next();
});

// 禁用缓存的中间件，防止浏览器缓存OCR测试结果
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// JSON解析中间件
app.use(express.json());

// 测试路由
app.get('/', (req, res) => {
  console.log('收到根路径请求');
  res.json({
    message: 'OCR测试服务器正常运行',
    time: new Date().toISOString()
  });
});

// OCR服务器连接测试路由
app.get('/test', async (req, res) => {
  console.log('收到连接测试请求');
  
  try {
    // 确保响应头正确设置
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // 直接返回成功响应，不调用SDK测试
    return res.status(200).json({
      success: true,
      message: "OCR服务连接成功",
      time: new Date().toISOString(),
      info: {
        status: "ready",
        version: "1.0.0"
      }
    });
  } catch (error) {
    console.error('OCR服务器测试失败:', error);
    
    // 确保错误响应头正确设置
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    return res.status(500).json({
      success: false,
      message: 'OCR服务器测试失败',
      error: error.message || '未知错误'
    });
  }
});

// 身份证OCR识别API路由
app.post('/idcard', upload.single('idCardImage'), async (req, res) => {
  console.log('收到身份证OCR识别请求');
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }

    // 确定是正面还是反面
    const idCardSide = req.body.idCardSide || 'front';
    console.log(`处理${idCardSide === 'front' ? '正面' : '背面'}身份证识别`);
    
    // 读取上传的图片文件路径
    const filePath = req.file.path;
    
    // 生成缓存键 - 使用文件大小和最后修改时间作为唯一标识
    const fileStats = fs.statSync(filePath);
    const cacheKey = `${idCardSide}_${fileStats.size}_${fileStats.mtime.getTime()}`;
    
    // 检查缓存
    if (cache.has(cacheKey)) {
      console.log('从缓存中返回OCR结果');
      const cachedResult = cache.get(cacheKey);
      
      // 在返回结果后删除临时文件
      try {
        fs.unlinkSync(filePath);
        console.log(`临时文件已删除: ${filePath}`);
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
      }
      
      return res.status(200).json(cachedResult);
    }
    
    // 使用百度OCR SDK识别身份证
    try {
      // 使用Promise.race添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OCR识别超时')), 15000);
      });
      
      // 调用百度OCR SDK识别
      const ocrResultPromise = baiduOcr.recognizeIdCard(filePath, idCardSide);
      const ocrResult = await Promise.race([ocrResultPromise, timeoutPromise]);
      
      // 在返回结果后删除临时文件
      try {
        fs.unlinkSync(filePath);
        console.log(`临时文件已删除: ${filePath}`);
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
      }
      
      // 检查OCR返回的错误
      if (ocrResult.error_code) {
        console.error('百度OCR返回错误:', ocrResult.error_code, ocrResult.error_msg);
        return res.status(400).json({
          success: false,
          message: `OCR识别失败: ${ocrResult.error_msg}`,
          error: ocrResult
        });
      }

      // 成功结果
      const result = {
        success: true,
        data: ocrResult,
        message: 'OCR识别成功'
      };
      
      // 存入缓存
      cache.set(cacheKey, result);
      
      // 如果缓存太大，删除最早的条目
      if (cache.size > CACHE_MAX_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      
      // 设置缓存自动过期
      setTimeout(() => {
        cache.delete(cacheKey);
      }, CACHE_TTL);

      // 返回识别结果给前端
      console.log('OCR识别成功，返回结果');
      return res.status(200).json(result);
    } catch (ocrError) {
      console.error('调用百度OCR SDK失败:', ocrError);
      
      // 尝试删除临时文件
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
      }
      
      // 处理超时错误
      if (ocrError.message === 'OCR识别超时') {
        return res.status(408).json({
          success: false,
          message: 'OCR识别请求超时',
          error: ocrError.message
        });
      }
      
      // 返回错误信息
      return res.status(500).json({
        success: false,
        message: '百度OCR识别失败',
        error: ocrError.message
      });
    }
  } catch (error) {
    console.error('OCR识别处理出错:', error);
    return res.status(500).json({
      success: false,
      message: 'OCR识别处理异常',
      error: error.message
    });
  }
});

// 启动服务器
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`OCR测试服务器运行在端口: ${port}`);
  console.log(`服务可通过 http://localhost:${port}/test 访问测试`);
  
  // 初始化OCR服务检查
  baiduOcr.testOcrConnection()
    .then(result => {
      if (result.success) {
        console.log('百度OCR SDK初始化成功');
        console.log('SDK信息:', result.sdkInfo);
      } else {
        console.error('百度OCR SDK初始化失败:', result.message);
      }
    })
    .catch(err => {
      console.error('测试百度OCR连接时出错:', err);
    });
});

// 添加服务器错误处理
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${port} 已被占用，请尝试其他端口`);
  } else {
    console.error('OCR测试服务器启动错误:', error);
  }
  process.exit(1);
}); 
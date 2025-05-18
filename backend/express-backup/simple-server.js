const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cosService = require('./utils/cos-service');

// 引入OCR路由 - 确保路径正确
const ocrRoutes = require('./routes/ocr');
console.log('OCR路由已加载: ', typeof ocrRoutes);

const app = express();
const port = process.env.PORT || 3001;

// 简易内存数据库 - 使用全局变量确保所有路由共享同一个实例
global.db = {
  resumes: []
};

// 确保上传目录存在 (用于临时存储上传文件)
const uploadDir = path.join(__dirname, 'temp-uploads');
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

// 启用CORS
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
}));

// JSON解析中间件
app.use(express.json());

// 设置全局前缀和日志中间件
app.use('/api', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: err.message
  });
});

// 添加OCR测试路由，放在所有路由之前
app.get('/api/ocr/test', (req, res) => {
  console.log('收到OCR测试请求 /api/ocr/test');
  
  try {
    // 设置允许跨域
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: "主服务OCR接口连接成功",
      time: new Date().toISOString(),
      info: {
        status: "ready",
        version: "1.0.0"
      }
    });
  } catch (error) {
    console.error('OCR测试接口错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 添加调试路由
app.get('/api/status', (req, res) => {
  console.log('收到状态检查请求');
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3001,
    dbStatus: {
      initialized: !!global.db,
      resumeCount: global.db ? global.db.resumes.length : 0
    }
  });
});

// 添加一个测试路由检查OCR路由是否正确加载
app.get('/api/test-ocr', (req, res) => {
  res.json({
    success: true,
    message: 'OCR路由测试',
    routerType: typeof ocrRoutes,
    hasRouter: !!ocrRoutes,
    hasRouterMethods: !!ocrRoutes.stack
  });
});

// 注册OCR路由
app.use('/api/ocr', ocrRoutes);

// 静态文件服务 - 保留用于兼容旧文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 测试连接
app.get('/api/upload/test-connection', (req, res) => {
  console.log('收到测试连接请求');
  res.json({ success: true, message: '连接正常' });
});

// 上传身份证照片到腾讯云COS
app.post('/api/upload/id-card/:type', upload.single('file'), async (req, res) => {
  console.log(`收到上传身份证${req.params.type}请求`);
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: '没有收到文件' });
  }
  
  try {
    // 上传到腾讯云COS
    const fileUrl = await cosService.uploadFile(req.file, 'id-cards');
    console.log(`上传成功，COS URL: ${fileUrl}`);
    
    res.json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error('上传身份证照片失败:', error);
    res.status(500).json({ success: false, message: `上传失败: ${error.message}` });
  }
});

// 上传其他文件到腾讯云COS
app.post('/api/upload/file/:category', upload.single('file'), async (req, res) => {
  const category = req.params.category;
  console.log(`收到上传${category}文件请求`);
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: '没有收到文件' });
  }
  
  try {
    // 上传到腾讯云COS
    const fileUrl = await cosService.uploadFile(req.file, category);
    console.log(`上传成功，COS URL: ${fileUrl}`);
    
    res.json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error(`上传${category}文件失败:`, error);
    res.status(500).json({ success: false, message: `上传失败: ${error.message}` });
  }
});

// 获取简历列表
app.get('/api/resumes', (req, res) => {
  try {
  console.log('收到获取简历列表请求');
    console.log('当前简历数据状态:', global.db ? '已初始化' : '未初始化');
    console.log('简历数量:', global.db && global.db.resumes ? global.db.resumes.length : '无法访问');
    
    // 确保db对象存在
    if (!global.db || !global.db.resumes) {
      console.log('初始化数据库对象');
      global.db = { resumes: [] };
    }
  
  // 如果没有简历，返回模拟数据
    if (global.db.resumes.length === 0) {
      console.log('没有实际简历数据，返回模拟数据');
    const mockData = [
      {
        id: '68201d6d8ef64c8bc6b85767',
        name: '测试用户1',
        age: 28,
        phone: '13800138001',
        gender: 'female',
        education: 'bachelor',
        workExperience: [
          {
            startDate: '2020-01',
            endDate: '2022-01',
            description: '测试工作经历1'
          }
        ]
      },
      {
        id: '6820299e8ef64c8bc6b85768',
        name: '测试用户2',
        age: 32,
        phone: '13900139001',
        gender: 'male',
        education: 'middle',
        workExperience: []
      }
    ];
    return res.json(mockData);
  }
  
  // 返回存储的简历数据
    console.log('返回实际简历数据，数量:', global.db.resumes.length);
    res.json(global.db.resumes);
  } catch (error) {
    console.error('获取简历列表失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取简历列表失败', 
      error: error.message 
    });
  }
});

// 获取指定ID的简历
app.get('/api/resumes/:id', (req, res) => {
  try {
  const { id } = req.params;
  console.log(`收到获取简历详情请求，ID: ${id}`);
    
    // 确保db对象存在
    if (!global.db || !global.db.resumes) {
      console.log('初始化数据库对象');
      global.db = { resumes: [] };
    }
  
  // 查找实际存储的简历
    const resume = global.db.resumes.find(r => r.id === id);
  
  if (resume) {
    console.log(`找到ID为 ${id} 的简历数据`);
    return res.json(resume);
  }
  
  console.log(`未找到ID为 ${id} 的简历，返回模拟数据`);
  
  // 如果没有找到，返回模拟数据
  const mockData = {
    id: id,
    name: `测试用户-${id.substring(0, 6)}`,
    age: 30,
    phone: '13800138001',
    gender: 'female',
    education: 'bachelor',
    workExperience: [
      {
        startDate: '2020-01',
        endDate: '2022-01',
        description: '测试工作经历'
      }
    ]
  };
  
  res.json(mockData);
  } catch (error) {
    console.error(`获取简历(ID: ${req.params.id})失败:`, error);
    res.status(500).json({ 
      success: false, 
      message: '获取简历详情失败', 
      error: error.message 
    });
  }
});

// 创建简历
app.post('/api/resumes', (req, res) => {
  try {
  console.log('收到创建简历请求');
  console.log('请求数据:', req.body);
    
    // 确保db对象存在
    if (!global.db || !global.db.resumes) {
      console.log('初始化数据库对象');
      global.db = { resumes: [] };
    }
  
  // 生成模拟ID
  const id = new Date().getTime().toString(16) + Math.floor(Math.random() * 10000).toString(16);
  
  // 创建新简历
  const newResume = {
    id,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // 存储简历数据
    global.db.resumes.push(newResume);
    console.log(`简历创建成功，ID: ${id}，现有简历数量: ${global.db.resumes.length}`);
  
  res.status(201).json(newResume);
  } catch (error) {
    console.error('创建简历失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '创建简历失败', 
      error: error.message 
    });
  }
});

// 更新简历
app.put('/api/resumes/:id', (req, res) => {
  try {
  const { id } = req.params;
  console.log(`收到更新简历请求，ID: ${id}`);
    
    // 确保db对象存在
    if (!global.db || !global.db.resumes) {
      console.log('初始化数据库对象');
      global.db = { resumes: [] };
    }
  
  // 查找简历索引
    const index = global.db.resumes.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: `未找到ID为 ${id} 的简历` });
  }
  
  // 更新简历
  const updatedResume = {
      ...global.db.resumes[index],
    ...req.body,
    id, // 确保ID不变
    updatedAt: new Date().toISOString()
  };
  
  // 替换原来的简历
    global.db.resumes[index] = updatedResume;
  console.log(`简历更新成功，ID: ${id}`);
  
  res.json(updatedResume);
  } catch (error) {
    console.error(`更新简历(ID: ${req.params.id})失败:`, error);
    res.status(500).json({ 
      success: false, 
      message: '更新简历失败', 
      error: error.message 
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`简单服务器运行在端口: ${port}，文件将上传到腾讯云COS`);
  
  // 在启动时初始化数据库
  if (!global.db) {
    global.db = { resumes: [] };
    console.log('数据库对象已初始化');
  }
}); 
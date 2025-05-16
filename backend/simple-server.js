const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cosService = require('./utils/cos-service');

// 引入OCR路由
const ocrRoutes = require('./routes/ocr');

const app = express();
const port = 3001;

// 简易内存数据库
const db = {
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

// 设置全局前缀
app.use('/api', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
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
  console.log('收到获取简历列表请求');
  
  // 如果没有简历，返回模拟数据
  if (db.resumes.length === 0) {
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
  res.json(db.resumes);
});

// 获取指定ID的简历
app.get('/api/resumes/:id', (req, res) => {
  const { id } = req.params;
  console.log(`收到获取简历详情请求，ID: ${id}`);
  
  // 查找实际存储的简历
  const resume = db.resumes.find(r => r.id === id);
  
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
});

// 创建简历
app.post('/api/resumes', (req, res) => {
  console.log('收到创建简历请求');
  console.log('请求数据:', req.body);
  
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
  db.resumes.push(newResume);
  console.log(`简历创建成功，ID: ${id}，现有简历数量: ${db.resumes.length}`);
  
  res.status(201).json(newResume);
});

// 更新简历
app.put('/api/resumes/:id', (req, res) => {
  const { id } = req.params;
  console.log(`收到更新简历请求，ID: ${id}`);
  
  // 查找简历索引
  const index = db.resumes.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: `未找到ID为 ${id} 的简历` });
  }
  
  // 更新简历
  const updatedResume = {
    ...db.resumes[index],
    ...req.body,
    id, // 确保ID不变
    updatedAt: new Date().toISOString()
  };
  
  // 替换原来的简历
  db.resumes[index] = updatedResume;
  console.log(`简历更新成功，ID: ${id}`);
  
  res.json(updatedResume);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`简单服务器运行在端口: ${port}，文件将上传到腾讯云COS`);
}); 
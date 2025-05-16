const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer'); // 用于文件上传
const path = require('path'); // 用于处理文件路径
const fs = require('fs'); // 用于文件系统操作

const app = express();
const PORT = 3001; // 修改为3001端口

// Middleware
app.use(cors());

// 增加请求体大小限制
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件存储
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // 根据字段名创建子目录
    let subDir = 'other';
    if (file.fieldname === 'idCardFront' || file.fieldname === 'idCardBack') {
      subDir = 'idcard';
    } else if (file.fieldname === 'photoFiles') {
      subDir = 'photos';
    } else if (file.fieldname === 'certificateFiles') {
      subDir = 'certificates';
    } else if (file.fieldname === 'medicalReportFiles') {
      subDir = 'medical';
    }
    const finalDir = path.join(uploadDir, subDir);
    fs.mkdirSync(finalDir, { recursive: true });
    cb(null, finalDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 引入路由和控制器
const resumeRoutes = require('./routes/resume');

// 添加调试路由
app.post('/api/test', (req, res) => {
  console.log('原始请求体:', req.body);
  console.log('原始请求文件:', req.files);
  res.json({ 
    received: true,
    body: req.body,
    files: req.files ? Object.keys(req.files) : null
  });
});

// Routes
app.use('/api/resumes', resumeRoutes);

app.get('/api/resumes', async (req, res) => {
  try {
    const resumes = await Resume.find().exec();
    res.json(resumes);
  } catch (error) {
    console.error('Fetch error details:', error);
    res.status(500).json({ message: 'Failed to fetch resumes', error: error.message });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    message: '服务器错误，请稍后再试',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

const express = require('express');
const multer = require('multer');
const path = require('path');
const { createResume, checkDuplicate } = require('../controllers/resumeController');
const uploadToCOS = require('../utils/cosUploader');

const router = express.Router();

// 使用内存存储
const storage = multer.memoryStorage();

// 配置文件过滤器
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'medicalReportFiles') {
    // 体检报告允许PDF
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
  } else {
    // 其他文件只允许图片
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
  }
  
  cb(new Error('文件类型不支持'));
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// 定义需要处理的文件字段
const uploadFields = [
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'photoFiles', maxCount: 10 },
  { name: 'certificateFiles', maxCount: 10 },
  { name: 'medicalReportFiles', maxCount: 10 }
];

// 创建简历路由
router.post('/', async (req, res, next) => {
  console.log('收到新的简历提交请求');
  console.log('表单数据:', req.body);
  
  // 直接调用createResume，不处理文件上传
  try {
    await createResume(req, res, next);
  } catch (error) {
    console.error('简历处理失败:', error);
    res.status(500).json({ 
      message: '简历处理失败', 
      error: error.message 
    });
  }
});

// 获取简历列表路由
router.get('/', async (req, res) => {
  try {
    const Resume = require('../models/Resume');
    const resumes = await Resume.find().sort({ createdAt: -1 });
    res.json(resumes);
  } catch (error) {
    console.error('获取简历列表失败:', error);
    res.status(500).json({ 
      message: '获取简历列表失败', 
      error: error.message 
    });
  }
});

// 添加查重路由
router.get('/check-duplicate', checkDuplicate);

module.exports = router;
const Resume = require('../models/Resume');

const createResume = async (req, res) => {
  try {
    console.log('================开始处理新简历请求================');
    console.log('请求方法和URL:', req.method, req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const formData = req.body;

    // 处理必填字段验证（移除了文件相关字段）
    const requiredFields = ['name', 'phone', 'age', 'jobType', 'education', 'nativePlace', 'experienceYears'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      console.error('缺少必填字段:', missingFields);
      return res.status(400).json({
        message: '请填写所有必填字段',
        missingFields: missingFields
      });
    }

    // 移除了文件处理逻辑
    
    // 处理工作经历
    let workExperience = [];
    try {
      workExperience = typeof formData.workExperience === 'string' 
        ? JSON.parse(formData.workExperience) 
        : formData.workExperience || [];
      console.log('解析后的工作经历:', workExperience);
    } catch (e) {
      console.error('解析工作经历失败:', e);
    }

    // 处理技能标签
    const skills = Array.isArray(formData.skills) 
      ? formData.skills 
      : formData.skills 
        ? [formData.skills] 
        : [];
    console.log('处理后的技能标签:', skills);

    // 处理数字类型字段
    const age = parseInt(formData.age, 10);
    const experienceYears = parseInt(formData.experienceYears, 10);
    const expectedSalary = parseInt(formData.expectedSalary, 10);

    if (isNaN(age) || isNaN(experienceYears) || isNaN(expectedSalary)) {
      console.error('数字类型字段解析失败');
      return res.status(400).json({
        message: '年龄、工作经验和期望薪资必须为数字'
      });
    }

    // 构建简历数据（移除了文件相关字段）
    const resumeData = {
      name: formData.name,
      phone: formData.phone,
      age,
      wechat: formData.wechat,
      idNumber: formData.idNumber,
      education: formData.education,
      maritalStatus: formData.maritalStatus,
      religion: formData.religion,
      currentAddress: formData.currentAddress,
      nativePlace: formData.nativePlace,
      hukouAddress: formData.hukouAddress,
      birthDate: formData.birthDate,
      ethnicity: formData.ethnicity,
      gender: formData.gender,
      zodiac: formData.zodiac,
      zodiacSign: formData.zodiacSign,
      jobType: formData.jobType,
      expectedSalary,
      serviceArea: formData.serviceArea,
      orderStatus: formData.orderStatus,
      skills,
      experienceYears,
      leadSource: formData.leadSource,
      workExperience
    };

    console.log('准备保存的简历数据:', JSON.stringify(resumeData, null, 2));

    // 创建并保存简历
    const newResume = new Resume(resumeData);
    console.log('创建的简历实例:', newResume);
    
    const savedResume = await newResume.save();
    console.log('简历保存成功:', savedResume._id);

    // 返回成功响应
    res.status(201).json({ 
      success: true,
      message: '简历提交成功', 
      data: savedResume
    });

    console.log('================简历处理完成================');
  } catch (error) {
    console.error('创建简历失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 根据错误类型返回不同的错误信息
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: '数据验证失败',
        errors: Object.values(error.errors).map(err => err.message)
      });
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({ 
        message: '该手机号已被注册',
        field: Object.keys(error.keyPattern)[0]
      });
    }

    res.status(500).json({ 
      message: '服务器错误，请稍后再试', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 新增查重接口
const checkDuplicate = async (req, res) => {
  try {
    const { phone, idNumber } = req.query;
    console.log('查重检查：', { phone, idNumber });
    
    if (!phone && !idNumber) {
      return res.status(400).json({
        message: '请提供手机号或身份证号进行查重',
        duplicate: false
      });
    }

    // 构建查询条件
    const queryConditions = [];
    let duplicatePhone = false;
    let duplicateIdNumber = false;

    // 如果提供了手机号，添加手机号查询条件
    if (phone) {
      const phoneResult = await Resume.findOne({ phone });
      duplicatePhone = !!phoneResult;
      if (duplicatePhone) {
        console.log('发现重复手机号:', phone);
      }
    }

    // 如果提供了身份证号，添加身份证号查询条件
    if (idNumber) {
      const idNumberResult = await Resume.findOne({ idNumber });
      duplicateIdNumber = !!idNumberResult;
      if (duplicateIdNumber) {
        console.log('发现重复身份证号:', idNumber);
      }
    }

    // 返回查重结果
    res.status(200).json({
      duplicate: duplicatePhone || duplicateIdNumber,
      duplicatePhone,
      duplicateIdNumber,
      message: (duplicatePhone || duplicateIdNumber) ? 
        '发现重复数据，请勿重复提交' : '未发现重复数据'
    });
  } catch (error) {
    console.error('查重检查失败:', error);
    res.status(500).json({
      message: '查重检查失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器错误'
    });
  }
};

module.exports = { 
  createResume,
  checkDuplicate
};
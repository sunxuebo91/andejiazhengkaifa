// 小程序简历创建页面实现示例
// 文件: pages/resume/create.js

const API_BASE_URL = 'https://your-api-domain.com';

Page({
  data: {
    // 表单数据
    formData: {
      // 必填字段
      name: '',
      phone: '',
      gender: '',
      age: '',
      jobType: '',
      education: '',
      
      // 可选字段
      wechat: '',
      idNumber: '',
      school: '',
      major: '',
      experienceYears: 0,
      expectedSalary: '',
      nativePlace: '',
      skills: [],
      serviceArea: [],
      workExperiences: [],
      maritalStatus: '',
      religion: '',
      zodiac: '',
      zodiacSign: '',
      ethnicity: '',
      birthDate: '',
      currentAddress: '',
      hukouAddress: '',
      orderStatus: '',
      leadSource: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      medicalExamDate: '',
      selfIntroduction: '',
      
      // 文件字段
      idCardFrontUrl: '',
      idCardBackUrl: '',
      photoUrls: [],
      certificateUrls: [],
      medicalReportUrls: []
    },

    // UI状态
    loading: false,
    submitting: false
    
    // 枚举选项
    genderOptions: [
      { value: 'female', label: '女' },
      { value: 'male', label: '男' }
    ],
    
    educationOptions: [
      { value: 'no', label: '无学历' },
      { value: 'primary', label: '小学' },
      { value: 'middle', label: '初中' },
      { value: 'secondary', label: '中专' },
      { value: 'vocational', label: '职高' },
      { value: 'high', label: '高中' },
      { value: 'college', label: '大专' },
      { value: 'bachelor', label: '本科' },
      { value: 'graduate', label: '研究生及以上' }
    ],
    
    jobTypeOptions: [
      { value: 'yuexin', label: '月嫂' },
      { value: 'zhujia-yuer', label: '住家育儿嫂' },
      { value: 'baiban-yuer', label: '白班育儿' },
      { value: 'baojie', label: '保洁' },
      { value: 'baiban-baomu', label: '白班保姆' },
      { value: 'zhujia-baomu', label: '住家保姆' },
      { value: 'yangchong', label: '养宠' },
      { value: 'xiaoshi', label: '小时工' },
      { value: 'zhujia-hulao', label: '住家护老' }
    ],
    
    skillsOptions: [
      { value: 'chanhou', label: '产后修复师' },
      { value: 'teshu-yinger', label: '特殊婴儿护理' },
      { value: 'yiliaobackground', label: '医疗背景' },
      { value: 'yuying', label: '高级育婴师' },
      { value: 'muying', label: '母婴护理师' },
      { value: 'cuiru', label: '高级催乳师' },
      { value: 'jiashi', label: '驾驶' },
      { value: 'yingyang', label: '营养师' },
      { value: 'zaojiao', label: '早教师' },
      { value: 'xinli', label: '心理咨询师' },
      { value: 'liliao-kangfu', label: '理疗康复' },
      { value: 'shuangtai-huli', label: '双胎护理' },
      { value: 'yanglao-huli', label: '养老护理' }
    ],
    
    // UI状态
    loading: false,
    submitting: false
  },

  onLoad: function(options) {
    console.log('简历创建页面加载');
  },

  // 输入框变化处理
  onInputChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    console.log(`字段 ${field} 更新为:`, value);
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 选择器变化处理
  onPickerChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    console.log(`选择器 ${field} 更新为:`, value);
    
    // 获取对应的选项数组
    const optionsKey = `${field}Options`;
    const options = this.data[optionsKey];
    
    if (options && options[value]) {
      this.setData({
        [`formData.${field}`]: options[value].value
      });
    }
  },

  // 多选处理
  onCheckboxChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    console.log(`多选 ${field} 更新为:`, value);
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 日期选择处理
  onDateChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    console.log(`日期 ${field} 更新为:`, value);
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 文件上传处理
  chooseImage: function(e) {
    const { type } = e.currentTarget.dataset;
    
    wx.chooseImage({
      count: type === 'idCard' ? 1 : 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('选择的文件:', res.tempFilePaths);
        
        // 上传文件
        res.tempFilePaths.forEach(filePath => {
          this.uploadFile(filePath, type);
        });
      }
    });
  },

  // 文件上传
  uploadFile: function(filePath, type) {
    console.log('开始上传文件:', filePath, '类型:', type);
    
    wx.showLoading({
      title: '上传中...'
    });
    
    wx.uploadFile({
      url: `${API_BASE_URL}/api/upload/file`,
      filePath: filePath,
      name: 'file',
      formData: {
        type: type
      },
      success: (res) => {
        console.log('文件上传成功:', res.data);
        
        try {
          const data = JSON.parse(res.data);
          if (data.success) {
            this.handleUploadSuccess(data.data.url, type);
          } else {
            throw new Error(data.message);
          }
        } catch (error) {
          console.error('解析上传响应失败:', error);
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('文件上传失败:', err);
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 处理上传成功
  handleUploadSuccess: function(url, type) {
    const formData = { ...this.data.formData };
    
    switch (type) {
      case 'idCardFront':
        formData.idCardFrontUrl = url;
        break;
      case 'idCardBack':
        formData.idCardBackUrl = url;
        break;
      case 'photo':
        formData.photoUrls.push(url);
        break;
      case 'certificate':
        formData.certificateUrls.push(url);
        break;
      case 'medicalReport':
        formData.medicalReportUrls.push(url);
        break;
    }
    
    this.setData({ formData });
    
    wx.showToast({
      title: '上传成功',
      icon: 'success'
    });
  },

  // 表单验证
  validateForm: function() {
    const { formData } = this.data;
    const errors = [];
    
    // 必填字段验证
    const requiredFields = [
      { key: 'name', label: '姓名' },
      { key: 'phone', label: '手机号' },
      { key: 'gender', label: '性别' },
      { key: 'age', label: '年龄' },
      { key: 'jobType', label: '工种' },
      { key: 'education', label: '学历' }
    ];
    
    requiredFields.forEach(field => {
      if (!formData[field.key]) {
        errors.push(`${field.label}不能为空`);
      }
    });
    
    // 手机号格式验证
    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.push('请输入正确的手机号');
    }
    
    // 年龄范围验证
    if (formData.age && (formData.age < 18 || formData.age > 65)) {
      errors.push('年龄必须在18-65岁之间');
    }
    
    // 身份证号验证
    if (formData.idNumber && !/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(formData.idNumber)) {
      errors.push('请输入正确的身份证号');
    }
    
    return errors;
  },

  // 数据格式化
  formatFormData: function(data) {
    return {
      ...data,
      age: Number(data.age),
      experienceYears: Number(data.experienceYears) || 0,
      expectedSalary: data.expectedSalary ? Number(data.expectedSalary) : undefined,
      skills: Array.isArray(data.skills) ? data.skills : [],
      serviceArea: Array.isArray(data.serviceArea) ? data.serviceArea : [],
      workExperiences: Array.isArray(data.workExperiences) ? data.workExperiences : [],
      photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : [],
      certificateUrls: Array.isArray(data.certificateUrls) ? data.certificateUrls : [],
      medicalReportUrls: Array.isArray(data.medicalReportUrls) ? data.medicalReportUrls : []
    };
  },

  // 生成幂等性键
  generateIdempotencyKey: function() {
    return `miniprogram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 提交表单
  submitForm: function() {
    if (this.data.submitting) {
      return;
    }
    
    // 验证表单
    const errors = this.validateForm();
    if (errors.length > 0) {
      wx.showModal({
        title: '表单验证失败',
        content: errors[0],
        showCancel: false
      });
      return;
    }
    
    this.setData({ submitting: true });
    
    // 格式化数据
    const submitData = this.formatFormData(this.data.formData);
    
    console.log('提交的数据:', submitData);
    
    wx.request({
      url: `${API_BASE_URL}/api/resumes/miniprogram/create`,
      method: 'POST',
      data: submitData,
      header: {
        'Content-Type': 'application/json',
        'Idempotency-Key': this.generateIdempotencyKey()
      },
      success: (res) => {
        console.log('提交响应:', res.data);
        
        if (res.data.success) {
          wx.showToast({
            title: '提交成功',
            icon: 'success'
          });
          
          // 跳转到成功页面
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showModal({
            title: '提交失败',
            content: res.data.message || '未知错误',
            showCancel: false
          });
        }
      },
      fail: (err) => {
        console.error('提交失败:', err);
        wx.showModal({
          title: '提交失败',
          content: '网络错误，请重试',
          showCancel: false
        });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  }
});

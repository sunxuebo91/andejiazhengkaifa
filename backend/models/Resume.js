const mongoose = require('mongoose');
const workExperienceSchema = new mongoose.Schema({
  startDate: String,
  endDate: String,
  description: String
}, { _id: false });

const ResumeSchema = new mongoose.Schema({
  // 基本信息
  name: { type: String, required: true },
  phone: { type: String, required: true },
  age: { type: Number, required: true },
  wechat: { type: String },
  idNumber: { type: String },
  education: { type: String, required: true },
  nativePlace: { type: String, required: true },
  experienceYears: { type: Number, required: true },

  // 个人信息
  maritalStatus: { type: String },
  religion: { type: String },
  currentAddress: { type: String },
  hukouAddress: { type: String },
  birthDate: { type: String },
  ethnicity: { type: String },
  gender: { type: String },
  zodiac: { type: String },
  zodiacSign: { type: String },

  // 工作信息
  jobType: { type: String, required: true },
  expectedSalary: { type: Number },
  serviceArea: { type: String },
  orderStatus: { type: String },
  skills: { type: [String], default: [] },
  leadSource: { type: String },
  workExperience: { type: [workExperienceSchema], default: [] },
  
  // 文件上传字段
  idCardFrontUrl: { type: String },
  idCardBackUrl: { type: String },
  photoUrls: { type: [String], default: [] },
  certificateUrls: { type: [String], default: [] },
  medicalReportUrls: { type: [String], default: [] },
}, { 
  timestamps: true,
  versionKey: false 
});

// 添加索引
ResumeSchema.index({ phone: 1 }, { unique: true });
ResumeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Resume', ResumeSchema);
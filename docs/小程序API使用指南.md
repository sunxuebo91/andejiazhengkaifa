# 小程序API使用指南

## 📋 **API概览**

CRM系统为小程序提供了完整的简历管理API，支持创建、更新、文件上传等功能。

### **基础信息**
- **基础URL**: `http://your-domain/api/resumes`
- **认证方式**: Bearer Token
- **数据格式**: JSON
- **文件上传**: multipart/form-data

## 🔧 **API端点详情**

### **1. 创建简历** ⭐

#### **POST** `/miniprogram/create`

**功能**: 创建新简历，支持幂等性和去重

**请求头**:
```http
Content-Type: application/json
Authorization: Bearer <token>
Idempotency-Key: <unique-key>  # 可选，防重复提交
api-version: v2                # 可选，API版本
x-request-id: <request-id>     # 可选，请求追踪
```

**请求体**:
```json
{
  "name": "张三",
  "phone": "13800138000",
  "gender": "female",
  "age": 30,
  "jobType": "yuexin",
  "education": "college",
  "experienceYears": 5,
  "nativePlace": "河南省",
  "selfIntroduction": "我是一名经验丰富的月嫂，有5年的母婴护理经验...",
  "wechat": "wx123456",
  "currentAddress": "郑州市金水区",
  "hukouAddress": "河南省郑州市",
  "birthDate": "1990-01-01",
  "skills": ["muying", "cuiru", "yuezican"],
  "serviceArea": ["郑州市金水区", "郑州市二七区"],
  "expectedSalary": 8000,
  "workExperiences": [
    {
      "startDate": "2020-01-01",
      "endDate": "2022-12-31",
      "description": "在某家庭担任月嫂，负责产妇和新生儿护理",
      "orderNumber": "CON12345678901",
      "district": "chaoyang",
      "customerName": "张女士",
      "customerReview": "服务态度好，专业技能强",
      "photos": [
        {
          "url": "https://cos.example.com/work-photo-1.jpg",
          "name": "工作照片1.jpg",
          "size": 102400,
          "mimeType": "image/jpeg"
        }
      ]
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "createdAt": "2023-07-20T10:30:00.000Z",
    "action": "CREATED",
    "resume": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "张三",
      "phone": "13800138000",
      "selfIntroduction": "我是一名经验丰富的月嫂...",
      "skills": ["muying", "cuiru"],
      "createdAt": "2023-07-20T10:30:00.000Z",
      "updatedAt": "2023-07-20T10:30:00.000Z"
    }
  },
  "message": "创建简历成功"
}
```

### **2. 获取简历详情** 🆕

#### **GET** `/miniprogram/:id`

**功能**: 获取简历完整信息

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "张三",
    "phone": "13800138000",
    "selfIntroduction": "我是一名经验丰富的月嫂...",
    "skills": ["muying", "cuiru"],
    "personalPhoto": [
      {
        "url": "https://example.com/photo1.jpg",
        "filename": "photo1.jpg",
        "size": 1024000
      }
    ],
    "createdAt": "2023-07-20T10:30:00.000Z",
    "updatedAt": "2023-07-20T11:00:00.000Z"
  },
  "message": "获取简历详情成功"
}
```

### **3. 更新简历**

#### **PATCH** `/miniprogram/:id`

**功能**: 更新现有简历信息

**请求体**:
```json
{
  "selfIntroduction": "更新后的自我介绍内容...",
  "expectedSalary": 9000,
  "skills": ["muying", "cuiru", "yuezican", "chanhou"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "张三",
    "phone": "13800138000",
    "selfIntroduction": "更新后的自我介绍内容...",
    "updatedAt": "2023-07-20T11:00:00.000Z"
  },
  "message": "更新简历成功"
}
```

### **3. 上传文件**

#### **POST** `/miniprogram/:id/upload-file`

**功能**: 上传单个文件（身份证、照片、证书、体检报告）

**请求头**:
```http
Content-Type: multipart/form-data
```

**请求体**:
```
file: <文件二进制数据>
type: "idCardFront" | "idCardBack" | "personalPhoto" | "certificate" | "medicalReport"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://example.com/uploads/file.jpg",
    "fileType": "personalPhoto",
    "fileName": "photo.jpg",
    "fileSize": 1024000
  },
  "message": "文件上传成功"
}
```

### **4. 删除文件**

#### **DELETE** `/miniprogram/:id/delete-file`

**功能**: 删除指定文件

**请求体**:
```json
{
  "fileUrl": "https://example.com/uploads/file.jpg",
  "fileType": "personalPhoto"
}
```

## 📝 **字段说明**

### **必填字段**
- `name`: 姓名 (2-20字符)
- `phone`: 手机号 (11位数字)
- `gender`: 性别 ("male" | "female")
- `age`: 年龄 (18-80)
- `jobType`: 工种 (见工种枚举)
- `education`: 学历 (见学历枚举)
- `experienceYears`: 工作经验年限 (0-50)
- `nativePlace`: 籍贯

### **可选字段**
- `selfIntroduction`: 自我介绍 (最多1000字符) 🔥
- `wechat`: 微信号
- `currentAddress`: 现居住地址
- `hukouAddress`: 户籍地址
- `birthDate`: 出生日期 (YYYY-MM-DD)
- `skills`: 技能标签数组
- `serviceArea`: 服务区域数组
- `expectedSalary`: 期望薪资
- `workExperiences`: 工作经历数组（详见下方说明）

### **工作经历字段说明 (workExperiences)**

每个工作经历对象包含以下字段：

**必填字段**：
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)
- `description`: 工作描述

**可选字段**：
- `orderNumber`: 订单编号 (格式：CON{11位数字}，例如：CON12345678901)
- `district`: 服务区域 (北京市区县代码，例如：chaoyang、haidian)
- `customerName`: 客户姓名
- `customerReview`: 客户评价
- `photos`: 工作照片数组，每个照片对象包含：
  - `url`: 图片URL (必填)
  - `name`: 文件名 (可选)
  - `size`: 文件大小（字节）(可选)
  - `mimeType`: MIME类型 (可选)

**北京市区县代码**：
```
dongcheng: 东城区    xicheng: 西城区      chaoyang: 朝阳区
fengtai: 丰台区      shijingshan: 石景山区  haidian: 海淀区
mentougou: 门头沟区  fangshan: 房山区     tongzhou: 通州区
shunyi: 顺义区       changping: 昌平区    daxing: 大兴区
huairou: 怀柔区      pinggu: 平谷区       miyun: 密云区
yanqing: 延庆区
```

### **工种枚举 (jobType)**
```
yuexin: 月嫂
yuesao: 月嫂
baomu: 保姆
yuying: 育婴师
yanglaohuli: 养老护理
jiazhenggongsi: 家政公司
```

### **学历枚举 (education)**
```
no: 无学历
primary: 小学
middle: 初中
secondary: 中专
vocational: 职高
high: 高中
college: 大专
bachelor: 本科
graduate: 研究生
```

## 🔍 **错误处理**

### **常见错误码**
- `400`: 请求参数错误
- `401`: 未授权
- `409`: 数据冲突（手机号重复）
- `500`: 服务器内部错误

### **错误响应格式**
```json
{
  "success": false,
  "code": "DUPLICATE",
  "data": {
    "existingId": "60f7b3b3b3b3b3b3b3b3b3b3"
  },
  "message": "手机号已存在"
}
```

## 🎯 **最佳实践**

### **1. 幂等性处理**
```javascript
// 使用Idempotency-Key防止重复提交
const idempotencyKey = `create_resume_${Date.now()}_${Math.random()}`;

wx.request({
  url: '/api/resumes/miniprogram/create',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey
  },
  data: formData
});
```

### **2. 自我介绍字段处理**
```javascript
// 确保自我介绍字段被正确提交
const submitData = {
  // ... 其他字段
  selfIntroduction: formData.selfIntroduction || undefined // 🔥 重要
};

// 验证字符长度
if (submitData.selfIntroduction && submitData.selfIntroduction.length > 1000) {
  wx.showToast({
    title: '自我介绍不能超过1000字',
    icon: 'error'
  });
  return;
}
```

### **3. 错误处理**
```javascript
wx.request({
  url: '/api/resumes/miniprogram/create',
  method: 'POST',
  data: formData,
  success: (res) => {
    if (res.data.success) {
      wx.showToast({
        title: res.data.message,
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: res.data.message,
        icon: 'error'
      });
    }
  },
  fail: (err) => {
    wx.showToast({
      title: '网络请求失败',
      icon: 'error'
    });
  }
});
```

## 🔄 **更新日志**

### **v2.1.0 (当前版本)**
- ✅ 修复UpdateResumeDto中缺少selfIntroduction字段的问题
- ✅ 优化小程序API日志记录，特别标注自我介绍字段
- ✅ 统一响应格式，包含完整的字段信息
- ✅ 增强错误处理和调试信息

### **使用建议**
1. **必须包含selfIntroduction字段**: 在表单数据中添加自我介绍输入框
2. **正确的数据提交**: 确保所有字段都按照API规范提交
3. **完善的错误处理**: 处理各种可能的错误情况
4. **幂等性支持**: 使用Idempotency-Key防止重复提交

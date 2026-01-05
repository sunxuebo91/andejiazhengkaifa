# 安得家政CRM系统 API 接口规范

## 通用响应格式

所有API响应遵循统一的格式：

```json
{
  "success": true|false,
  "data": {}, // 请求成功时返回的数据
  "message": "操作成功/失败的消息",
  "error": { // 请求失败时返回的错误信息
    "code": "错误代码",
    "details": {} // 详细错误信息
  },
  "timestamp": 1626342025123 // 时间戳
}
```

## 状态码说明

- 200: 请求成功
- 201: 创建成功
- 400: 请求参数错误
- 401: 未授权
- 403: 禁止访问
- 404: 资源不存在
- 500: 服务器内部错误

## 接口清单

### 认证相关

#### 登录
- **URL**: `/api/auth/login`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "username": "用户名",
    "password": "密码"
  }
  ```
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "access_token": "JWT令牌",
      "user": {
        "id": "用户ID",
        "username": "用户名",
        "name": "真实姓名",
        "phone": "手机号码",
        "email": "邮箱地址",
        "avatar": "头像URL地址",
        "role": "用户角色",
        "department": "所属部门",
        "permissions": ["权限列表"]
      }
    },
    "timestamp": 1626342025123
  }
  ```

#### 获取当前用户信息
- **URL**: `/api/auth/me`
- **方法**: `GET`
- **请求头**: `Authorization: Bearer [token]`
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "id": "用户ID",
      "username": "登录用户名",
      "name": "真实姓名",
      "phone": "手机号码",
      "email": "邮箱地址",
      "avatar": "头像URL地址",
      "role": "用户角色",
      "department": "所属部门",
      "permissions": ["权限列表"],
      "active": true,
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    },
    "message": "获取用户信息成功",
    "timestamp": 1626342025123
  }
  ```

#### 上传用户头像
- **URL**: `/api/auth/avatar`
- **方法**: `POST`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `multipart/form-data`
  - `avatar`: 头像文件（支持jpg、jpeg、png格式，最大5MB）
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "avatar": "头像URL地址"
    },
    "message": "头像上传成功",
    "timestamp": 1626342025123
  }
  ```

#### 登出
- **URL**: `/api/auth/logout`
- **方法**: `POST`
- **请求头**: `Authorization: Bearer [token]`
- **成功响应**:
  ```json
  {
    "success": true,
    "message": "登出成功",
    "timestamp": 1626342025123
  }
  ```

### 简历管理

#### 获取所有简历
- **URL**: `/api/resumes`
- **方法**: `GET`
- **请求头**: `Authorization: Bearer [token]`
- **成功响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "简历ID",
        "name": "姓名",
        "phone": "手机号",
        "age": 30,
        // 其他简历字段
      }
    ],
    "timestamp": 1626342025123
  }
  ```

#### 获取单个简历
- **URL**: `/api/resumes/:id`
- **方法**: `GET`
- **请求头**: `Authorization: Bearer [token]`
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "id": "简历ID",
      "name": "姓名",
      "phone": "手机号",
      "age": 30,
      // 其他简历字段
    },
    "timestamp": 1626342025123
  }
  ```


#### 获取公开简历（无认证）
- URL: `/api/resumes/:id/public`
- 方法: `GET`
- 认证: 无需
- 成功响应:
  ```json
  {
    "success": true,
    "data": { /* 完整简历原始数据（不脱敏）*/ },
    "message": "获取简历详情成功"
  }
  ```
- 错误响应:
  ```json
  { "success": false, "message": "简历不存在" }
  ```

#### 创建简历
- **URL**: `/api/resumes`
- **方法**: `POST`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `multipart/form-data`
  - 文本字段: name, phone, age, ...
  - 文件字段: idCardFront, idCardBack, photoFiles[], certificateFiles[], medicalReportFiles[]
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "id": "新创建的简历ID",
      "name": "姓名",
      "phone": "手机号",
      // 其他简历字段
    },
    "timestamp": 1626342025123
  }
  ```

#### 更新简历
- **URL**: `/api/resumes/:id`
- **方法**: `PUT`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `multipart/form-data`
  - 文本字段: name, phone, age, ...
  - 文件字段: idCardFront, idCardBack, photoFiles[], certificateFiles[], medicalReportFiles[]
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "id": "更新的简历ID",
      "name": "姓名",
      "phone": "手机号",
      // 其他简历字段
    },
    "timestamp": 1626342025123
  }
  ```

#### 删除简历
- **URL**: `/api/resumes/:id`
- **方法**: `DELETE`
- **请求头**: `Authorization: Bearer [token]`
- **成功响应**:
  ```json
  {
    "success": true,
    "message": "简历删除成功",
    "timestamp": 1626342025123
  }
  ```

#### 检查简历是否重复
- **URL**: `/api/resumes/check-duplicate`
- **方法**: `GET`
- **请求头**: `Authorization: Bearer [token]`
- **参数**: `phone`(必填), `idNumber`(可选)
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "duplicate": true|false,
      "existingResume": {
        "id": "已存在的简历ID",
        "name": "姓名",
        // 其他简历字段
      }
    },
    "timestamp": 1626342025123
  }
  ```

### 文件上传

#### 上传身份证照片
- **URL**: `/api/upload/id-card/:type` (type可为front或back)
- **方法**: `POST`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `multipart/form-data`
  - 文件字段: file
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "url": "上传文件的URL"
    },
    "timestamp": 1626342025123
  }
  ```

#### 上传其他文件
- **URL**: `/api/upload/file/:category`
- **方法**: `POST`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `multipart/form-data`
  - 文件字段: file
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "url": "上传文件的URL"
    },
    "timestamp": 1626342025123
  }
  ```

### 小程序专用接口

#### 创建简历（小程序）
- **URL**: `/api/resumes/miniprogram/create`
- **方法**: `POST`
- **功能特性**:
  - ✅ 支持幂等性操作（防重复提交）
  - ✅ 自动数据清理和格式化
  - ✅ 手机号唯一性验证
  - ✅ 详细的错误信息返回
- **请求头**:
  - `Authorization: Bearer [token]` (必需)
  - `Idempotency-Key: [唯一键]` (可选，防重复提交)
  - `api-version: [版本号]` (可选)
  - `x-request-id: [请求ID]` (可选)
- **必填字段**:
  - `name` (string): 姓名，2-20字符
  - `phone` (string): 手机号码，11位数字
  - `gender` (string): 性别，"female" 或 "male"
  - `age` (number): 年龄，18-65岁
  - `jobType` (string): 工种，如 "yuexin", "zhujia-yuer" 等
  - `education` (string): 学历，如 "high", "college" 等
- **请求体**: `application/json`
  ```json
  {
    "name": "张三",
    "phone": "13800138000",
    "gender": "female",
    "age": 35,
    "jobType": "yuexin",
    "education": "high",
    "experienceYears": 3,
    "expectedSalary": 8000,
    "skills": ["chanhou", "yuying"],
    "serviceArea": ["北京市朝阳区"],
    "selfIntroduction": "自我介绍",
    "school": "学校名称",
    "major": "专业",
    "workExperiences": [
      {
        "startDate": "2020-01-01",
        "endDate": "2023-12-31",
        "description": "工作描述"
      }
    ]
  }
  ```
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "id": "66e2f4af8b1234567890abcd",
      "createdAt": "2025-09-12T10:19:27.671Z",
      "action": "CREATED"
    },
    "message": "创建简历成功"
  }
  ```
- **错误响应**:
  - 重复手机号 (409):
    ```json
    {
      "success": false,
      "code": "DUPLICATE",
      "data": {
        "existingId": "66e2f4af8b1234567890abcd"
      },
      "message": "该手机号已被使用"
    }
    ```
  - 验证错误 (400):
    ```json
    {
      "success": false,
      "code": "VALIDATION_ERROR",
      "data": {
        "errors": ["姓名不能为空", "手机号码格式不正确"]
      },
      "message": "数据验证失败"
    }
    ```
  - 服务器错误 (500):
    ```json
    {
      "success": false,
      "code": "INTERNAL_ERROR",
      "data": {
        "requestId": "req-123456"
      },
      "message": "创建简历失败: 内部服务器错误"
    }
    ```

#### 更新简历（小程序）
- **URL**: `/api/resumes/miniprogram/:id`
- **方法**: `PATCH`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `application/json`
  ```json
  {
    "expectedSalary": 9000,
    "selfIntroduction": "更新后的自我介绍",
    "skills": ["muying", "cuiru", "yuezican"]
  }
  ```
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "id": "简历ID",
      "name": "姓名",
      "phone": "手机号",
      "age": 28,
      "gender": "female",
      "jobType": "yuexin",
      "education": "high",
      "experienceYears": 3,
      "expectedSalary": 9000,
      "nativePlace": "河南省郑州市",
      "skills": ["muying", "cuiru", "yuezican"],
      "serviceArea": ["北京市朝阳区"],
      "workExperiences": [],
      "photoUrls": [],
      "certificateUrls": [],
      "medicalReportUrls": [],
      "certificates": [],
      "reports": [],
      "updatedAt": "2025-09-12T10:19:39.842Z"
    },
    "message": "更新简历成功"
  }
  ```

#### 上传文件（小程序）
- **URL**: `/api/resumes/miniprogram/:id/upload-file`
- **方法**: `POST`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `multipart/form-data`
  - `file`: 文件
  - `type`: 文件类型（idCardFront/idCardBack/personalPhoto/certificate/medicalReport/selfIntroductionVideo/confinementMealPhoto/cookingPhoto/complementaryFoodPhoto/positiveReviewPhoto）
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "fileUrl": "https://example.com/file.jpg",
      "fileType": "personalPhoto",
      "fileName": "photo.jpg",
      "fileSize": 1024,
      "resumeId": "简历ID"
    },
    "message": "文件上传成功"
  }
  ```

#### 删除文件（小程序）
- **URL**: `/api/resumes/miniprogram/:id/delete-file`
- **方法**: `DELETE`
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `application/json`
  ```json
  {
    "fileUrl": "https://example.com/file.jpg",
    "fileType": "personalPhoto"
  }
  ```
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      "resumeId": "简历ID",
      "deletedFileUrl": "https://example.com/file.jpg",
      "fileType": "personalPhoto"
    },
    "message": "文件删除成功"
  }
  ```

### 百度OCR和地图服务

#### 获取地点建议
- **URL**: `/api/baidu/place/suggestion`
- **方法**: `GET`
- **参数**:
  - `query`: 搜索关键词
  - `region`: 区域
  - `city_limit`: 是否限制城市内
  - `output`: 输出格式
- **成功响应**:
  ```json
  {
    "success": true,
    "data": {
      // 百度地图API返回的数据
    },
    "timestamp": 1626342025123
  }
  ```

## 小程序接口枚举值说明

### 性别 (gender)
- `male`: 男
- `female`: 女

### 工种 (jobType)
- `yuexin`: 月嫂
- `zhujia-yuer`: 住家育儿嫂
- `baiban-yuer`: 白班育儿
- `baojie`: 保洁
- `baiban-baomu`: 白班保姆
- `zhujia-baomu`: 住家保姆
- `yangchong`: 养宠
- `xiaoshi`: 小时工
- `zhujia-hulao`: 住家护老

### 学历 (education)
- `no`: 无学历
- `primary`: 小学
- `middle`: 初中
- `secondary`: 中专
- `vocational`: 职高
- `high`: 高中
- `college`: 大专
- `bachelor`: 本科
- `graduate`: 研究生

### 技能标签 (skills)
- `muying`: 母婴护理师
- `cuiru`: 高级催乳师
- `yuezican`: 月子餐营养师
- `chanhou`: 产后修复师
- `teshu-yinger`: 特殊婴儿护理
- `yiliaobackground`: 医疗背景
- `yuying`: 高级育婴师
- `zaojiao`: 早教师
- `fushi`: 辅食营养师
- `ertui`: 小儿推拿师
- `waiyu`: 外语
- `zhongcan`: 中餐
- `xican`: 西餐
- `mianshi`: 面食
- `jiashi`: 驾驶
- `shouyi`: 整理收纳

### 文件类型 (fileType)

#### 基础证件类
- `idCardFront`: 身份证正面（最多1张）
- `idCardBack`: 身份证背面（最多1张）
- `personalPhoto`: 个人照片（最多30张）
- `certificate`: 技能证书（最多30张）
- `medicalReport`: 体检报告（最多10张）

#### 视频类
- `selfIntroductionVideo`: 自我介绍视频（最多1个）

#### 作品展示类
- `confinementMealPhoto`: 月子餐照片（最多30张）
- `cookingPhoto`: 烹饪照片（最多30张）
- `complementaryFoodPhoto`: 辅食添加照片（最多30张）
- `positiveReviewPhoto`: 好评展示照片（最多30张）

### 婚姻状况 (maritalStatus)
- `single`: 单身
- `married`: 已婚
- `divorced`: 离异
- `widowed`: 丧偶

### 宗教信仰 (religion)
- `none`: 无
- `buddhism`: 佛教
- `taoism`: 道教
- `christianity`: 基督教
- `catholicism`: 天主教
- `islam`: 伊斯兰教
- `other`: 其他

### 来源渠道 (leadSource)
- `referral`: 转介绍
- `paid-lead`: 付费线索
- `community`: 社群线索
- `door-to-door`: 地推
- `shared-order`: 合单
- `other`: 其他

---

## 文件上传详细说明

### 支持的文件格式

#### 图片文件
- **格式**: JPG, JPEG, PNG, GIF, WEBP
- **大小限制**: 单个文件最大 10MB
- **推荐尺寸**:
  - 身份证照片: 1200x800 像素
  - 个人照片: 800x800 像素
  - 证书照片: 1200x900 像素
  - 作品展示: 800x600 像素

#### 视频文件
- **格式**: MP4, MOV, AVI
- **大小限制**: 单个文件最大 100MB
- **推荐参数**:
  - 分辨率: 1280x720 或 1920x1080
  - 帧率: 25-30 fps
  - 时长: 建议不超过 3 分钟

### 文件上传流程

#### 1. CRM端上传（创建/编辑简历时）
```
POST /api/resumes (创建)
PUT /api/resumes/:id (更新)

Content-Type: multipart/form-data

表单字段:
- name: 姓名
- phone: 手机号
- age: 年龄
- ...其他文本字段

文件字段:
- idCardFront: 身份证正面（单个文件）
- idCardBack: 身份证背面（单个文件）
- photoFiles: 个人照片（多个文件）
- certificateFiles: 技能证书（多个文件）
- medicalReportFiles: 体检报告（多个文件）
- selfIntroductionVideo: 自我介绍视频（单个文件）
- confinementMealPhotos: 月子餐照片（多个文件）
- cookingPhotos: 烹饪照片（多个文件）
- complementaryFoodPhotos: 辅食添加照片（多个文件）
- positiveReviewPhotos: 好评展示照片（多个文件）
```

#### 2. 小程序端上传（单个文件上传）
```
POST /api/resumes/miniprogram/:id/upload-file

Content-Type: multipart/form-data

参数:
- file: 文件（必填）
- type: 文件类型（必填，见文件类型枚举）

特点:
- 立即上传到云存储
- 自动关联到简历记录
- 返回文件URL
- 支持断点续传
```

### 文件存储路径规则

```
腾讯云COS存储路径:
- 身份证: /id-card/{resumeId}/{timestamp}-{filename}
- 个人照片: /photo/{resumeId}/{timestamp}-{filename}
- 技能证书: /certificate/{resumeId}/{timestamp}-{filename}
- 体检报告: /medical-report/{resumeId}/{timestamp}-{filename}
- 自我介绍视频: /video/{resumeId}/{timestamp}-{filename}
- 月子餐照片: /confinement-meal/{resumeId}/{timestamp}-{filename}
- 烹饪照片: /cooking/{resumeId}/{timestamp}-{filename}
- 辅食添加照片: /complementary-food/{resumeId}/{timestamp}-{filename}
- 好评展示照片: /positive-review/{resumeId}/{timestamp}-{filename}
```

### 文件删除

#### CRM端删除
- 在编辑简历时，直接移除文件即可
- 保存时会自动删除云存储中的文件

#### 小程序端删除
```
DELETE /api/resumes/miniprogram/:id/delete-file

Content-Type: application/json

{
  "fileUrl": "https://example.com/file.jpg",
  "fileType": "cookingPhoto"
}

说明:
- 同时删除数据库记录和云存储文件
- 删除失败会返回详细错误信息
```

### 文件压缩策略

系统会自动对上传的图片进行压缩优化：

1. **个人照片**: 压缩至 800x800，质量 85%
2. **证书照片**: 压缩至 1200x900，质量 90%
3. **身份证照片**: 保持原始质量，不压缩
4. **作品展示照片**: 压缩至 800x600，质量 85%

### 错误处理

#### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| `FILE_TOO_LARGE` | 文件大小超过限制 | 压缩文件后重新上传 |
| `INVALID_FILE_TYPE` | 不支持的文件格式 | 使用支持的文件格式 |
| `UPLOAD_FAILED` | 上传失败 | 检查网络连接后重试 |
| `FILE_NOT_FOUND` | 文件不存在 | 确认文件URL是否正确 |
| `DELETE_FAILED` | 删除失败 | 检查文件是否已被删除 |
| `MAX_FILES_EXCEEDED` | 超过最大文件数量 | 删除部分文件后再上传 |

#### 错误响应示例

```json
{
  "success": false,
  "code": "FILE_TOO_LARGE",
  "message": "文件大小超过限制，最大允许 10MB",
  "data": {
    "maxSize": 10485760,
    "actualSize": 15728640,
    "fileName": "photo.jpg"
  },
  "timestamp": 1767592939244
}
```

### 最佳实践

#### 前端上传建议

1. **显示上传进度**
```javascript
wx.uploadFile({
  url: 'https://api.example.com/upload',
  filePath: tempFilePath,
  name: 'file',
  formData: { type: 'cookingPhoto' },
  success: (res) => {
    console.log('上传成功', res);
  },
  fail: (err) => {
    console.error('上传失败', err);
  }
});
```

2. **图片预压缩**
```javascript
wx.compressImage({
  src: tempFilePath,
  quality: 80,
  success: (res) => {
    // 使用压缩后的图片上传
    uploadFile(res.tempFilePath);
  }
});
```

3. **错误重试机制**
```javascript
async function uploadWithRetry(filePath, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await uploadFile(filePath);
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // 指数退避
    }
  }
}
```

4. **批量上传优化**
```javascript
// 使用 Promise.all 并发上传，但限制并发数
async function uploadBatch(files, concurrency = 3) {
  const results = [];
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(file => uploadFile(file))
    );
    results.push(...batchResults);
  }
  return results;
}
```

---

## 附录

### 完整的简历数据结构

```typescript
interface Resume {
  // 基本信息
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: 'male' | 'female';
  idNumber?: string;

  // 工作信息
  jobType: string;
  education: string;
  experienceYears?: number;
  expectedSalary?: number;

  // 个人信息
  nativePlace?: string;
  currentAddress?: string;
  maritalStatus?: string;
  religion?: string;
  height?: number;
  weight?: number;

  // 技能和经验
  skills: string[];
  serviceArea: string[];
  selfIntroduction?: string;
  workExperiences: WorkExperience[];

  // 文件资料
  idCardFront?: string;
  idCardBack?: string;
  photoUrls: string[];
  certificateUrls: string[];
  medicalReportUrls: string[];
  selfIntroductionVideo?: string;

  // 作品展示
  confinementMealPhotos: string[];
  cookingPhotos: string[];
  complementaryFoodPhotos: string[];
  positiveReviewPhotos: string[];

  // 系统字段
  status: string;
  leadSource?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkExperience {
  startDate: string;
  endDate: string;
  description: string;
}
```

### API版本历史

| 版本 | 发布日期 | 主要变更 |
|------|---------|---------|
| v1.3 | 2026-01-05 | 新增烹饪照片等作品展示类型 |
| v1.2 | 2025-12-15 | 优化文件上传接口 |
| v1.1 | 2025-11-20 | 新增小程序专用接口 |
| v1.0 | 2025-10-01 | 初始版本 |

---

**文档版本**: v1.3
**最后更新**: 2026-01-05
**维护团队**: 安得家政技术团队
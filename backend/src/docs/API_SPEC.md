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
- **请求头**: `Authorization: Bearer [token]`
- **请求体**: `application/json`
  ```json
  {
    "name": "姓名",
    "phone": "手机号",
    "age": 28,
    "gender": "female",
    "jobType": "yuexin",
    "education": "high",
    "experienceYears": 3,
    "expectedSalary": 8000,
    "nativePlace": "河南省郑州市",
    "skills": ["muying", "cuiru"],
    "serviceArea": ["北京市朝阳区"],
    "selfIntroduction": "自我介绍",
    "school": "学校名称",
    "major": "专业"
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
      "expectedSalary": 8000,
      "nativePlace": "河南省郑州市",
      "skills": ["muying", "cuiru"],
      "serviceArea": ["北京市朝阳区"],
      "workExperiences": [],
      "createdAt": "2025-09-12T10:19:27.671Z",
      "updatedAt": "2025-09-12T10:19:27.671Z"
    },
    "message": "创建简历成功"
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
  - `type`: 文件类型（idCardFront/idCardBack/personalPhoto/certificate/medicalReport）
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
- `idCardFront`: 身份证正面
- `idCardBack`: 身份证背面
- `personalPhoto`: 个人照片
- `certificate`: 技能证书
- `medicalReport`: 体检报告

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
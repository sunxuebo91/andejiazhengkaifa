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
      "token": "JWT令牌",
      "user": {
        "id": "用户ID",
        "username": "用户名",
        "role": "角色"
      }
    },
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
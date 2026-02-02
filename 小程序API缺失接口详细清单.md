# 小程序API缺失接口详细清单

> **生成时间**: 2026-01-16  
> **用途**: 用于更新小程序API文档

---

## 📋 缺失接口总览

| 模块 | 缺失数量 | 优先级 | 状态 |
|------|---------|--------|------|
| 客户管理 | 10个 | 🔴 高 | 待添加 |
| 简历管理 | 8个 | 🔴 高 | 待添加 |
| 视频面试 | 8个 | 🟡 中 | 待添加 |
| ZEGO服务 | 2个 | 🟡 中 | 待添加 |
| 微信服务 | 4个 | 🟢 低 | 待添加 |
| 认证模块 | 1个 | 🔴 高 | 待添加 |
| OCR监控 | 2个 | 🟢 低 | 待添加 |
| 日志记录 | 1个 | 🟢 低 | 待添加 |

**总计**: 36个接口需要添加到文档

---

## 🔴 优先级1：核心业务接口（必须立即添加）

### 1. 客户管理模块 (10个接口)

#### 1.1 获取客户统计信息
```
GET /api/customers/miniprogram/statistics
认证: 需要JWT Token
权限: 基于角色（admin/manager/employee）
```

**请求示例**:
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/customers/miniprogram/statistics',
  method: 'GET',
  header: {
    'Authorization': 'Bearer ' + token
  },
  success: (res) => {
    console.log(res.data.data); // { total, myCustomers, newToday, ... }
  }
});
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "myCustomers": 25,
    "newToday": 3,
    "followUpToday": 5
  }
}
```

---

#### 1.2 获取客户列表
```
GET /api/customers/miniprogram/list
认证: 需要JWT Token
权限: 基于角色和分配关系
```

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认10）
- `status`: 客户状态筛选
- `keyword`: 搜索关键词

**请求示例**:
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/customers/miniprogram/list?page=1&pageSize=20',
  method: 'GET',
  header: {
    'Authorization': 'Bearer ' + token
  }
});
```

---

#### 1.3 创建客户
```
POST /api/customers/miniprogram/create
认证: 需要JWT Token
支持: 幂等性（Idempotency-Key）
```

**请求头**:
```
Authorization: Bearer {token}
Idempotency-Key: {unique-key}  // 可选，防重复提交
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "张女士",
  "phone": "13800138000",
  "serviceType": "月嫂",
  "expectedBudget": 8000,
  "address": "北京市朝阳区",
  "notes": "需要金牌月嫂"
}
```

---

#### 1.4 获取客户详情
```
GET /api/customers/miniprogram/:id
认证: 需要JWT Token
权限: 只能查看自己负责的客户（员工）或所有客户（管理员）
```

---

#### 1.5 更新客户信息
```
PATCH /api/customers/miniprogram/:id
认证: 需要JWT Token
权限: 只能修改自己负责的客户
```

---

#### 1.6 分配客户
```
PATCH /api/customers/miniprogram/:id/assign
认证: 需要JWT Token
权限: 仅管理员和经理
```

**请求体**:
```json
{
  "assignedTo": "员工ID",
  "reason": "分配原因"
}
```

---

#### 1.7 新增客户跟进记录
```
POST /api/customers/miniprogram/:id/follow-ups
认证: 需要JWT Token
```

**请求体**:
```json
{
  "content": "已联系客户，客户表示下周可以面试",
  "nextFollowUpDate": "2026-01-20",
  "status": "contacted"
}
```

---

#### 1.8 获取客户跟进列表
```
GET /api/customers/miniprogram/:id/follow-ups
认证: 需要JWT Token
```

---

#### 1.9 获取客户分配日志
```
GET /api/customers/miniprogram/:id/assignment-logs
认证: 需要JWT Token
```

---

#### 1.10 获取员工列表（用于分配）
```
GET /api/customers/miniprogram/employees/list
认证: 需要JWT Token
权限: 仅管理员和经理
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user123",
      "name": "李员工",
      "role": "普通员工",
      "customerCount": 15
    }
  ]
}
```

---

### 2. 简历管理模块 (8个接口)

#### 2.1 数据验证接口
```
POST /api/resumes/miniprogram/validate
认证: 需要JWT Token
用途: 验证手机号、身份证是否已存在
```

**请求体**:
```json
{
  "phone": "13800138000",
  "idNumber": "110101199001011234"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "phone": {
      "valid": true,
      "exists": false,
      "message": "手机号可用"
    },
    "idNumber": {
      "valid": true,
      "exists": true,
      "message": "身份证号已存在"
    }
  }
}
```

---

#### 2.2 获取统计信息
```
GET /api/resumes/miniprogram/stats
认证: 需要JWT Token
用途: 获取简历统计数据
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalResumes": 1250,
    "resumesWithSelfIntroduction": 980,
    "selfIntroductionRate": "78.40",
    "recentResumes": 45,
    "lastUpdated": "2026-01-16T10:30:00.000Z"
  }
}
```

---

#### 2.3 获取公开简历列表
```
GET /api/resumes/public/list
认证: 无需认证
用途: 获取公开简历列表（不脱敏，完整信息）
```

**查询参数**:
- `page`: 页码
- `pageSize`: 每页数量
- `keyword`: 搜索关键词
- `jobType`: 工种筛选
- `orderStatus`: 接单状态
- `maxAge`: 最大年龄
- `nativePlace`: 籍贯
- `ethnicity`: 民族

**请求示例**:
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/resumes/public/list?page=1&pageSize=20&jobType=yuexin',
  method: 'GET'
  // 无需 Authorization header
});
```

---

#### 2.4 获取公开简历详情
```
GET /api/resumes/public/:id
认证: 无需认证
用途: 获取公开简历完整详情（不脱敏）
```

---

#### 2.5 生成简历分享链接
```
POST /api/resumes/:id/share
认证: 需要JWT Token
用途: 生成简历分享链接（带过期时间）
```

**请求体**:
```json
{
  "expireHours": 24  // 可选，默认24小时
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "abc123xyz",
    "shareUrl": "https://crm.andejiazheng.com/api/resumes/shared/abc123xyz",
    "expireAt": "2026-01-17T10:30:00.000Z",
    "path": "/pages/public/detail/index?token=abc123xyz"
  }
}
```

---

#### 2.6 获取分享的简历
```
GET /api/resumes/shared/:token
认证: 无需认证
用途: 通过分享token获取简历（脱敏）
```

---

#### 2.7 搜索服务人员
```
GET /api/resumes/search-workers
认证: 无需认证
用途: 按姓名或手机号搜索服务人员
```

**查询参数**:
- `phone`: 手机号（模糊搜索）
- `name`: 姓名（模糊搜索）
- `limit`: 返回数量限制（默认10）

---

#### 2.8 获取枚举字典
```
GET /api/resumes/enums
认证: 无需认证
用途: 获取所有枚举值（性别、工种、学历等）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "gender": [
      { "value": "female", "label": "女" },
      { "value": "male", "label": "男" }
    ],
    "jobType": [
      { "value": "yuexin", "label": "月嫂" },
      { "value": "yuesao", "label": "育儿嫂" }
    ],
    "education": [...],
    "skills": [...],
    "maternityNurseLevel": [...]
  }
}
```

---

### 3. 认证模块 (1个接口)

#### 3.1 小程序微信登录
```
POST /api/auth/miniprogram-login
认证: 无需认证
用途: 小程序通过微信code和手机号登录
```

**请求体**:
```json
{
  "code": "微信登录code",
  "phone": "13800138000"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user123",
      "phone": "13800138000",
      "name": "张三",
      "role": "employee"
    }
  }
}
```

---

## 🟡 优先级2：辅助功能接口

### 4. 视频面试模块 (8个接口)

这些接口已有独立文档 `MINIPROGRAM_BACKEND_API.md`，建议整合到主文档。

#### 接口列表
1. `POST /api/interview/rooms` - 创建面试间
2. `POST /api/interview/create-room` - 简化创建（H5用）
3. `GET /api/interview/room/:roomId` - 获取面试间信息
4. `POST /api/interview/room/:roomId/end` - 结束面试
5. `GET /api/interview/rooms` - 面试间列表
6. `GET /api/interview/latest-room` - 最新活跃面试间
7. `POST /api/interview/guest/join` - 访客加入（无需认证）
8. `POST /api/interview/guest/leave` - 访客离开（无需认证）

---

### 5. ZEGO视频服务 (2个接口)

#### 5.1 生成ZEGO Token
```
POST /api/zego/generate-token
认证: 需要JWT Token
```

#### 5.2 生成访客Token
```
POST /api/zego/generate-guest-token
认证: 无需认证
```

---

## 🟢 优先级3：监控和辅助接口

### 6. 微信服务模块 (4个接口)
### 7. OCR监控 (2个接口)
### 8. 日志记录 (1个接口)

这些接口主要用于系统内部，可以在后续版本中添加到文档。

---

## 📝 文档更新建议

### 更新方式1：扩展主文档
在 `backend/docs/小程序API完整文档.md` 中添加新章节：
- 第5章：客户管理
- 第6章：视频面试
- 第7章：辅助接口

### 更新方式2：模块化文档
创建独立的模块文档：
- `backend/docs/小程序API-客户管理.md`
- `backend/docs/小程序API-视频面试.md`
- 在主文档中添加链接索引

### 推荐方式
**方式1（扩展主文档）** - 便于小程序开发者查阅，所有接口集中在一个文档中。

---

**清单生成完毕** ✅


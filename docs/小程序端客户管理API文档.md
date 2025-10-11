# 小程序端客户管理API文档

## 📋 概述

本文档详细描述了小程序端客户管理系统的API接口规范，包括请求格式、响应格式、权限控制、错误处理等内容。

## 🔐 认证方式

所有API请求都需要在请求头中包含JWT Token：

```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

## 📊 统一响应格式

所有API响应都遵循以下统一格式：

```json
{
  "success": true,
  "data": { /* 响应数据 */ },
  "message": "操作成功",
  "timestamp": 1640995200000,
  "error": "错误码（仅在失败时返回）"
}
```

## 🎯 API接口详情

### 1. 获取客户列表

**接口地址**：`GET /api/customers/miniprogram/list`

**功能描述**：获取客户列表，支持分页、搜索、筛选，基于用户角色返回相应权限的数据。

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| page | number | 否 | 页码，默认1 | 1 |
| limit | number | 否 | 每页数量，默认20 | 20 |
| search | string | 否 | 搜索关键词（姓名、手机号） | "张三" |
| contractStatus | string | 否 | 合同状态筛选 | "已签约" |
| leadSource | string | 否 | 线索来源筛选 | "美团" |
| serviceCategory | string | 否 | 服务类别筛选 | "月嫂" |
| leadLevel | string | 否 | 线索等级筛选 | "A类" |

**请求示例**：
```http
GET /api/customers/miniprogram/list?page=1&limit=20&search=张三&contractStatus=已签约
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
        "name": "张三",
        "phone": "138****5678", // 根据权限脱敏
        "leadSource": "美团",
        "serviceCategory": "月嫂",
        "contractStatus": "已签约",
        "leadLevel": "A类",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "assignedTo": "60f7b3c4e1b2c3d4e5f6g7h9",
        "assignedToUser": {
          "name": "李经理",
          "username": "limanager"
        }
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  },
  "message": "客户列表获取成功",
  "timestamp": 1640995200000
}
```

**权限说明**：
- 系统管理员：可查看所有客户
- 经理：可查看部门内所有客户
- 普通员工：只能查看自己负责的客户，其他客户手机号脱敏

### 2. 创建客户

**接口地址**：`POST /api/customers/miniprogram/create`

**功能描述**：创建新客户，支持幂等性操作，防止重复提交。

**请求头**：
```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
Idempotency-Key: miniprogram_1640995200000_abc123def (可选，防重复提交)
api-version: v1 (可选，API版本)
x-request-id: req_1640995200000_xyz789 (可选，请求追踪)
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| name | string | 是 | 客户姓名 | "张三" |
| phone | string | 是 | 客户电话 | "13812345678" |
| wechatId | string | 否 | 微信号 | "zhangsan123" |
| leadSource | string | 是 | 线索来源 | "美团" |
| serviceCategory | string | 否 | 服务类别 | "月嫂" |
| contractStatus | string | 是 | 客户状态 | "匹配中" |
| leadLevel | string | 否 | 线索等级 | "A类" |
| salaryBudget | number | 否 | 薪资预算 | 8000 |
| expectedStartDate | string | 否 | 期望开始日期 | "2024-02-01" |
| homeArea | number | 否 | 家庭面积 | 120 |
| familySize | number | 否 | 家庭人口 | 4 |
| restSchedule | string | 否 | 休息安排 | "单休" |
| address | string | 否 | 客户地址 | "北京市朝阳区..." |
| remarks | string | 否 | 备注信息 | "客户要求..." |

**请求示例**：
```json
{
  "name": "张三",
  "phone": "13812345678",
  "wechatId": "zhangsan123",
  "leadSource": "美团",
  "serviceCategory": "月嫂",
  "contractStatus": "匹配中",
  "leadLevel": "A类",
  "salaryBudget": 8000,
  "expectedStartDate": "2024-02-01",
  "homeArea": 120,
  "familySize": 4,
  "restSchedule": "单休",
  "address": "北京市朝阳区...",
  "remarks": "客户要求经验丰富的月嫂"
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "60f7b3c4e1b2c3d4e5f6g7h8",
    "customerId": "CUS20240101001",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "customer": {
      "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
      "name": "张三",
      "phone": "13812345678",
      "customerId": "CUS20240101001",
      // ... 其他字段
    },
    "action": "CREATED"
  },
  "message": "客户创建成功",
  "timestamp": 1640995200000
}
```

**错误响应示例**：
```json
{
  "success": false,
  "message": "该手机号已存在客户记录",
  "error": "DUPLICATE_PHONE",
  "timestamp": 1640995200000
}
```

### 3. 获取客户详情

**接口地址**：`GET /api/customers/miniprogram/:id`

**功能描述**：获取指定客户的详细信息，基于权限控制返回相应数据。

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 客户ID |

**请求示例**：
```http
GET /api/customers/miniprogram/60f7b3c4e1b2c3d4e5f6g7h8
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
    "name": "张三",
    "phone": "13812345678",
    "wechatId": "zhangsan123",
    "leadSource": "美团",
    "serviceCategory": "月嫂",
    "contractStatus": "已签约",
    "leadLevel": "A类",
    "salaryBudget": 8000,
    "expectedStartDate": "2024-02-01",
    "homeArea": 120,
    "familySize": 4,
    "restSchedule": "单休",
    "address": "北京市朝阳区...",
    "remarks": "客户要求经验丰富的月嫂",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "assignedTo": "60f7b3c4e1b2c3d4e5f6g7h9",
    "assignedToUser": {
      "name": "李经理",
      "username": "limanager"
    }
  },
  "message": "客户详情获取成功",
  "timestamp": 1640995200000
}
```

### 4. 更新客户信息

**接口地址**：`PATCH /api/customers/miniprogram/:id`

**功能描述**：更新客户信息，支持部分字段更新，状态变更时发送通知。

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 客户ID |

**请求参数**：支持客户创建时的所有字段，均为可选。

**请求示例**：
```json
{
  "contractStatus": "已签约",
  "salaryBudget": 9000,
  "remarks": "客户已确认服务"
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    // 更新后的完整客户信息
  },
  "message": "客户信息更新成功",
  "timestamp": 1640995200000
}
```

### 5. 分配客户

**接口地址**：`PATCH /api/customers/miniprogram/:id/assign`

**功能描述**：将客户分配给指定员工，仅管理员和经理可操作。

**权限要求**：系统管理员、经理

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 客户ID |

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| assignedTo | string | 是 | 被分配人用户ID |
| assignmentReason | string | 否 | 分配原因 |

**请求示例**：
```json
{
  "assignedTo": "60f7b3c4e1b2c3d4e5f6g7h9",
  "assignmentReason": "该员工经验丰富，适合此客户"
}
```

### 6. 创建跟进记录

**接口地址**：`POST /api/customers/miniprogram/:id/follow-ups`

**功能描述**：为指定客户创建跟进记录，需要有该客户的访问权限。

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 客户ID |

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| type | string | 是 | 跟进类型：phone/wechat/visit/other |
| content | string | 是 | 跟进内容 |

**请求示例**：
```json
{
  "type": "phone",
  "content": "与客户电话沟通，确认服务需求和时间安排"
}
```

### 7. 获取跟进记录

**接口地址**：`GET /api/customers/miniprogram/:id/follow-ups`

**功能描述**：获取指定客户的跟进记录列表。

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
      "customerId": "60f7b3c4e1b2c3d4e5f6g7h7",
      "type": "phone",
      "content": "与客户电话沟通，确认服务需求",
      "createdBy": "60f7b3c4e1b2c3d4e5f6g7h9",
      "createdByUser": {
        "name": "李经理",
        "username": "limanager"
      },
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "message": "跟进记录获取成功",
  "timestamp": 1640995200000
}
```

### 8. 获取分配历史

**接口地址**：`GET /api/customers/miniprogram/:id/assignment-logs`

**功能描述**：获取客户分配历史记录，仅管理员和经理可查看。

**权限要求**：系统管理员、经理

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
      "customerId": "60f7b3c4e1b2c3d4e5f6g7h7",
      "oldAssignedTo": "60f7b3c4e1b2c3d4e5f6g7h8",
      "newAssignedTo": "60f7b3c4e1b2c3d4e5f6g7h9",
      "assignedBy": "60f7b3c4e1b2c3d4e5f6g7h0",
      "assignedAt": "2024-01-01T10:00:00.000Z",
      "reason": "客户要求更换负责人",
      "oldAssignedToUser": {
        "name": "王员工",
        "username": "wangyuangong"
      },
      "newAssignedToUser": {
        "name": "李经理",
        "username": "limanager"
      },
      "assignedByUser": {
        "name": "张管理员",
        "username": "zhangadmin"
      }
    }
  ],
  "message": "分配历史获取成功",
  "timestamp": 1640995200000
}
```

### 9. 获取统计信息

**接口地址**：`GET /api/customers/miniprogram/statistics`

**功能描述**：获取客户统计信息，根据用户角色返回不同范围的统计数据。

**响应示例**：

**管理员/经理响应**：
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "byContractStatus": {
      "已签约": 300,
      "匹配中": 500,
      "流失客户": 100,
      "已退款": 50,
      "退款中": 30,
      "待定": 20
    },
    "byLeadSource": {
      "美团": 400,
      "抖音": 300,
      "快手": 200,
      "小红书": 100
    },
    "byServiceCategory": {
      "月嫂": 500,
      "育儿嫂": 300,
      "保姆": 200
    }
  },
  "message": "统计信息获取成功",
  "timestamp": 1640995200000
}
```

**普通员工响应**：
```json
{
  "success": true,
  "data": {
    "total": 50,
    "myCustomers": 50,
    "byContractStatus": {
      "已签约": 20,
      "匹配中": 25,
      "流失客户": 3,
      "待定": 2
    }
  },
  "message": "统计信息获取成功",
  "timestamp": 1640995200000
}
```

## ❌ 错误码说明

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| UNAUTHORIZED | 401 | 未授权，Token无效或已过期 |
| FORBIDDEN | 403 | 无权限访问该资源 |
| NOT_FOUND | 404 | 资源不存在 |
| DUPLICATE_PHONE | 400 | 手机号已存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 🔒 权限控制说明

### 角色定义

1. **系统管理员**：拥有所有权限
2. **经理**：可管理部门内的客户和员工
3. **普通员工**：只能管理自己负责的客户

### 数据可见性

- **系统管理员**：可查看所有数据
- **经理**：可查看部门内所有数据
- **普通员工**：只能查看自己负责的客户数据，其他客户的敏感信息（如手机号）会被脱敏

### 操作权限

| 操作 | 系统管理员 | 经理 | 普通员工 |
|------|------------|------|----------|
| 查看客户列表 | 全部 | 部门内 | 自己的 |
| 创建客户 | ✅ | ✅ | ✅ |
| 编辑客户 | 全部 | 部门内 | 自己的 |
| 分配客户 | ✅ | ✅ | ❌ |
| 查看跟进记录 | 全部 | 部门内 | 自己的 |
| 创建跟进记录 | 全部 | 部门内 | 自己的 |
| 查看分配历史 | ✅ | ✅ | ❌ |
| 查看统计信息 | 全部 | 部门内 | 自己的 |

## 📝 使用示例

### JavaScript/小程序示例

```javascript
// 引入服务
const miniprogramCustomerService = require('./services/miniprogramCustomerService.js');

// 获取客户列表
async function loadCustomers() {
  try {
    const response = await miniprogramCustomerService.getCustomers({
      page: 1,
      limit: 20,
      search: '张三',
      contractStatus: '已签约'
    });
    
    console.log('客户列表:', response.customers);
    console.log('总数:', response.total);
  } catch (error) {
    console.error('获取客户列表失败:', error.message);
  }
}

// 创建客户
async function createCustomer() {
  try {
    const customerData = {
      name: '张三',
      phone: '13812345678',
      leadSource: '美团',
      contractStatus: '匹配中'
    };
    
    const idempotencyKey = miniprogramCustomerService.generateIdempotencyKey();
    
    const response = await miniprogramCustomerService.createCustomer(
      customerData, 
      { idempotencyKey }
    );
    
    console.log('客户创建成功:', response);
  } catch (error) {
    console.error('创建客户失败:', error.message);
  }
}
```

## 🚀 最佳实践

### 1. 幂等性处理

对于创建操作，建议使用幂等性键防止重复提交：

```javascript
const idempotencyKey = `miniprogram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### 2. 错误处理

统一处理API错误：

```javascript
try {
  const result = await api.call();
} catch (error) {
  if (error.response?.data?.error === 'FORBIDDEN') {
    // 处理权限错误
  } else if (error.response?.data?.error === 'DUPLICATE_PHONE') {
    // 处理重复手机号错误
  } else {
    // 处理其他错误
  }
}
```

### 3. 数据缓存

对于列表数据，建议实现本地缓存：

```javascript
// 缓存客户列表数据
wx.setStorageSync('customerList', response.customers);

// 读取缓存数据
const cachedCustomers = wx.getStorageSync('customerList') || [];
```

### 4. 权限检查

在调用API前检查用户权限：

```javascript
const userInfo = wx.getStorageSync('userInfo');
if (!['系统管理员', '经理'].includes(userInfo.role)) {
  wx.showToast({ title: '无权限操作', icon: 'error' });
  return;
}
```

## 📞 技术支持

如有API使用问题，请联系技术支持团队：
- 邮箱：api-support@company.com
- 文档更新：请关注项目仓库的更新

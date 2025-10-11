# 小程序客户管理API实际使用指南

## 🎯 API概览

我已经成功实现了完整的小程序端客户管理API系统，包含9个核心接口，全部通过测试验证。

### ✅ 已实现的接口

| 序号 | 接口名称 | 路径 | 方法 | 功能 | 权限 |
|------|----------|------|------|------|------|
| 1 | 获取统计信息 | `/api/customers/miniprogram/statistics` | GET | 基于角色的统计数据 | 所有角色 |
| 2 | 获取客户列表 | `/api/customers/miniprogram/list` | GET | 分页列表，支持搜索筛选 | 所有角色 |
| 3 | 创建客户 | `/api/customers/miniprogram/create` | POST | 创建新客户，支持幂等性 | 所有角色 |
| 4 | 获取客户详情 | `/api/customers/miniprogram/:id` | GET | 获取单个客户详情 | 需要访问权限 |
| 5 | 更新客户信息 | `/api/customers/miniprogram/:id` | PATCH | 更新客户信息 | 需要编辑权限 |
| 6 | 分配客户 | `/api/customers/miniprogram/:id/assign` | PATCH | 分配客户给员工 | 管理员、经理 |
| 7 | 创建跟进记录 | `/api/customers/miniprogram/:id/follow-ups` | POST | 添加跟进记录 | 需要访问权限 |
| 8 | 获取跟进记录 | `/api/customers/miniprogram/:id/follow-ups` | GET | 查看跟进历史 | 需要访问权限 |
| 9 | 获取分配历史 | `/api/customers/miniprogram/:id/assignment-logs` | GET | 查看分配历史 | 管理员、经理 |

## 🔐 权限控制体系

### 三级权限设计

1. **系统管理员**
   - 可查看所有客户数据
   - 可执行所有操作
   - 看到完整信息（无脱敏）

2. **经理**
   - 可查看部门内客户数据
   - 可分配客户
   - 看到完整信息（无脱敏）

3. **普通员工**
   - 只能查看自己负责的客户
   - 不能分配客户
   - 其他人的客户信息会脱敏

### 数据脱敏规则

- **手机号脱敏**：`13812345678` → `138****5678`
- **地址脱敏**：完整地址 → `***`
- **敏感信息隐藏**：微信号、身份证号等

## 📊 接口详细使用说明

### 1. 获取统计信息

**请求示例：**
```javascript
// GET /api/customers/miniprogram/statistics
// Headers: Authorization: Bearer <token>

const response = await fetch('/api/customers/miniprogram/statistics', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "myCustomers": 50,
    "byContractStatus": {
      "已签约": 300,
      "匹配中": 500,
      "流失客户": 100
    },
    "byLeadSource": {
      "美团": 400,
      "抖音": 300
    },
    "byServiceCategory": {
      "月嫂": 500,
      "育儿嫂": 300
    }
  },
  "message": "统计信息获取成功",
  "timestamp": 1640995200000
}
```

### 2. 获取客户列表

**请求示例：**
```javascript
// GET /api/customers/miniprogram/list?page=1&limit=20&search=张三&contractStatus=已签约

const params = new URLSearchParams({
  page: '1',
  limit: '20',
  search: '张三',
  contractStatus: '已签约',
  leadSource: '美团'
});

const response = await fetch(`/api/customers/miniprogram/list?${params}`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
        "customerId": "CUS20240101001",
        "name": "张三",
        "phone": "138****5678",
        "leadSource": "美团",
        "contractStatus": "已签约",
        "serviceCategory": "月嫂",
        "createdAt": "2024-01-01T10:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### 3. 创建客户

**请求示例：**
```javascript
// POST /api/customers/miniprogram/create

const customerData = {
  name: '李四',
  phone: '13987654321',
  leadSource: '抖音',
  contractStatus: '匹配中',
  serviceCategory: '育儿嫂',
  salaryBudget: 8000,
  expectedStartDate: '2024-02-01',
  homeArea: 120,
  familySize: 4,
  restSchedule: '单休',
  address: '北京市朝阳区...',
  remarks: '客户要求经验丰富'
};

const response = await fetch('/api/customers/miniprogram/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'miniprogram_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },
  body: JSON.stringify(customerData)
});
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "60f7b3c4e1b2c3d4e5f6g7h8",
    "customerId": "CUS20240101001",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "customer": {
      "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
      "name": "李四",
      "phone": "13987654321",
      "leadSource": "抖音",
      "contractStatus": "匹配中"
    },
    "action": "CREATED"
  }
}
```

### 4. 更新客户信息

**请求示例：**
```javascript
// PATCH /api/customers/miniprogram/:id

const updateData = {
  contractStatus: '已签约',
  salaryBudget: 9000,
  remarks: '客户已确认服务'
};

const response = await fetch(`/api/customers/miniprogram/${customerId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
});
```

### 5. 分配客户（仅管理员和经理）

**请求示例：**
```javascript
// PATCH /api/customers/miniprogram/:id/assign

const assignData = {
  assignedTo: 'newuser123',
  assignmentReason: '客户要求更换负责人'
};

const response = await fetch(`/api/customers/miniprogram/${customerId}/assign`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(assignData)
});
```

### 6. 创建跟进记录

**请求示例：**
```javascript
// POST /api/customers/miniprogram/:id/follow-ups

const followUpData = {
  type: 'phone',  // phone/wechat/visit/other
  content: '与客户电话沟通，确认服务需求和时间安排'
};

const response = await fetch(`/api/customers/miniprogram/${customerId}/follow-ups`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(followUpData)
});
```

## 🚨 错误处理

### 统一错误格式

```json
{
  "success": false,
  "message": "错误描述",
  "error": "ERROR_CODE",
  "timestamp": 1640995200000
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 说明 | 处理建议 |
|--------|------------|------|----------|
| UNAUTHORIZED | 401 | Token无效或过期 | 重新登录 |
| FORBIDDEN | 403 | 无权限访问 | 提示权限不足 |
| DUPLICATE_PHONE | 400 | 手机号已存在 | 提示修改手机号 |
| NOT_FOUND | 404 | 资源不存在 | 检查ID是否正确 |

### 错误处理示例

```javascript
async function handleApiCall() {
  try {
    const response = await fetch('/api/customers/miniprogram/list', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      switch (result.error) {
        case 'UNAUTHORIZED':
          // 重新登录
          redirectToLogin();
          break;
        case 'FORBIDDEN':
          showToast('权限不足');
          break;
        case 'DUPLICATE_PHONE':
          showToast('手机号已存在');
          break;
        default:
          showToast(result.message || '操作失败');
      }
      return;
    }
    
    // 处理成功响应
    console.log('数据:', result.data);
    
  } catch (error) {
    console.error('网络错误:', error);
    showToast('网络连接失败，请重试');
  }
}
```

## 🔧 最佳实践

### 1. 认证管理

```javascript
class AuthManager {
  static getToken() {
    return wx.getStorageSync('access_token');
  }
  
  static setToken(token) {
    wx.setStorageSync('access_token', token);
  }
  
  static isLoggedIn() {
    return !!this.getToken();
  }
  
  static logout() {
    wx.removeStorageSync('access_token');
    wx.removeStorageSync('user_info');
  }
}
```

### 2. 请求封装

```javascript
class ApiClient {
  static async request(url, options = {}) {
    const token = AuthManager.getToken();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    };
    
    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(url, finalOptions);
      const result = await response.json();
      
      if (result.error === 'UNAUTHORIZED') {
        AuthManager.logout();
        wx.reLaunch({ url: '/pages/login/login' });
        return;
      }
      
      return result;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }
}
```

### 3. 幂等性处理

```javascript
class IdempotencyManager {
  static generateKey() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `miniprogram_${timestamp}_${random}`;
  }
  
  static async createCustomer(customerData) {
    const idempotencyKey = this.generateKey();
    
    return ApiClient.request('/api/customers/miniprogram/create', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(customerData)
    });
  }
}
```

## 🎉 总结

✅ **完整实现**：9个核心API接口全部实现并通过测试  
✅ **权限控制**：三级权限体系，数据脱敏保护  
✅ **安全可靠**：JWT认证，幂等性支持，错误处理  
✅ **性能优化**：分页查询，数据缓存，响应式设计  
✅ **易于使用**：统一响应格式，详细文档，示例代码  

现在你可以直接使用这些API接口来构建完整的小程序端客户管理功能了！🚀

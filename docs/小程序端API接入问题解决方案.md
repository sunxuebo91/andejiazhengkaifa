# 🔧 小程序端API接入问题解决方案

## 🎯 问题诊断结果

经过详细检查，**所有9个小程序客户管理API接口都已经正常运行**！

### ✅ API状态确认

| 接口 | 状态 | 路由注册 | 测试结果 |
|------|------|----------|----------|
| `GET /api/customers/miniprogram/statistics` | ✅ 正常 | ✅ 已注册 | ✅ 返回401(需认证) |
| `GET /api/customers/miniprogram/list` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |
| `POST /api/customers/miniprogram/create` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |
| `GET /api/customers/miniprogram/:id` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |
| `PATCH /api/customers/miniprogram/:id` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |
| `PATCH /api/customers/miniprogram/:id/assign` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |
| `POST /api/customers/miniprogram/:id/follow-ups` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |
| `GET /api/customers/miniprogram/:id/follow-ups` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |
| `GET /api/customers/miniprogram/:id/assignment-logs` | ✅ 正常 | ✅ 已注册 | ✅ 可用 |

## 🚨 小程序端常见问题及解决方案

### 1. **认证问题** - 最常见

**问题现象**：
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": {"code": "HTTP_401", "statusCode": 401}
}
```

**解决方案**：
```javascript
// 小程序端必须在请求头中包含JWT Token
wx.request({
  url: 'https://your-domain.com/api/customers/miniprogram/statistics',
  method: 'GET',
  header: {
    'Authorization': 'Bearer ' + wx.getStorageSync('access_token'),
    'Content-Type': 'application/json'
  },
  success: (res) => {
    console.log('API调用成功:', res.data);
  },
  fail: (err) => {
    console.error('API调用失败:', err);
  }
});
```

### 2. **域名配置问题**

**问题现象**：
- 请求无法发送
- 网络错误
- 域名不在合法域名列表中

**解决方案**：
1. 在微信小程序后台配置服务器域名
2. 添加你的API域名到request合法域名列表
3. 确保使用HTTPS协议

```javascript
// 正确的域名配置示例
const API_BASE_URL = 'https://crm.andejiazheng.com/api';

// 错误示例（HTTP协议）
// const API_BASE_URL = 'http://crm.andejiazheng.com/api';
```

### 3. **跨域问题**

**问题现象**：
- CORS错误
- 预检请求失败

**解决方案**：
后端已经配置了CORS，但确保小程序端使用正确的请求方式：

```javascript
// 正确的请求方式
wx.request({
  url: API_BASE_URL + '/customers/miniprogram/list',
  method: 'GET',
  header: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});
```

### 4. **数据格式问题**

**问题现象**：
- 参数验证失败
- 400 Bad Request

**解决方案**：
确保请求数据格式正确：

```javascript
// 创建客户 - 正确格式
const customerData = {
  name: '张女士',
  phone: '13812345678',
  leadSource: '美团',
  contractStatus: '匹配中',
  serviceCategory: '月嫂',
  salaryBudget: 8000,
  expectedStartDate: '2024-01-15',
  homeArea: '朝阳区',
  address: '北京市朝阳区xxx小区',
  familySize: '3人',
  restSchedule: '单休'
};

wx.request({
  url: API_BASE_URL + '/customers/miniprogram/create',
  method: 'POST',
  header: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'miniprogram_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },
  data: customerData
});
```

## 📱 小程序端完整API封装示例

### API服务类封装

```javascript
// utils/api.js
class CustomerAPI {
  constructor() {
    this.baseURL = 'https://crm.andejiazheng.com/api/customers/miniprogram';
  }

  // 获取Token
  getToken() {
    return wx.getStorageSync('access_token');
  }

  // 通用请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      const token = this.getToken();
      
      if (!token) {
        wx.showToast({ title: '请先登录', icon: 'error' });
        wx.reLaunch({ url: '/pages/login/login' });
        return reject(new Error('未登录'));
      }

      wx.request({
        url: this.baseURL + options.url,
        method: options.method || 'GET',
        header: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          ...options.header
        },
        data: options.data,
        success: (res) => {
          if (res.statusCode === 200) {
            if (res.data.success) {
              resolve(res.data);
            } else {
              this.handleError(res.data);
              reject(new Error(res.data.message));
            }
          } else if (res.statusCode === 401) {
            wx.showToast({ title: '登录已过期', icon: 'error' });
            wx.reLaunch({ url: '/pages/login/login' });
            reject(new Error('未授权'));
          } else {
            reject(new Error('网络错误'));
          }
        },
        fail: (err) => {
          console.error('API请求失败:', err);
          wx.showToast({ title: '网络连接失败', icon: 'error' });
          reject(err);
        }
      });
    });
  }

  // 错误处理
  handleError(errorData) {
    const errorMessages = {
      'DUPLICATE_PHONE': '手机号已存在',
      'FORBIDDEN': '权限不足',
      'NOT_FOUND': '数据不存在'
    };
    
    const message = errorMessages[errorData.error] || errorData.message || '操作失败';
    wx.showToast({ title: message, icon: 'error' });
  }

  // 获取统计信息
  getStatistics() {
    return this.request({ url: '/statistics' });
  }

  // 获取客户列表
  getCustomerList(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request({ url: `/list?${query}` });
  }

  // 创建客户
  createCustomer(customerData) {
    return this.request({
      url: '/create',
      method: 'POST',
      header: {
        'Idempotency-Key': 'miniprogram_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      },
      data: customerData
    });
  }

  // 获取客户详情
  getCustomerDetail(customerId) {
    return this.request({ url: `/${customerId}` });
  }

  // 更新客户信息
  updateCustomer(customerId, updateData) {
    return this.request({
      url: `/${customerId}`,
      method: 'PATCH',
      data: updateData
    });
  }

  // 分配客户
  assignCustomer(customerId, assignData) {
    return this.request({
      url: `/${customerId}/assign`,
      method: 'PATCH',
      data: assignData
    });
  }

  // 创建跟进记录
  createFollowUp(customerId, followUpData) {
    return this.request({
      url: `/${customerId}/follow-ups`,
      method: 'POST',
      data: followUpData
    });
  }

  // 获取跟进记录
  getFollowUps(customerId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request({ url: `/${customerId}/follow-ups?${query}` });
  }

  // 获取分配历史
  getAssignmentLogs(customerId) {
    return this.request({ url: `/${customerId}/assignment-logs` });
  }
}

// 导出单例
export default new CustomerAPI();
```

### 页面使用示例

```javascript
// pages/customer-list/customer-list.js
import CustomerAPI from '../../utils/api.js';

Page({
  data: {
    customers: [],
    loading: false,
    hasMore: true,
    page: 1,
    limit: 20
  },

  onLoad() {
    this.loadCustomers();
    this.loadStatistics();
  },

  // 加载客户列表
  async loadCustomers() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const result = await CustomerAPI.getCustomerList({
        page: this.data.page,
        limit: this.data.limit
      });

      const newCustomers = this.data.page === 1 ? 
        result.data.customers : 
        [...this.data.customers, ...result.data.customers];

      this.setData({
        customers: newCustomers,
        hasMore: result.data.hasMore,
        page: this.data.page + 1,
        loading: false
      });
    } catch (error) {
      console.error('加载客户列表失败:', error);
      this.setData({ loading: false });
    }
  },

  // 加载统计信息
  async loadStatistics() {
    try {
      const result = await CustomerAPI.getStatistics();
      this.setData({ statistics: result.data });
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  },

  // 创建客户
  async createCustomer() {
    const customerData = {
      name: '新客户',
      phone: '13800138000',
      leadSource: '美团',
      contractStatus: '匹配中',
      serviceCategory: '月嫂'
    };

    try {
      const result = await CustomerAPI.createCustomer(customerData);
      wx.showToast({ title: '创建成功', icon: 'success' });
      this.loadCustomers(); // 重新加载列表
    } catch (error) {
      console.error('创建客户失败:', error);
    }
  }
});
```

## 🔍 调试技巧

### 1. 开启调试模式
```javascript
// 在开发阶段开启详细日志
const DEBUG = true;

if (DEBUG) {
  console.log('API请求:', options);
  console.log('API响应:', res);
}
```

### 2. 检查网络状态
```javascript
wx.getNetworkType({
  success: (res) => {
    console.log('网络类型:', res.networkType);
    if (res.networkType === 'none') {
      wx.showToast({ title: '网络不可用', icon: 'error' });
    }
  }
});
```

### 3. 使用微信开发者工具调试
- 打开Network面板查看请求详情
- 检查请求头是否正确
- 查看响应状态码和内容

## 📞 技术支持

如果小程序端仍然无法使用API，请提供以下信息：

1. **具体错误信息**：完整的错误响应
2. **请求详情**：URL、请求头、请求体
3. **环境信息**：开发/生产环境、微信版本
4. **复现步骤**：详细的操作步骤

**API服务器信息**：
- 开发环境：`http://localhost:3001/api/customers/miniprogram`
- 生产环境：`https://crm.andejiazheng.com/api/customers/miniprogram`
- 服务状态：✅ 正常运行
- 最后更新：2025-09-30 11:33:41

所有API接口都已经正常工作，问题通常出现在小程序端的配置或调用方式上。按照上述解决方案逐一排查，应该能够解决所有问题！🚀

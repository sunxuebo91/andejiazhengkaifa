# 小程序端AI接入客户管理API完整指南

## 🎯 接入目标

将刚创建的客户管理API系统完整集成到你的小程序中，实现：
- 客户列表管理
- 客户创建和编辑
- 权限控制和数据安全
- 完整的用户体验

## 📦 第一步：复制核心文件

### 1.1 复制服务文件

将以下文件复制到你的小程序项目中：

```bash
# 复制API服务文件
cp frontend/src/services/miniprogramCustomerService.ts 你的小程序项目/services/
cp frontend/src/utils/miniprogramUtils.ts 你的小程序项目/utils/
cp frontend/src/types/miniprogram.types.ts 你的小程序项目/types/
```

### 1.2 复制页面文件

```bash
# 复制页面文件
cp -r docs/小程序端客户管理示例/pages/customer/ 你的小程序项目/pages/
```

## ⚙️ 第二步：配置小程序

### 2.1 修改 app.json

在你的小程序 `app.json` 中添加新页面：

```json
{
  "pages": [
    "pages/index/index",
    "pages/customer/list",
    "pages/customer/create",
    "pages/customer/detail",
    "pages/customer/edit"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#1890ff",
    "navigationBarTitleText": "客户管理系统",
    "navigationBarTextStyle": "white",
    "enablePullDownRefresh": true
  },
  "permission": {
    "scope.userLocation": {
      "desc": "用于获取客户地理位置信息"
    }
  },
  "requiredBackgroundModes": ["location"],
  "networkTimeout": {
    "request": 10000,
    "downloadFile": 10000
  }
}
```

### 2.2 配置API基础地址

在 `services/miniprogramCustomerService.js` 中修改API地址：

```javascript
// 修改为你的实际API地址
const API_BASE_URL = 'https://your-domain.com'; // 替换为你的后端地址

// 如果是开发环境，可以使用本地地址
// const API_BASE_URL = 'http://localhost:3000';
```

## 🔐 第三步：配置认证

### 3.1 创建认证服务

创建 `services/authService.js`：

```javascript
// services/authService.js
class AuthService {
  constructor() {
    this.tokenKey = 'jwt_token';
    this.userInfoKey = 'user_info';
  }

  // 设置Token
  setToken(token) {
    wx.setStorageSync(this.tokenKey, token);
  }

  // 获取Token
  getToken() {
    return wx.getStorageSync(this.tokenKey) || '';
  }

  // 设置用户信息
  setUserInfo(userInfo) {
    wx.setStorageSync(this.userInfoKey, userInfo);
  }

  // 获取用户信息
  getUserInfo() {
    return wx.getStorageSync(this.userInfoKey) || {};
  }

  // 检查是否已登录
  isLoggedIn() {
    return !!this.getToken();
  }

  // 登出
  logout() {
    wx.removeStorageSync(this.tokenKey);
    wx.removeStorageSync(this.userInfoKey);
  }

  // 微信登录
  async wxLogin() {
    try {
      // 获取微信登录code
      const loginRes = await wx.login();
      
      // 调用后端登录接口
      const response = await wx.request({
        url: `${API_BASE_URL}/api/auth/miniprogram/login`,
        method: 'POST',
        data: {
          code: loginRes.code
        }
      });

      if (response.data.success) {
        this.setToken(response.data.data.token);
        this.setUserInfo(response.data.data.user);
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
```

### 3.2 修改API服务添加认证

修改 `services/miniprogramCustomerService.js`，添加认证头：

```javascript
const authService = require('./authService');

// 在每个API调用前添加认证头
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = authService.getToken();
  
  if (!token) {
    throw new Error('用户未登录');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  return wx.request({
    url: `${API_BASE_URL}${url}`,
    ...options,
    header: headers
  });
};

// 更新所有API方法使用认证请求
const miniprogramCustomerService = {
  async getCustomers(query = {}) {
    try {
      const response = await makeAuthenticatedRequest('/api/customers/miniprogram/list', {
        method: 'GET',
        data: query
      });
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || '获取客户列表失败');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('获取客户列表失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },
  
  // ... 其他方法类似更新
};
```

## 📱 第四步：集成页面

### 4.1 修改首页添加入口

在你的首页 `pages/index/index.wxml` 中添加客户管理入口：

```xml
<!-- 客户管理入口 -->
<view class="function-card" bindtap="goToCustomerList">
  <view class="card-icon">
    <icon type="contact" size="32" color="#1890ff"></icon>
  </view>
  <view class="card-content">
    <text class="card-title">客户管理</text>
    <text class="card-desc">查看和管理客户信息</text>
  </view>
  <view class="card-arrow">
    <icon type="arrow_right" size="16" color="#ccc"></icon>
  </view>
</view>
```

在 `pages/index/index.js` 中添加跳转方法：

```javascript
Page({
  // ... 其他代码

  // 跳转到客户列表
  goToCustomerList() {
    const authService = require('../../services/authService');
    
    if (!authService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            this.doLogin();
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/customer/list'
    });
  },

  // 执行登录
  async doLogin() {
    try {
      wx.showLoading({ title: '登录中...' });
      
      const authService = require('../../services/authService');
      await authService.wxLogin();
      
      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '登录失败',
        content: error.message,
        showCancel: false
      });
    }
  }
});
```

### 4.2 添加全局样式

在 `app.wxss` 中添加全局样式：

```css
/* 全局样式 */
.function-card {
  display: flex;
  align-items: center;
  padding: 30rpx;
  margin: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.card-icon {
  margin-right: 20rpx;
}

.card-content {
  flex: 1;
}

.card-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.card-desc {
  font-size: 26rpx;
  color: #666;
}

.card-arrow {
  margin-left: 20rpx;
}

/* 通用按钮样式 */
.btn-primary {
  background-color: #1890ff;
  color: #fff;
  border-radius: 8rpx;
  border: none;
}

.btn-secondary {
  background-color: #f8f8f8;
  color: #666;
  border-radius: 8rpx;
  border: none;
}

/* 加载状态 */
.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid #f0f0f0;
  border-top: 3rpx solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## 🔧 第五步：权限配置

### 5.1 创建权限检查工具

创建 `utils/permissionUtils.js`：

```javascript
// utils/permissionUtils.js
const authService = require('../services/authService');

class PermissionUtils {
  // 获取当前用户信息
  getCurrentUser() {
    return authService.getUserInfo();
  }

  // 检查是否有权限
  hasPermission(permission) {
    const user = this.getCurrentUser();
    const role = user.role;

    const permissions = {
      '系统管理员': ['view_all', 'create', 'edit_all', 'assign', 'delete', 'view_stats', 'view_logs'],
      '经理': ['view_team', 'create', 'edit_team', 'assign', 'view_stats'],
      '普通员工': ['view_own', 'create', 'edit_own']
    };

    return permissions[role]?.includes(permission) || false;
  }

  // 检查是否可以查看客户
  canViewCustomer(customer) {
    const user = this.getCurrentUser();
    
    if (user.role === '系统管理员') return true;
    if (user.role === '经理') return true;
    if (user.role === '普通员工') {
      return customer.assignedTo === user.userId;
    }
    
    return false;
  }

  // 检查是否可以编辑客户
  canEditCustomer(customer) {
    const user = this.getCurrentUser();
    
    if (user.role === '系统管理员') return true;
    if (user.role === '经理') return true;
    if (user.role === '普通员工') {
      return customer.assignedTo === user.userId;
    }
    
    return false;
  }

  // 检查是否可以分配客户
  canAssignCustomer() {
    return this.hasPermission('assign');
  }

  // 显示权限错误提示
  showPermissionError() {
    wx.showToast({
      title: '权限不足',
      icon: 'error'
    });
  }
}

module.exports = new PermissionUtils();
```

### 5.2 在页面中使用权限检查

修改 `pages/customer/list.js`，添加权限检查：

```javascript
const permissionUtils = require('../../utils/permissionUtils');

Page({
  data: {
    // ... 其他数据
    userPermissions: {
      canCreate: false,
      canEdit: false,
      canAssign: false,
      canViewAll: false
    }
  },

  onLoad() {
    this.checkPermissions();
    this.loadCustomers();
  },

  // 检查用户权限
  checkPermissions() {
    const permissions = {
      canCreate: permissionUtils.hasPermission('create'),
      canEdit: permissionUtils.hasPermission('edit_team') || permissionUtils.hasPermission('edit_all'),
      canAssign: permissionUtils.canAssignCustomer(),
      canViewAll: permissionUtils.hasPermission('view_all') || permissionUtils.hasPermission('view_team')
    };

    this.setData({ userPermissions: permissions });
  },

  // 编辑客户（添加权限检查）
  onEditCustomer(e) {
    const { customer } = e.currentTarget.dataset;
    
    if (!permissionUtils.canEditCustomer(customer)) {
      permissionUtils.showPermissionError();
      return;
    }
    
    wx.navigateTo({
      url: `/pages/customer/edit?id=${customer._id}`
    });
  }
});
```

## 🧪 第六步：测试集成

### 6.1 创建测试页面

创建 `pages/test/test.js` 用于测试API：

```javascript
const miniprogramCustomerService = require('../../services/miniprogramCustomerService');

Page({
  data: {
    testResults: []
  },

  onLoad() {
    this.runTests();
  },

  async runTests() {
    const tests = [
      { name: '获取客户列表', test: this.testGetCustomers },
      { name: '创建客户', test: this.testCreateCustomer },
      { name: '获取统计信息', test: this.testGetStatistics }
    ];

    const results = [];

    for (const test of tests) {
      try {
        await test.test.call(this);
        results.push({ name: test.name, status: '成功', error: null });
      } catch (error) {
        results.push({ name: test.name, status: '失败', error: error.message });
      }
    }

    this.setData({ testResults: results });
  },

  async testGetCustomers() {
    const result = await miniprogramCustomerService.getCustomers({ page: 1, limit: 5 });
    console.log('客户列表测试结果:', result);
  },

  async testCreateCustomer() {
    const customerData = {
      name: '测试客户',
      phone: '13800138000',
      leadSource: '测试',
      contractStatus: '匹配中'
    };
    
    const result = await miniprogramCustomerService.createCustomer(customerData);
    console.log('创建客户测试结果:', result);
  },

  async testGetStatistics() {
    const result = await miniprogramCustomerService.getStatistics();
    console.log('统计信息测试结果:', result);
  }
});
```

## 📋 第七步：部署检查清单

### 7.1 部署前检查

- [ ] 后端API服务已部署并可访问
- [ ] 小程序已配置正确的API地址
- [ ] JWT认证已正确配置
- [ ] 权限控制已正确实现
- [ ] 所有页面路由已添加到app.json
- [ ] 测试页面功能正常

### 7.2 功能测试清单

- [ ] 用户登录功能正常
- [ ] 客户列表加载正常
- [ ] 搜索和筛选功能正常
- [ ] 客户创建功能正常
- [ ] 权限控制生效
- [ ] 数据脱敏正常
- [ ] 错误处理正常

## 🚀 第八步：上线发布

### 8.1 小程序发布流程

1. **代码审查**：确保所有代码符合规范
2. **功能测试**：完整测试所有功能
3. **性能测试**：确保页面加载速度正常
4. **提交审核**：通过微信开发者工具提交审核
5. **发布上线**：审核通过后发布

### 8.2 监控和维护

```javascript
// 添加错误监控
wx.onError((error) => {
  console.error('小程序错误:', error);
  // 可以发送到后端进行错误统计
});

// 添加性能监控
wx.onAppShow(() => {
  console.log('小程序启动时间:', Date.now());
});
```

## 📞 技术支持

如果在集成过程中遇到问题：

1. **检查控制台错误**：查看开发者工具控制台的错误信息
2. **验证API连接**：确保后端API服务正常运行
3. **检查权限配置**：确认用户角色和权限设置正确
4. **查看网络请求**：检查API请求和响应是否正常

## 🎉 完成

按照以上步骤完成后，你的小程序就成功集成了完整的客户管理系统！用户可以：

- 安全登录并获得相应权限
- 查看和管理客户信息
- 创建和编辑客户
- 享受完整的用户体验

记住定期更新和维护系统，确保功能正常运行。

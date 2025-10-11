/**
 * 小程序实际使用示例
 * 展示如何在真实项目中集成和使用客户管理API
 */

// ==================== 1. 服务层集成示例 ====================

// services/customerApi.js - 实际项目中的API服务
const API_BASE = 'https://your-domain.com/api';

class CustomerApiService {
  constructor() {
    this.baseURL = API_BASE;
  }

  // 获取认证头
  getAuthHeaders() {
    const token = wx.getStorageSync('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // 统一请求方法
  async request(url, options = {}) {
    const { method = 'GET', data, headers = {} } = options;
    
    try {
      const response = await wx.request({
        url: `${this.baseURL}${url}`,
        method,
        data,
        header: {
          ...this.getAuthHeaders(),
          ...headers
        }
      });

      if (response.statusCode === 401) {
        // Token过期，重新登录
        await this.refreshToken();
        throw new Error('请重新登录');
      }

      if (!response.data.success) {
        throw new Error(response.data.message || '请求失败');
      }

      return response.data.data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // 获取客户列表
  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/customers/miniprogram/list?${query}`);
  }

  // 创建客户
  async createCustomer(customerData, options = {}) {
    const headers = {};
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    return this.request('/customers/miniprogram/create', {
      method: 'POST',
      data: customerData,
      headers
    });
  }

  // 更新客户
  async updateCustomer(id, updateData) {
    return this.request(`/customers/miniprogram/${id}`, {
      method: 'PATCH',
      data: updateData
    });
  }

  // 获取客户详情
  async getCustomerDetail(id) {
    return this.request(`/customers/miniprogram/${id}`);
  }

  // 分配客户
  async assignCustomer(id, assignData) {
    return this.request(`/customers/miniprogram/${id}/assign`, {
      method: 'PATCH',
      data: assignData
    });
  }

  // 创建跟进记录
  async createFollowUp(customerId, followUpData) {
    return this.request(`/customers/miniprogram/${customerId}/follow-ups`, {
      method: 'POST',
      data: followUpData
    });
  }

  // 获取统计信息
  async getStatistics() {
    return this.request('/customers/miniprogram/statistics');
  }

  // 刷新Token
  async refreshToken() {
    // 实现Token刷新逻辑
    const refreshToken = wx.getStorageSync('refresh_token');
    // ... 刷新逻辑
  }
}

// 导出单例
module.exports = new CustomerApiService();

// ==================== 2. 页面使用示例 ====================

// pages/customer/list.js - 客户列表页面实际使用
const customerApi = require('../../services/customerApi');
const { formatDate, debounce } = require('../../utils/helpers');

Page({
  data: {
    customers: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    searchKeyword: '',
    filters: {
      status: '',
      source: '',
      level: ''
    },
    pagination: {
      page: 1,
      limit: 20,
      total: 0
    }
  },

  onLoad() {
    this.loadCustomers();
  },

  onPullDownRefresh() {
    this.refreshCustomers();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreCustomers();
    }
  },

  // 加载客户列表
  async loadCustomers(reset = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const params = {
        page: reset ? 1 : this.data.pagination.page,
        limit: this.data.pagination.limit,
        search: this.data.searchKeyword,
        ...this.data.filters
      };

      const result = await customerApi.getCustomers(params);

      const customers = reset ? result.customers : [...this.data.customers, ...result.customers];

      this.setData({
        customers,
        hasMore: result.hasMore,
        'pagination.total': result.total,
        'pagination.page': reset ? 1 : this.data.pagination.page,
        loading: false
      });

    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'error'
      });
    }
  },

  // 刷新列表
  async refreshCustomers() {
    this.setData({ refreshing: true });
    await this.loadCustomers(true);
    this.setData({ refreshing: false });
    wx.stopPullDownRefresh();
  },

  // 加载更多
  async loadMoreCustomers() {
    this.setData({
      'pagination.page': this.data.pagination.page + 1
    });
    await this.loadCustomers();
  },

  // 搜索处理（防抖）
  onSearchInput: debounce(function(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.loadCustomers(true);
  }, 500),

  // 筛选处理
  onFilterChange(e) {
    const { type, value } = e.currentTarget.dataset;
    this.setData({
      [`filters.${type}`]: value
    });
    this.loadCustomers(true);
  },

  // 跳转到客户详情
  onCustomerTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/customer/detail?id=${id}`
    });
  },

  // 创建客户
  onCreateCustomer() {
    wx.navigateTo({
      url: '/pages/customer/create'
    });
  }
});

// ==================== 3. 客户创建页面示例 ====================

// pages/customer/create.js
const customerApi = require('../../services/customerApi');
const { validateForm, generateId } = require('../../utils/helpers');

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      leadSource: '',
      contractStatus: '匹配中'
    },
    submitting: false,
    errors: {}
  },

  // 表单输入处理
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: '' // 清除错误
    });
  },

  // 提交表单
  async onSubmit() {
    if (this.data.submitting) return;

    // 表单验证
    const errors = validateForm(this.data.formData);
    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      wx.showToast({
        title: '请检查表单信息',
        icon: 'error'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 生成幂等性键
      const idempotencyKey = `create_${Date.now()}_${generateId()}`;

      const result = await customerApi.createCustomer(this.data.formData, {
        idempotencyKey
      });

      wx.showToast({
        title: '创建成功',
        icon: 'success'
      });

      // 返回列表页并刷新
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      this.setData({ submitting: false });
      
      if (error.message.includes('手机号已存在')) {
        this.setData({
          'errors.phone': '该手机号已存在'
        });
      }

      wx.showModal({
        title: '创建失败',
        content: error.message,
        showCancel: false
      });
    }
  }
});

// ==================== 4. 权限管理示例 ====================

// utils/permission.js - 权限管理工具
class PermissionManager {
  constructor() {
    this.userInfo = wx.getStorageSync('userInfo') || {};
  }

  // 检查权限
  hasPermission(action, resource = null) {
    const { role } = this.userInfo;
    
    const permissions = {
      '系统管理员': {
        'customer:view': () => true,
        'customer:create': () => true,
        'customer:edit': () => true,
        'customer:assign': () => true,
        'customer:delete': () => true
      },
      '经理': {
        'customer:view': () => true,
        'customer:create': () => true,
        'customer:edit': () => true,
        'customer:assign': () => true,
        'customer:delete': () => false
      },
      '普通员工': {
        'customer:view': (customer) => customer?.assignedTo === this.userInfo.userId,
        'customer:create': () => true,
        'customer:edit': (customer) => customer?.assignedTo === this.userInfo.userId,
        'customer:assign': () => false,
        'customer:delete': () => false
      }
    };

    const rolePermissions = permissions[role];
    if (!rolePermissions) return false;

    const permissionCheck = rolePermissions[action];
    if (!permissionCheck) return false;

    return typeof permissionCheck === 'function' 
      ? permissionCheck(resource) 
      : permissionCheck;
  }

  // 权限装饰器
  requirePermission(action, resource = null) {
    if (!this.hasPermission(action, resource)) {
      wx.showModal({
        title: '权限不足',
        content: '您没有权限执行此操作',
        showCancel: false
      });
      return false;
    }
    return true;
  }
}

module.exports = new PermissionManager();

// ==================== 5. 错误处理示例 ====================

// utils/errorHandler.js - 统一错误处理
class ErrorHandler {
  static handle(error, context = '') {
    console.error(`${context} 错误:`, error);

    let message = '操作失败，请重试';
    
    if (error.message) {
      if (error.message.includes('网络')) {
        message = '网络连接失败，请检查网络';
      } else if (error.message.includes('权限')) {
        message = '权限不足';
      } else if (error.message.includes('登录')) {
        message = '登录已过期，请重新登录';
        this.handleLoginExpired();
        return;
      } else {
        message = error.message;
      }
    }

    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    });
  }

  static handleLoginExpired() {
    wx.clearStorageSync();
    wx.reLaunch({
      url: '/pages/login/login'
    });
  }

  static showNetworkError() {
    wx.showModal({
      title: '网络错误',
      content: '网络连接失败，请检查网络设置后重试',
      confirmText: '重试',
      success: (res) => {
        if (res.confirm) {
          // 重试逻辑
        }
      }
    });
  }
}

module.exports = ErrorHandler;

// ==================== 6. 使用示例总结 ====================

/**
 * 在实际项目中的使用流程：
 * 
 * 1. 复制API服务文件到你的项目
 * 2. 修改API基础地址为你的后端地址
 * 3. 集成认证系统
 * 4. 添加权限控制
 * 5. 实现错误处理
 * 6. 测试所有功能
 * 7. 部署上线
 * 
 * 关键注意事项：
 * - 确保后端API正常运行
 * - 正确配置JWT认证
 * - 实现完整的权限控制
 * - 添加适当的错误处理
 * - 进行充分的测试
 */

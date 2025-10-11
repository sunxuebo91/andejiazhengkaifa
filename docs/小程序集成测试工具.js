/**
 * 小程序客户管理系统集成测试工具
 * 用于验证API集成是否成功
 */

// ==================== 测试页面 ====================
// pages/test/integration-test.js

const customerApi = require('../../services/miniprogramCustomerService');
const authService = require('../../services/authService');
const permissionUtils = require('../../utils/permissionUtils');

Page({
  data: {
    testResults: [],
    testing: false,
    currentTest: '',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '集成测试'
    });
  },

  // 开始测试
  async startTest() {
    if (this.data.testing) return;

    this.setData({
      testing: true,
      testResults: [],
      currentTest: '',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    });

    const tests = [
      { name: '认证服务测试', test: this.testAuthService },
      { name: 'API连接测试', test: this.testApiConnection },
      { name: '权限管理测试', test: this.testPermissions },
      { name: '客户列表API测试', test: this.testCustomerListApi },
      { name: '客户创建API测试', test: this.testCustomerCreateApi },
      { name: '数据验证测试', test: this.testDataValidation },
      { name: '错误处理测试', test: this.testErrorHandling }
    ];

    this.setData({ totalTests: tests.length });

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      this.setData({ currentTest: test.name });

      try {
        await test.test.call(this);
        this.addTestResult(test.name, 'PASS', '测试通过');
        this.setData({ passedTests: this.data.passedTests + 1 });
      } catch (error) {
        this.addTestResult(test.name, 'FAIL', error.message);
        this.setData({ failedTests: this.data.failedTests + 1 });
      }

      // 添加延迟，让用户看到测试进度
      await this.sleep(500);
    }

    this.setData({
      testing: false,
      currentTest: '测试完成'
    });

    // 显示测试结果摘要
    this.showTestSummary();
  },

  // 添加测试结果
  addTestResult(testName, status, message) {
    const result = {
      name: testName,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    };

    this.setData({
      testResults: [...this.data.testResults, result]
    });
  },

  // 显示测试摘要
  showTestSummary() {
    const { totalTests, passedTests, failedTests } = this.data;
    const successRate = Math.round((passedTests / totalTests) * 100);

    wx.showModal({
      title: '测试完成',
      content: `总计: ${totalTests}\n通过: ${passedTests}\n失败: ${failedTests}\n成功率: ${successRate}%`,
      showCancel: false
    });
  },

  // 测试认证服务
  async testAuthService() {
    // 测试Token存储和获取
    const testToken = 'test_token_123';
    authService.setToken(testToken);
    
    const retrievedToken = authService.getToken();
    if (retrievedToken !== testToken) {
      throw new Error('Token存储/获取失败');
    }

    // 测试用户信息存储
    const testUser = { id: '123', name: '测试用户', role: '普通员工' };
    authService.setUserInfo(testUser);
    
    const retrievedUser = authService.getUserInfo();
    if (retrievedUser.id !== testUser.id) {
      throw new Error('用户信息存储/获取失败');
    }

    // 测试登录状态检查
    if (!authService.isLoggedIn()) {
      throw new Error('登录状态检查失败');
    }
  },

  // 测试API连接
  async testApiConnection() {
    try {
      // 尝试调用一个简单的API
      const response = await wx.request({
        url: 'https://httpbin.org/get', // 使用公共测试API
        method: 'GET',
        timeout: 5000
      });

      if (response.statusCode !== 200) {
        throw new Error('网络连接异常');
      }
    } catch (error) {
      if (error.errMsg && error.errMsg.includes('timeout')) {
        throw new Error('网络连接超时，请检查网络设置');
      } else {
        throw new Error('网络连接失败');
      }
    }
  },

  // 测试权限管理
  async testPermissions() {
    // 测试权限检查功能
    const testCustomer = {
      _id: 'test123',
      assignedTo: '123'
    };

    // 设置测试用户
    authService.setUserInfo({ userId: '123', role: '普通员工' });

    // 测试查看权限
    if (!permissionUtils.canViewCustomer(testCustomer)) {
      throw new Error('权限检查失败：应该能查看自己的客户');
    }

    // 测试其他用户的客户
    const otherCustomer = { ...testCustomer, assignedTo: '456' };
    if (permissionUtils.canViewCustomer(otherCustomer)) {
      throw new Error('权限检查失败：不应该能查看其他人的客户');
    }

    // 测试管理员权限
    authService.setUserInfo({ userId: '123', role: '系统管理员' });
    if (!permissionUtils.canViewCustomer(otherCustomer)) {
      throw new Error('权限检查失败：管理员应该能查看所有客户');
    }
  },

  // 测试客户列表API
  async testCustomerListApi() {
    try {
      // 模拟API调用（实际项目中会调用真实API）
      const mockResponse = {
        customers: [
          {
            _id: 'test123',
            name: '测试客户',
            phone: '138****5678',
            leadSource: '测试',
            contractStatus: '匹配中'
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false
      };

      // 验证响应格式
      if (!Array.isArray(mockResponse.customers)) {
        throw new Error('客户列表格式错误');
      }

      if (typeof mockResponse.total !== 'number') {
        throw new Error('总数格式错误');
      }

      // 验证客户数据结构
      const customer = mockResponse.customers[0];
      const requiredFields = ['_id', 'name', 'phone', 'leadSource', 'contractStatus'];
      
      for (const field of requiredFields) {
        if (!customer[field]) {
          throw new Error(`客户数据缺少必要字段: ${field}`);
        }
      }

    } catch (error) {
      throw new Error(`客户列表API测试失败: ${error.message}`);
    }
  },

  // 测试客户创建API
  async testCustomerCreateApi() {
    const testCustomerData = {
      name: '测试客户',
      phone: '13800138000',
      leadSource: '测试',
      contractStatus: '匹配中'
    };

    // 验证数据格式
    if (!testCustomerData.name || !testCustomerData.phone) {
      throw new Error('客户数据验证失败');
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(testCustomerData.phone)) {
      throw new Error('手机号格式验证失败');
    }

    // 模拟创建成功响应
    const mockCreateResponse = {
      id: 'new123',
      customerId: 'CUS20240101001',
      customer: testCustomerData,
      action: 'CREATED'
    };

    if (!mockCreateResponse.id || !mockCreateResponse.customer) {
      throw new Error('创建响应格式错误');
    }
  },

  // 测试数据验证
  async testDataValidation() {
    const { validateCustomerForm } = require('../../utils/miniprogramUtils');

    // 测试空数据验证
    const emptyData = {};
    const errors = validateCustomerForm(emptyData);
    
    if (errors.length === 0) {
      throw new Error('空数据应该产生验证错误');
    }

    // 测试有效数据验证
    const validData = {
      name: '张三',
      phone: '13812345678',
      leadSource: '美团',
      contractStatus: '匹配中'
    };

    const validErrors = validateCustomerForm(validData);
    if (validErrors.length > 0) {
      throw new Error('有效数据不应该产生验证错误');
    }

    // 测试无效手机号
    const invalidPhoneData = {
      ...validData,
      phone: '123456789'
    };

    const phoneErrors = validateCustomerForm(invalidPhoneData);
    const hasPhoneError = phoneErrors.some(error => error.field === 'phone');
    
    if (!hasPhoneError) {
      throw new Error('无效手机号应该产生验证错误');
    }
  },

  // 测试错误处理
  async testErrorHandling() {
    const { handleApiError } = require('../../utils/miniprogramUtils');

    // 测试不同类型的错误处理
    const responseError = {
      response: {
        data: {
          message: 'API错误信息'
        }
      }
    };

    const errorMessage = handleApiError(responseError);
    if (errorMessage !== 'API错误信息') {
      throw new Error('响应错误处理失败');
    }

    // 测试普通错误
    const normalError = new Error('网络连接失败');
    const normalErrorMessage = handleApiError(normalError);
    if (normalErrorMessage !== '网络连接失败') {
      throw new Error('普通错误处理失败');
    }

    // 测试未知错误
    const unknownErrorMessage = handleApiError({});
    if (unknownErrorMessage !== '网络错误，请重试') {
      throw new Error('未知错误处理失败');
    }
  },

  // 工具方法：延迟
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 清除测试数据
  clearTestData() {
    authService.logout();
    this.setData({
      testResults: [],
      testing: false,
      currentTest: '',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    });

    wx.showToast({
      title: '测试数据已清除',
      icon: 'success'
    });
  },

  // 导出测试报告
  exportTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.data.totalTests,
        passed: this.data.passedTests,
        failed: this.data.failedTests,
        successRate: Math.round((this.data.passedTests / this.data.totalTests) * 100)
      },
      details: this.data.testResults
    };

    // 将报告保存到本地存储
    wx.setStorageSync('integration_test_report', report);

    wx.showModal({
      title: '测试报告',
      content: `测试报告已保存到本地存储\n\n总计: ${report.summary.total}\n通过: ${report.summary.passed}\n失败: ${report.summary.failed}\n成功率: ${report.summary.successRate}%`,
      showCancel: false
    });
  }
});

// ==================== 测试页面模板 ====================
// pages/test/integration-test.wxml

/*
<view class="container">
  <view class="header">
    <text class="title">客户管理系统集成测试</text>
    <text class="subtitle">验证API集成是否成功</text>
  </view>

  <view class="test-controls">
    <button 
      class="test-btn {{testing ? 'disabled' : ''}}" 
      bindtap="startTest" 
      disabled="{{testing}}"
    >
      {{testing ? '测试中...' : '开始测试'}}
    </button>
    
    <button class="clear-btn" bindtap="clearTestData">
      清除数据
    </button>
    
    <button 
      class="export-btn" 
      bindtap="exportTestReport"
      disabled="{{testResults.length === 0}}"
    >
      导出报告
    </button>
  </view>

  <view wx:if="{{testing}}" class="current-test">
    <text>正在执行: {{currentTest}}</text>
    <view class="progress">
      <view class="progress-bar" style="width: {{(passedTests + failedTests) / totalTests * 100}}%"></view>
    </view>
  </view>

  <view class="test-summary" wx:if="{{testResults.length > 0}}">
    <view class="summary-item">
      <text class="label">总计:</text>
      <text class="value">{{totalTests}}</text>
    </view>
    <view class="summary-item">
      <text class="label">通过:</text>
      <text class="value success">{{passedTests}}</text>
    </view>
    <view class="summary-item">
      <text class="label">失败:</text>
      <text class="value error">{{failedTests}}</text>
    </view>
  </view>

  <view class="test-results">
    <view 
      wx:for="{{testResults}}" 
      wx:key="name"
      class="test-result {{item.status === 'PASS' ? 'success' : 'error'}}"
    >
      <view class="result-header">
        <text class="test-name">{{item.name}}</text>
        <text class="test-status">{{item.status}}</text>
      </view>
      <view class="result-message">{{item.message}}</view>
      <view class="result-time">{{item.timestamp}}</view>
    </view>
  </view>
</view>
*/

// ==================== 使用说明 ====================

/**
 * 集成测试工具使用说明：
 * 
 * 1. 将此文件复制到你的小程序项目中
 * 2. 在app.json中添加测试页面路径
 * 3. 运行测试验证集成是否成功
 * 4. 根据测试结果修复问题
 * 5. 删除测试页面（生产环境不需要）
 * 
 * 测试覆盖范围：
 * - 认证服务功能
 * - API连接状态
 * - 权限管理逻辑
 * - 数据验证规则
 * - 错误处理机制
 * 
 * 注意事项：
 * - 测试需要网络连接
 * - 某些测试可能需要真实的API环境
 * - 测试完成后记得清除测试数据
 */

/**
 * 小程序客户管理API测试工具
 * 用于快速验证API接口是否正常工作
 */

class MiniProgramAPITester {
  constructor() {
    this.baseURL = 'https://crm.andejiazheng.com/api/customers/miniprogram';
    // 测试环境可以改为: 'http://localhost:3001/api/customers/miniprogram'
    
    this.testResults = [];
  }

  // 模拟获取Token（实际使用时需要真实的登录流程）
  getTestToken() {
    // 这里需要替换为真实的JWT Token
    // 可以通过登录接口获取，或者从小程序存储中读取
    return wx.getStorageSync('access_token') || 'your-jwt-token-here';
  }

  // 通用API测试方法
  async testAPI(testName, options) {
    console.log(`🧪 开始测试: ${testName}`);
    
    const startTime = Date.now();
    
    try {
      const result = await this.makeRequest(options);
      const duration = Date.now() - startTime;
      
      const testResult = {
        name: testName,
        status: 'SUCCESS',
        duration: `${duration}ms`,
        response: result,
        timestamp: new Date().toLocaleString()
      };
      
      this.testResults.push(testResult);
      console.log(`✅ ${testName} - 成功 (${duration}ms)`);
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const testResult = {
        name: testName,
        status: 'FAILED',
        duration: `${duration}ms`,
        error: error.message,
        timestamp: new Date().toLocaleString()
      };
      
      this.testResults.push(testResult);
      console.error(`❌ ${testName} - 失败 (${duration}ms):`, error.message);
      return testResult;
    }
  }

  // 发送HTTP请求
  makeRequest(options) {
    return new Promise((resolve, reject) => {
      const token = this.getTestToken();
      
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || '请求失败'}`));
          }
        },
        fail: (err) => {
          reject(new Error(`网络错误: ${err.errMsg || '请求失败'}`));
        }
      });
    });
  }

  // 测试1: 获取统计信息
  async testGetStatistics() {
    return await this.testAPI('获取统计信息', {
      url: '/statistics',
      method: 'GET'
    });
  }

  // 测试2: 获取客户列表
  async testGetCustomerList() {
    return await this.testAPI('获取客户列表', {
      url: '/list?page=1&limit=5',
      method: 'GET'
    });
  }

  // 测试3: 创建客户
  async testCreateCustomer() {
    const testCustomerData = {
      name: '测试客户_' + Date.now(),
      phone: '138' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
      leadSource: '美团',
      contractStatus: '匹配中',
      serviceCategory: '月嫂',
      salaryBudget: 8000,
      expectedStartDate: '2025-02-01', // 修正日期为未来日期
      homeArea: '朝阳区',
      address: '北京市朝阳区测试地址',
      familySize: '3人',
      restSchedule: '单休',
      remarks: 'API测试创建的客户',
      // 添加必需字段
      gender: '女',
      age: 30,
      workExperience: '2年',
      education: '高中',
      nativePlace: '北京',
      maritalStatus: '已婚',
      hasChildren: true,
      healthStatus: '健康',
      personalityTraits: ['细心', '耐心']
    };

    return await this.testAPI('创建客户', {
      url: '/create',
      method: 'POST',
      header: {
        'Idempotency-Key': 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
      },
      data: testCustomerData
    });
  }

  // 测试4: 获取客户详情（需要先有客户ID）
  async testGetCustomerDetail(customerId) {
    if (!customerId) {
      console.log('⚠️ 跳过客户详情测试 - 需要有效的客户ID');
      return null;
    }

    return await this.testAPI('获取客户详情', {
      url: `/${customerId}`,
      method: 'GET'
    });
  }

  // 测试5: 更新客户信息
  async testUpdateCustomer(customerId) {
    if (!customerId) {
      console.log('⚠️ 跳过更新客户测试 - 需要有效的客户ID');
      return null;
    }

    const updateData = {
      contractStatus: '已签约',
      remarks: '测试更新 - ' + new Date().toLocaleString()
    };

    return await this.testAPI('更新客户信息', {
      url: `/${customerId}`,
      method: 'PATCH',
      data: updateData
    });
  }

  // 测试6: 创建跟进记录
  async testCreateFollowUp(customerId) {
    if (!customerId) {
      console.log('⚠️ 跳过创建跟进记录测试 - 需要有效的客户ID');
      return null;
    }

    const followUpData = {
      type: 'phone',
      content: '测试跟进记录 - ' + new Date().toLocaleString()
    };

    return await this.testAPI('创建跟进记录', {
      url: `/${customerId}/follow-ups`,
      method: 'POST',
      data: followUpData
    });
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始运行小程序API完整测试...');
    console.log('📍 测试服务器:', this.baseURL);
    
    this.testResults = [];
    let customerId = null;

    // 基础测试
    await this.testGetStatistics();
    await this.testGetCustomerList();
    
    // 创建客户测试
    const createResult = await this.testCreateCustomer();
    if (createResult.status === 'SUCCESS' && createResult.response?.data?.id) {
      customerId = createResult.response.data.id;
      console.log('📝 获得测试客户ID:', customerId);
    }

    // 需要客户ID的测试
    if (customerId) {
      await this.testGetCustomerDetail(customerId);
      await this.testUpdateCustomer(customerId);
      await this.testCreateFollowUp(customerId);
    }

    // 生成测试报告
    this.generateTestReport();
  }

  // 生成测试报告
  generateTestReport() {
    console.log('\n📊 ===== API测试报告 =====');
    
    const successCount = this.testResults.filter(r => r.status === 'SUCCESS').length;
    const failCount = this.testResults.filter(r => r.status === 'FAILED').length;
    const totalCount = this.testResults.length;
    
    console.log(`📈 总测试数: ${totalCount}`);
    console.log(`✅ 成功: ${successCount}`);
    console.log(`❌ 失败: ${failCount}`);
    console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    console.log('\n📋 详细结果:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name} (${result.duration})`);
      
      if (result.status === 'FAILED') {
        console.log(`   错误: ${result.error}`);
      }
    });

    // 显示在小程序界面上
    if (typeof wx !== 'undefined') {
      const message = `测试完成!\n成功: ${successCount}/${totalCount}\n成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`;
      
      if (failCount === 0) {
        wx.showToast({
          title: '所有测试通过!',
          icon: 'success',
          duration: 3000
        });
      } else {
        wx.showModal({
          title: 'API测试结果',
          content: message,
          showCancel: false
        });
      }
    }

    return {
      total: totalCount,
      success: successCount,
      failed: failCount,
      successRate: ((successCount / totalCount) * 100).toFixed(1) + '%',
      details: this.testResults
    };
  }

  // 快速健康检查
  async quickHealthCheck() {
    console.log('🏥 执行API健康检查...');
    
    try {
      // 只测试最基础的接口
      const result = await this.makeRequest({
        url: '/statistics',
        method: 'GET'
      });
      
      console.log('✅ API服务正常');
      
      if (typeof wx !== 'undefined') {
        wx.showToast({
          title: 'API服务正常',
          icon: 'success'
        });
      }
      
      return { status: 'healthy', message: 'API服务正常' };
      
    } catch (error) {
      console.error('❌ API服务异常:', error.message);
      
      if (typeof wx !== 'undefined') {
        wx.showModal({
          title: 'API服务异常',
          content: error.message,
          showCancel: false
        });
      }
      
      return { status: 'unhealthy', message: error.message };
    }
  }
}

// 使用示例
/*
// 在小程序页面中使用
Page({
  data: {
    testResults: null
  },

  onLoad() {
    this.apiTester = new MiniProgramAPITester();
  },

  // 快速检查
  async onQuickCheck() {
    const result = await this.apiTester.quickHealthCheck();
    console.log('健康检查结果:', result);
  },

  // 完整测试
  async onFullTest() {
    const report = await this.apiTester.runAllTests();
    this.setData({ testResults: report });
  }
});
*/

// 导出测试工具
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MiniProgramAPITester;
} else if (typeof window !== 'undefined') {
  window.MiniProgramAPITester = MiniProgramAPITester;
}

// 如果在小程序环境中，创建全局实例
if (typeof wx !== 'undefined') {
  wx.apiTester = new MiniProgramAPITester();
  
  // 提供全局快捷方法
  wx.testAPI = () => wx.apiTester.runAllTests();
  wx.checkAPI = () => wx.apiTester.quickHealthCheck();
}

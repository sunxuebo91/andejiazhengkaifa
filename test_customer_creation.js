const http = require('http');

// 配置
const BASE_URL = 'http://localhost:3001/api';
const TEST_DATA = {
  advisorId: 'advisor_test_001',
  openid: 'wx_test_openid_123456',
  templateId: 'template_test_001',
};

// HTTP请求工具函数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(body),
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: { error: 'Invalid JSON response', body },
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试客户创建功能
async function testCustomerCreation() {
  console.log('🧪 开始测试客户创建功能...\n');

  const testScenarios = [
    {
      name: '场景1: 有手机号的新客户 -> 应该创建客户记录',
      data: {
        customerId: 'wx_new_customer_001',
        advisorId: TEST_DATA.advisorId,
        actionType: 'view_resume',
        actionData: {
          resumeId: 'resume_test_001',
          viewTime: new Date().toISOString(),
          duration: 30
        },
        customerName: '张三',
        customerPhone: '13800138001', // 新手机号
        resumeId: 'resume_test_001'
      },
      expected: {
        customerCreated: true,
        shouldHaveCustomerId: true
      }
    },
    {
      name: '场景2: 有手机号的老客户 -> 不应该重复创建',
      data: {
        customerId: 'wx_existing_customer_001',
        advisorId: TEST_DATA.advisorId,
        actionType: 'contact_advisor',
        actionData: {
          contactMethod: 'phone',
          contactTime: new Date().toISOString()
        },
        customerName: '张三',
        customerPhone: '13800138001', // 重复手机号
      },
      expected: {
        customerCreated: false,
        shouldHaveCustomerId: true
      }
    },
    {
      name: '场景3: 没有手机号的客户 -> 不应该创建客户记录',
      data: {
        customerId: 'wx_no_phone_customer_001',
        advisorId: TEST_DATA.advisorId,
        actionType: 'view_resume',
        actionData: {
          resumeId: 'resume_test_002',
          viewTime: new Date().toISOString(),
          duration: 45
        },
        customerName: '李四',
        // 没有customerPhone
      },
      expected: {
        customerCreated: false,
        shouldHaveCustomerId: false
      }
    },
    {
      name: '场景4: 手机号格式错误 -> 不应该创建客户记录',
      data: {
        customerId: 'wx_invalid_phone_001',
        advisorId: TEST_DATA.advisorId,
        actionType: 'book_service',
        actionData: {
          serviceType: '家政服务',
          bookingTime: new Date().toISOString()
        },
        customerName: '王五',
        customerPhone: '1234567890', // 错误格式
      },
      expected: {
        customerCreated: false,
        shouldHaveCustomerId: false
      }
    },
    {
      name: '场景5: 另一个新客户 -> 应该创建客户记录',
      data: {
        customerId: 'wx_new_customer_002',
        advisorId: TEST_DATA.advisorId,
        actionType: 'view_resume',
        actionData: {
          resumeId: 'resume_test_003',
          viewTime: new Date().toISOString(),
          duration: 60
        },
        customerName: '赵六',
        customerPhone: '13800138002', // 另一个新手机号
      },
      expected: {
        customerCreated: true,
        shouldHaveCustomerId: true
      }
    }
  ];

  let passedTests = 0;
  let totalTests = testScenarios.length;

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`${i + 1}️⃣ ${scenario.name}`);
    
    try {
      const response = await makeRequest('POST', '/customer/action', scenario.data);
      
      if (response.status === 200 && response.data.success) {
        const result = response.data.data;
        
        // 验证客户创建状态
        const customerCreatedMatch = result.customerCreated === scenario.expected.customerCreated;
        const customerIdMatch = scenario.expected.shouldHaveCustomerId 
          ? !!result.customerId 
          : !result.customerId;
        
        if (customerCreatedMatch && customerIdMatch) {
          console.log('✅ 测试通过');
          console.log(`   - 客户创建状态: ${result.customerCreated} (预期: ${scenario.expected.customerCreated})`);
          console.log(`   - 客户ID: ${result.customerId ? '有' : '无'} (预期: ${scenario.expected.shouldHaveCustomerId ? '有' : '无'})`);
          if (result.customer) {
            console.log(`   - 客户信息: ${result.customer.name} - ${result.customer.phone}`);
          }
          passedTests++;
        } else {
          console.log('❌ 测试失败');
          console.log(`   - 客户创建状态: ${result.customerCreated} (预期: ${scenario.expected.customerCreated}) ${customerCreatedMatch ? '✅' : '❌'}`);
          console.log(`   - 客户ID: ${result.customerId ? '有' : '无'} (预期: ${scenario.expected.shouldHaveCustomerId ? '有' : '无'}) ${customerIdMatch ? '✅' : '❌'}`);
        }
      } else {
        console.log('❌ 请求失败');
        console.log(`   - 状态码: ${response.status}`);
        console.log(`   - 响应: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      console.log('❌ 请求异常');
      console.log(`   - 错误: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('📊 测试结果汇总:');
  console.log(`   - 通过: ${passedTests}/${totalTests}`);
  console.log(`   - 成功率: ${Math.round(passedTests / totalTests * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！客户创建功能正常工作！');
  } else {
    console.log('⚠️  部分测试失败，请检查实现逻辑');
  }
}

// 测试健康检查
async function testHealthCheck() {
  console.log('🔍 测试服务器连接...');
  try {
    const response = await makeRequest('GET', '/health');
    console.log('✅ 服务器连接正常');
    return true;
  } catch (error) {
    console.log('❌ 服务器连接失败:', error.message);
    console.log('请确保后端服务已启动 (npm run start:dev)');
    return false;
  }
}

// 主函数
async function main() {
  console.log('='.repeat(80));
  console.log('🧪 微信API客户创建功能测试脚本');
  console.log('='.repeat(80));
  console.log('');

  // 先测试服务器连接
  const isServerRunning = await testHealthCheck();
  console.log('');

  if (isServerRunning) {
    await testCustomerCreation();
  } else {
    console.log('请先启动后端服务：');
    console.log('cd backend && npm run start:dev');
  }

  console.log('');
  console.log('='.repeat(80));
}

// 运行测试
main().catch(console.error);

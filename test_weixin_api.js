const http = require('http');

// 配置
const BASE_URL = 'http://localhost:3001/api'; // 开发环境
const TEST_DATA = {
  code: 'test_wx_code_123456',
  advisorId: 'advisor_test_001',
  customerId: 'customer_test_001',
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

// 测试函数
async function testWeixinAPIs() {
  console.log('🚀 开始测试微信API接口...\n');

  try {
    // 1. 测试获取OpenID接口
    console.log('1️⃣ 测试获取OpenID接口');
    console.log('POST /api/wechat/openid');
    
    try {
      const openidResponse = await makeRequest('POST', '/wechat/openid', {
        code: TEST_DATA.code
      });
      console.log('✅ 获取OpenID接口响应:', JSON.stringify(openidResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 获取OpenID接口失败:', error.message);
    }
    console.log('');

    // 2. 测试保存顾问订阅状态接口
    console.log('2️⃣ 测试保存顾问订阅状态接口');
    console.log('POST /api/advisor/subscribe');
    
    try {
      const subscribeResponse = await makeRequest('POST', '/advisor/subscribe', {
        advisorId: TEST_DATA.advisorId,
        openid: TEST_DATA.openid,
        templateId: TEST_DATA.templateId,
        subscribed: true,
        subscribeData: {
          source: 'test',
          timestamp: new Date().toISOString()
        }
      });
      console.log('✅ 保存订阅状态接口响应:', JSON.stringify(subscribeResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 保存订阅状态接口失败:', error.message);
    }
    console.log('');

    // 3. 测试记录客户行为接口
    console.log('3️⃣ 测试记录客户行为接口');
    console.log('POST /api/customer/action');
    
    try {
      const actionResponse = await makeRequest('POST', '/customer/action', {
        customerId: TEST_DATA.customerId,
        advisorId: TEST_DATA.advisorId,
        actionType: 'view_resume',
        actionData: {
          resumeId: 'resume_test_001',
          viewTime: new Date().toISOString(),
          duration: 30
        },
        customerName: '测试客户',
        customerPhone: '13800138000',
        resumeId: 'resume_test_001'
      });
      console.log('✅ 记录客户行为接口响应:', JSON.stringify(actionResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 记录客户行为接口失败:', error.message);
    }
    console.log('');

    // 4. 测试发送订阅消息接口
    console.log('4️⃣ 测试发送订阅消息接口');
    console.log('POST /api/message/send');
    
    try {
      const messageResponse = await makeRequest('POST', '/message/send', {
        touser: TEST_DATA.openid,
        template_id: TEST_DATA.templateId,
        data: {
          thing1: { value: '测试客户查看了您的简历' },
          time2: { value: new Date().toLocaleString('zh-CN') },
          thing3: { value: '13800138000' }
        },
        page: 'pages/customer/detail?id=' + TEST_DATA.customerId,
        miniprogram_state: 'developer'
      });
      console.log('✅ 发送订阅消息接口响应:', JSON.stringify(messageResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 发送订阅消息接口失败:', error.message);
    }
    console.log('');

    console.log('🎉 微信API接口测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
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
  console.log('='.repeat(60));
  console.log('🧪 微信API集成测试脚本');
  console.log('='.repeat(60));
  console.log('');

  // 先测试服务器连接
  const isServerRunning = await testHealthCheck();
  console.log('');

  if (isServerRunning) {
    await testWeixinAPIs();
  } else {
    console.log('请先启动后端服务：');
    console.log('cd backend && npm run start:dev');
  }

  console.log('');
  console.log('='.repeat(60));
}

// 运行测试
main().catch(console.error);

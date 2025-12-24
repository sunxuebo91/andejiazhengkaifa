/**
 * 快速测试云函数通知功能
 */

const http = require('http');

// 测试配置
const API_HOST = 'localhost';
const API_PORT = 3001;
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODMxNmYxY2U1MDQwMjU5NzYxMjc5MDkiLCJyb2xlIjoiYWRtaW4iLCJuYW1lIjoi5a2Z5a2m5Y2aIiwiaWF0IjoxNzY2NTQyNTYxLCJleHAiOjE3NjY2Mjg5NjF9.mC5rMMwAFC4TrICM7HZfNMgcTlrUWApyH2xzPSEBN98';
const CUSTOMER_ID = '6847fa0e6798cab487d828f1';
const ASSIGNED_TO_USER_ID = '6848f5e2809126015584f13d';

console.log('🧪 开始测试云函数通知功能\n');
console.log('📋 测试配置:');
console.log('  - API地址:', `${API_HOST}:${API_PORT}`);
console.log('  - 客户ID:', CUSTOMER_ID);
console.log('  - 被分配人ID:', ASSIGNED_TO_USER_ID);
console.log('');

/**
 * 发送HTTP请求
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * 测试单个客户分配
 */
async function testAssignCustomer() {
  console.log('📝 测试1: 单个客户分配 (Web端)');
  console.log('   接口: PATCH /api/customers/:id/assign');
  
  try {
    const response = await makeRequest(
      'PATCH',
      `/customers/${CUSTOMER_ID}/assign`,
      {
        assignedTo: ASSIGNED_TO_USER_ID,
      }
    );

    console.log('   状态码:', response.status);
    
    if (response.status === 200) {
      console.log('   ✅ 分配成功');
      if (response.data && response.data.notificationData) {
        console.log('   📱 通知数据:', JSON.stringify(response.data.notificationData, null, 2));
      }
    } else {
      console.log('   ❌ 分配失败:', response.data);
    }
  } catch (error) {
    console.log('   ❌ 请求失败:', error.message);
  }
  
  console.log('');
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('⏳ 等待2秒，让服务准备好...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testAssignCustomer();
  
  console.log('✅ 测试完成！');
  console.log('');
  console.log('📊 查看后端日志:');
  console.log('   pm2 logs backend-dev --lines 50');
  console.log('');
  console.log('🔍 期望看到的日志:');
  console.log('   📱 调用云函数发送通知 - 被分配人: xxx');
  console.log('   ✅ 云函数调用成功');
  console.log('   或');
  console.log('   ⚠️ 小程序AppSecret未配置，跳过通知发送');
}

// 运行测试
runTests().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});


/**
 * 测试CRM端调用云函数发送通知功能
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行
 * 2. 替换下面的 TOKEN、CUSTOMER_ID、ASSIGNED_TO_USER_ID
 * 3. 运行: node test_cloud_function_notification.js
 */

const http = require('http');

// ==================== 配置区 ====================
const API_HOST = 'localhost';
const API_PORT = 3001;

// 需要替换的值
const TOKEN = 'YOUR_JWT_TOKEN_HERE';  // 从浏览器开发者工具中获取
const CUSTOMER_ID = 'YOUR_CUSTOMER_ID_HERE';  // 要分配的客户ID
const ASSIGNED_TO_USER_ID = 'YOUR_USER_ID_HERE';  // 被分配人的用户ID

// ==================== 测试函数 ====================

/**
 * 发送HTTP请求
 */
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
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

/**
 * 测试单个客户分配（小程序端接口）
 */
async function testMiniprogramAssign() {
  console.log('\n========================================');
  console.log('测试1: 小程序端分配客户');
  console.log('========================================\n');

  try {
    const response = await makeRequest(
      'PATCH',
      `/customers/miniprogram/${CUSTOMER_ID}/assign`,
      {
        assignedTo: ASSIGNED_TO_USER_ID,
        assignmentReason: '测试云函数通知'
      },
      TOKEN
    );

    console.log('✅ 响应状态:', response.status);
    console.log('📦 响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ 分配成功！');
      if (response.data.data.notificationData) {
        console.log('📱 通知数据:', response.data.data.notificationData);
        console.log('\n💡 提示: 请检查后端日志，查看云函数调用情况');
      }
    } else {
      console.log('\n❌ 分配失败:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

/**
 * 测试Web端分配客户
 */
async function testWebAssign() {
  console.log('\n========================================');
  console.log('测试2: Web端分配客户');
  console.log('========================================\n');

  try {
    const response = await makeRequest(
      'PATCH',
      `/customers/${CUSTOMER_ID}/assign`,
      {
        assignedTo: ASSIGNED_TO_USER_ID,
        assignmentReason: '测试Web端云函数通知'
      },
      TOKEN
    );

    console.log('✅ 响应状态:', response.status);
    console.log('📦 响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ 分配成功！');
      if (response.data.data.notificationData) {
        console.log('📱 通知数据:', response.data.data.notificationData);
        console.log('\n💡 提示: 请检查后端日志，查看云函数调用情况');
      }
    } else {
      console.log('\n❌ 分配失败:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始测试CRM端调用云函数发送通知功能\n');

  // 检查配置
  if (TOKEN === 'YOUR_JWT_TOKEN_HERE' || 
      CUSTOMER_ID === 'YOUR_CUSTOMER_ID_HERE' || 
      ASSIGNED_TO_USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ 错误: 请先配置 TOKEN、CUSTOMER_ID 和 ASSIGNED_TO_USER_ID');
    console.log('\n💡 提示:');
    console.log('1. 从浏览器开发者工具中获取 JWT Token');
    console.log('2. 从数据库或CRM系统中获取客户ID和用户ID');
    return;
  }

  // 运行测试
  await testMiniprogramAssign();
  await testWebAssign();

  console.log('\n========================================');
  console.log('✅ 测试完成！');
  console.log('========================================\n');
  console.log('📝 后续步骤:');
  console.log('1. 检查后端日志，确认云函数调用是否成功');
  console.log('2. 检查小程序端是否收到订阅消息通知');
  console.log('3. 如果失败，检查小程序AppSecret是否正确配置');
  console.log('4. 确认云函数 quickstartFunctions 已部署并正常运行\n');
}

// 运行测试
runTests().catch(console.error);


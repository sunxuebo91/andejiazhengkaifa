/**
 * 测试客户分配通知功能
 * 
 * 用途：验证所有分配接口是否正确返回 notificationData 字段
 * 
 * 使用方法：
 * 1. 修改下面的配置信息（API_BASE_URL, TOKEN等）
 * 2. 运行: node test_customer_assignment_notification.js
 */

const API_BASE_URL = 'http://localhost:3000/api';
const TOKEN = 'YOUR_JWT_TOKEN_HERE';  // 替换为实际的JWT token

// 测试数据（需要替换为实际的ID）
const TEST_DATA = {
  customerId: '60f7b3c4e1b2c3d4e5f6g7h8',      // 替换为实际的客户ID
  assignedToUserId: '60f7b3c4e1b2c3d4e5f6g7h9', // 替换为实际的用户ID
  customerIds: [                                 // 替换为实际的客户ID列表
    '60f7b3c4e1b2c3d4e5f6g7h8',
    '60f7b3c4e1b2c3d4e5f6g7h7',
  ],
};

// HTTP请求工具函数
async function request(method, url, data = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, options);
  const result = await response.json();
  
  return {
    status: response.status,
    data: result,
  };
}

// 测试1: 单个客户分配 (Web端)
async function testSingleAssignment() {
  console.log('\n📋 测试1: 单个客户分配 (Web端)');
  console.log('接口: PATCH /api/customers/:id/assign');
  
  try {
    const result = await request('PATCH', `/customers/${TEST_DATA.customerId}/assign`, {
      assignedTo: TEST_DATA.assignedToUserId,
      assignmentReason: '测试单个分配',
    });

    console.log('状态码:', result.status);
    console.log('响应:', JSON.stringify(result.data, null, 2));

    if (result.data.success && result.data.data.notificationData) {
      console.log('✅ 通过: notificationData 字段存在');
      console.log('通知数据:', result.data.data.notificationData);
    } else {
      console.log('❌ 失败: notificationData 字段不存在');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

// 测试2: 单个客户分配 (小程序端)
async function testMiniprogramAssignment() {
  console.log('\n📋 测试2: 单个客户分配 (小程序端)');
  console.log('接口: PATCH /api/customers/miniprogram/:id/assign');
  
  try {
    const result = await request('PATCH', `/customers/miniprogram/${TEST_DATA.customerId}/assign`, {
      assignedTo: TEST_DATA.assignedToUserId,
      assignmentReason: '测试小程序分配',
    });

    console.log('状态码:', result.status);
    console.log('响应:', JSON.stringify(result.data, null, 2));

    if (result.data.success && result.data.data.notificationData) {
      console.log('✅ 通过: notificationData 字段存在');
      console.log('通知数据:', result.data.data.notificationData);
    } else {
      console.log('❌ 失败: notificationData 字段不存在');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

// 测试3: 批量分配客户
async function testBatchAssignment() {
  console.log('\n📋 测试3: 批量分配客户');
  console.log('接口: POST /api/customers/batch-assign');
  
  try {
    const result = await request('POST', '/customers/batch-assign', {
      customerIds: TEST_DATA.customerIds,
      assignedTo: TEST_DATA.assignedToUserId,
      assignmentReason: '测试批量分配',
    });

    console.log('状态码:', result.status);
    console.log('响应:', JSON.stringify(result.data, null, 2));

    if (result.data.success && result.data.data.notificationData) {
      console.log('✅ 通过: notificationData 字段存在');
      console.log('通知数据:', result.data.data.notificationData);
    } else {
      console.log('❌ 失败: notificationData 字段不存在');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

// 测试4: 从公海分配客户
async function testAssignFromPool() {
  console.log('\n📋 测试4: 从公海分配客户');
  console.log('接口: POST /api/customers/public-pool/assign');
  
  try {
    const result = await request('POST', '/customers/public-pool/assign', {
      customerIds: TEST_DATA.customerIds,
      assignedTo: TEST_DATA.assignedToUserId,
      reason: '测试从公海分配',
    });

    console.log('状态码:', result.status);
    console.log('响应:', JSON.stringify(result.data, null, 2));

    if (result.data.success && result.data.data.notificationData) {
      console.log('✅ 通过: notificationData 字段存在');
      console.log('通知数据:', result.data.data.notificationData);
    } else {
      console.log('❌ 失败: notificationData 字段不存在');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始测试客户分配通知功能...\n');
  console.log('配置信息:');
  console.log('- API地址:', API_BASE_URL);
  console.log('- Token:', TOKEN.substring(0, 20) + '...');
  console.log('- 测试客户ID:', TEST_DATA.customerId);
  console.log('- 测试用户ID:', TEST_DATA.assignedToUserId);

  await testSingleAssignment();
  await testMiniprogramAssignment();
  await testBatchAssignment();
  await testAssignFromPool();

  console.log('\n✅ 所有测试完成！');
}

// 执行测试
runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});


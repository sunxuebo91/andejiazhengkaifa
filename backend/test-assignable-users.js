// 简单的测试脚本来验证 assignable-users 接口
const axios = require('axios');

async function testAssignableUsers() {
  try {
    console.log('测试 assignable-users 接口...');
    
    // 假设后端运行在 localhost:3000
    const response = await axios.get('http://localhost:3000/api/customers/assignable-users', {
      headers: {
        'Authorization': 'Bearer your-test-token-here' // 需要替换为实际的token
      }
    });
    
    console.log('✅ 接口调用成功');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ 接口调用失败');
    console.log('错误状态:', error.response?.status);
    console.log('错误信息:', error.response?.data);
    console.log('完整错误:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testAssignableUsers();
}

module.exports = { testAssignableUsers };

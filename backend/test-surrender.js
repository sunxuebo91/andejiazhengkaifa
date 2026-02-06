/**
 * 测试退保接口
 */

const axios = require('axios');

// 生产环境配置
const BACKEND_URL = 'https://crm.andejiazheng.com';
const TEST_POLICY_NO = '14527006800194502605'; // 孙学博的测试保单

async function testSurrender() {
  console.log('\n🧪 测试退保接口...');
  console.log('='.repeat(80));
  console.log('保单号:', TEST_POLICY_NO);
  console.log('退保原因: 13 (退票退保)');
  console.log('');

  try {
    // 需要先登录获取JWT token
    console.log('📝 步骤1: 登录获取token...');
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      {
        username: 'admin',
        password: 'admin123', // 请替换为实际密码
      },
      {
        timeout: 30000,
      }
    );

    console.log('登录响应:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.data?.access_token || loginResponse.data.access_token;
    console.log('✅ 登录成功，获取到token:', token ? '有token' : '无token');
    console.log('');

    // 调用退保接口
    console.log('📝 步骤2: 调用退保接口...');
    const surrenderResponse = await axios.post(
      `${BACKEND_URL}/api/dashubao/policy/surrender`,
      {
        policyNo: TEST_POLICY_NO,
        removeReason: '13', // 退票退保
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ 退保请求成功!');
    console.log('');
    console.log('📥 响应数据:');
    console.log(JSON.stringify(surrenderResponse.data, null, 2));
    console.log('');
    console.log('='.repeat(80));

    if (surrenderResponse.data.Success === 'true') {
      console.log('✅ 退保成功！');
      console.log('');
      console.log('💡 保单状态应该已更新为 surrendered');
    } else {
      console.log('❌ 退保失败！');
      console.log('错误信息:', surrenderResponse.data.Message || '未知错误');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSurrender();


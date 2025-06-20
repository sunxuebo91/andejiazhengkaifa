const axios = require('axios');

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';
const TEMPLATE_ID = 'TNF606E6D81E2D49C99CC983F4D0412276-3387';

// 模拟登录获取token（你需要替换为实际的登录凭据）
const LOGIN_CREDENTIALS = {
  username: 'admin', // 替换为实际用户名
  password: 'admin123' // 替换为实际密码
};

async function testESignAPI() {
  console.log('🔍 开始测试爱签API端点...\n');

  try {
    // 1. 登录获取token
    console.log('1. 尝试登录获取token...');
    let token = '';
    
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, LOGIN_CREDENTIALS);
      token = loginResponse.data.data?.token || loginResponse.data.token;
      console.log('✅ 登录成功，获取到token');
    } catch (loginError) {
      console.log('⚠️ 登录失败，将使用无token测试（某些接口可能失败）');
      console.log('   错误:', loginError.response?.data?.message || loginError.message);
    }

    // 设置请求头
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    // 2. 测试爱签服务健康检查
    console.log('\n2. 测试爱签服务健康检查...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/esign/health`, { headers });
      console.log('✅ 爱签服务健康检查成功');
      console.log('   状态:', healthResponse.data.data?.status);
      console.log('   配置:', JSON.stringify(healthResponse.data.data?.config, null, 2));
    } catch (healthError) {
      console.log('❌ 爱签服务健康检查失败');
      console.log('   错误:', healthError.response?.data?.message || healthError.message);
    }

    // 3. 测试爱签连接
    console.log('\n3. 测试爱签连接...');
    try {
      const connectionResponse = await axios.get(`${API_BASE_URL}/esign/test-connection`, { headers });
      console.log('✅ 爱签连接测试成功');
      console.log('   结果:', connectionResponse.data.data?.success ? '连接正常' : '连接异常');
      console.log('   消息:', connectionResponse.data.data?.message);
    } catch (connectionError) {
      console.log('❌ 爱签连接测试失败');
      console.log('   错误:', connectionError.response?.data?.message || connectionError.message);
    }

    // 4. 获取调试配置
    console.log('\n4. 获取调试配置...');
    try {
      const configResponse = await axios.get(`${API_BASE_URL}/esign/debug-config`, { headers });
      console.log('✅ 获取调试配置成功');
      console.log('   配置详情:', JSON.stringify(configResponse.data.data, null, 2));
    } catch (configError) {
      console.log('❌ 获取调试配置失败');
      console.log('   错误:', configError.response?.data?.message || configError.message);
    }

    // 5. 获取模板控件信息
    console.log(`\n5. 获取模板控件信息 (${TEMPLATE_ID})...`);
    try {
      const componentsResponse = await axios.get(`${API_BASE_URL}/esign/templates/${TEMPLATE_ID}/components`, { headers });
      console.log('✅ 获取模板控件信息成功');
      console.log('   控件数量:', componentsResponse.data.data?.components?.length || 0);
      console.log('   控件列表:');
      componentsResponse.data.data?.components?.forEach((comp, index) => {
        console.log(`     ${index + 1}. ${comp.name} (${comp.type}) - ${comp.required ? '必填' : '可选'}`);
      });
    } catch (componentsError) {
      console.log('❌ 获取模板控件信息失败');
      console.log('   错误:', componentsError.response?.data?.message || componentsError.message);
      if (componentsError.response?.data?.error) {
        console.log('   详细错误:', JSON.stringify(componentsError.response.data.error, null, 2));
      }
    }

    // 6. 获取模板详细调试信息
    console.log(`\n6. 获取模板详细调试信息 (${TEMPLATE_ID})...`);
    try {
      const debugResponse = await axios.get(`${API_BASE_URL}/esign/templates/${TEMPLATE_ID}/debug`, { headers });
      console.log('✅ 获取模板调试信息成功');
      console.log('   调试信息:', JSON.stringify(debugResponse.data.data, null, 2));
    } catch (debugError) {
      console.log('❌ 获取模板调试信息失败');
      console.log('   错误:', debugError.response?.data?.message || debugError.message);
    }

    // 7. 测试模板预览生成
    console.log('\n7. 测试模板预览生成...');
    try {
      const previewData = {
        templateId: TEMPLATE_ID,
        formData: {
          party_a_name: '测试甲方公司',
          party_b_name: '测试乙方公司',
          contract_amount: 10000,
          payment_method: '一次性付款'
        }
      };
      
      const previewResponse = await axios.post(`${API_BASE_URL}/esign/templates/preview`, previewData, { headers });
      console.log('✅ 模板预览生成成功');
      console.log('   预览URL长度:', previewResponse.data.data?.previewUrl?.length || 0);
      console.log('   预览ID:', previewResponse.data.data?.previewId);
    } catch (previewError) {
      console.log('❌ 模板预览生成失败');
      console.log('   错误:', previewError.response?.data?.message || previewError.message);
      if (previewError.response?.data?.error) {
        console.log('   详细错误:', JSON.stringify(previewError.response.data.error, null, 2));
      }
    }

  } catch (error) {
    console.log('❌ 测试过程中发生未预期错误:', error.message);
  }

  console.log('\n🏁 测试完成！');
}

// 执行测试
testESignAPI().catch(console.error); 
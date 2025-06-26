const axios = require('axios');

// 直接测试getContract接口
async function testGetContract() {
  const BASE_URL = 'http://localhost:3000';
  const esignContractNo = 'CONTRACT_1750920193559_qdrnzwo7e';
  
  console.log('🧪 直接测试getContract接口');
  console.log('爱签合同编号:', esignContractNo);
  console.log('');

  try {
    // 0. 先登录获取token
    console.log('📋 步骤0: 登录获取token');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功');
    
    // 设置默认的Authorization头
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('');

    // 1. 直接调用后端的getContract方法
    console.log('📋 步骤1: 直接测试getContract接口');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/esign/test-get-contract`, {
        contractNo: esignContractNo
      });
      
      console.log('✅ getContract响应:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ getContract失败:', error.response?.data || error.message);
    }
    
    console.log('');

    // 2. 测试getContractStatus作为对比
    console.log('📋 步骤2: 测试getContractStatus作为对比');
    
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/esign/contract-status/${esignContractNo}`);
      console.log('✅ getContractStatus响应:', JSON.stringify(statusResponse.data, null, 2));
    } catch (error) {
      console.log('❌ getContractStatus失败:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testGetContract().catch(console.error); 
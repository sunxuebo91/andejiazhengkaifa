const axios = require('axios');

async function testPreviewFunction() {
  console.log('🔍 测试预览功能...');
  
  try {
    // 1. 先测试健康检查
    console.log('📡 测试后端健康状态...');
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ 后端服务正常:', healthResponse.data);
    
    // 2. 测试登录获取token
    console.log('🔐 测试登录...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      console.log('✅ 登录成功，获取到token');
      
      // 3. 获取一个真实的合同编号
      console.log('📋 获取合同列表...');
      const contractsResponse = await axios.get('http://localhost:3001/api/contracts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (contractsResponse.data.success && contractsResponse.data.data.length > 0) {
        const contract = contractsResponse.data.data[0];
        console.log('✅ 找到合同:', {
          id: contract._id,
          contractNumber: contract.contractNumber,
          esignContractNo: contract.esignContractNo
        });
        
        // 4. 测试预览功能
        const contractNo = contract.esignContractNo || contract.contractNumber;
        console.log(`🔍 测试预览合同: ${contractNo}`);
        
        const previewResponse = await axios.get(
          `http://localhost:3001/api/esign/contracts/${contractNo}/preview`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('📋 预览结果:', {
          success: previewResponse.data.success,
          message: previewResponse.data.message,
          hasPreviewData: !!previewResponse.data.previewData,
          contractStatus: previewResponse.data.contractStatus,
          statusText: previewResponse.data.statusText
        });
        
        if (previewResponse.data.success) {
          console.log('✅ 预览功能正常工作');
        } else {
          console.log('❌ 预览功能失败:', previewResponse.data.message);
        }
        
      } else {
        console.log('❌ 没有找到合同数据');
      }
      
    } else {
      console.log('❌ 登录失败:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  }
}

testPreviewFunction().catch(console.error); 
const axios = require('axios');

async function testTemplateSimple() {
  console.log('🔍 简单模板接口测试...\n');

  const baseURL = 'http://localhost:3001';
  
  try {
    console.log('📋 测试模板接口...');
    const response = await axios.get(`${baseURL}/api/esign/templates`);
    
    console.log('✅ 模板接口响应成功');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ 模板接口测试失败');
    console.error('错误状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data || error.message);
    
    // 尝试检查错误详情
    if (error.response?.data?.error) {
      console.error('详细错误:', error.response.data.error);
    }
  }
}

// 运行测试
testTemplateSimple().then(() => {
  console.log('\n🎉 测试完成');
}).catch(error => {
  console.error('💥 测试异常:', error);
}); 
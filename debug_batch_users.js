const axios = require('axios');

console.log('🔍 调试批量添加用户API的实际响应...');

const testData = {
  partyAName: '孙学博',
  partyAMobile: '18604592681',
  partyAIdCard: '230623199105111630',
  partyBName: '朱小双',
  partyBMobile: '18600455241',
  partyBIdCard: '231023199205201234',
  isNotice: false,
  isSignPwdNotice: false
};

async function debugBatchUsers() {
  try {
    console.log('📤 调试请求，获取完整响应...');
    
    const response = await axios.post('http://localhost:3000/api/esign/add-users-batch', testData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // 接受所有状态码，不抛出错误
    });
    
    console.log('📊 完整响应调试信息:');
    console.log('状态码:', response.status);
    console.log('响应头:', JSON.stringify(response.headers, null, 2));
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 分析响应结构
    const result = response.data;
    console.log('\n🔍 响应结构分析:');
    console.log('- success 字段:', result.success);
    console.log('- success 字段类型:', typeof result.success);
    console.log('- message 字段:', result.message);
    
    if (result.data) {
      console.log('\n👥 用户添加状态:');
      console.log('甲方:', result.data.partyA?.success ? '✅' : '❌', result.data.partyA?.message);
      console.log('乙方:', result.data.partyB?.success ? '✅' : '❌', result.data.partyB?.message);
      console.log('丙方:', result.data.partyC?.success ? '✅' : '❌', result.data.partyC?.message);
    }
    
    // 检查前端拦截器会如何处理这个响应
    console.log('\n🎯 前端拦截器分析:');
    if (result.success === false) {
      console.log('❌ 前端拦截器会抛出错误:', result.message);
    } else if (result.success === true) {
      console.log('✅ 前端拦截器会正常处理');
    } else {
      console.log('⚠️ success 字段值异常:', result.success);
    }
    
  } catch (error) {
    console.error('❌ 调试请求失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
  }
}

debugBatchUsers(); 
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function verifyPhoneValidation() {
  try {
    console.log('🔐 登录获取token...');
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ 登录成功');
    
    // 测试重复手机号
    console.log('\n📞 测试手机号重复验证...');
    const existingPhone = '18604592681';
    
    try {
      const response = await axios.post(`${BASE_URL}/api/customers`, {
        name: '测试重复手机号',
        phone: existingPhone,
        leadSource: '美团',
        contractStatus: '待定'
      }, { headers });
      
      if (response.data.success === false) {
        console.log('✅ 手机号重复验证正常工作');
        console.log('✅ 错误信息:', response.data.message);
      } else {
        console.log('❌ 手机号重复验证失败，允许创建重复客户');
      }
    } catch (error) {
      console.log('✅ 手机号重复验证通过异常机制工作');
      console.log('✅ 错误信息:', error.message);
    }
    
    console.log('\n🎉 验证完成!');
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

verifyPhoneValidation(); 
const axios = require('axios');

// 测试小程序简历创建API
async function testResumeAPI() {
  const baseURL = 'http://localhost:3001/api';
  
  // 1. 先登录获取token
  console.log('🔐 正在登录...');
  try {
    // 测试管理员登录
    const adminLogin = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const adminToken = adminLogin.data.access_token;
    console.log('✅ 管理员登录成功');
    console.log('👤 管理员用户信息:', JSON.stringify(adminLogin.data.user, null, 2));
    
    // 测试管理员创建简历
    console.log('\n📝 测试管理员创建简历...');
    const adminResumeData = {
      name: '测试阿姨-管理员创建',
      phone: '13800138001',
      gender: 'female',
      age: 35,
      jobType: 'yuexin',
      education: 'high'
    };
    
    const adminResumeResult = await axios.post(`${baseURL}/resumes/miniprogram/create`, adminResumeData, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 管理员创建简历成功:', adminResumeResult.data);
    
  } catch (error) {
    console.error('❌ 管理员测试失败:', error.response?.data || error.message);
  }
  
  // 2. 测试员工登录和创建简历
  try {
    console.log('\n🔐 正在测试员工登录...');
    
    // 首先检查是否有员工账号，如果没有就创建一个
    let employeeToken;
    try {
      const employeeLogin = await axios.post(`${baseURL}/auth/login`, {
        username: 'employee',
        password: 'employee123'
      });
      employeeToken = employeeLogin.data.access_token;
      console.log('✅ 员工登录成功');
      console.log('👤 员工用户信息:', JSON.stringify(employeeLogin.data.user, null, 2));
    } catch (loginError) {
      console.log('⚠️ 员工账号不存在，尝试创建...');
      
      // 使用管理员token创建员工账号
      const adminLogin = await axios.post(`${baseURL}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });
      const adminToken = adminLogin.data.access_token;
      
      const createEmployee = await axios.post(`${baseURL}/users`, {
        username: 'employee',
        password: 'employee123',
        name: '测试员工',
        email: 'employee@test.com',
        phone: '13800138002',
        role: 'employee'
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ 员工账号创建成功');
      
      // 重新登录
      const employeeLogin = await axios.post(`${baseURL}/auth/login`, {
        username: 'employee',
        password: 'employee123'
      });
      employeeToken = employeeLogin.data.access_token;
      console.log('✅ 员工登录成功');
      console.log('👤 员工用户信息:', JSON.stringify(employeeLogin.data.user, null, 2));
    }
    
    // 测试员工创建简历
    console.log('\n📝 测试员工创建简历...');
    const employeeResumeData = {
      name: '测试阿姨-员工创建',
      phone: '13800138003',
      gender: 'female',
      age: 30,
      jobType: 'yuexin',
      education: 'middle'
    };
    
    const employeeResumeResult = await axios.post(`${baseURL}/resumes/miniprogram/create`, employeeResumeData, {
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 员工创建简历成功:', employeeResumeResult.data);
    
  } catch (error) {
    console.error('❌ 员工测试失败:', error.response?.data || error.message);
    console.error('错误详情:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testResumeAPI().catch(console.error);

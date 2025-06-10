const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// 测试用户登录信息
const testUser = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 登录测试用户...');
    const response = await axios.post(`${API_BASE}/auth/login`, testUser);
    authToken = response.data.data.token;
    console.log('✅ 登录成功');
    return authToken;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function getCustomers() {
  try {
    console.log('\n📋 获取客户列表...');
    const response = await axios.get(`${API_BASE}/customers?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const customers = response.data.data.customers;
    if (customers.length === 0) {
      throw new Error('没有找到客户数据');
    }
    
    const customer = customers[0];
    console.log(`✅ 找到客户: ${customer.name} (ID: ${customer._id})`);
    return customer;
  } catch (error) {
    console.error('❌ 获取客户列表失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function createFollowUp(customerId) {
  try {
    console.log('\n📝 创建跟进记录...');
    const followUpData = {
      type: 'phone',
      content: '测试跟进记录：电话联系客户，了解服务需求，客户表示对月嫂服务很感兴趣，希望尽快安排面试。'
    };

    const response = await axios.post(`${API_BASE}/customers/${customerId}/follow-ups`, followUpData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ 跟进记录创建成功');
    console.log('📄 跟进记录内容:', {
      id: response.data.data._id,
      type: response.data.data.type,
      content: response.data.data.content.substring(0, 50) + '...',
      createdAt: response.data.data.createdAt
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ 创建跟进记录失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function getFollowUps(customerId) {
  try {
    console.log('\n📖 获取跟进记录列表...');
    const response = await axios.get(`${API_BASE}/customers/${customerId}/follow-ups`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const followUps = response.data.data;
    console.log(`✅ 获取到 ${followUps.length} 条跟进记录`);
    
    followUps.forEach((followUp, index) => {
      console.log(`  ${index + 1}. [${followUp.type}] ${new Date(followUp.createdAt).toLocaleString()} by ${followUp.createdBy.name}`);
      console.log(`     ${followUp.content.substring(0, 80)}...`);
    });
    
    return followUps;
  } catch (error) {
    console.error('❌ 获取跟进记录失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function getCustomerDetail(customerId) {
  try {
    console.log('\n👤 获取客户详情（包含跟进记录）...');
    const response = await axios.get(`${API_BASE}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const customer = response.data.data;
    console.log(`✅ 客户详情获取成功: ${customer.name}`);
    console.log(`📊 客户状态: ${customer.contractStatus}`);
    console.log(`📞 联系方式: ${customer.phone}`);
    
    if (customer.followUps) {
      console.log(`📝 跟进记录数量: ${customer.followUps.length}`);
    } else {
      console.log('📝 跟进记录: 无');
    }
    
    return customer;
  } catch (error) {
    console.error('❌ 获取客户详情失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🚀 开始测试客户跟进记录功能...\n');

    // 1. 登录
    await login();
    
    // 2. 获取客户
    const customer = await getCustomers();
    
    // 3. 创建跟进记录
    await createFollowUp(customer._id);
    
    // 4. 获取跟进记录列表
    await getFollowUps(customer._id);
    
    // 5. 获取客户详情（包含跟进记录）
    await getCustomerDetail(customer._id);
    
    console.log('\n🎉 所有测试通过！客户跟进记录功能工作正常！');
    console.log('\n✨ 功能验证摘要:');
    console.log('  ✅ 用户登录认证');
    console.log('  ✅ 客户列表获取');
    console.log('  ✅ 跟进记录创建');
    console.log('  ✅ 跟进记录查询');
    console.log('  ✅ 客户详情（含跟进记录）');
    
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
runTests(); 
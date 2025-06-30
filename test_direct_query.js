const axios = require('axios');

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiNjgzMTZmMWNlNTA0MDI1OTc2MTI3OTA5IiwiaWF0IjoxNzUxMjUyMTA2LCJleHAiOjE3NTEzMzg1MDZ9.bU0NXJocpBdvS504ysFmgneBC4QZO9zu2-hMXzbT7Qs';

async function test() {
  try {
    console.log('🔍 测试1: 获取合同列表，搜索手机号');
    const response1 = await axios.get('http://localhost:3001/api/contracts?search=18604592681', {
      headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    });
    
    console.log('搜索结果:', response1.data.data.contracts.length, '个合同');
    if (response1.data.data.contracts.length > 0) {
      const contract = response1.data.data.contracts[0];
      console.log('第一个合同:', {
        id: contract._id,
        customerName: contract.customerName,
        customerPhone: contract.customerPhone,
        contractNumber: contract.contractNumber
      });
    }
    
    console.log('\n🔍 测试2: 检查客户现有合同API');
    const response2 = await axios.get('http://localhost:3001/api/contracts/check-customer/18604592681', {
      headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    });
    
    console.log('检查结果:', response2.data);
    
    console.log('\n🔍 测试3: 直接通过ID查询合同');
    const response3 = await axios.get('http://localhost:3001/api/contracts/686101813ad0e8bad843d822', {
      headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    });
    
    console.log('直接查询结果:', {
      customerName: response3.data.data.customerName,
      customerPhone: response3.data.data.customerPhone,
      customerPhoneType: typeof response3.data.data.customerPhone
    });
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

test(); 
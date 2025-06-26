// 测试合同签署链接问题
const axios = require('axios');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiNjgzMTZmMWNlNTA0MDI1OTc2MTI3OTA5IiwiaWF0IjoxNzUwOTI1MjI1LCJleHAiOjE3NTEwMTE2MjV9.-NLnNA8gWIamhLTPLgCjY51DIBnmzzAfBKwRDWblb0E';
const BASE_URL = 'http://localhost:3000/api';
const CONTRACT_NO = 'CONTRACT_1750920193559_qdrnzwo7e';

async function testContractIssue() {
  console.log('🧪 开始测试合同签署链接问题...\n');

  // 1. 获取合同详情
  console.log('📄 步骤1: 获取合同详情');
  try {
    const response = await axios.get(`${BASE_URL}/contracts/685cec04d67d92c3f0c169cc`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    const contract = response.data.data;
    console.log('✅ 合同基本信息:');
    console.log(`   - 合同编号: ${contract.contractNumber}`);
    console.log(`   - 甲方: ${contract.customerName} (${contract.customerPhone})`);
    console.log(`   - 乙方: ${contract.workerName} (${contract.workerPhone})`);
    console.log(`   - 爱签合同号: ${contract.esignContractNo}`);
    console.log(`   - 爱签状态: ${contract.esignStatus}`);
    console.log(`   - 签署链接: ${contract.esignSignUrls ? 'EXISTS' : 'NULL'}`);
    
    if (contract.esignSignUrls) {
      console.log(`   - 签署链接内容: ${contract.esignSignUrls.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('❌ 获取合同详情失败:', error.response?.data || error.message);
  }

  console.log('\n📡 步骤2: 查询爱签平台合同状态');
  try {
    const response = await axios.get(`${BASE_URL}/esign/contract-status/${CONTRACT_NO}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('✅ 爱签平台状态:', response.data);
  } catch (error) {
    console.error('❌ 查询爱签平台状态失败:', error.response?.data || error.message);
  }

  console.log('\n🔍 步骤3: 尝试模拟添加签署方');
  try {
    const signersData = {
      contractNo: CONTRACT_NO,
      signers: [
        {
          account: '18604592681', // 甲方手机号
          name: '孙学博',
          mobile: '18604592681',
          signType: 'manual',
          validateType: 'sms'
        },
        {
          account: '18600455241', // 乙方手机号
          name: '朱小双',
          mobile: '18600455241',
          signType: 'manual',
          validateType: 'sms'
        }
      ],
      signOrder: 'parallel'
    };

    console.log('发送签署方数据:', JSON.stringify(signersData, null, 2));

    const response = await axios.post(`${BASE_URL}/esign/add-signers-simple`, signersData, {
      headers: { 
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 添加签署方成功:', response.data);
    
    if (response.data.code === 100000 && response.data.data?.signUser) {
      console.log('\n🔗 获取到的签署链接:');
      response.data.data.signUser.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.account}): ${user.signUrl}`);
      });
    }
  } catch (error) {
    console.error('❌ 添加签署方失败:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('详细错误信息:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n🎯 测试完成！');
}

testContractIssue().catch(console.error); 
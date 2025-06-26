// 测试签署链接修复功能
const axios = require('axios');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiNjgzMTZmMWNlNTA0MDI1OTc2MTI3OTA5IiwiaWF0IjoxNzUwOTI1MjI1LCJleHAiOjE3NTEwMTE2MjV9.-NLnNA8gWIamhLTPLgCjY51DIBnmzzAfBKwRDWblb0E';
const BASE_URL = 'http://localhost:3000/api';
const CONTRACT_ID = '685cec04d67d92c3f0c169cc';
const CONTRACT_NO = 'CONTRACT_1750920193559_qdrnzwo7e';

async function testSignUrlFix() {
  console.log('🧪 开始测试签署链接修复功能...\n');

  // 1. 获取合同详情
  console.log('📄 步骤1: 获取合同详情');
  let contract;
  try {
    const response = await axios.get(`${BASE_URL}/contracts/${CONTRACT_ID}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    contract = response.data.data;
    console.log('✅ 合同基本信息:');
    console.log(`   - 合同编号: ${contract.contractNumber}`);
    console.log(`   - 甲方: ${contract.customerName} (${contract.customerPhone})`);
    console.log(`   - 乙方: ${contract.workerName} (${contract.workerPhone})`);
    console.log(`   - 爱签合同号: ${contract.esignContractNo}`);
    console.log(`   - 签署链接: ${contract.esignSignUrls ? 'EXISTS' : 'NULL'}`);
  } catch (error) {
    console.error('❌ 获取合同详情失败:', error.response?.data || error.message);
    return;
  }

  // 2. 模拟重新获取签署链接的过程
  console.log('\n🔄 步骤2: 模拟重新获取签署链接');
  try {
    const signersData = {
      contractNo: CONTRACT_NO,
      signers: [
        {
          account: contract.customerPhone,
          name: contract.customerName,
          mobile: contract.customerPhone,
          signType: 'manual',
          validateType: 'sms'
        },
        {
          account: contract.workerPhone,
          name: contract.workerName,
          mobile: contract.workerPhone,
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
    
    console.log('✅ API响应:', response.data);
    
    // 检查是否获取到签署链接
    if (response.data.data?.signUser && response.data.data.signUser.length > 0) {
      console.log('\n🔗 获取到的签署链接:');
      const signUrls = response.data.data.signUser.map((user, index) => ({
        name: user.name,
        mobile: user.account,
        role: index === 0 ? '甲方（客户）' : '乙方（服务人员）',
        signUrl: user.signUrl,
        account: user.account,
        signOrder: user.signOrder
      }));
      
      signUrls.forEach((url, index) => {
        console.log(`   ${index + 1}. ${url.name} (${url.role}): ${url.signUrl}`);
      });
      
      // 3. 尝试保存到本地数据库
      console.log('\n💾 步骤3: 保存签署链接到本地数据库');
      try {
        const updateResponse = await axios.put(`${BASE_URL}/contracts/${CONTRACT_ID}`, {
          esignSignUrls: JSON.stringify(signUrls)
        }, {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        console.log('✅ 签署链接已保存到本地数据库');
        
        // 4. 验证保存结果
        console.log('\n✅ 步骤4: 验证保存结果');
        const verifyResponse = await axios.get(`${BASE_URL}/contracts/${CONTRACT_ID}`, {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        const updatedContract = verifyResponse.data.data;
        if (updatedContract.esignSignUrls) {
          console.log('✅ 验证成功，签署链接已正确保存');
          const savedUrls = JSON.parse(updatedContract.esignSignUrls);
          console.log(`   - 保存的签署链接数量: ${savedUrls.length}`);
          savedUrls.forEach((url, index) => {
            console.log(`   ${index + 1}. ${url.name} (${url.role})`);
          });
        } else {
          console.log('❌ 验证失败，签署链接未保存');
        }
        
      } catch (saveError) {
        console.error('❌ 保存签署链接失败:', saveError.response?.data || saveError.message);
      }
      
    } else if (response.data.code === 100074) {
      console.log('\n⚠️ 返回100074（重复添加签署人），这是正常的');
      console.log('说明签署方已存在，但可能签署链接已过期或合同已完成');
    } else {
      console.log('\n❌ 未获取到签署链接');
    }
    
  } catch (error) {
    console.error('❌ 重新获取签署链接失败:', error.response?.data || error.message);
  }

  console.log('\n🎯 测试完成！');
}

testSignUrlFix().catch(console.error); 
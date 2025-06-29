const axios = require('axios');

// 测试精准合同状态功能
async function testDetailedContractStatus() {
  const testContractNo = 'CONTRACT_1751007652612_53vpxu7sf';
  const backendUrl = 'http://localhost:3000';
  
  console.log('🧪 测试精准合同状态功能');
  console.log('='.repeat(50));
  
  try {
    // 测试后端API
    console.log('📡 调用后端API...');
    const response = await axios.get(`${backendUrl}/api/esign/contract-status/${testContractNo}`);
    
    console.log('✅ API响应成功');
    console.log('📊 原始响应:', JSON.stringify(response.data, null, 2));
    
    // 检查精准状态解析
    if (response.data.detailedStatus) {
      console.log('\n🎯 精准状态解析结果:');
      console.log('- 状态文本:', response.data.detailedStatus.text);
      console.log('- 是否精准:', response.data.detailedStatus.detailed);
      console.log('- 状态摘要:', response.data.detailedStatus.summary);
      
      if (response.data.detailedStatus.detailed) {
        console.log('- 客户已签约:', response.data.detailedStatus.customerSigned);
        console.log('- 阿姨已签约:', response.data.detailedStatus.workerSigned);
        
        if (response.data.detailedStatus.customer) {
          console.log('- 客户信息:', response.data.detailedStatus.customer);
        }
        
        if (response.data.detailedStatus.worker) {
          console.log('- 阿姨信息:', response.data.detailedStatus.worker);
        }
      }
    } else {
      console.log('⚠️ 未找到精准状态解析结果');
    }
    
    // 模拟不同状态场景
    console.log('\n🔬 状态解析测试:');
    
    const testCases = [
      {
        name: '双方都未签约',
        data: {
          status: 1,
          signers: [
            { account: 'customer_123', name: '张客户', status: 1, signOrder: 1 },
            { account: 'worker_456', name: '李阿姨', status: 1, signOrder: 2 }
          ]
        }
      },
      {
        name: '客户已签约，阿姨未签约',
        data: {
          status: 1,
          signers: [
            { account: 'customer_123', name: '张客户', status: 2, signOrder: 1 },
            { account: 'worker_456', name: '李阿姨', status: 1, signOrder: 2 }
          ]
        }
      },
      {
        name: '阿姨已签约，客户未签约',
        data: {
          status: 1,
          signers: [
            { account: 'customer_123', name: '张客户', status: 1, signOrder: 1 },
            { account: 'worker_456', name: '李阿姨', status: 2, signOrder: 2 }
          ]
        }
      },
      {
        name: '双方都已签约',
        data: {
          status: 2,
          signers: [
            { account: 'customer_123', name: '张客户', status: 2, signOrder: 1 },
            { account: 'worker_456', name: '李阿姨', status: 2, signOrder: 2 }
          ]
        }
      }
    ];
    
    // 这里可以添加本地状态解析测试
    testCases.forEach((testCase, index) => {
      console.log(`\n${index + 1}. ${testCase.name}:`);
      console.log(`   合同状态: ${testCase.data.status}`);
      console.log(`   签署方: ${testCase.data.signers.map(s => `${s.name}(${s.status === 2 ? '已签' : '未签'})`).join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('📄 错误响应:', error.response.data);
    }
  }
}

// 运行测试
testDetailedContractStatus().then(() => {
  console.log('\n✅ 测试完成');
}).catch(error => {
  console.error('\n❌ 测试异常:', error);
}); 
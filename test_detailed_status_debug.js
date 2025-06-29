const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testDetailedStatus() {
  try {
    console.log('🔍 测试精准状态解析功能');
    console.log('=' * 50);
    
    const contractNo = 'CONTRACT_1751007652612_53vpxu7sf';
    console.log(`测试合同编号: ${contractNo}`);
    
    // 调用后端API
    const response = await axios.get(`${API_BASE_URL}/esign/contract-status/${contractNo}`);
    
    console.log('\n📡 API响应:');
    console.log('- 状态码:', response.status);
    console.log('- 响应数据:', JSON.stringify(response.data, null, 2));
    
    // 检查精准状态
    if (response.data && response.data.detailedStatus) {
      console.log('\n🎯 精准状态解析结果:');
      console.log('- 精准状态文本:', response.data.detailedStatus.text);
      console.log('- 是否为精准状态:', response.data.detailedStatus.detailed);
      console.log('- 状态颜色:', response.data.detailedStatus.color);
      console.log('- 状态摘要:', response.data.detailedStatus.summary);
      
      if (response.data.detailedStatus.signers) {
        console.log('\n👥 签署方信息:');
        response.data.detailedStatus.signers.forEach((signer, index) => {
          console.log(`  签署方 ${index + 1}:`, {
            account: signer.account,
            signOrder: signer.signOrder,
            status: signer.status,
            statusText: signer.status === 2 ? '已签约' : '未签约'
          });
        });
      }
      
      if (response.data.detailedStatus.customer && response.data.detailedStatus.worker) {
        console.log('\n🔍 识别的角色:');
        console.log('- 甲方(客户):', {
          account: response.data.detailedStatus.customer.account,
          status: response.data.detailedStatus.customer.status,
          signed: response.data.detailedStatus.customerSigned
        });
        console.log('- 乙方(阿姨):', {
          account: response.data.detailedStatus.worker.account,
          status: response.data.detailedStatus.worker.status,
          signed: response.data.detailedStatus.workerSigned
        });
      }
    } else {
      console.log('\n⚠️ 未找到精准状态解析结果');
    }
    
    // 基础状态信息
    if (response.data && response.data.data) {
      console.log('\n📋 基础状态信息:');
      console.log('- 合同状态:', response.data.data.status);
      console.log('- 状态含义:', getStatusText(response.data.data.status));
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.log('- 响应状态:', error.response.status);
      console.log('- 响应数据:', error.response.data);
    }
  }
}

function getStatusText(status) {
  const statusMap = {
    0: '等待签约',
    1: '签约中',
    2: '已签约',
    3: '过期',
    4: '拒签',
    6: '作废',
    7: '撤销'
  };
  return statusMap[status] || '未知';
}

// 运行测试
testDetailedStatus(); 
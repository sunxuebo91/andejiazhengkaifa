const axios = require('axios');

// 测试最终的预览合同功能（基于合同状态）
async function testFinalPreview() {
  const BASE_URL = 'http://localhost:3000';
  const esignContractNo = 'CONTRACT_1750920193559_qdrnzwo7e';
  
  console.log('🧪 测试最终的预览合同功能');
  console.log('爱签合同编号:', esignContractNo);
  console.log('');

  try {
    // 0. 先登录获取token
    console.log('📋 步骤0: 登录获取token');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功');
    
    // 设置默认的Authorization头
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('');

    // 1. 测试新的预览合同API
    console.log('📋 步骤1: 测试基于状态的预览合同API');
    const previewResponse = await axios.get(`${BASE_URL}/api/esign/preview-contract/${esignContractNo}`);
    
    console.log('✅ 预览响应:', JSON.stringify(previewResponse.data, null, 2));
    console.log('');

    // 2. 分析响应结果
    console.log('📊 分析预览结果:');
    const data = previewResponse.data;
    
    console.log('- 调用成功:', data.success ? '✅' : '❌');
    console.log('- 合同状态:', data.contractStatus || '未知');
    console.log('- 状态文本:', data.statusText || '未知');
    console.log('- 使用方法:', data.method || '未知');
    
    // 根据合同状态分析结果
    if (data.contractStatus === 2) {
      console.log('');
      console.log('🎯 签约完成状态分析:');
      console.log('- 应该下载:', data.shouldDownload ? '✅' : '❌');
      console.log('- 推荐操作:', data.previewInfo?.recommendation || '无');
      
      if (data.previewInfo?.availableFormats) {
        console.log('- 可用下载格式:');
        data.previewInfo.availableFormats.forEach((format, index) => {
          console.log(`  ${index + 1}. ${format.name}${format.recommended ? ' (推荐)' : ''}${format.description ? ' - ' + format.description : ''}`);
        });
      }
      
      console.log('');
      console.log('✅ 符合预期：签约完成状态应该提示下载合同');
      
    } else if (data.contractStatus === 1) {
      console.log('');
      console.log('🎯 签约中状态分析:');
      console.log('- 可以预览:', data.previewData ? '✅' : '❌');
      console.log('- 签约中标识:', data.previewInfo?.contractSigning ? '✅' : '❌');
      console.log('- 推荐操作:', data.previewInfo?.recommendation || '无');
      
      console.log('');
      console.log('✅ 符合预期：签约中状态可以预览当前进度');
      
    } else if (data.previewUrl) {
      console.log('');
      console.log('🎯 其他状态分析:');
      console.log('- 预览链接: ✅', data.previewUrl);
      console.log('- 嵌入式链接:', data.embeddedUrl ? '✅' : '❌');
      
    } else {
      console.log('');
      console.log('🎯 回退模式分析:');
      console.log('- 回退模式:', data.fallbackMode ? '✅' : '❌');
      console.log('- 错误信息:', data.message);
      console.log('- 可以下载:', data.previewInfo?.canDownload ? '✅' : '❌');
    }

    console.log('');
    console.log('🎯 最终结论:');
    
    if (data.success) {
      if (data.contractStatus === 2 && data.shouldDownload) {
        console.log('✅ 完美！签约完成状态正确提示下载合同');
      } else if (data.contractStatus === 1 && (data.previewData || data.previewInfo?.contractSigning)) {
        console.log('✅ 完美！签约中状态正确显示预览功能');
      } else if (data.previewUrl) {
        console.log('✅ 完美！成功获取预览链接');
      } else {
        console.log('⚠️  功能可用，但可能需要进一步优化');
      }
    } else {
      console.log('❌ 预览功能存在问题，需要检查');
    }

    // 3. 如果是签约完成状态，测试下载功能
    if (data.contractStatus === 2) {
      console.log('');
      console.log('📋 步骤3: 测试下载合同功能（签约完成状态）');
      
      try {
        // 获取本地合同ID进行下载测试
        const contractsResponse = await axios.get(`${BASE_URL}/api/contracts?search=${esignContractNo}`);
        
        if (contractsResponse.data.success && contractsResponse.data.data.length > 0) {
          const contractId = contractsResponse.data.data[0].id;
          console.log('找到本地合同ID:', contractId);
          
          const downloadResponse = await axios.post(`${BASE_URL}/api/contracts/${contractId}/download-contract`, {
            force: 1,
            downloadFileType: 1
          });
          
          console.log('下载测试结果:', downloadResponse.data.success ? '✅ 成功' : '❌ 失败');
          if (!downloadResponse.data.success) {
            console.log('下载失败原因:', downloadResponse.data.message);
          }
        } else {
          console.log('⚠️  未找到对应的本地合同记录');
        }
      } catch (downloadError) {
        console.log('❌ 下载测试失败:', downloadError.response?.data?.message || downloadError.message);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testFinalPreview().catch(console.error); 
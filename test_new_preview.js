const axios = require('axios');

// 测试新的预览合同功能
async function testNewPreview() {
  const BASE_URL = 'http://localhost:3000';
  const esignContractNo = 'CONTRACT_1750920193559_qdrnzwo7e';
  
  console.log('🧪 测试新的预览合同功能');
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
    console.log('📋 步骤1: 测试新的预览合同API');
    const previewResponse = await axios.get(`${BASE_URL}/api/esign/preview-contract/${esignContractNo}`);
    
    console.log('✅ 预览响应:', JSON.stringify(previewResponse.data, null, 2));
    console.log('');

    // 2. 分析响应结果
    console.log('📊 分析预览结果:');
    const data = previewResponse.data;
    
    console.log('- 调用成功:', data.success ? '✅' : '❌');
    console.log('- 使用方法:', data.method || '未知');
    
    if (data.previewUrl) {
      console.log('- 预览链接: ✅', data.previewUrl);
    } else {
      console.log('- 预览链接: ❌ 无');
    }
    
    if (data.embeddedUrl) {
      console.log('- 嵌入式链接: ✅', data.embeddedUrl);
    } else {
      console.log('- 嵌入式链接: ❌ 无');
    }
    
    if (data.contractInfo) {
      console.log('- 合同信息: ✅');
      console.log('  - 合同状态:', data.contractInfo.status);
      console.log('  - 合同名称:', data.contractInfo.contractName);
      console.log('  - 有效期:', data.contractInfo.validityTime);
      console.log('  - 签署人数量:', data.contractInfo.signUser?.length || 0);
    }
    
    if (data.status) {
      console.log('- 状态信息: ✅ (回退模式)');
    }
    
    if (data.previewInfo) {
      console.log('- 预览信息: ✅');
      console.log('  - 可下载:', data.previewInfo.canDownload ? '✅' : '❌');
      console.log('  - 有预览链接:', data.previewInfo.hasPreviewUrl ? '✅' : '❌');
      console.log('  - 有嵌入式链接:', data.previewInfo.hasEmbeddedUrl ? '✅' : '❌');
      console.log('  - 可用格式数量:', data.previewInfo.availableFormats?.length || 0);
    }

    console.log('');
    console.log('🎯 结论:');
    
    if (data.success && data.previewUrl) {
      console.log('✅ 预览功能完全正常！用户可以直接打开预览链接');
    } else if (data.success && data.contractInfo) {
      console.log('✅ 获取到合同信息，但可能没有预览链接');
    } else if (data.success && data.fallbackMode) {
      console.log('⚠️  使用回退模式，显示合同状态信息');
    } else {
      console.log('❌ 预览功能存在问题');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testNewPreview().catch(console.error); 
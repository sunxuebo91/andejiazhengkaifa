const http = require('http');

const contractNo = 'CONTRACT_1751007652612_53vpxu7sf';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/esign/contract-status/${contractNo}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🔍 测试API端点:', `http://localhost:3000${options.path}`);

const req = http.request(options, (res) => {
  console.log('📡 响应状态码:', res.statusCode);
  console.log('📡 响应头:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📦 原始响应数据:');
    console.log(data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('\n📊 解析后的JSON:');
      console.log(JSON.stringify(jsonData, null, 2));
      
      // 检查精准状态
      if (jsonData.detailedStatus) {
        console.log('\n🎯 精准状态信息:');
        console.log('- 状态文本:', jsonData.detailedStatus.text);
        console.log('- 是否为精准状态:', jsonData.detailedStatus.detailed);
        console.log('- 状态颜色:', jsonData.detailedStatus.color);
        console.log('- 状态摘要:', jsonData.detailedStatus.summary);
      } else {
        console.log('\n⚠️ 未找到detailedStatus字段');
      }
      
      // 检查基础状态
      if (jsonData.data && jsonData.data.status !== undefined) {
        console.log('\n📋 基础状态:');
        console.log('- 状态值:', jsonData.data.status);
        console.log('- 签署方数量:', jsonData.data.signers?.length || 0);
      }
      
    } catch (error) {
      console.error('❌ JSON解析失败:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
});

req.end(); 
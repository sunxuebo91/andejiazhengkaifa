const http = require('http');

function testContractStatusAPI() {
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

  console.log('🔍 测试合同状态API...');
  console.log('📡 请求地址:', `http://localhost:3000${options.path}`);
  
  const req = http.request(options, (res) => {
    console.log('📊 响应状态码:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n📦 原始响应数据:');
      console.log(data);
      
      try {
        const jsonData = JSON.parse(data);
        console.log('\n📋 解析后的JSON结构:');
        console.log(JSON.stringify(jsonData, null, 2));
        
        // 检查关键字段
        console.log('\n🔍 关键字段检查:');
        console.log('- success:', jsonData.success);
        console.log('- data存在:', !!jsonData.data);
        console.log('- data.status:', jsonData.data?.status);
        console.log('- detailedStatus存在:', !!jsonData.detailedStatus);
        console.log('- detailedStatus.text:', jsonData.detailedStatus?.text);
        console.log('- detailedStatus.detailed:', jsonData.detailedStatus?.detailed);
        
        if (jsonData.detailedStatus) {
          console.log('\n🎯 精准状态信息:');
          console.log('- 状态文本:', jsonData.detailedStatus.text);
          console.log('- 是否精准:', jsonData.detailedStatus.detailed);
          console.log('- 状态颜色:', jsonData.detailedStatus.color);
          console.log('- 客户已签约:', jsonData.detailedStatus.customerSigned);
          console.log('- 阿姨已签约:', jsonData.detailedStatus.workerSigned);
        } else {
          console.log('\n❌ 没有找到精准状态信息！');
          console.log('这意味着后端的精准状态解析功能没有生效。');
        }
        
      } catch (parseError) {
        console.error('❌ JSON解析错误:', parseError.message);
        console.log('原始数据:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ 请求错误:', error.message);
    console.log('可能的原因:');
    console.log('1. 后端服务未启动');
    console.log('2. 端口3000被占用');
    console.log('3. 网络连接问题');
  });
  
  req.end();
}

// 等待后端启动
setTimeout(() => {
  testContractStatusAPI();
}, 5000);

console.log('⏳ 等待5秒让后端启动...'); 
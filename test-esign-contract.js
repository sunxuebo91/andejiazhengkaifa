const axios = require('axios');

// 测试创建爱签合同
async function testCreateContract() {
  console.log('🧪 开始测试创建爱签合同...\n');

  // 模拟前端提交的数据
  const testData = {
    contractNo: `TEST_CONTRACT_${Date.now()}`,
    contractName: '家政服务合同测试',
    templateNo: 'TNCBC37535B2134B5F949E1BBC86116B59',
    validityTime: 30,
    signOrder: 1,
    templateParams: {
      // 甲方（客户）信息
      '客户姓名': '张三',
      '客户电话': '13800138000',
      '客户身份证号': '110101199001011234',
      
      // 乙方（阿姨）信息
      '阿姨姓名': '李阿姨',
      '阿姨电话': '13900139000',
      '阿姨身份证号': '110101198001011234',
      
      // 时间信息
      '开始年': 2026,
      '开始月': 2,
      '开始日': 1,
      '结束年': 2027,
      '结束月': 2,
      '结束日': 1,
      
      // 金额信息
      '阿姨工资': '8000',
      '服务费': '1000',
      '匹配费': '500',
      
      // 服务备注
      '服务备注': '做饭；打扫卫生；照顾老人',
    }
  };

  console.log('📋 测试数据:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');

  try {
    console.log('🚀 发送请求到后端API...');
    const response = await axios.post(
      'http://localhost:3001/api/esign/create-contract-template',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('\n✅ 请求成功！');
    console.log('📊 响应状态:', response.status);
    console.log('📊 响应数据:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 合同创建成功！');
      if (response.data.data) {
        console.log('合同编号:', testData.contractNo);
        console.log('响应详情:', response.data.data);
      }
    } else {
      console.log('\n❌ 合同创建失败！');
      console.log('错误信息:', response.data.message);
    }

  } catch (error) {
    console.log('\n❌ 请求失败！');
    
    if (error.response) {
      console.log('HTTP状态码:', error.response.status);
      console.log('错误响应:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('请求已发送但未收到响应');
      console.log('错误:', error.message);
    } else {
      console.log('请求配置错误:', error.message);
    }
  }
}

// 运行测试
testCreateContract().then(() => {
  console.log('\n✅ 测试完成');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ 测试异常:', err);
  process.exit(1);
});


// 测试签署链接保存流程
console.log('🧪 开始测试签署链接保存流程...');

// 1. 首先测试创建合同并检查 localContractId
console.log('\n📝 步骤1: 测试合同创建流程');

// 2. 模拟步骤3的签署链接保存
console.log('\n🔗 步骤2: 测试签署链接保存');

// 模拟爱签API返回的数据结构
const mockEsignResponse = {
  code: 100000,
  msg: '成功',
  data: {
    signUser: [
      {
        name: '张三',
        account: '13800138001',
        signUrl: 'https://qianfu.esign.cn/sign/xxx123',
        signOrder: 1
      },
      {
        name: '李四',
        account: '13800138002', 
        signUrl: 'https://qianfu.esign.cn/sign/xxx456',
        signOrder: 2
      }
    ]
  }
};

console.log('模拟爱签API响应:', JSON.stringify(mockEsignResponse, null, 2));

// 3. 模拟签署链接数据转换
const signUrls = mockEsignResponse.data.signUser.map((user, index) => ({
  name: user.name,
  mobile: user.account,
  role: index === 0 ? '甲方（客户）' : '乙方（服务人员）',
  signUrl: user.signUrl,
  account: user.account,
  signOrder: user.signOrder
}));

console.log('\n转换后的签署链接数据:', JSON.stringify(signUrls, null, 2));

// 4. 模拟保存到数据库的JSON字符串
const esignSignUrlsJson = JSON.stringify(signUrls);
console.log('\n保存到数据库的JSON字符串:', esignSignUrlsJson);

// 5. 模拟从数据库读取并解析
try {
  const parsedSignUrls = JSON.parse(esignSignUrlsJson);
  console.log('\n从数据库解析的签署链接:', parsedSignUrls);
  console.log('✅ JSON解析成功');
} catch (error) {
  console.error('❌ JSON解析失败:', error);
}

console.log('\n🎯 测试完成！请检查控制台输出确认数据流程正确性。'); 
/**
 * 签署顺序分析测试
 * 分析丙方是否需要在甲乙双方签署后才能签署
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 测试配置
const testConfig = {
  contractNo: `ORDER-TEST-${Date.now()}`,
  templateNo: "TNF606E6D81E2D49C99CC983F4D0412276-3387",
  
  // 甲方（个人客户）
  party1: {
    account: "18612345678",
    name: "张三",
    idCard: "110101199001011234",
    phone: "18612345678"
  },
  
  // 乙方（个人阿姨）
  party2: {
    account: "18687654321", 
    name: "李四",
    idCard: "110101199002022345",
    phone: "18687654321"
  },
  
  // 丙方（企业）
  party3: {
    account: "company_test_001",
    name: "测试企业有限公司",
    orgCode: "91110000000000001X"
  }
};

async function analyzeSigningOrder() {
  console.log('🔍 签署顺序分析测试');
  console.log('=' .repeat(60));
  console.log('测试目标: 分析丙方签章的时序问题');
  console.log('');

  try {
    // 步骤1: 创建合同
    console.log('📄 步骤1: 创建合同...');
    const contractResponse = await createContract();
    
    if (!contractResponse.success) {
      throw new Error(`合同创建失败: ${contractResponse.error}`);
    }
    
    const contractId = contractResponse.data.contractId;
    console.log(`✅ 合同创建成功: ${contractId}`);
    
    // 步骤2: 添加签署人（重点关注签署顺序）
    console.log('\n👥 步骤2: 添加签署人（分析签署顺序）...');
    const signersResponse = await addSignersWithOrderAnalysis(contractId);
    
    if (!signersResponse.success) {
      throw new Error(`签署人添加失败: ${signersResponse.error}`);
    }
    
    console.log('✅ 签署人添加成功');
    
    // 步骤3: 获取合同状态（查看实际的签署顺序）
    console.log('\n📊 步骤3: 获取合同状态...');
    const statusResponse = await getContractStatus(contractId);
    
    if (statusResponse.success) {
      console.log('✅ 合同状态获取成功');
      analyzeContractStatus(statusResponse.data);
    }
    
    // 步骤4: 分析签署策略
    console.log('\n🔍 步骤4: 分析签署策略...');
    analyzeSigningStrategy();
    
    // 步骤5: 给出建议
    console.log('\n💡 步骤5: 问题分析和建议...');
    provideSuggestions();
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

/**
 * 创建合同
 */
async function createContract() {
  try {
    const requestData = {
      contractNo: testConfig.contractNo,
      contractName: "签署顺序分析测试合同",
      templateNo: testConfig.templateNo,
      templateParams: {
        "客户姓名": testConfig.party1.name,
        "客户电话": testConfig.party1.phone,
        "客户身份证号": testConfig.party1.idCard,
        "客户联系地址": "北京市朝阳区测试地址123号",
        "阿姨姓名": testConfig.party2.name,
        "阿姨电话": testConfig.party2.phone,
        "阿姨身份证号": testConfig.party2.idCard,
        "阿姨联系地址": "北京市海淀区测试地址456号",
        "籍贯": "北京",
        "年龄": "35",
        "性别": "女",
        "服务类型": "住家保姆",
        "服务时间": "全天候",
        "服务地址": "北京市朝阳区测试地址123号",
        "开始年": "2024",
        "开始月": "01",
        "开始日": "01",
        "结束年": "2024",
        "结束月": "12",
        "结束日": "31",
        "服务费": "8000",
        "大写服务费": "捌仟元整",
        "匹配费": "800",
        "匹配费大写": "捌佰元整",
        "阿姨工资": "7200",
        "阿姨工资大写": "柒仟贰佰元整",
        "合同备注": "签署顺序分析测试",
        "服务备注": "测试丙方签章时序问题"
      }
    };

    const response = await axios.post(`${BASE_URL}/api/esign/create-contract`, requestData);
    
    return {
      success: true,
      data: {
        contractId: testConfig.contractNo,
        response: response.data
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * 添加签署人并分析签署顺序
 */
async function addSignersWithOrderAnalysis(contractId) {
  try {
    console.log('📋 签署人配置分析:');
    
    const signersData = {
      contractNo: contractId,
      signers: [
        {
          account: testConfig.party1.account,
          name: testConfig.party1.name,
          mobile: testConfig.party1.phone,
          signType: 'manual' // 有感知签署
        },
        {
          account: testConfig.party2.account,
          name: testConfig.party2.name,
          mobile: testConfig.party2.phone,
          signType: 'manual' // 有感知签署
        },
        {
          account: testConfig.party3.account,
          name: testConfig.party3.name,
          mobile: '', // 企业用户可能没有手机号
          signType: 'auto' // 无感知签署（自动签章）
        }
      ],
      signOrder: 'sequential', // 顺序签署
      templateParams: {} // 空的模板参数
    };

    console.log('  甲方（客户）: 有感知签署，签署顺序: 1');
    console.log('  乙方（阿姨）: 有感知签署，签署顺序: 2');
    console.log('  丙方（企业）: 无感知签署，签署顺序: 3');
    console.log('  签署模式: 顺序签署（sequential）');
    console.log('');

    const response = await axios.post(`${BASE_URL}/api/esign/add-signers-simple`, signersData);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * 获取合同状态
 */
async function getContractStatus(contractId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/esign/contract-status/${contractId}`);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * 分析合同状态
 */
function analyzeContractStatus(statusData) {
  console.log('📊 合同状态分析:');
  
  if (statusData && statusData.data) {
    console.log('  合同状态数据:', JSON.stringify(statusData.data, null, 2));
  } else {
    console.log('  ⚠️ 无法获取详细的合同状态信息');
  }
}

/**
 * 分析签署策略
 */
function analyzeSigningStrategy() {
  console.log('🔍 签署策略分析:');
  console.log('');
  
  console.log('✅ 当前签署策略配置:');
  console.log('  甲方签名区: 个人签名 (signUserType: 2)');
  console.log('  乙方签名区: 个人签名 (signUserType: 2)');
  console.log('  丙方签章区: 企业签章 (signUserType: 1)');
  console.log('');
  
  console.log('✅ 签章定位方式:');
  console.log('  locationMode: 4 (模板坐标签章)');
  console.log('  signKey: "丙方签章区"');
  console.log('  sealNo: "e5a9b6ff9e754771b0c364f68f2c3717"');
  console.log('  canDrag: 0 (禁止拖动)');
  console.log('');
  
  console.log('🤔 可能的问题点:');
  console.log('  1. 签署顺序: 丙方需要等待甲乙双方签署完成');
  console.log('  2. 企业认证: 企业用户可能未完成认证');
  console.log('  3. 默认印章: 印章设置可能未生效');
  console.log('  4. 签章触发: 自动签章可能需要手动触发');
}

/**
 * 提供建议
 */
function provideSuggestions() {
  console.log('💡 问题解决建议:');
  console.log('');
  
  console.log('🔧 立即可尝试的解决方案:');
  console.log('  1. 检查签署顺序: 确认甲乙双方是否已完成签署');
  console.log('  2. 手动触发签章: 尝试通过管理界面手动触发丙方签章');
  console.log('  3. 检查企业认证: 验证企业用户的认证状态');
  console.log('  4. 验证印章设置: 确认默认印章是否正确设置');
  console.log('');
  
  console.log('🚀 长期优化方案:');
  console.log('  1. 改为并行签署: 允许三方同时签署');
  console.log('  2. 添加状态监控: 实时监控签署进度');
  console.log('  3. 增加错误处理: 完善签章失败的重试机制');
  console.log('  4. 用户体验优化: 提供更清晰的签署状态提示');
  console.log('');
  
  console.log('🎯 关键验证点:');
  console.log('  1. 在浏览器中打开合同预览链接');
  console.log('  2. 检查第9页的丙方签章区是否有印章');
  console.log('  3. 如果是空白，尝试刷新页面或重新生成合同');
  console.log('  4. 检查后端日志中的默认印章设置结果');
}

// 运行测试
analyzeSigningOrder().catch(error => {
  console.error('测试执行失败:', error);
}); 
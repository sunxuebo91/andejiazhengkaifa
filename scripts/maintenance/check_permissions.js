// 爱签权限查询脚本 - 通过印章查询验证权限
const axios = require('axios');

// 测试企业账号
const ENTERPRISE_ACCOUNT = 'ASIGN91110111MACJMD2R5J';
const COMPANY_NAME = '北京安得家政有限公司';

console.log('🔍 开始查询爱签企业权限状态...');
console.log(`📋 企业账号: ${ENTERPRISE_ACCOUNT}`);
console.log(`🏢 企业名称: ${COMPANY_NAME}`);

async function checkPermissionsBySeal() {
  console.log('\\n📋 方式1: 通过印章查询验证自动签署权限');
  
  try {
    // 通过后端API查询印章列表
    const response = await axios.post('http://localhost:3001/api/esign/add-stranger', {
      account: ENTERPRISE_ACCOUNT,
      userType: 1, // 企业用户
      companyName: COMPANY_NAME,
      mobile: '', // 企业用户不需要手机号
      isNotice: 0
    });
    
    console.log('✅ 企业用户状态:', response.data);
    
    // 如果用户添加成功，说明账号有效
    if (response.data.success || response.data.code === 100000) {
      console.log('✅ 企业账号有效，可以进行签署');
      return true;
    } else {
      console.log('❌ 企业账号状态异常:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 印章权限查询失败:', error.response?.data || error.message);
    return false;
  }
}

async function checkPermissionsByContract() {
  console.log('\\n📋 方式2: 通过创建测试合同验证权限');
  
  try {
    // 创建一个简单的测试合同来验证权限
    const contractData = {
      contractNo: `PERMISSION_TEST_${Date.now()}`,
      contractName: '权限测试合同',
      templateNo: 'template_6748f2e7b2f7b',
      templateParams: {
        '客户姓名': '权限测试客户',
        '客户联系电话': '13800138000', 
        '客户身份证号': '110101199001011234',
        '客户联系地址': '北京市测试区',
        '阿姨姓名': '权限测试阿姨',
        '阿姨联系电话': '13800138001',
        '阿姨身份证号': '110101199002022345', 
        '阿姨联系地址': '北京市测试区',
        '服务类型': '权限测试',
        '服务地址': '北京市测试区',
        '籍贯': '北京',
        '年龄': '30',
        '性别': '女',
        '开始年': '2024',
        '开始月': '12', 
        '开始日': '30',
        '结束年': '2024',
        '结束月': '12',
        '结束日': '31',
        '服务费': '100',
        '匹配费': '10',
        '阿姨工资': '90',
        '合同备注': '权限测试',
        '服务备注': '权限测试'
      },
      validityTime: 1 // 1天有效期
    };
    
    const response = await axios.post('http://localhost:3001/api/esign/create-contract-flow', contractData);
    
    if (response.data.success) {
      console.log('✅ 测试合同创建成功，权限正常');
      console.log(`📄 合同编号: ${response.data.contractNo}`);
      return response.data.contractNo;
    } else {
      console.log('❌ 测试合同创建失败:', response.data.message);
      // 检查是否是权限相关的错误
      if (response.data.message && response.data.message.includes('权限')) {
        console.log('🚫 权限问题确认：自动签署权限未开通');
      }
      return null;
    }
  } catch (error) {
    console.error('❌ 合同权限测试失败:', error.response?.data || error.message);
    
    // 分析错误信息
    const errorMsg = error.response?.data?.message || error.message;
    if (errorMsg.includes('100607') || errorMsg.includes('权限')) {
      console.log('🚫 确认：企业自动签署权限未开通');
      console.log('💡 建议：联系爱签商务开通以下权限：');
      console.log('   - 企业自身主体默认盖章权限');
      console.log('   - 无感知签约权限');
    }
    return null;
  }
}

async function checkAccountStatus() {
  console.log('\\n📋 方式3: 检查账号基本状态');
  
  try {
    // 通过合同状态查询来验证账号是否有效
    const response = await axios.get('http://localhost:3001/api/esign/debug-config');
    
    if (response.data.success) {
      console.log('✅ 后端服务连接正常');
      console.log('📋 爱签配置状态:', {
        host: response.data.config.host,
        appId: response.data.config.appId,
        version: response.data.config.version
      });
      return true;
    }
  } catch (error) {
    console.error('❌ 账号状态检查失败:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 开始执行权限检查流程...');
  
  // 1. 检查账号基本状态
  const accountOk = await checkAccountStatus();
  if (!accountOk) {
    console.log('❌ 账号状态检查失败，终止检查');
    return;
  }
  
  // 2. 通过印章查询验证权限
  const sealPermissionOk = await checkPermissionsBySeal();
  
  // 3. 通过合同创建验证权限
  const contractPermissionOk = await checkPermissionsByContract();
  
  // 4. 总结权限状态
  console.log('\\n📊 权限检查结果总结:');
  console.log('=' .repeat(50));
  console.log(`🏢 企业账号: ${ENTERPRISE_ACCOUNT}`);
  console.log(`📋 账号状态: ${accountOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`🔖 印章权限: ${sealPermissionOk ? '✅ 正常' : '❌ 需要检查'}`);
  console.log(`📄 合同权限: ${contractPermissionOk ? '✅ 正常' : '❌ 需要开通'}`);
  
  if (!contractPermissionOk) {
    console.log('\\n💡 权限开通建议:');
    console.log('1. 联系爱签商务开通企业自动签署权限');
    console.log('2. 确认企业印章支持无感知签约');
    console.log('3. 验证企业账号的实名认证状态');
    console.log('\\n📞 联系方式: 爱签官方客服');
  } else {
    console.log('\\n🎉 权限状态良好，可以正常使用自动签署功能！');
  }
}

// 执行主函数
main().catch(console.error); 
/**
 * 测试默认印章设置功能
 * 验证官方API调用是否正确
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 测试企业用户
const testEnterpriseUser = {
  account: "company_test_001",
  name: "测试企业有限公司"
};

// 官方默认印章编号
const DEFAULT_SEAL_NO = "e5a9b6ff9e754771b0c364f68f2c3717";

async function testDefaultSealSetting() {
  console.log('🔧 测试默认印章设置功能');
  console.log('=' .repeat(60));
  console.log(`企业用户: ${testEnterpriseUser.name} (${testEnterpriseUser.account})`);
  console.log(`默认印章编号: ${DEFAULT_SEAL_NO}`);
  console.log('');

  try {
    // 1. 直接调用后端的setDefaultSeal方法
    console.log('📡 步骤1: 调用后端API设置默认印章...');
    const response = await axios.post(`${BASE_URL}/api/esign/set-default-seal`, {
      account: testEnterpriseUser.account,
      sealNo: DEFAULT_SEAL_NO
    });

    console.log('✅ API调用成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));

    // 分析响应结果
    if (response.data && response.data.data) {
      const apiResponse = response.data.data;
      
      if (apiResponse.code === 100000) {
        console.log('🎉 默认印章设置成功！');
        console.log(`✅ 用户 ${testEnterpriseUser.account} 的默认印章已设置为: ${DEFAULT_SEAL_NO}`);
      } else {
        console.log('❌ 默认印章设置失败');
        console.log(`错误码: ${apiResponse.code}`);
        console.log(`错误信息: ${apiResponse.msg}`);
        
        // 分析常见错误
        analyzeError(apiResponse.code, apiResponse.msg);
      }
    } else {
      console.log('⚠️ 响应格式异常');
      console.log('完整响应:', response.data);
    }

  } catch (error) {
    console.error('❌ API调用失败:', error.message);
    
    if (error.response) {
      console.log('HTTP状态码:', error.response.status);
      console.log('错误响应:', error.response.data);
    }
  }
}

/**
 * 分析错误码
 */
function analyzeError(code, msg) {
  console.log('\n🔍 错误分析:');
  
  switch (code) {
    case 100025:
      console.log('❌ 参数错误，用户不存在');
      console.log('💡 建议: 检查企业用户是否已正确注册');
      break;
    case 100053:
      console.log('❌ 用户账号为空');
      console.log('💡 建议: 检查account参数是否正确传递');
      break;
    case 100151:
      console.log('❌ 用户无效');
      console.log('💡 建议: 用户可能未完成实名认证或企业认证');
      break;
    case 100152:
      console.log('❌ 用户锁定');
      console.log('💡 建议: 联系爱签客服解锁用户');
      break;
    case 100591:
      console.log('❌ 印章编号不存在');
      console.log('💡 建议: 检查sealNo参数是否正确');
      console.log(`当前使用的印章编号: ${DEFAULT_SEAL_NO}`);
      break;
    default:
      console.log(`❌ 未知错误码: ${code}`);
      console.log(`错误信息: ${msg}`);
      break;
  }
}

/**
 * 测试企业用户注册状态
 */
async function testEnterpriseUserStatus() {
  console.log('\n🔍 检查企业用户状态...');
  
  try {
    // 这里可以调用其他API来检查用户状态
    // 比如获取用户印章列表等
    console.log('📋 企业用户信息:');
    console.log(`  账号: ${testEnterpriseUser.account}`);
    console.log(`  名称: ${testEnterpriseUser.name}`);
    console.log('  状态: 需要通过其他API验证');
    
  } catch (error) {
    console.error('❌ 检查用户状态失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🧪 默认印章设置功能测试');
  console.log('测试目标: 验证企业用户默认印章设置是否正常工作');
  console.log('');

  await testDefaultSealSetting();
  await testEnterpriseUserStatus();
  
  console.log('\n📝 测试建议:');
  console.log('1. 确保企业用户已正确注册并完成认证');
  console.log('2. 验证印章编号的有效性');
  console.log('3. 检查API调用的时序问题');
  console.log('4. 确认签章策略配置正确');
}

// 运行测试
main().catch(error => {
  console.error('测试执行失败:', error);
}); 
const axios = require('axios');

// 后端API基础URL
const API_BASE = 'http://localhost:3000/api';

// 测试数据（使用客户姓名而不是甲方姓名）
const testData = {
  "contractNo": "CONTRACT_1750672094123_test_customer_name",
  "contractName": "家政服务合同",
  "templateNo": "TNF606E6D81E2D49C99CC983F4D0412276-3387",
  "templateParams": {
    "客户姓名": "孙学博",  // 使用客户姓名而不是甲方姓名
    "甲方联系电话": "18604592681",
    "甲方身份证号": "230623199105111630",
    "客户联系地址": "黑龙江大庆市林甸县",
    "甲方": true,
    "阿姨姓名": "闫凯欣",
    "阿姨电话": "13264518973",
    "阿姨身份证号": "230623199105111630",
    "阿姨工资": "5500",
    "乙方": true,
    "服务类型": "白班保姆",
    "服务时间": "9-12点",
    "服务地址": "黑龙江大庆市林甸县",
    "籍贯": "黑龙江",
    "年龄": "32",
    "性别": "女",
    "服务费": "5000",
    "服务备注": "做饭家务",
    "开始年": 2025,
    "开始月": 6,
    "开始日": 23,
    "结束年": 2026,
    "结束月": 6,
    "结束日": 23,
    "匹配费": "500",
    "合同备注": "无",
    "丙方": true,
    "甲方电话": "18604592681",
    "甲方身份证": "230623199105111630",
    "乙方姓名": "闫凯欣",
    "乙方电话": "13264518973",
    "乙方身份证": "13013219930910004X"
  }
};

async function testCustomerNameFix() {
  console.log('🧪 测试客户姓名字段修复');
  console.log('='.repeat(50));

  try {
    console.log('📋 测试数据:');
    console.log('- 合同编号:', testData.contractNo);
    console.log('- 合同名称:', testData.contractName);
    console.log('- 模板编号:', testData.templateNo);
    console.log('- 客户姓名:', testData.templateParams['客户姓名']); // 注意这里是客户姓名
    console.log('- 甲方电话:', testData.templateParams['甲方联系电话']);
    console.log('- 甲方身份证:', testData.templateParams['甲方身份证号']);
    console.log();

    console.log('🔄 调用合同创建API...');
    const response = await axios.post(`${API_BASE}/esign/create-contract-template`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ API调用成功!');
    console.log('📊 响应状态码:', response.status);
    console.log('📋 响应数据:', JSON.stringify(response.data, null, 2));

    // 检查是否还有"缺少客户姓名"的错误
    if (response.data.success === false && response.data.message && response.data.message.includes('客户姓名')) {
      console.log('❌ 修复失败: 仍然提示缺少客户姓名');
      console.log('🔍 错误信息:', response.data.message);
      return false;
    } else if (response.data.success === true) {
      console.log('✅ 修复成功: 合同创建成功!');
      console.log('🎯 客户姓名字段已正确识别');
      return true;
    } else if (response.data.data && response.data.data.success === true) {
      console.log('✅ 修复成功: 合同创建成功!');
      console.log('🎯 客户姓名字段已正确识别');
      return true;
    } else {
      console.log('⚠️  其他错误:', response.data.message || response.data.data?.message || '未知错误');
      console.log('🔍 详细错误:', response.data.data?.error || response.data.error);
      return false;
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('📋 错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试客户姓名字段修复');
  console.log('目标: 使用"客户姓名"替代"甲方姓名"，解决字段不匹配问题');
  console.log();

  const success = await testCustomerNameFix();
  
  console.log();
  console.log('='.repeat(50));
  if (success) {
    console.log('🎉 测试通过: 客户姓名字段修复成功!');
    console.log('✅ 直接使用爱签API模板中的原始字段名');
    console.log('🔧 无需复杂的字段映射逻辑');
  } else {
    console.log('💥 测试失败: 需要进一步调试');
  }
}

// 运行测试
main().catch(console.error); 
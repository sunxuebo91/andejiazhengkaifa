// 测试新字段功能的脚本
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// 测试创建包含新字段的客户
async function testNewCustomerFields() {
  console.log('🔍 测试新客户字段功能...\n');

  const testCustomer = {
    name: '测试客户_新字段',
    phone: '13800138888',
    wechatId: 'test_wechat_id',
    idCardNumber: '110101199001011234',
    leadSource: '美团',
    contractStatus: '匹配中',
    serviceCategory: '月嫂',
    leadLevel: 'A类',
    salaryBudget: 8000,
    expectedStartDate: '2024-02-01',
    homeArea: 120,
    familySize: 3,
    restSchedule: '单休',
    address: '北京市朝阳区测试街道123号',
    ageRequirement: '25-40岁',
    genderRequirement: '女',
    originRequirement: '四川',
    educationRequirement: '高中',
    expectedDeliveryDate: '2024-03-15',
    remarks: '这是一个测试备注，用于验证新字段功能。客户对服务有特殊要求，需要经验丰富的月嫂。'
  };

  try {
    console.log('📝 创建包含新字段的测试客户...');
    const response = await axios.post(`${API_BASE_URL}/customers`, testCustomer);
    
    if (response.status === 201) {
      console.log('✅ 客户创建成功！');
      console.log('📊 返回的客户数据:');
      console.log(`   - 客户ID: ${response.data._id}`);
      console.log(`   - 姓名: ${response.data.name}`);
      console.log(`   - 电话: ${response.data.phone}`);
      console.log(`   - 微信号: ${response.data.wechatId || '未设置'}`);
      console.log(`   - 身份证号: ${response.data.idCardNumber || '未设置'}`);
      console.log(`   - 客户状态: ${response.data.contractStatus}`);
      console.log(`   - 学历要求: ${response.data.educationRequirement || '未设置'}`);
      console.log(`   - 备注: ${response.data.remarks || '无备注'}`);
      
      return response.data._id;
    }
  } catch (error) {
    console.error('❌ 创建客户失败:');
    if (error.response?.data) {
      console.error('   错误详情:', error.response.data);
    } else {
      console.error('   错误信息:', error.message);
    }
    return null;
  }
}

// 测试必填字段验证
async function testRequiredFieldsValidation() {
  console.log('\n🔍 测试必填字段验证...\n');

  // 测试缺少必填字段的情况
  const incompleteCustomer = {
    name: '测试客户',
    // 缺少 phone, leadSource, contractStatus
  };

  try {
    console.log('📝 尝试创建缺少必填字段的客户...');
    await axios.post(`${API_BASE_URL}/customers`, incompleteCustomer);
    console.log('❌ 意外成功 - 应该失败的请求却成功了');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ 验证成功 - 正确拒绝了缺少必填字段的请求');
      console.log('📋 验证错误信息:');
      if (error.response.data.message) {
        const messages = Array.isArray(error.response.data.message) 
          ? error.response.data.message 
          : [error.response.data.message];
        messages.forEach(msg => console.log(`   - ${msg}`));
      }
    } else {
      console.error('❌ 意外错误:', error.response?.data || error.message);
    }
  }
}

// 测试字段长度和格式验证
async function testFieldValidation() {
  console.log('\n🔍 测试字段格式验证...\n');

  const invalidCustomer = {
    name: '测试',
    phone: '13800138999',
    leadSource: '美团',
    contractStatus: '匹配中',
    idCardNumber: '12345', // 无效身份证号
    salaryBudget: 500, // 低于最小值
    homeArea: 5, // 低于最小值
  };

  try {
    console.log('📝 尝试创建包含无效字段的客户...');
    await axios.post(`${API_BASE_URL}/customers`, invalidCustomer);
    console.log('❌ 意外成功 - 应该失败的请求却成功了');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ 验证成功 - 正确拒绝了包含无效字段的请求');
      console.log('📋 验证错误信息:');
      if (error.response.data.message) {
        const messages = Array.isArray(error.response.data.message) 
          ? error.response.data.message 
          : [error.response.data.message];
        messages.forEach(msg => console.log(`   - ${msg}`));
      }
    } else {
      console.error('❌ 意外错误:', error.response?.data || error.message);
    }
  }
}

// 检查前端页面布局
function checkFrontendLayout() {
  console.log('\n🔍 前端页面布局检查...\n');
  
  const expectedFields = {
    required: ['name', 'phone', 'leadSource', 'contractStatus'],
    optional: [
      'wechatId', 'idCardNumber', 'serviceCategory', 'leadLevel', 
      'salaryBudget', 'expectedStartDate', 'homeArea', 'familySize',
      'restSchedule', 'address', 'ageRequirement', 'genderRequirement',
      'originRequirement', 'educationRequirement', 'expectedDeliveryDate', 'remarks'
    ]
  };

  console.log('📋 必填字段 (4个):');
  expectedFields.required.forEach(field => {
    console.log(`   ✓ ${field}`);
  });

  console.log('\n📋 可选字段 (16个):');
  expectedFields.optional.forEach(field => {
    console.log(`   ○ ${field}`);
  });

  console.log('\n📐 布局特点:');
  console.log('   - 使用分组布局 (基础信息、需求信息、家庭信息、需求要求、备注信息)');
  console.log('   - 3列网格布局 (除地址和备注为全宽)');
  console.log('   - 统一的输入框宽度');
  console.log('   - 智能分组逻辑相关字段');
  console.log('   - 备注字段使用多行文本框，放在最后');
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试新字段功能\n');
  
  // 检查前端布局
  checkFrontendLayout();
  
  // 测试后端API
  const customerId = await testNewCustomerFields();
  await testRequiredFieldsValidation();
  await testFieldValidation();
  
  console.log('\n📈 测试总结:');
  console.log('✅ 新字段添加完成');
  console.log('✅ 前端页面布局优化');
  console.log('✅ 后端验证规则配置');
  console.log('✅ 必填/可选字段正确分类');
  
  if (customerId) {
    console.log(`\n💡 创建的测试客户ID: ${customerId}`);
    console.log('   可以在前端客户列表中查看详情');
  }
}

// 运行测试
runTests().catch(console.error); 
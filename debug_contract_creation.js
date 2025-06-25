#!/usr/bin/env node

/**
 * 调试合同创建过程中的服务备注数据处理
 */

const axios = require('axios');

console.log('🔍 调试合同创建过程中的服务备注数据处理');
console.log('=======================================================\n');

// 模拟前端提交的合同创建数据（基于用户日志）
const mockCreateContractRequest = {
  contractNo: "TEST_" + Date.now(),
  contractName: "家政服务合同测试",
  templateNo: "T8888888",  // 需要替换为实际的模板编号
  templateParams: {
    '甲方姓名': '张测试',
    '甲方身份证号': '123456789012345678',
    '甲方联系电话': '13800138000',
    '乙方姓名': '李阿姨',
    '乙方身份证号': '876543210987654321',
    '乙方联系电话': '13900139000',
    '服务费': '5000',
    '服务开始日期': '2024-01-15',
    '服务结束日期': '2024-12-15',
    '服务备注': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服', // 这是关键字段
    '服务内容': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服',
    '服务需求': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服',
    '服务项目': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服'
  },
  validityTime: 30,
  signOrder: 1
};

console.log('📤 模拟前端提交的数据:');
console.log('合同编号:', mockCreateContractRequest.contractNo);
console.log('模板编号:', mockCreateContractRequest.templateNo);
console.log('');

console.log('🎯 服务备注相关字段:');
const serviceFields = ['服务备注', '服务内容', '服务需求', '服务项目'];
serviceFields.forEach(field => {
  if (mockCreateContractRequest.templateParams[field]) {
    console.log(`  ${field}: "${mockCreateContractRequest.templateParams[field]}"`);
  }
});
console.log('');

// 模拟后端convertToFillData的转换过程
function simulateConvertToFillData(templateParams) {
  console.log('🔄 模拟后端convertToFillData转换过程:');
  console.log('=====================================');
  
  const fillData = {};
  
  Object.entries(templateParams).forEach(([key, value]) => {
    console.log(`处理字段 "${key}": "${value}"`);
    
    // 检查是否为服务备注相关字段
    if (key === '服务备注' || key.includes('服务备注') || key.includes('服务内容') || key.includes('服务项目') || key.includes('服务需求')) {
      if (typeof value === 'string' && value.includes('；')) {
        // 将分号分隔的字符串转换为换行符分隔的字符串（多行文本格式）
        const serviceLines = value.split('；').filter(item => item.trim()).join('\\n');
        fillData[key] = serviceLines;
        console.log(`  ✅ 服务字段转换: "${value}" -> "${serviceLines}"`);
      } else {
        fillData[key] = value;
        console.log(`  ℹ️  服务字段保持原样: "${value}"`);
      }
    } else {
      fillData[key] = value;
      console.log(`  ➡️  普通字段: "${value}"`);
    }
  });
  
  console.log('');
  console.log('🎯 转换后的fillData:');
  console.log('=====================================');
  Object.entries(fillData).forEach(([key, value]) => {
    console.log(`"${key}": "${value}"`);
  });
  
  return fillData;
}

// 测试不同的字段名组合
async function testDifferentFieldNames() {
  console.log('\\n🧪 测试不同字段名的数据转换:');
  console.log('=====================================');
  
  const testCases = [
    { name: '服务备注', value: '做饭；做早餐；照顾老人' },
    { name: '服务内容', value: '做饭；做早餐；照顾老人' },
    { name: '服务需求', value: '做饭；做早餐；照顾老人' },
    { name: '服务项目', value: '做饭；做早餐；照顾老人' },
    { name: '其他字段', value: '做饭；做早餐；照顾老人' }
  ];
  
  testCases.forEach(testCase => {
    const testData = { [testCase.name]: testCase.value };
    console.log(`\\n测试字段: "${testCase.name}"`);
    console.log(`输入: "${testCase.value}"`);
    
    const result = simulateConvertToFillData(testData);
    console.log(`输出: "${result[testCase.name]}"`);
    
    // 检查是否正确转换
    const isServiceField = testCase.name === '服务备注' || testCase.name.includes('服务');
    const shouldConvert = isServiceField && testCase.value.includes('；');
    const wasConverted = result[testCase.name].includes('\\n');
    
    if (shouldConvert && wasConverted) {
      console.log('✅ 转换正确');
    } else if (!shouldConvert && !wasConverted) {
      console.log('✅ 不需要转换，保持原样');
    } else {
      console.log('❌ 转换逻辑可能有问题');
    }
  });
}

// 调用创建合同API进行实际测试
async function testCreateContract() {
  console.log('\\n📡 调用创建合同API进行实际测试:');
  console.log('=====================================');
  
  try {
    console.log('正在调用 /api/esign/create-contract...');
    
    const response = await axios.post('http://localhost:3000/api/esign/create-contract', mockCreateContractRequest);
    
    console.log('🎉 API调用成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 检查返回的合同信息
    if (response.data && response.data.data) {
      console.log('\\n📋 合同创建结果:');
      const contractData = response.data.data;
      console.log('合同编号:', contractData.contractNo || '未返回');
      console.log('预览链接:', contractData.previewUrl || '未返回');
      
      if (contractData.contractNo) {
        console.log('\\n💡 建议下一步:');
        console.log('1. 使用合同编号获取合同状态');
        console.log('2. 预览合同检查服务备注字段是否正确显示');
      }
    }
    
  } catch (error) {
    console.error('❌ API调用失败:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\\n💡 可能的原因:');
      console.log('1. 模板编号不正确');
      console.log('2. 必填字段缺失');
      console.log('3. 字段名与模板不匹配');
    } else if (error.response?.status === 404) {
      console.log('\\n💡 API路径可能不正确，请检查后端路由配置');
    }
  }
}

// 主程序
async function main() {
  // 1. 模拟数据转换
  const convertedData = simulateConvertToFillData(mockCreateContractRequest.templateParams);
  
  // 2. 测试不同字段名
  await testDifferentFieldNames();
  
  // 3. 实际测试API调用
  await testCreateContract();
  
  console.log('\\n📝 调试总结:');
  console.log('=====================================');
  console.log('1. 前端数据格式: 分号分隔字符串');
  console.log('2. 后端转换格式: 换行符分隔字符串');
  console.log('3. 关键检查点: 字段名是否与模板匹配');
  console.log('4. 下一步: 获取真实模板字段信息进行对比');
}

main().catch(console.error); 
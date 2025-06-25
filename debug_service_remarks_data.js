#!/usr/bin/env node

/**
 * 调试服务备注数据传递问题 - 模拟前端实际数据
 */

const axios = require('axios');

console.log('🔍 调试服务备注数据传递问题');
console.log('=====================================\n');

// 基于前端日志，模拟实际的数据传递
const mockFrontendData = {
  templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
  validityTime: '365',
  templateParams: {
    // 基本信息
    '客户姓名': '孙学博',
    '客户电话': '18604592681', 
    '客户身份证号': '230623199105111630',
    '阿姨姓名': '朱小双',
    '阿姨电话': '18600455241',
    '阿姨身份证号': '430722198710025361',
    '服务费': '5000',
    '匹配费': '1500',
    
    // 关键问题：服务备注字段 - 前端传递的格式
    '服务备注': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服；洗衣服；打扫卫生；照顾老人；照顾孩子',
    
    // 其他可能的服务字段名
    '服务内容': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服；洗衣服；打扫卫生；照顾老人；照顾孩子',
    '服务需求': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服；洗衣服；打扫卫生；照顾老人；照顾孩子',
    '服务项目': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服；洗衣服；打扫卫生；照顾老人；照顾孩子',
    
    // 时间字段
    '服务开始时间': '2024年1月15日',
    '服务结束时间': '2024年12月15日',
    
    // 大写金额
    '大写服务费': '伍仟元整',
    '匹配费大写': '壹仟伍佰元整'
  }
};

console.log('📤 模拟前端传递的数据:');
console.log('=====================================');
console.log('模板编号:', mockFrontendData.templateNo);
console.log('有效期:', mockFrontendData.validityTime);
console.log('\n📋 模板参数:');

// 重点关注服务相关字段
const serviceFields = ['服务备注', '服务内容', '服务需求', '服务项目'];
serviceFields.forEach(field => {
  if (mockFrontendData.templateParams[field]) {
    console.log('\n�� ' + field + ':');
    console.log('   原始值: "' + mockFrontendData.templateParams[field] + '"');
    console.log('   数据类型: ' + typeof mockFrontendData.templateParams[field]);
    console.log('   长度: ' + mockFrontendData.templateParams[field].length);
    console.log('   分隔符: 分号（；）');
    console.log('   项目数量: ' + mockFrontendData.templateParams[field].split('；').length);
    console.log('   项目列表: ' + JSON.stringify(mockFrontendData.templateParams[field].split('；')));
  }
});

// 模拟后端convertToFillData的转换逻辑
function simulateBackendConversion(templateParams) {
  console.log('\n🔄 模拟后端convertToFillData转换:');
  console.log('=====================================');
  
  const fillData = {};
  
  Object.entries(templateParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      // 特殊处理：服务备注字段（多行文本类型，需要换行符分隔的字符串）
      if (key === '服务备注' || key.includes('服务备注') || key.includes('服务内容') || key.includes('服务项目') || key.includes('服务需求')) {
        if (typeof value === 'string' && value.includes('；')) {
          // 将分号分隔的字符串转换为换行符分隔的字符串（多行文本格式）
          const serviceLines = value.split('；').filter(item => item.trim()).join('\n');
          fillData[key] = serviceLines;
          console.log('🔄 ' + key + ' 字段转换:');
          console.log('   输入: "' + value + '"');
          console.log('   输出: "' + serviceLines + '"');
          console.log('   输出类型: ' + typeof serviceLines);
          console.log('   输出行数: ' + serviceLines.split('\n').length);
        } else {
          fillData[key] = value;
          console.log('📝 ' + key + ' 字段保持不变: "' + value + '"');
        }
      } else {
        fillData[key] = value;
      }
    }
  });
  
  return fillData;
}

const convertedData = simulateBackendConversion(mockFrontendData.templateParams);

console.log('\n📝 转换后的fillData:');
console.log('=====================================');
serviceFields.forEach(field => {
  if (convertedData[field]) {
    console.log('\n✅ ' + field + ':');
    console.log('   最终值: "' + convertedData[field] + '"');
    console.log('   数据类型: ' + typeof convertedData[field]);
    console.log('   是否包含换行符: ' + convertedData[field].includes('\n'));
    if (convertedData[field].includes('\n')) {
      console.log('   行数: ' + convertedData[field].split('\n').length);
      console.log('   每行内容: ' + JSON.stringify(convertedData[field].split('\n')));
    }
  }
});

// 测试实际API调用
async function testActualAPI() {
  console.log('\n🚀 测试实际API调用:');
  console.log('=====================================');
  
  try {
    const contractRequest = {
      contractNo: 'TEST_SERVICE_REMARKS_' + Date.now(),
      contractName: '安得家政服务合同测试',
      templateNo: mockFrontendData.templateNo,
      templateParams: mockFrontendData.templateParams,
      validityTime: parseInt(mockFrontendData.validityTime) || 30,
      signOrder: 1
    };
    
    console.log('📡 发送合同创建请求...');
    console.log('请求数据:', JSON.stringify(contractRequest, null, 2));
    
    const response = await axios.post('http://localhost:3000/api/esign/create-contract', contractRequest);
    
    console.log('\n✅ API调用成功:');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      console.log('\n🎯 关键信息:');
      console.log('合同编号:', response.data.data.contractNo);
      console.log('合同状态:', response.data.data.status);
      console.log('创建时间:', response.data.data.createTime);
    }
    
  } catch (error) {
    console.error('\n❌ API调用失败:');
    console.error('错误信息:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('详细错误:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  // 先显示数据分析
  console.log('\n💡 问题分析总结:');
  console.log('=====================================');
  console.log('1. 前端收集数据格式: 分号分隔字符串');
  console.log('2. 后端转换逻辑: 分号 → 换行符');
  console.log('3. 爱签API要求: 多行文本字符串（换行符分隔）');
  console.log('4. 合同显示异常: 只显示最后一个项目或显示数组格式');
  console.log('\n可能的问题:');
  console.log('- 字段名不匹配（模板中的实际字段名与前端使用的不同）');
  console.log('- 数据类型错误（传递了数组而不是字符串）');
  console.log('- 后端转换逻辑未生效');
  
  // 测试实际API
  await testActualAPI();
}

main().catch(console.error); 
#!/usr/bin/env node

/**
 * 获取真实模板字段信息，确认服务相关字段名称
 */

const axios = require('axios');

console.log('🔍 获取真实模板字段信息');
console.log('=====================================\n');

// 使用前端日志中的实际模板编号
const templateNo = 'TNF606E6D81E2D49C99CC983F4D0412276-3387';

async function getTemplateData() {
  try {
    console.log('📡 调用后端API获取模板数据...');
    console.log('模板编号:', templateNo);
    
    const response = await axios.post('http://localhost:3000/api/esign/template/data', {
      templateIdent: templateNo
    });
    
    console.log('✅ API调用成功');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const fields = response.data.data;
      console.log('\n📋 模板字段列表:');
      console.log('=====================================');
      
      fields.forEach((field, index) => {
        console.log(`${index + 1}. 字段名: "${field.dataKey}"`);
        console.log(`   数据类型: ${field.dataType} (${getDataTypeDescription(field.dataType)})`);
        console.log(`   填充类型: ${field.fillType}`);
        console.log(`   必填: ${field.required === 1 ? '是' : '否'}`);
        console.log(`   页码: ${field.page}`);
        console.log('');
      });
      
      // 查找服务相关字段
      console.log('🎯 服务相关字段分析:');
      console.log('=====================================');
      
      const serviceFields = fields.filter(field => 
        field.dataKey && (
          field.dataKey.includes('服务') ||
          field.dataKey.includes('备注') ||
          field.dataKey.includes('需求') ||
          field.dataKey.includes('内容') ||
          field.dataKey.includes('项目')
        )
      );
      
      if (serviceFields.length > 0) {
        serviceFields.forEach(field => {
          console.log(`🎯 找到服务字段: "${field.dataKey}"`);
          console.log(`   数据类型: ${field.dataType} (${getDataTypeDescription(field.dataType)})`);
          console.log(`   ${field.dataType === 8 ? '✅ 这是多行文本字段！' : '⚠️ 不是多行文本字段'}`);
          console.log('');
        });
        
        console.log('💡 前端应该使用的字段名:');
        serviceFields.forEach(field => {
          console.log(`   "${field.dataKey}"`);
        });
      } else {
        console.log('❌ 未找到明确的服务相关字段');
        console.log('📋 所有字段名列表:');
        fields.forEach(field => {
          console.log(`   "${field.dataKey}"`);
        });
      }
      
    } else {
      console.log('❌ 响应数据格式不正确');
    }
    
  } catch (error) {
    console.error('❌ API调用失败:', error.response?.data || error.message);
  }
}

function getDataTypeDescription(dataType) {
  const types = {
    1: '单行文本',
    2: '数字',
    3: '日期',
    4: '身份证',
    5: '手机号',
    6: '邮箱',
    7: '下拉选择',
    8: '多行文本',
    9: '图片',
    10: '附件'
  };
  return types[dataType] || '未知类型';
}

// 模拟前端当前使用的字段名
function analyzeFieldMapping() {
  console.log('\n🔍 前端字段名映射分析:');
  console.log('=====================================');
  
  const frontendFields = [
    '服务备注',
    '服务内容', 
    '服务需求',
    '服务项目'
  ];
  
  console.log('前端可能使用的字段名:');
  frontendFields.forEach(field => {
    console.log(`   "${field}"`);
  });
  
  console.log('\n💡 如果字段名不匹配，需要：');
  console.log('1. 更新前端代码中的字段名');
  console.log('2. 更新后端convertToFillData方法中的字段名匹配逻辑');
}

async function main() {
  await getTemplateData();
  analyzeFieldMapping();
  
  console.log('\n📝 下一步操作:');
  console.log('=====================================');
  console.log('1. 确认模板中的实际服务字段名');
  console.log('2. 对比前端使用的字段名');
  console.log('3. 如有不匹配，修正字段名映射');
  console.log('4. 重新测试合同创建功能');
}

main().catch(console.error); 
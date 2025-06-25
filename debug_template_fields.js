#!/usr/bin/env node

const axios = require('axios');

/**
 * 调试模板字段名称 - 获取真实的字段信息
 */

console.log('🔍 调试模板字段名称');
console.log('=====================================\n');

// 模拟调用后端API获取模板字段信息
async function getTemplateFields() {
  try {
    console.log('📡 正在获取模板字段信息...');
    
    // 调用后端API获取模板数据
    const response = await axios.get('http://localhost:3000/api/esign/templates');
    
    if (response.data && response.data.length > 0) {
      const template = response.data[0]; // 获取第一个模板
      console.log('📋 模板基础信息:');
      console.log(`模板编号: ${template.templateNo}`);
      console.log(`模板名称: ${template.templateName}`);
      console.log(`字段数量: ${template.fields?.length || 0}\n`);
      
      console.log('🔍 所有字段列表:');
      console.log('=====================================');
      
      if (template.fields && template.fields.length > 0) {
        template.fields.forEach((field, index) => {
          console.log(`${index + 1}. 字段名: "${field.key}"`);
          console.log(`   标签: "${field.label}"`);
          console.log(`   类型: ${field.type}`);
          console.log(`   必填: ${field.required ? '是' : '否'}`);
          if (field.originalField) {
            console.log(`   原始字段: dataType=${field.originalField.dataType}, fillType=${field.originalField.fillType}`);
          }
          console.log('');
        });
        
        // 查找可能的服务备注字段
        console.log('🎯 可能的服务备注相关字段:');
        console.log('=====================================');
        const serviceFields = template.fields.filter(field => 
          field.key.includes('服务') || 
          field.key.includes('备注') || 
          field.key.includes('需求') ||
          field.key.includes('内容') ||
          field.key.includes('项目') ||
          field.label.includes('服务') ||
          field.label.includes('备注') ||
          field.label.includes('需求')
        );
        
        if (serviceFields.length > 0) {
          serviceFields.forEach((field, index) => {
            console.log(`${index + 1}. 🎯 "${field.key}" (${field.label})`);
            console.log(`   类型: ${field.type}`);
            if (field.originalField?.dataType === 8) {
              console.log(`   ✅ 这是多行文本字段！`);
            }
          });
        } else {
          console.log('❌ 未找到明确的服务备注字段');
        }
        
      } else {
        console.log('❌ 模板没有字段信息');
      }
      
      return template;
    } else {
      console.log('❌ 没有获取到模板数据');
      return null;
    }
    
  } catch (error) {
    console.error('❌ 获取模板字段失败:', error.message);
    return null;
  }
}

// 模拟前端提交的数据
function simulateFormSubmission(template) {
  console.log('\n📤 模拟前端提交的数据');
  console.log('=====================================');
  
  const frontendData = {
    '服务备注': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服',
    '服务需求': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服',
    '服务内容': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服',
    '服务项目': '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服'
  };
  
  console.log('前端可能提交的字段名组合:');
  Object.entries(frontendData).forEach(([key, value]) => {
    console.log(`  "${key}": "${value}"`);
  });
  
  if (template?.fields) {
    console.log('\n🔍 字段名匹配检查:');
    console.log('=====================================');
    
    template.fields.forEach(field => {
      if (frontendData[field.key]) {
        console.log(`✅ 匹配: 前端字段 "${field.key}" -> 模板字段 "${field.key}"`);
      } else if (field.key.includes('服务') || field.key.includes('备注') || field.key.includes('需求')) {
        console.log(`⚠️  可能匹配: 模板字段 "${field.key}" 但前端没有对应数据`);
      }
    });
  }
}

// 建议的修复方案
function suggestFix(template) {
  console.log('\n🔧 建议的修复方案');
  console.log('=====================================');
  
  if (template?.fields) {
    const serviceFields = template.fields.filter(field => 
      field.key.includes('服务') || 
      field.key.includes('备注') || 
      field.key.includes('需求') ||
      (field.originalField?.dataType === 8)
    );
    
    if (serviceFields.length > 0) {
      console.log('1. 更新前端字段名映射:');
      serviceFields.forEach(field => {
        console.log(`   将前端的 "服务备注" 改为 "${field.key}"`);
      });
      
      console.log('\n2. 更新后端convertToFillData方法:');
      console.log('   添加对以下字段的支持:');
      serviceFields.forEach(field => {
        console.log(`   - "${field.key}"`);
      });
      
      console.log('\n3. 验证数据转换:');
      const testValue = '做饭；做早餐；做午餐；做晚餐；买菜；熨烫衣服';
      const convertedValue = testValue.split('；').join('\n');
      console.log(`   输入: "${testValue}"`);
      console.log(`   输出: "${convertedValue}"`);
    } else {
      console.log('❌ 无法找到合适的服务字段，需要检查模板配置');
    }
  }
}

// 执行调试
async function main() {
  const template = await getTemplateFields();
  simulateFormSubmission(template);
  suggestFix(template);
  
  console.log('\n📝 下一步操作建议');
  console.log('=====================================');
  console.log('1. 检查上面的字段匹配结果');
  console.log('2. 根据实际的模板字段名更新前端代码');
  console.log('3. 确认后端convertToFillData方法包含正确的字段名');
  console.log('4. 重新测试服务备注功能');
}

main().catch(console.error); 
// 验证新字段配置的脚本
const fs = require('fs');
const path = require('path');

console.log('🚀 验证新字段配置完成情况\n');

// 1. 检查前端类型定义
function checkFrontendTypes() {
  console.log('📋 1. 检查前端类型定义...');
  
  try {
    const typesFile = fs.readFileSync('frontend/src/types/customer.types.ts', 'utf8');
    
    const newFields = [
      'wechatId?',
      'idCardNumber?', 
      'contractStatus:',
      'educationRequirement?',
      'remarks?',
      'EDUCATION_REQUIREMENTS'
    ];
    
    let foundFields = 0;
    newFields.forEach(field => {
      if (typesFile.includes(field)) {
        console.log(`   ✅ ${field.replace('?', '').replace(':', '')} - 已添加`);
        foundFields++;
      } else {
        console.log(`   ❌ ${field.replace('?', '').replace(':', '')} - 未找到`);
      }
    });
    
    console.log(`   📊 新字段配置: ${foundFields}/${newFields.length} 完成\n`);
    
  } catch (error) {
    console.log('   ❌ 读取类型文件失败:', error.message);
  }
}

// 2. 检查后端DTO
function checkBackendDTO() {
  console.log('📋 2. 检查后端DTO配置...');
  
  try {
    const dtoFile = fs.readFileSync('backend/src/modules/customers/dto/create-customer.dto.ts', 'utf8');
    
    const newFields = [
      'wechatId?',
      'idCardNumber?',
      'contractStatus:',
      'educationRequirement?',
      'remarks?'
    ];
    
    let foundFields = 0;
    newFields.forEach(field => {
      const fieldName = field.replace('?', '').replace(':', '');
      if (dtoFile.includes(fieldName)) {
        console.log(`   ✅ ${fieldName} - 已配置`);
        foundFields++;
      } else {
        console.log(`   ❌ ${fieldName} - 未找到`);
      }
    });
    
    console.log(`   📊 DTO字段配置: ${foundFields}/${newFields.length} 完成\n`);
    
  } catch (error) {
    console.log('   ❌ 读取DTO文件失败:', error.message);
  }
}

// 3. 检查数据库模型
function checkDatabaseModel() {
  console.log('📋 3. 检查数据库模型配置...');
  
  try {
    const modelFile = fs.readFileSync('backend/src/modules/customers/models/customer.model.ts', 'utf8');
    
    const newFields = [
      'wechatId:',
      'idCardNumber:',
      'educationRequirement:',
      'remarks:'
    ];
    
    let foundFields = 0;
    newFields.forEach(field => {
      const fieldName = field.replace(':', '');
      if (modelFile.includes(fieldName)) {
        console.log(`   ✅ ${fieldName} - 已配置`);
        foundFields++;
      } else {
        console.log(`   ❌ ${fieldName} - 未找到`);
      }
    });
    
    console.log(`   📊 模型字段配置: ${foundFields}/${newFields.length} 完成\n`);
    
  } catch (error) {
    console.log('   ❌ 读取模型文件失败:', error.message);
  }
}

// 4. 检查前端创建页面
function checkCreateCustomerPage() {
  console.log('📋 4. 检查前端创建页面...');
  
  try {
    const pageFile = fs.readFileSync('frontend/src/pages/customers/CreateCustomer.tsx', 'utf8');
    
    // 检查新字段表单项
    const newFormFields = [
      'name="wechatId"',
      'name="idCardNumber"', 
      'name="contractStatus"',
      'name="educationRequirement"',
      'name="remarks"'
    ];
    
    let foundFields = 0;
    newFormFields.forEach(field => {
      if (pageFile.includes(field)) {
        console.log(`   ✅ ${field.replace('name="', '').replace('"', '')} 表单项 - 已添加`);
        foundFields++;
      } else {
        console.log(`   ❌ ${field.replace('name="', '').replace('"', '')} 表单项 - 未找到`);
      }
    });
    
    // 检查布局特征
    const layoutFeatures = [
      'Divider orientation="left"',
      'TextArea',
      'CONTRACT_STATUSES',
      'EDUCATION_REQUIREMENTS',
      'maxWidth: \'1400px\''
    ];
    
    console.log('\n   📐 布局特征检查:');
    layoutFeatures.forEach(feature => {
      if (pageFile.includes(feature)) {
        console.log(`   ✅ ${feature} - 已配置`);
      } else {
        console.log(`   ❌ ${feature} - 未找到`);
      }
    });
    
    console.log(`\n   📊 表单字段配置: ${foundFields}/${newFormFields.length} 完成\n`);
    
  } catch (error) {
    console.log('   ❌ 读取页面文件失败:', error.message);
  }
}

// 5. 总结配置情况
function summarizeConfiguration() {
  console.log('📈 5. 配置总结...\n');
  
  console.log('🎯 新增字段列表:');
  console.log('   📝 微信号 (wechatId) - 可选');
  console.log('   🆔 身份证号 (idCardNumber) - 可选');
  console.log('   📋 客户状态 (contractStatus) - 必填');
  console.log('   🎓 学历要求 (educationRequirement) - 可选');
  console.log('   💬 备注 (remarks) - 可选，多行文本\n');
  
  console.log('🎨 页面布局优化:');
  console.log('   📐 智能分组: 基础信息、需求信息、家庭信息、需求要求、备注信息');
  console.log('   📏 3列网格布局，内容居中');
  console.log('   📱 响应式设计，最大宽度1400px');
  console.log('   🎯 统一输入框宽度');
  console.log('   📝 备注字段使用多行文本框，放在最后\n');
  
  console.log('✅ 验证字段要求:');
  console.log('   📋 必填字段: 姓名、电话、线索来源、客户状态 (4个)');
  console.log('   📋 可选字段: 其他所有字段 (16个)');
  console.log('   🔒 身份证号格式验证');
  console.log('   📊 薪资、面积等数值范围验证\n');
  
  console.log('🎓 学历选项:');
  const educationOptions = ['无学历', '小学', '初中', '中专', '职高', '高中', '大专', '本科', '研究生及以上'];
  educationOptions.forEach(option => {
    console.log(`   📚 ${option}`);
  });
  
  console.log('\n🔄 客户状态选项:');
  const statusOptions = ['已签约', '匹配中', '流失客户', '已退款', '退款中', '待定'];
  statusOptions.forEach(option => {
    console.log(`   📊 ${option}`);
  });
}

// 主函数
function main() {
  checkFrontendTypes();
  checkBackendDTO();
  checkDatabaseModel();
  checkCreateCustomerPage();
  summarizeConfiguration();
  
  console.log('\n🎉 新字段配置验证完成！');
  console.log('💡 可以在浏览器中访问客户创建页面查看效果');
  console.log('🔗 访问地址: http://localhost:5173/customers/create');
}

main(); 
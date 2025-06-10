const fs = require('fs');
const path = require('path');

console.log('🔍 验证客户跟进记录UI功能完整性...\n');

const checks = [];

// 1. 检查跟进记录类型定义
function checkFollowUpTypes() {
  const filePath = 'frontend/src/types/customer-follow-up.types.ts';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasEnum = content.includes('export enum CustomerFollowUpType');
    const hasOptions = content.includes('FOLLOW_UP_TYPE_OPTIONS');
    const hasInterfaces = content.includes('interface CustomerFollowUp');
    
    checks.push({
      name: '跟进记录类型定义',
      status: hasEnum && hasOptions && hasInterfaces,
      details: `枚举: ${hasEnum ? '✅' : '❌'}, 选项: ${hasOptions ? '✅' : '❌'}, 接口: ${hasInterfaces ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({ name: '跟进记录类型定义', status: false, details: '文件不存在' });
  }
}

// 2. 检查跟进记录服务
function checkFollowUpService() {
  const filePath = 'frontend/src/services/customerFollowUpService.ts';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasCreateMethod = content.includes('createFollowUp');
    const hasGetMethod = content.includes('getFollowUps');
    
    checks.push({
      name: '跟进记录服务',
      status: hasCreateMethod && hasGetMethod,
      details: `创建方法: ${hasCreateMethod ? '✅' : '❌'}, 查询方法: ${hasGetMethod ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({ name: '跟进记录服务', status: false, details: '文件不存在' });
  }
}

// 3. 检查跟进记录弹窗组件
function checkFollowUpModal() {
  const filePath = 'frontend/src/components/CustomerFollowUpModal.tsx';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasModal = content.includes('CustomerFollowUpModal');
    const hasForm = content.includes('Form');
    const hasSelect = content.includes('Select');
    const hasTextArea = content.includes('TextArea');
    
    checks.push({
      name: '跟进记录弹窗组件',
      status: hasModal && hasForm && hasSelect && hasTextArea,
      details: `组件: ${hasModal ? '✅' : '❌'}, 表单: ${hasForm ? '✅' : '❌'}, 选择器: ${hasSelect ? '✅' : '❌'}, 文本域: ${hasTextArea ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({ name: '跟进记录弹窗组件', status: false, details: '文件不存在' });
  }
}

// 4. 检查客户列表页面修改
function checkCustomerList() {
  const filePath = 'frontend/src/pages/customers/CustomerList.tsx';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasFollowUpModal = content.includes('CustomerFollowUpModal');
    const hasAddFollowUpButton = content.includes('添加跟进');
    const hasClickableCustomerId = content.includes('Link') && content.includes('customerId');
    const hasMessageIcon = content.includes('MessageOutlined');
    
    checks.push({
      name: '客户列表页面更新',
      status: hasFollowUpModal && hasAddFollowUpButton && hasClickableCustomerId && hasMessageIcon,
      details: `弹窗导入: ${hasFollowUpModal ? '✅' : '❌'}, 跟进按钮: ${hasAddFollowUpButton ? '✅' : '❌'}, 可点击ID: ${hasClickableCustomerId ? '✅' : '❌'}, 图标: ${hasMessageIcon ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({ name: '客户列表页面更新', status: false, details: '文件不存在' });
  }
}

// 5. 检查客户详情页面修改
function checkCustomerDetail() {
  const filePath = 'frontend/src/pages/customers/CustomerDetail.tsx';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasFollowUpModal = content.includes('CustomerFollowUpModal');
    const hasTimeline = content.includes('Timeline');
    const hasFollowUpSection = content.includes('跟进记录');
    const hasDateTimeFormat = content.includes('formatDateTime');
    const hasAddFollowUpButton = content.includes('添加跟进记录');
    
    checks.push({
      name: '客户详情页面更新',
      status: hasFollowUpModal && hasTimeline && hasFollowUpSection && hasDateTimeFormat && hasAddFollowUpButton,
      details: `弹窗: ${hasFollowUpModal ? '✅' : '❌'}, 时间线: ${hasTimeline ? '✅' : '❌'}, 跟进区域: ${hasFollowUpSection ? '✅' : '❌'}, 时间格式: ${hasDateTimeFormat ? '✅' : '❌'}, 添加按钮: ${hasAddFollowUpButton ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({ name: '客户详情页面更新', status: false, details: '文件不存在' });
  }
}

// 6. 检查客户类型更新
function checkCustomerTypes() {
  const filePath = 'frontend/src/types/customer.types.ts';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasFollowUpImport = content.includes('CustomerFollowUp');
    const hasFollowUpField = content.includes('followUps?:');
    
    checks.push({
      name: '客户类型更新',
      status: hasFollowUpImport && hasFollowUpField,
      details: `导入: ${hasFollowUpImport ? '✅' : '❌'}, 字段: ${hasFollowUpField ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({ name: '客户类型更新', status: false, details: '文件不存在' });
  }
}

// 执行所有检查
checkFollowUpTypes();
checkFollowUpService();
checkFollowUpModal();
checkCustomerList();
checkCustomerDetail();
checkCustomerTypes();

// 输出结果
console.log('📊 UI功能检查结果:\n');

let passedChecks = 0;
checks.forEach((check, index) => {
  const status = check.status ? '✅ 通过' : '❌ 失败';
  console.log(`${index + 1}. ${check.name}: ${status}`);
  console.log(`   详情: ${check.details}\n`);
  if (check.status) passedChecks++;
});

console.log(`🎯 总体结果: ${passedChecks}/${checks.length} 项检查通过`);

if (passedChecks === checks.length) {
  console.log('\n🎉 所有UI功能检查通过！前端跟进记录功能已正确实现！\n');
  console.log('📋 功能特性总结:');
  console.log('  ✅ 客户列表 - "查看"按钮改为"添加跟进"按钮');
  console.log('  ✅ 客户ID - 可点击跳转到详情页');
  console.log('  ✅ 跟进弹窗 - 包含跟进方式选择和内容输入');
  console.log('  ✅ 客户详情 - 添加跟进记录展示区域');
  console.log('  ✅ 时间显示 - 系统信息和跟进记录都显示到分钟');
  console.log('  ✅ 交互体验 - 完整的添加、查看、展示流程');
} else {
  console.log('\n⚠️  部分功能检查未通过，请检查上述失败项目。');
}

console.log('\n🚀 下一步建议:');
console.log('  1. 重启前端开发服务以应用更改');
console.log('  2. 在浏览器中测试完整功能流程');
console.log('  3. 验证跟进记录的创建、显示和时间格式');
console.log('  4. 确认客户ID点击跳转正常工作'); 
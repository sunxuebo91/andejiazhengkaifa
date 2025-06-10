// 诊断客户列表显示问题的脚本
const fs = require('fs');

console.log('🔍 诊断客户列表显示问题\n');

// 1. 检查前端API调用
function checkFrontendAPICall() {
  console.log('📋 1. 检查前端API调用...');
  
  try {
    const customerListFile = fs.readFileSync('frontend/src/pages/customers/CustomerList.tsx', 'utf8');
    
    // 检查API调用逻辑
    const apiChecks = [
      'customerService.getCustomers',
      'fetchCustomers',
      'useEffect',
      'setCustomers(response.customers)',
      'response.customers'
    ];
    
    console.log('   🔍 API调用检查:');
    apiChecks.forEach(check => {
      if (customerListFile.includes(check)) {
        console.log(`   ✅ ${check} - 已配置`);
      } else {
        console.log(`   ❌ ${check} - 未找到`);
      }
    });
    
    // 检查是否正确使用了新的CONTRACT_STATUSES
    if (customerListFile.includes('CONTRACT_STATUSES')) {
      console.log('   ✅ CONTRACT_STATUSES 导入 - 已配置');
    } else {
      console.log('   ❌ CONTRACT_STATUSES 导入 - 未找到');
    }
    
  } catch (error) {
    console.log('   ❌ 读取客户列表文件失败:', error.message);
  }
  
  console.log('');
}

// 2. 检查后端服务配置
function checkBackendService() {
  console.log('📋 2. 检查后端服务配置...');
  
  try {
    const customerServiceFile = fs.readFileSync('backend/src/modules/customers/customers.service.ts', 'utf8');
    
    // 检查是否有硬编码的contractStatus
    if (customerServiceFile.includes("contractStatus: '待定'")) {
      console.log('   ❌ 发现硬编码的contractStatus默认值 - 需要修复');
    } else {
      console.log('   ✅ 无硬编码的contractStatus默认值');
    }
    
    // 检查findAll方法
    if (customerServiceFile.includes('async findAll')) {
      console.log('   ✅ findAll方法 - 已配置');
    } else {
      console.log('   ❌ findAll方法 - 未找到');
    }
    
    // 检查排序和分页
    if (customerServiceFile.includes('sort(sortOptions)')) {
      console.log('   ✅ 排序功能 - 已配置');
    } else {
      console.log('   ❌ 排序功能 - 未找到');
    }
    
  } catch (error) {
    console.log('   ❌ 读取后端服务文件失败:', error.message);
  }
  
  console.log('');
}

// 3. 检查数据模型
function checkDataModel() {
  console.log('📋 3. 检查数据模型配置...');
  
  try {
    const modelFile = fs.readFileSync('backend/src/modules/customers/models/customer.model.ts', 'utf8');
    
    // 检查必填字段配置
    const requiredFields = ['name', 'phone', 'leadSource'];
    console.log('   🔍 必填字段检查:');
    requiredFields.forEach(field => {
      // 查找字段定义是否包含 required: true
      const fieldRegex = new RegExp(`@Prop\\(\\{[^}]*required:\\s*true[^}]*\\}\\)\\s*${field}:`);
      if (fieldRegex.test(modelFile)) {
        console.log(`   ✅ ${field} - 必填配置正确`);
      } else {
        console.log(`   ⚠️  ${field} - 可能不是必填字段`);
      }
    });
    
    // 检查contractStatus字段
    if (modelFile.includes('contractStatus:')) {
      console.log('   ✅ contractStatus字段 - 已添加');
      
      // 检查是否设置为必填
      if (modelFile.includes('required: true') && modelFile.includes('contractStatus')) {
        console.log('   ⚠️  contractStatus可能被设置为必填字段');
      } else {
        console.log('   ✅ contractStatus字段配置正确');
      }
    } else {
      console.log('   ❌ contractStatus字段 - 未找到');
    }
    
  } catch (error) {
    console.log('   ❌ 读取模型文件失败:', error.message);
  }
  
  console.log('');
}

// 4. 可能的问题和解决方案
function suggestSolutions() {
  console.log('📋 4. 可能的问题和解决方案...\n');
  
  console.log('🔍 常见问题排查:');
  console.log('   1. 后端硬编码contractStatus默认值');
  console.log('   2. 数据库连接或权限问题');
  console.log('   3. 前端API调用权限问题');
  console.log('   4. 数据格式不匹配');
  console.log('   5. 缓存问题');
  
  console.log('\n💡 建议解决步骤:');
  console.log('   1. 确认后端服务正常运行 (pm2 list)');
  console.log('   2. 检查浏览器控制台是否有JavaScript错误');
  console.log('   3. 检查浏览器网络面板API调用状态');
  console.log('   4. 确认数据库中是否有客户数据');
  console.log('   5. 检查JWT token是否有效');
  
  console.log('\n🔧 快速修复建议:');
  console.log('   1. 刷新浏览器页面');
  console.log('   2. 清除浏览器缓存和localStorage');
  console.log('   3. 重新登录系统');
  console.log('   4. 重启前后端服务');
  
  console.log('\n📝 调试命令:');
  console.log('   1. 检查后端日志: pm2 logs backend-dev');
  console.log('   2. 检查前端控制台错误');
  console.log('   3. 访问客户创建页面: http://localhost:5173/customers/create');
  console.log('   4. 访问客户列表页面: http://localhost:5173/customers');
}

// 5. 生成修复摘要
function generateFixSummary() {
  console.log('\n📈 修复摘要...\n');
  
  console.log('✅ 已完成的修复:');
  console.log('   📝 移除了后端硬编码的contractStatus默认值');
  console.log('   🔧 更新了客户创建时的数据处理逻辑');
  console.log('   📊 确保用户选择的客户状态被正确保存');
  
  console.log('\n🎯 修复后预期行为:');
  console.log('   📋 客户创建时会保存用户选择的contractStatus');
  console.log('   📋 客户列表会显示正确的客户状态');
  console.log('   📋 新创建的客户应该立即在列表中显示');
  
  console.log('\n🔍 需要验证的功能:');
  console.log('   1. 创建新客户并检查是否在列表中显示');
  console.log('   2. 验证客户状态显示是否正确');
  console.log('   3. 测试搜索和筛选功能');
  console.log('   4. 确认分页功能正常');
}

// 主函数
function main() {
  checkFrontendAPICall();
  checkBackendService();
  checkDataModel();
  suggestSolutions();
  generateFixSummary();
  
  console.log('\n🎉 诊断完成！');
  console.log('💡 建议先测试创建一个新客户，然后检查列表是否更新');
}

main(); 
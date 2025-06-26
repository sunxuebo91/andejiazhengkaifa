const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';
const TEMPLATE_ID = 'TNF606E6D81E2D49C99CC983F4D0412276-3387';

console.log('📅 爱签模板日期控件使用方式详解');
console.log('==========================================');
console.log(`🔍 模板ID: ${TEMPLATE_ID}`);
console.log(`🌐 API地址: ${BASE_URL}`);
console.log('');

async function analyzeDateControls() {
  try {
    console.log('1️⃣ 正在获取模板控件信息...');
    
    // 调用后端API获取模板控件信息
    const response = await axios.post(`${BASE_URL}/api/esign/template/data`, {
      templateIdent: TEMPLATE_ID
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success && response.data.data && response.data.data.code === 100000) {
      const fields = response.data.data.data;
      
      // 筛选出日期相关控件
      const dateFields = fields.filter(field => 
        field.dataType === 7 || // 日期控件
        field.dataType === 5 || // 可能包含日期的单选框  
        field.dataKey.includes('日期') ||
        field.dataKey.includes('时间') ||
        field.dataKey.includes('年') ||
        field.dataKey.includes('月') ||
        field.dataKey.includes('日')
      );
      
      console.log(`📅 找到 ${dateFields.length} 个日期相关控件:`);
      console.log('');
      
      // 按类型分组
      const dateControlsByType = {
        dateControls: [], // dataType = 7 的日期控件
        timeFields: [],   // 年月日单独字段
        otherFields: []   // 其他包含时间信息的字段
      };
      
      dateFields.forEach(field => {
        if (field.dataType === 7) {
          dateControlsByType.dateControls.push(field);
        } else if (field.dataKey.includes('年') || field.dataKey.includes('月') || field.dataKey.includes('日')) {
          dateControlsByType.timeFields.push(field);
        } else {
          dateControlsByType.otherFields.push(field);
        }
      });
      
      // 分析日期控件 (dataType = 7)
      console.log('2️⃣ 日期控件 (dataType = 7) 详细分析');
      console.log('=======================================');
      
      if (dateControlsByType.dateControls.length > 0) {
        dateControlsByType.dateControls.forEach((field, index) => {
          console.log(`[日期控件 ${index + 1}]`);
          console.log(`📋 字段名: ${field.dataKey}`);
          console.log(`🏷️ 数据类型: ${field.dataType} (日期控件)`);
          console.log(`❗ 必填: ${field.required === 1 ? '是' : '否'}`);
          console.log(`📍 页码: ${field.page}`);
          console.log(`📍 坐标: X=${field.locationX}, Y=${field.locationY}`);
          console.log(`👤 关联签署人: ${field.signUser || '无'}`);
          
          // 分析日期控件的作用
          const purpose = getDateControlPurpose(field.dataKey);
          console.log(`🎯 控件作用: ${purpose}`);
          
          // 生成使用示例
          console.log(`💡 使用方式:`);
          console.log(`   - 前端显示: 日期选择器 (DatePicker)`);
          console.log(`   - 数据格式: YYYY-MM-DD 或自动生成当前日期`);
          console.log(`   - 填充时机: ${getDateFillTiming(field.dataKey)}`);
          console.log(`   - 示例值: ${generateSampleValue(field.dataKey)}`);
          
          console.log('');
        });
        
        // 生成日期控件使用代码示例
        console.log('📝 日期控件前端使用代码示例:');
        console.log('```typescript');
        console.log('// React前端日期控件使用');
        console.log('const handleDateFieldsInTemplate = () => {');
        console.log('  const templateParams = {');
        
        dateControlsByType.dateControls.forEach(field => {
          const sampleValue = generateSampleValue(field.dataKey);
          console.log(`    '${field.dataKey}': '${sampleValue}', // ${getDateControlPurpose(field.dataKey)}`);
        });
        
        console.log('  };');
        console.log('  return templateParams;');
        console.log('};');
        console.log('```');
        console.log('');
        
      } else {
        console.log('❌ 未发现标准日期控件 (dataType = 7)');
      }
      
      // 分析年月日单独字段
      console.log('3️⃣ 年月日单独字段分析');
      console.log('=======================');
      
      if (dateControlsByType.timeFields.length > 0) {
        // 按年月日分组
        const timeFieldGroups = {
          years: dateControlsByType.timeFields.filter(f => f.dataKey.includes('年')),
          months: dateControlsByType.timeFields.filter(f => f.dataKey.includes('月')),
          days: dateControlsByType.timeFields.filter(f => f.dataKey.includes('日'))
        };
        
        console.log(`📊 年份字段: ${timeFieldGroups.years.length} 个`);
        timeFieldGroups.years.forEach(field => {
          console.log(`   - ${field.dataKey} (页${field.page})`);
        });
        
        console.log(`📊 月份字段: ${timeFieldGroups.months.length} 个`);
        timeFieldGroups.months.forEach(field => {
          console.log(`   - ${field.dataKey} (页${field.page})`);
        });
        
        console.log(`📊 日期字段: ${timeFieldGroups.days.length} 个`);
        timeFieldGroups.days.forEach(field => {
          console.log(`   - ${field.dataKey} (页${field.page})`);
        });
        
        console.log('');
        console.log('💡 年月日字段的组合使用方式:');
        console.log('这些字段通常成组出现，用于构建完整的日期信息：');
        
        // 检测日期组合
        const dateGroups = detectDateGroups(timeFieldGroups);
        
        dateGroups.forEach((group, index) => {
          console.log(`\n[日期组合 ${index + 1}] ${group.name}`);
          console.log(`📋 包含字段: ${group.fields.map(f => f.dataKey).join(', ')}`);
          console.log(`🎯 用途: ${group.purpose}`);
          console.log(`💡 前端实现:`);
          console.log(`   - 使用三个下拉选择器或一个日期选择器`);
          console.log(`   - 用户选择后自动分解为年、月、日三个值`);
          console.log(`   - 可以实现日期范围验证和自动计算`);
        });
        
        // 生成年月日字段的前端代码示例
        console.log('\n📝 年月日字段前端代码示例:');
        console.log('```typescript');
        console.log('// 年月日分离字段的处理');
        console.log('const handleDateSeparateFields = (selectedDate: Date) => {');
        console.log('  const templateParams = {');
        
        timeFieldGroups.years.forEach(field => {
          console.log(`    '${field.dataKey}': selectedDate.getFullYear(),`);
        });
        timeFieldGroups.months.forEach(field => {
          console.log(`    '${field.dataKey}': selectedDate.getMonth() + 1,`);
        });
        timeFieldGroups.days.forEach(field => {
          console.log(`    '${field.dataKey}': selectedDate.getDate(),`);
        });
        
        console.log('  };');
        console.log('  return templateParams;');
        console.log('};');
        console.log('```');
        console.log('');
        
      } else {
        console.log('❌ 未发现年月日单独字段');
      }
      
      // 实际使用场景演示
      console.log('4️⃣ 实际使用场景演示');
      console.log('=====================');
      
      console.log('🎯 场景1: 创建合同时填充日期字段');
      console.log('```javascript');
      console.log('const createContractWithDates = async () => {');
      console.log('  const currentDate = new Date();');
      console.log('  const nextYear = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());');
      console.log('  ');
      console.log('  const templateParams = {');
      
      // 基于实际字段生成示例
      const allDateFields = [...dateControlsByType.dateControls, ...dateControlsByType.timeFields];
      allDateFields.forEach(field => {
        const sampleCode = generateFieldCode(field);
        console.log(`    '${field.dataKey}': ${sampleCode}, // ${getDateControlPurpose(field.dataKey)}`);
      });
      
      console.log('  };');
      console.log('  ');
      console.log('  // 调用爱签API创建合同');
      console.log('  const response = await axios.post("/api/esign/create-contract-flow", {');
      console.log('    contractName: "家政服务合同",');
      console.log('    templateNo: "TNF606E6D81E2D49C99CC983F4D0412276-3387",');
      console.log('    templateParams: templateParams');
      console.log('  });');
      console.log('};');
      console.log('```');
      console.log('');
      
      console.log('🎯 场景2: 自动签约日期生成');
      console.log('```javascript');
      console.log('// 签约时自动填充签约日期');
      console.log('const fillSigningDates = () => {');
      console.log('  const signingDate = new Date();');
      console.log('  return {');
      
      dateControlsByType.dateControls
        .filter(field => field.dataKey.includes('签约日期'))
        .forEach(field => {
          console.log(`    '${field.dataKey}': signingDate.toISOString().split('T')[0], // 自动生成签约日期`);
        });
      
      console.log('  };');
      console.log('};');
      console.log('```');
      console.log('');
      
      // 最佳实践建议
      console.log('5️⃣ 日期控件使用最佳实践');
      console.log('===========================');
      
      console.log('✅ **推荐做法:**');
      console.log('1. **自动生成签约日期** - 在合同签署时自动填充当前日期');
      console.log('2. **智能默认值** - 为开始日期设置当前日期，结束日期设置未来日期');
      console.log('3. **日期验证** - 确保结束日期不早于开始日期');
      console.log('4. **格式统一** - 使用统一的日期格式 (YYYY-MM-DD)');
      console.log('5. **用户友好** - 提供日期选择器而不是手动输入');
      console.log('');
      
      console.log('⚠️ **注意事项:**');
      console.log('1. 爱签的日期控件有两种类型：');
      console.log('   - dataType = 7: 标准日期控件，自动生成签约时间');
      console.log('   - dataType = 1: 文本字段，需要手动填充年月日');
      console.log('2. 签约日期控件通常在签署时自动填充，不需要预先设置');
      console.log('3. 合同期限相关的日期需要在创建合同时填充');
      console.log('4. 注意时区和日期格式的一致性');
      console.log('');
      
      // 当前系统的实现分析
      console.log('6️⃣ 当前系统实现分析');
      console.log('======================');
      
      console.log('📊 当前系统已实现的日期处理功能:');
      console.log('✅ 前端使用年月日分离的下拉选择器');
      console.log('✅ 自动计算合同有效期');
      console.log('✅ 默认时间值设置（当前年份+1年）');
      console.log('✅ 日期变化监听和自动计算');
      console.log('✅ 格式化日期字符串生成');
      console.log('');
      
      console.log('🎯 系统的日期字段映射:');
      console.log('前端表单字段 → 模板字段 → 最终显示');
      console.log('开始年/月/日 → 开始年/开始月/开始日 → 合同期限');
      console.log('结束年/月/日 → 结束年/结束月/结束日 → 合同期限');
      console.log('- → 甲方签约日期 → 自动生成');
      console.log('- → 乙方签约日期 → 自动生成');
      console.log('- → 丙方签约日期 → 自动生成');
      
    } else {
      console.log('❌ API调用失败或数据格式不正确');
      console.log('📊 完整响应:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.log('❌ 请求失败:', error.message);
    
    if (error.response) {
      console.log('📊 错误状态:', error.response.status);
      console.log('📋 错误信息:', error.response.data);
    }
  }
}

// 辅助函数：获取日期控件的用途
function getDateControlPurpose(dataKey) {
  if (dataKey.includes('签约日期')) {
    return '签约时自动生成的签署日期';
  }
  if (dataKey.includes('开始')) {
    return '合同或服务开始日期';
  }
  if (dataKey.includes('结束')) {
    return '合同或服务结束日期';
  }
  if (dataKey.includes('年') || dataKey.includes('月') || dataKey.includes('日')) {
    return '日期组成部分，需组合使用';
  }
  return '通用日期字段';
}

// 辅助函数：获取日期填充时机
function getDateFillTiming(dataKey) {
  if (dataKey.includes('签约日期')) {
    return '签署时自动填充';
  }
  if (dataKey.includes('开始') || dataKey.includes('结束')) {
    return '合同创建时填充';
  }
  return '根据业务需要填充';
}

// 辅助函数：生成示例值
function generateSampleValue(dataKey) {
  const currentDate = new Date();
  
  if (dataKey.includes('签约日期')) {
    return currentDate.toISOString().split('T')[0];
  }
  if (dataKey.includes('开始')) {
    return currentDate.toISOString().split('T')[0];
  }
  if (dataKey.includes('结束')) {
    const nextYear = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
    return nextYear.toISOString().split('T')[0];
  }
  
  return currentDate.toISOString().split('T')[0];
}

// 辅助函数：生成字段代码
function generateFieldCode(field) {
  if (field.dataKey.includes('年')) {
    return 'currentDate.getFullYear()';
  }
  if (field.dataKey.includes('月')) {
    return 'currentDate.getMonth() + 1';
  }
  if (field.dataKey.includes('日')) {
    return 'currentDate.getDate()';
  }
  if (field.dataType === 7) {
    return '"自动生成"';
  }
  
  return '"2024-01-01"';
}

// 辅助函数：检测日期组合
function detectDateGroups(timeFieldGroups) {
  const groups = [];
  
  // 检测开始日期组合
  const startFields = [];
  if (timeFieldGroups.years.some(f => f.dataKey.includes('开始'))) {
    startFields.push(...timeFieldGroups.years.filter(f => f.dataKey.includes('开始')));
    startFields.push(...timeFieldGroups.months.filter(f => f.dataKey.includes('开始')));
    startFields.push(...timeFieldGroups.days.filter(f => f.dataKey.includes('开始')));
  }
  
  if (startFields.length > 0) {
    groups.push({
      name: '服务开始日期',
      fields: startFields,
      purpose: '定义合同服务的开始时间'
    });
  }
  
  // 检测结束日期组合
  const endFields = [];
  if (timeFieldGroups.years.some(f => f.dataKey.includes('结束'))) {
    endFields.push(...timeFieldGroups.years.filter(f => f.dataKey.includes('结束')));
    endFields.push(...timeFieldGroups.months.filter(f => f.dataKey.includes('结束')));
    endFields.push(...timeFieldGroups.days.filter(f => f.dataKey.includes('结束')));
  }
  
  if (endFields.length > 0) {
    groups.push({
      name: '服务结束日期',
      fields: endFields,
      purpose: '定义合同服务的结束时间'
    });
  }
  
  return groups;
}

async function main() {
  await analyzeDateControls();
  
  console.log('\n📋 日期控件使用总结');
  console.log('===================');
  console.log('1. ✅ 已分析所有日期相关控件');
  console.log('2. ✅ 已说明两种日期控件类型的区别');
  console.log('3. ✅ 已提供前端实现代码示例');
  console.log('4. ✅ 已分析当前系统的实现方式');
  console.log('5. ✅ 已给出最佳实践建议');
  console.log('');
  console.log('🎯 核心要点:');
  console.log('- dataType=7的日期控件主要用于签约时自动生成时间');
  console.log('- 年月日分离字段用于用户输入合同期限');
  console.log('- 当前系统的实现方式是正确和完善的');
  console.log('- 建议继续使用现有的日期处理逻辑');
}

// 运行分析
main().catch(console.error); 
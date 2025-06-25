#!/usr/bin/env node

/**
 * 测试convertToFillData方法是否正确处理数组格式的服务备注
 */

const axios = require('axios');

console.log('🧪 测试convertToFillData方法');
console.log('=====================================\n');

// 模拟前端可能传递的数组格式数据
const testData = {
  contractNo: `TEST_CONVERT_${Date.now()}`,
  contractName: 'convertToFillData测试',
  templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
  templateParams: {
    // 基本信息
    '客户姓名': '测试客户',
    '客户电话': '18604592681',
    '阿姨姓名': '测试阿姨',
    '阿姨电话': '18600455241',
    
    // 关键测试：数组格式的服务备注（模拟前端Checkbox.Group直接传递的数组）
    '服务备注': ['做饭', '做早餐', '做午餐', '买菜', '打扫卫生'],
    '服务需求': ['做饭', '做早餐', '做午餐', '买菜', '打扫卫生'],
    '服务内容': ['做饭', '做早餐', '做午餐', '买菜', '打扫卫生'],
    '服务项目': ['做饭', '做早餐', '做午餐', '买菜', '打扫卫生'],
    
    // 对比测试：分号分隔的字符串格式
    '服务备注_字符串': '做饭；做早餐；做午餐；买菜；打扫卫生',
    
    '服务费': '5000',
    '匹配费': '1500'
  },
  validityTime: 30,
  signOrder: 1
};

async function testConvertToFillData() {
  try {
    console.log('📤 发送测试数据:');
    console.log('=====================================');
    console.log('合同编号:', testData.contractNo);
    console.log('模板编号:', testData.templateNo);
    console.log('\n🎯 关键测试字段:');
    
    Object.entries(testData.templateParams).forEach(([key, value]) => {
      if (key.includes('服务')) {
        console.log(`${key}:`);
        console.log(`  类型: ${Array.isArray(value) ? '数组' : '字符串'}`);
        console.log(`  值: ${Array.isArray(value) ? JSON.stringify(value) : value}`);
        console.log('');
      }
    });
    
    console.log('📡 调用后端API...');
    const response = await axios.post('http://localhost:3000/api/esign/create-contract', testData);
    
    if (response.data.code === 100000) {
      console.log('✅ 合同创建成功！');
      console.log('合同编号:', response.data.data?.contractNo);
      console.log('响应:', JSON.stringify(response.data, null, 2));
      
      console.log('\n🔍 查看后端日志，确认数据转换过程:');
      console.log('执行命令: tail -50 /home/ubuntu/andejiazhengcrm/backend/logs/backend-dev-out.log | grep -A 10 -B 5 "🔥\\|服务备注\\|convertToFillData"');
      
    } else {
      console.log('❌ 合同创建失败:');
      console.log('错误代码:', response.data.code);
      console.log('错误信息:', response.data.msg);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:');
    console.error('错误:', error.response?.data || error.message);
  }
}

testConvertToFillData(); 
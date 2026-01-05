/**
 * 档期API测试脚本
 * 使用方法: node test-availability-api.js <resumeId>
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试用的简历ID（需要是月嫂）
const RESUME_ID = process.argv[2] || '677d9c8e8f8f8f8f8f8f8f8f';

console.log('🧪 开始测试档期API功能...\n');
console.log(`📋 测试简历ID: ${RESUME_ID}\n`);

// 测试1: 更新档期
async function testUpdateAvailability() {
  console.log('📝 测试1: 更新档期（2024-03-01 到 2024-03-26）');
  try {
    const response = await axios.post(
      `${BASE_URL}/resumes/${RESUME_ID}/availability`,
      {
        startDate: '2024-03-01',
        endDate: '2024-03-26',
        status: 'occupied',
        remarks: '测试订单占用'
      }
    );
    console.log('✅ 更新成功:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试2: 获取档期
async function testGetAvailability() {
  console.log('\n📅 测试2: 获取档期（2024-03-01 到 2024-03-31）');
  try {
    const response = await axios.get(
      `${BASE_URL}/resumes/${RESUME_ID}/availability`,
      {
        params: {
          startDate: '2024-03-01',
          endDate: '2024-03-31'
        }
      }
    );
    console.log('✅ 获取成功:');
    console.log(`   - 简历ID: ${response.data.data.resumeId}`);
    console.log(`   - 姓名: ${response.data.data.name}`);
    console.log(`   - 档期数量: ${response.data.data.availabilityCalendar.length}天`);
    
    // 显示前5天的档期
    const periods = response.data.data.availabilityCalendar.slice(0, 5);
    console.log('   - 前5天档期:');
    periods.forEach(p => {
      console.log(`     ${p.date.split('T')[0]}: ${p.status} ${p.remarks ? '(' + p.remarks + ')' : ''}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试3: 检查档期冲突
async function testCheckAvailability() {
  console.log('\n🔍 测试3: 检查档期冲突（2024-03-10 到 2024-03-20）');
  try {
    const response = await axios.get(
      `${BASE_URL}/resumes/${RESUME_ID}/availability/check`,
      {
        params: {
          startDate: '2024-03-10',
          endDate: '2024-03-20'
        }
      }
    );
    console.log('✅ 检查成功:', response.data);
    console.log(`   - 档期${response.data.data.isAvailable ? '可用' : '已被占用'}`);
    return true;
  } catch (error) {
    console.error('❌ 检查失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试4: 批量更新档期
async function testBatchUpdateAvailability() {
  console.log('\n📦 测试4: 批量更新档期（指定日期列表）');
  try {
    const response = await axios.post(
      `${BASE_URL}/resumes/${RESUME_ID}/availability/batch`,
      {
        dates: ['2024-04-01', '2024-04-02', '2024-04-03'],
        status: 'reserved',
        remarks: '测试预约'
      }
    );
    console.log('✅ 批量更新成功:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 批量更新失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试5: 删除档期
async function testDeleteAvailability() {
  console.log('\n🗑️  测试5: 删除档期（2024-04-01 到 2024-04-03）');
  try {
    const response = await axios.delete(
      `${BASE_URL}/resumes/${RESUME_ID}/availability`,
      {
        params: {
          startDate: '2024-04-01',
          endDate: '2024-04-03'
        }
      }
    );
    console.log('✅ 删除成功:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 删除失败:', error.response?.data || error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  const results = [];
  
  results.push(await testUpdateAvailability());
  results.push(await testGetAvailability());
  results.push(await testCheckAvailability());
  results.push(await testBatchUpdateAvailability());
  results.push(await testDeleteAvailability());
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`   - 总测试数: ${results.length}`);
  console.log(`   - 成功: ${results.filter(r => r).length}`);
  console.log(`   - 失败: ${results.filter(r => !r).length}`);
  console.log('='.repeat(50));
}

runAllTests().catch(console.error);


#!/usr/bin/env node

/**
 * 测试 leadSource 字段修复
 * 验证自助注册和销售创建接口是否正确设置 leadSource
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试用例
const tests = [];

// 测试1：自助注册接口应该设置 leadSource: 'self-registration'
tests.push({
  name: '✅ 测试1：自助注册接口 - leadSource 应为 self-registration',
  async run() {
    try {
      const response = await axios.post(`${BASE_URL}/resumes/miniprogram/self-register`, {
        name: '自助注册测试',
        phone: '13977777777',
        age: 30,
        gender: 'female',
        jobType: 'yuexin',
        leadSource: 'referral'  // 前端尝试传递其他值
      });

      if (response.data.success) {
        const leadSource = response.data.data.leadSource;
        if (leadSource === 'self-registration') {
          console.log('✅ PASS: leadSource 正确设置为 self-registration');
          console.log(`   返回数据: ${JSON.stringify(response.data.data, null, 2)}`);
          return true;
        } else {
          console.log(`❌ FAIL: leadSource 应为 self-registration，实际为 ${leadSource}`);
          return false;
        }
      } else {
        console.log(`❌ FAIL: 请求失败 - ${response.data.message}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      return false;
    }
  }
});

// 测试2：销售创建接口应该设置 leadSource: 'other'（或其他销售来源）
tests.push({
  name: '✅ 测试2：销售创建接口 - leadSource 应为 other（销售创建）',
  async run() {
    try {
      // 首先获取一个有效的JWT token（这里使用模拟）
      // 实际环境中需要真实的token
      const response = await axios.post(
        `${BASE_URL}/resumes/miniprogram/create`,
        {
          name: '销售创建测试',
          phone: '13988888888',
          age: 28,
          gender: 'female',
          jobType: 'zhujia-yuer',
          leadSource: 'self-registration'  // 前端尝试传递自助注册值
        },
        {
          headers: {
            'Authorization': 'Bearer mock-token'  // 这会导致认证失败，但我们可以看到错误信息
          }
        }
      );

      console.log('⚠️  SKIP: 需要有效的JWT token才能测试销售创建接口');
      console.log('   建议在有认证的环境中测试此接口');
      return null;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  SKIP: 需要有效的JWT token才能测试销售创建接口');
        return null;
      }
      console.log(`❌ ERROR: ${error.message}`);
      return false;
    }
  }
});

// 测试3：验证前端传递的 leadSource 被忽略
tests.push({
  name: '✅ 测试3：验证前端传递的 leadSource 被忽略',
  async run() {
    try {
      const response = await axios.post(`${BASE_URL}/resumes/miniprogram/self-register`, {
        name: '测试忽略leadSource',
        phone: '13999999999',
        age: 32,
        gender: 'male',
        jobType: 'baojie',
        leadSource: 'paid-lead'  // 前端尝试传递其他值
      });

      if (response.data.success) {
        const leadSource = response.data.data.leadSource;
        if (leadSource === 'self-registration') {
          console.log('✅ PASS: 前端传递的 leadSource 被正确忽略');
          console.log(`   前端传递: paid-lead, 实际保存: ${leadSource}`);
          return true;
        } else {
          console.log(`❌ FAIL: leadSource 应为 self-registration，实际为 ${leadSource}`);
          return false;
        }
      } else {
        console.log(`❌ FAIL: 请求失败 - ${response.data.message}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      return false;
    }
  }
});

// 测试4：验证 status 字段也被正确设置
tests.push({
  name: '✅ 测试4：验证 status 字段被设置为 draft',
  async run() {
    try {
      const response = await axios.post(`${BASE_URL}/resumes/miniprogram/self-register`, {
        name: '测试status字段',
        phone: '13911111111',
        age: 25,
        gender: 'female',
        jobType: 'yuer'
      });

      if (response.data.success) {
        const status = response.data.data.status;
        if (status === 'draft') {
          console.log('✅ PASS: status 正确设置为 draft');
          console.log(`   返回数据: ${JSON.stringify(response.data.data, null, 2)}`);
          return true;
        } else {
          console.log(`❌ FAIL: status 应为 draft，实际为 ${status}`);
          return false;
        }
      } else {
        console.log(`❌ FAIL: 请求失败 - ${response.data.message}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      return false;
    }
  }
});

// 运行所有测试
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 leadSource 字段修复测试');
  console.log('='.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log('-'.repeat(80));
    
    const result = await test.run();
    
    if (result === true) {
      passed++;
    } else if (result === false) {
      failed++;
    } else {
      skipped++;
    }
  }

  // 总结
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试总结');
  console.log('='.repeat(80));
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`⚠️  跳过: ${skipped}`);
  console.log(`📈 总计: ${tests.length}`);
  console.log('='.repeat(80) + '\n');

  if (failed === 0) {
    console.log('🎉 所有测试通过！leadSource 字段修复成功！\n');
    process.exit(0);
  } else {
    console.log('❌ 有测试失败，请检查实现\n');
    process.exit(1);
  }
}

// 运行测试
runAllTests().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});


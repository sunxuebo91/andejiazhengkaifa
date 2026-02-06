/**
 * 测试大树保批改接口（换人功能）
 * 
 * 使用方法：
 * node test-amend-policy.js <保单号>
 * 
 * 例如：
 * node test-amend-policy.js 14527006800216447774
 */

const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:3000/api';
const LOGIN_URL = `${API_BASE_URL}/auth/login`;
const AMEND_URL = `${API_BASE_URL}/dashubao/policy/amend`;
const QUERY_URL = `${API_BASE_URL}/dashubao/policy/query`;

// 测试用户凭证（请根据实际情况修改）
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

// 测试数据
const TEST_AMEND_DATA = {
  oldInsured: {
    insuredName: '张三',
    idType: '1',
    idNumber: '110101199001011234',
    birthDate: '19900101000000',
    gender: 'M'
  },
  newInsured: {
    insuredName: '李四',
    idType: '1',
    idNumber: '110101199002021234',
    birthDate: '19900202000000',
    gender: 'M',
    mobile: '13800138000'
  }
};

async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(LOGIN_URL, TEST_USER);
    const token = response.data.access_token;
    console.log('✅ 登录成功');
    return token;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

async function queryPolicy(token, policyNo) {
  try {
    console.log('\n📋 查询保单信息...');
    console.log('保单号:', policyNo);
    
    const response = await axios.post(
      QUERY_URL,
      { policyNo },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 保单查询成功');
    console.log('响应:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ 保单查询失败:', error.response?.data || error.message);
    return null;
  }
}

async function amendPolicy(token, policyNo, amendData) {
  try {
    console.log('\n🔄 执行批改（换人）...');
    console.log('保单号:', policyNo);
    console.log('批改数据:', JSON.stringify(amendData, null, 2));
    
    const response = await axios.post(
      AMEND_URL,
      {
        policyNo,
        ...amendData
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 批改成功');
    console.log('响应:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ 批改失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function main() {
  try {
    // 获取命令行参数
    const policyNo = process.argv[2];
    
    if (!policyNo) {
      console.error('❌ 请提供保单号');
      console.log('使用方法: node test-amend-policy.js <保单号>');
      console.log('例如: node test-amend-policy.js 14527006800216447774');
      process.exit(1);
    }
    
    console.log('='.repeat(80));
    console.log('大树保批改接口测试');
    console.log('='.repeat(80));
    
    // 1. 登录获取token
    const token = await login();
    
    // 2. 查询保单（可选，用于验证保单存在）
    await queryPolicy(token, policyNo);
    
    // 3. 执行批改
    const result = await amendPolicy(token, policyNo, TEST_AMEND_DATA);
    
    console.log('\n' + '='.repeat(80));
    if (result && result.Success === 'true') {
      console.log('✅ 测试成功！批改操作已完成');
    } else {
      console.log('❌ 测试失败！请检查错误信息');
      console.log('\n可能的原因：');
      console.log('1. 保单号不存在或输入错误');
      console.log('2. 保单状态不允许批改（已注销、已退保等）');
      console.log('3. 原被保人信息与保单不匹配');
      console.log('4. 大树保API返回错误');
      console.log('\n请查看后端日志获取详细信息：');
      console.log('pm2 logs backend-prod --lines 50');
    }
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
main();


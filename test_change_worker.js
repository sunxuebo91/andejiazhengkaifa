#!/usr/bin/env node

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3001';

// 测试数据
const TEST_CUSTOMER_PHONE = '13552336332'; // 孙学亮的手机号
const TEST_CUSTOMER_NAME = '孙学亮';

// 新阿姨信息
const NEW_WORKER = {
  workerName: '李阿姨',
  workerPhone: '13800138002', 
  workerIdCard: '110101199001011234',
  workerSalary: 9000
};

// 测试用例
const tests = [
  {
    name: '测试1：检查客户现有合同',
    test: () => checkCustomerContract(TEST_CUSTOMER_PHONE)
  },
  {
    name: '测试2：创建换人合同',
    test: () => createChangeWorkerContract()
  },
  {
    name: '测试3：查看客户合同历史',
    test: () => getCustomerHistory(TEST_CUSTOMER_PHONE)
  },
  {
    name: '测试4：获取最新合同列表',
    test: () => getLatestContracts()
  }
];

let originalContractId = null;

// 工具函数
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    console.log(`🌐 ${method.toUpperCase()} ${url}`);
    if (data) {
      console.log('📤 请求数据:', JSON.stringify(data, null, 2));
    }
    
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    console.log('✅ 响应成功:', response.status);
    console.log('📥 响应数据:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ 请求失败:', error.response?.status || 'NO_STATUS');
    console.error('📥 错误数据:', JSON.stringify(error.response?.data || error.message, null, 2));
    throw error;
  }
}

// 测试函数
async function checkCustomerContract(customerPhone) {
  console.log('🔍 检查客户现有合同...');
  const result = await makeRequest('GET', `/api/contracts/check-customer/${customerPhone}`);
  
  if (result.data && result.data.hasContract && result.data.contract) {
    originalContractId = result.data.contract._id;
    console.log('📋 找到原合同ID:', originalContractId);
  }
  
  return result;
}

async function createChangeWorkerContract() {
  if (!originalContractId) {
    throw new Error('原合同ID未找到，请先运行测试1');
  }
  
  console.log('🔄 创建换人合同...');
  
  // 构建新合同数据
  const contractData = {
    customerName: TEST_CUSTOMER_NAME,
    customerPhone: TEST_CUSTOMER_PHONE,
    contractType: '住家保姆', // 新类型
    workerName: NEW_WORKER.workerName,
    workerPhone: NEW_WORKER.workerPhone,
    workerIdCard: NEW_WORKER.workerIdCard,
    workerSalary: NEW_WORKER.workerSalary,
    customerServiceFee: 6500,
    customerId: '68496c353256e22b4ac830f4', // 使用现有客户ID
    workerId: '683fad9552417d2e6c100190', // 使用一个现有员工ID
    // startDate 和 endDate 将由后端自动计算
  };
  
  const result = await makeRequest('POST', `/api/contracts/change-worker/${originalContractId}`, contractData);
  return result;
}

async function getCustomerHistory(customerPhone) {
  console.log('📖 获取客户合同历史...');
  const result = await makeRequest('GET', `/api/contracts/history/${customerPhone}`);
  return result;
}

async function getLatestContracts() {
  console.log('📋 获取最新合同列表...');
  const result = await makeRequest('GET', '/api/contracts/latest/list?page=1&limit=5');
  return result;
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试A客户换多个阿姨功能...\n');
  
  for (let i = 0; i < tests.length; i++) {
    const { name, test } = tests[i];
    console.log(`\n=== ${name} ===`);
    
    try {
      const result = await test();
      console.log(`✅ ${name} 通过\n`);
    } catch (error) {
      console.log(`❌ ${name} 失败:`, error.message);
      
      // 如果是认证错误，跳过后续测试
      if (error.response?.status === 401) {
        console.log('🔐 认证失败，跳过后续测试');
        break;
      }
    }
  }
  
  console.log('\n🎉 测试完成！');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  checkCustomerContract,
  createChangeWorkerContract,
  getCustomerHistory,
  getLatestContracts
}; 
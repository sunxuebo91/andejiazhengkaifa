const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3001';
const TEST_CUSTOMER_PHONE = '18604592681'; // 孙学博的手机号
const TEST_CUSTOMER_NAME = '孙学博';

// 真实的JWT token
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiNjgzMTZmMWNlNTA0MDI1OTc2MTI3OTA5IiwiaWF0IjoxNzUxMjUyMTA2LCJleHAiOjE3NTEzMzg1MDZ9.bU0NXJocpBdvS504ysFmgneBC4QZO9zu2-hMXzbT7Qs';

// 新服务人员信息
const NEW_WORKER = {
  workerName: '李阿姨',
  workerPhone: '13900139000',
  workerIdCard: '110101199001010002',
  workerSalary: 7000
};

// 辅助函数：发送请求
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    console.log(`📤 ${method} ${endpoint}`);
    if (data) {
      console.log('请求数据:', JSON.stringify(data, null, 2));
    }
    
    const response = await axios(config);
    console.log(`✅ 响应状态: ${response.status}`);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`❌ 请求失败: ${method} ${endpoint}`);
    if (error.response) {
      console.error('错误状态:', error.response.status);
      console.error('错误数据:', error.response.data);
    } else {
      console.error('错误信息:', error.message);
    }
    throw error;
  }
}

// 测试1：检查客户现有合同
async function test1_checkCustomerContract() {
  console.log('\n=== 测试1：检查客户现有合同 ===');
  
  try {
    const result = await makeRequest('GET', `/api/contracts/check-customer/${TEST_CUSTOMER_PHONE}`);
    
    if (result.success) {
      console.log('✅ 检查成功');
      console.log(`客户是否有合同: ${result.data.hasContract}`);
      console.log(`合同数量: ${result.data.contractCount}`);
      console.log(`是否有已签约合同: ${result.data.isSignedContract}`);
      
      if (result.data.hasContract) {
        console.log('现有合同信息:');
        console.log(`- 合同编号: ${result.data.contract.contractNumber}`);
        console.log(`- 客户姓名: ${result.data.contract.customerName}`);
        console.log(`- 当前服务人员: ${result.data.contract.workerName}`);
        console.log(`- 合同状态: ${result.data.contract.contractStatus}`);
        console.log(`- 爱签状态: ${result.data.contract.esignStatus}`);
      }
      
      return result.data;
    } else {
      console.log('❌ 检查失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 测试1失败:', error.message);
    return null;
  }
}

// 测试2：创建换人合同
async function test2_createChangeWorkerContract(existingContractData) {
  console.log('\n=== 测试2：创建换人合同 ===');
  
  if (!existingContractData || !existingContractData.hasContract) {
    console.log('❌ 没有现有合同，无法测试换人功能');
    return null;
  }
  
  const originalContractId = existingContractData.contract._id;
  console.log('原合同ID:', originalContractId);
  
  try {
    const changeData = {
      workerName: NEW_WORKER.workerName,
      workerPhone: NEW_WORKER.workerPhone,
      workerIdCard: NEW_WORKER.workerIdCard,
      workerSalary: NEW_WORKER.workerSalary,
      contractType: '住家保姆',
      customerServiceFee: 6500,
      workerId: '683fad9552417d2e6c100190', // 使用一个现有员工ID
      remarks: '换人合同测试'
    };
    
    const result = await makeRequest('POST', `/api/contracts/change-worker/${originalContractId}`, changeData);
    
    if (result.success) {
      console.log('✅ 换人合同创建成功');
      console.log('新合同信息:');
      console.log(`- 合同编号: ${result.data.contractNumber}`);
      console.log(`- 新服务人员: ${result.data.workerName}`);
      console.log(`- 开始时间: ${result.data.startDate}`);
      console.log(`- 结束时间: ${result.data.endDate}`);
      console.log(`- 合同状态: ${result.data.contractStatus}`);
      console.log(`- 替换合同ID: ${result.data.replacesContractId}`);
      
      return result.data;
    } else {
      console.log('❌ 换人合同创建失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 测试2失败:', error.message);
    return null;
  }
}

// 测试3：验证原合同状态更新
async function test3_verifyOriginalContractUpdate(originalContractId) {
  console.log('\n=== 测试3：验证原合同状态更新 ===');
  
  if (!originalContractId) {
    console.log('❌ 没有原合同ID，无法验证');
    return;
  }
  
  try {
    const result = await makeRequest('GET', `/api/contracts/${originalContractId}`);
    
    if (result.success) {
      console.log('✅ 原合同状态查询成功');
      console.log('原合同状态:');
      console.log(`- 是否最新: ${result.data.isLatest}`);
      console.log(`- 合同状态: ${result.data.contractStatus}`);
      console.log(`- 被替换合同ID: ${result.data.replacedByContractId}`);
      console.log(`- 实际服务天数: ${result.data.serviceDays}`);
    } else {
      console.log('❌ 原合同状态查询失败:', result.message);
    }
  } catch (error) {
    console.error('❌ 测试3失败:', error.message);
  }
}

// 测试4：获取客户合同历史
async function test4_getCustomerHistory() {
  console.log('\n=== 测试4：获取客户合同历史 ===');
  
  try {
    const result = await makeRequest('GET', `/api/contracts/history/${TEST_CUSTOMER_PHONE}`);
    
    if (result.success && result.data) {
      console.log('✅ 客户合同历史查询成功');
      console.log(`客户: ${result.data.customerName}`);
      console.log(`总换人次数: ${result.data.totalWorkers}`);
      console.log(`最新合同ID: ${result.data.latestContractId}`);
      console.log('合同历史:');
      
      result.data.contracts?.forEach((contract, index) => {
        console.log(`  ${index + 1}. ${contract.workerName} (${contract.workerPhone})`);
        console.log(`     服务期: ${contract.startDate} ~ ${contract.endDate}`);
        console.log(`     状态: ${contract.status}`);
        if (contract.serviceDays) {
          console.log(`     实际服务天数: ${contract.serviceDays}`);
        }
      });
    } else {
      console.log('❌ 客户合同历史查询失败:', result.message);
    }
  } catch (error) {
    console.error('❌ 测试4失败:', error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试换人功能实现');
  console.log(`测试客户: ${TEST_CUSTOMER_NAME} (${TEST_CUSTOMER_PHONE})`);
  
  try {
    // 测试1：检查客户现有合同
    const existingContractData = await test1_checkCustomerContract();
    
    // 测试2：创建换人合同
    const newContract = await test2_createChangeWorkerContract(existingContractData);
    
    // 测试3：验证原合同状态更新
    if (existingContractData?.hasContract) {
      await test3_verifyOriginalContractUpdate(existingContractData.contract._id);
    }
    
    // 测试4：获取客户合同历史
    await test4_getCustomerHistory();
    
    console.log('\n✅ 所有测试完成');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  test1_checkCustomerContract,
  test2_createChangeWorkerContract,
  test3_verifyOriginalContractUpdate,
  test4_getCustomerHistory
}; 
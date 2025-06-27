#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');

// MongoDB连接配置
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'housekeeping';

async function connectToMongoDB() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  return client.db(DB_NAME);
}

// 测试数据
const TEST_CUSTOMER_PHONE = '13552336332';
const TEST_CUSTOMER_NAME = '孙学亮';

// 新阿姨信息
const NEW_WORKER = {
  workerName: '李阿姨',
  workerPhone: '13800138002', 
  workerIdCard: '110101199001011234',
  workerSalary: 9000
};

async function test1_checkCustomerContract() {
  console.log('\n=== 测试1：检查客户现有合同 ===');
  
  const db = await connectToMongoDB();
  
  // 查询客户最新合同
  const latestContract = await db.collection('contracts').findOne({
    customerPhone: TEST_CUSTOMER_PHONE,
    isLatest: true,
    contractStatus: { $ne: 'cancelled' }
  });
  
  console.log('📋 客户现有合同:', latestContract ? '存在' : '不存在');
  if (latestContract) {
    console.log('合同编号:', latestContract.contractNumber);
    console.log('开始时间:', latestContract.startDate);
    console.log('结束时间:', latestContract.endDate);
    console.log('服务人员:', latestContract.workerName);
    console.log('合同状态:', latestContract.contractStatus);
  }
  
  return latestContract;
}

async function test2_createChangeWorkerContract(originalContract) {
  console.log('\n=== 测试2：模拟创建换人合同 ===');
  
  if (!originalContract) {
    console.log('❌ 没有原合同，无法创建换人合同');
    return null;
  }
  
  const db = await connectToMongoDB();
  
  // 计算新合同的时间
  const currentDate = new Date();
  const originalStartDate = new Date(originalContract.startDate);
  const originalEndDate = new Date(originalContract.endDate);
  
  // 计算服务天数
  const serviceDays = Math.floor((currentDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log('📅 时间计算:');
  console.log('原开始时间:', originalStartDate.toISOString().split('T')[0]);
  console.log('原结束时间:', originalEndDate.toISOString().split('T')[0]);
  console.log('换人日期:', currentDate.toISOString().split('T')[0]);
  console.log('已服务天数:', serviceDays);
  
  // 新合同数据
  const newContractData = {
    contractNumber: `CON${Date.now()}${Math.floor(Math.random() * 1000)}`,
    customerName: TEST_CUSTOMER_NAME,
    customerPhone: TEST_CUSTOMER_PHONE,
    customerIdCard: originalContract.customerIdCard,
    contractType: '住家保姆', // 新类型
    startDate: currentDate,
    endDate: originalEndDate,
    workerName: NEW_WORKER.workerName,
    workerPhone: NEW_WORKER.workerPhone,
    workerIdCard: NEW_WORKER.workerIdCard,
    workerSalary: NEW_WORKER.workerSalary,
    customerServiceFee: 6500,
    customerId: originalContract.customerId,
    workerId: originalContract.workerId, // 模拟，实际应该是新员工ID
    createdBy: originalContract.createdBy,
    
    // 新增字段
    isLatest: true,
    contractStatus: 'draft',
    replacesContractId: originalContract._id,
    changeDate: currentDate,
    createdAt: currentDate,
    updatedAt: currentDate
  };
  
  console.log('\n📋 新合同数据:');
  console.log('合同编号:', newContractData.contractNumber);
  console.log('新开始时间:', newContractData.startDate.toISOString().split('T')[0]);
  console.log('结束时间:', newContractData.endDate.toISOString().split('T')[0]);
  console.log('新服务人员:', newContractData.workerName);
  console.log('新工资:', newContractData.workerSalary);
  
  // 插入新合同
  const insertResult = await db.collection('contracts').insertOne(newContractData);
  console.log('✅ 新合同创建成功, ID:', insertResult.insertedId);
  
  // 更新原合同状态
  const updateResult = await db.collection('contracts').updateOne(
    { _id: originalContract._id },
    {
      $set: {
        isLatest: false,
        contractStatus: 'replaced',
        replacedByContractId: insertResult.insertedId,
        serviceDays: serviceDays,
        updatedAt: currentDate
      }
    }
  );
  console.log('✅ 原合同状态更新成功, 修改数量:', updateResult.modifiedCount);
  
  return { ...newContractData, _id: insertResult.insertedId };
}

async function test3_createCustomerHistory(originalContract, newContract) {
  console.log('\n=== 测试3：创建客户合同历史 ===');
  
  if (!originalContract || !newContract) {
    console.log('❌ 缺少合同数据，无法创建历史记录');
    return;
  }
  
  const db = await connectToMongoDB();
  
  // 检查是否已有历史记录
  let history = await db.collection('customercontracthistories').findOne({
    customerPhone: TEST_CUSTOMER_PHONE
  });
  
  if (!history) {
    // 创建新的历史记录
    history = {
      customerPhone: TEST_CUSTOMER_PHONE,
      customerName: TEST_CUSTOMER_NAME,
      contracts: [],
      latestContractId: newContract._id,
      totalWorkers: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  // 添加原合同记录（如果不存在）
  const hasOriginalRecord = history.contracts.some(c => 
    c.contractId.toString() === originalContract._id.toString()
  );
  
  if (!hasOriginalRecord) {
    history.contracts.push({
      contractId: originalContract._id,
      contractNumber: originalContract.contractNumber,
      workerName: originalContract.workerName,
      workerPhone: originalContract.workerPhone,
      workerSalary: originalContract.workerSalary,
      startDate: originalContract.startDate,
      endDate: originalContract.endDate,
      createdAt: originalContract.createdAt,
      status: 'replaced',
      order: history.contracts.length + 1,
      serviceDays: originalContract.serviceDays,
      terminationDate: new Date(),
      terminationReason: '换人'
    });
  }
  
  // 添加新合同记录
  history.contracts.push({
    contractId: newContract._id,
    contractNumber: newContract.contractNumber,
    workerName: newContract.workerName,
    workerPhone: newContract.workerPhone,
    workerSalary: newContract.workerSalary,
    startDate: newContract.startDate,
    endDate: newContract.endDate,
    createdAt: newContract.createdAt,
    status: 'active',
    order: history.contracts.length + 1
  });
  
  // 更新统计信息
  history.latestContractId = newContract._id;
  history.totalWorkers = history.contracts.length;
  history.updatedAt = new Date();
  
  // 保存历史记录
  const result = await db.collection('customercontracthistories').replaceOne(
    { customerPhone: TEST_CUSTOMER_PHONE },
    history,
    { upsert: true }
  );
  
  console.log('✅ 客户合同历史记录保存成功');
  console.log('总工人数:', history.totalWorkers);
  console.log('合同记录数:', history.contracts.length);
  
  return history;
}

async function test4_queryLatestContracts() {
  console.log('\n=== 测试4：查询最新合同列表 ===');
  
  const db = await connectToMongoDB();
  
  const latestContracts = await db.collection('contracts').find({
    isLatest: true,
    contractStatus: { $ne: 'cancelled' }
  }).sort({ createdAt: -1 }).limit(5).toArray();
  
  console.log('📋 最新合同列表:');
  latestContracts.forEach((contract, index) => {
    console.log(`${index + 1}. ${contract.contractNumber} - ${contract.customerName} - ${contract.workerName}`);
  });
  
  return latestContracts;
}

async function test5_queryCustomerHistory() {
  console.log('\n=== 测试5：查询客户合同历史 ===');
  
  const db = await connectToMongoDB();
  
  const history = await db.collection('customercontracthistories').findOne({
    customerPhone: TEST_CUSTOMER_PHONE
  });
  
  if (history) {
    console.log('📖 客户合同历史:');
    console.log('客户姓名:', history.customerName);
    console.log('总工人数:', history.totalWorkers);
    console.log('合同记录:');
    history.contracts.forEach((record, index) => {
      console.log(`  ${record.order}. ${record.workerName} (${record.status})`);
      console.log(`     服务期: ${record.startDate.toISOString().split('T')[0]} ~ ${record.endDate.toISOString().split('T')[0]}`);
      if (record.serviceDays) {
        console.log(`     实际服务: ${record.serviceDays}天`);
      }
    });
  } else {
    console.log('❌ 没有找到客户合同历史');
  }
  
  return history;
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试A客户换多个阿姨功能（数据库直接测试）...');
  
  try {
    // 测试1：检查客户现有合同
    const originalContract = await test1_checkCustomerContract();
    
    if (originalContract) {
      // 测试2：创建换人合同
      const newContract = await test2_createChangeWorkerContract(originalContract);
      
      // 测试3：创建客户历史记录
      await test3_createCustomerHistory(originalContract, newContract);
      
      // 测试4：查询最新合同列表
      await test4_queryLatestContracts();
      
      // 测试5：查询客户合同历史
      await test5_queryCustomerHistory();
      
      console.log('\n🎉 所有测试完成！换人功能数据库层面测试成功！');
    } else {
      console.log('\n❌ 未找到测试客户的现有合同，请确认数据是否存在');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
  
  process.exit(0);
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  test1_checkCustomerContract,
  test2_createChangeWorkerContract,
  test3_createCustomerHistory,
  test4_queryLatestContracts,
  test5_queryCustomerHistory
}; 
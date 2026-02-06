// 测试脚本：检查创建合同时是否传递了 notifyUrl

const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/housekeeping');
    
    const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));
    
    // 查询这个合同
    const contract = await Contract.findOne({ 
      contractNumber: 'CONTRACT_1770303865772_vcxaahr4q' 
    }).lean();
    
    if (!contract) {
      console.log('❌ 合同不存在');
      await mongoose.connection.close();
      return;
    }
    
    console.log('📋 合同信息:');
    console.log('合同编号:', contract.contractNumber);
    console.log('客户姓名:', contract.customerName);
    console.log('服务人员:', contract.workerName);
    console.log('');
    console.log('🔍 合同状态:');
    console.log('contractStatus:', contract.contractStatus);
    console.log('esignStatus:', contract.esignStatus);
    console.log('esignContractNo:', contract.esignContractNo);
    console.log('');
    console.log('📅 时间信息:');
    console.log('创建时间:', contract.createdAt);
    console.log('更新时间:', contract.updatedAt);
    console.log('');
    
    // 检查合同创建时间
    const createTime = new Date(contract.createdAt);
    const restartTime = new Date('2026-02-05T15:02:06.000Z'); // 23:02:06 北京时间
    
    console.log('⏰ 时间对比:');
    console.log('生产环境重启时间:', restartTime.toISOString(), '(北京时间 23:02:06)');
    console.log('合同创建时间:', createTime.toISOString(), '(北京时间', new Date(createTime.getTime() + 8*60*60*1000).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}), ')');
    console.log('');
    
    if (createTime > restartTime) {
      console.log('✅ 合同是在重启后创建的，应该包含 notifyUrl');
    } else {
      console.log('❌ 合同是在重启前创建的，可能没有 notifyUrl');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('错误:', error.message);
    await mongoose.connection.close();
  }
})();


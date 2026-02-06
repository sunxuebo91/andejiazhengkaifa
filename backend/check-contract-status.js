const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/housekeeping');
    console.log('✅ 连接到数据库成功\n');
    
    const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));
    
    const contract = await Contract.findOne({ 
      contractNumber: 'CONTRACT_1770287360099_qrpa44nkb' 
    }).lean();
    
    if (!contract) {
      console.log('❌ 未找到合同');
      process.exit(1);
    }
    
    console.log('📋 合同状态检查:\n');
    console.log(`合同编号: ${contract.contractNumber}`);
    console.log(`客户: ${contract.customerName}`);
    console.log(`服务人员: ${contract.workerName}`);
    console.log('');
    console.log(`合同状态: ${contract.contractStatus}`);
    console.log(`爱签状态: ${contract.esignStatus}`);
    console.log(`爱签合同号: ${contract.esignContractNo || '(未设置)'}`);
    console.log('');
    console.log(`保险同步状态: ${contract.insuranceSyncStatus || '(未设置)'}`);
    console.log(`保险同步错误: ${contract.insuranceSyncError || '(无)'}`);
    console.log('');
    console.log(`创建时间: ${contract.createdAt}`);
    console.log(`更新时间: ${contract.updatedAt}`);
    console.log('');
    
    // 判断状态
    if (contract.contractStatus === 'active' && contract.esignStatus === '2') {
      console.log('✅ 合同已签约，状态正常');
      console.log('✅ 爱签回调已触发');
    } else if (contract.esignStatus === '2') {
      console.log('⚠️  爱签状态是"已签约"，但合同状态不是 active');
      console.log('可能爱签回调没有正确处理');
    } else if (contract.esignStatus === '1') {
      console.log('⚠️  合同还在签约中（爱签状态: 1）');
      console.log('爱签回调还没有触发');
    } else {
      console.log('❌ 合同状态异常');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
})();


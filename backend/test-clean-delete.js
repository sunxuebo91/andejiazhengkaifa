const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/housekeeping');
    
    const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));
    
    console.log('🧪 测试合同删除功能 - 彻底清空记录');
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    
    // 步骤1：创建旧合同
    console.log('📝 步骤1：创建旧合同（合同A）');
    const oldContract = await Contract.create({
      contractNumber: 'TEST_OLD_001',
      customerName: '测试客户_删除',
      customerPhone: '13900000001',
      workerName: '旧服务人员',
      contractType: 'hourly',
      contractStatus: 'active',
      esignStatus: '2',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  ✅ 旧合同已创建:', oldContract.contractNumber);
    console.log('');
    
    // 步骤2：创建换人合同
    console.log('📝 步骤2：创建换人合同（合同B，替换合同A）');
    const newContract = await Contract.create({
      contractNumber: 'TEST_NEW_002',
      customerName: '测试客户_删除',
      customerPhone: '13900000001',
      workerName: '新服务人员',
      contractType: 'hourly',
      contractStatus: 'active',
      esignStatus: '2',
      replacesContractId: oldContract._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  ✅ 换人合同已创建:', newContract.contractNumber);
    console.log('');
    
    // 更新旧合同状态为 replaced
    await Contract.findByIdAndUpdate(oldContract._id, {
      contractStatus: 'replaced',
      replacedByContractId: newContract._id,
    });
    console.log('  ✅ 旧合同已标记为 replaced');
    console.log('');
    
    // 验证创建后的状态
    const contractsBeforeDelete = await Contract.find({ 
      customerName: '测试客户_删除' 
    }).lean();
    console.log('📊 删除前的合同数量:', contractsBeforeDelete.length);
    console.log('  - 旧合同:', oldContract.contractNumber, '(replaced)');
    console.log('  - 新合同:', newContract.contractNumber, '(active)');
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    
    // 步骤3：删除换人合同（应该同时删除旧合同）
    console.log('🗑️ 步骤3：删除换人合同（合同B）');
    console.log('  ⚠️ 注意：应该同时删除旧合同（合同A）');
    console.log('');
    
    await Contract.findByIdAndDelete(newContract._id);
    console.log('  ✅ 换人合同已删除');
    console.log('');
    
    // 步骤4：验证删除结果
    console.log('📊 步骤4：验证删除结果');
    const contractsAfterDelete = await Contract.find({ 
      customerName: '测试客户_删除' 
    }).lean();
    
    console.log('  删除后的合同数量:', contractsAfterDelete.length);
    console.log('');
    
    if (contractsAfterDelete.length === 0) {
      console.log('  ✅✅✅ 测试通过！所有合同已彻底删除！');
      console.log('  数据库已清空，没有任何记录！');
    } else {
      console.log('  ❌ 测试失败：还有', contractsAfterDelete.length, '个合同未删除');
      for (const c of contractsAfterDelete) {
        console.log('    - 合同编号:', c.contractNumber);
        console.log('      状态:', c.contractStatus);
        console.log('      replacesContractId:', c.replacesContractId || '(无)');
        console.log('      replacedByContractId:', c.replacedByContractId || '(无)');
      }
      
      // 清理测试数据
      console.log('');
      console.log('  🧹 清理残留的测试数据...');
      await Contract.deleteMany({ customerName: '测试客户_删除' });
      console.log('  ✅ 测试数据已清理');
    }
    
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    console.log('✅ 测试完成');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
})();


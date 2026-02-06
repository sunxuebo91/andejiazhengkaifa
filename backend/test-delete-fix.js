const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/housekeeping');
    
    const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));
    
    console.log('🧪 测试合同删除修复功能');
    console.log('');
    console.log('📋 测试场景：');
    console.log('  1. 创建旧合同（合同A）');
    console.log('  2. 创建换人合同（合同B，替换合同A）');
    console.log('  3. 删除换人合同（合同B）');
    console.log('  4. 验证旧合同（合同A）是否恢复正常');
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    
    // 步骤1：创建旧合同
    console.log('📝 步骤1：创建旧合同（合同A）');
    const oldContract = await Contract.create({
      contractNumber: 'TEST_OLD_CONTRACT_001',
      customerName: '测试客户',
      customerPhone: '13800000001',
      workerName: '旧服务人员',
      contractType: 'hourly',
      contractStatus: 'active',
      esignStatus: '2',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  ✅ 旧合同已创建:', oldContract.contractNumber);
    console.log('  状态:', oldContract.contractStatus);
    console.log('');
    
    // 步骤2：创建换人合同，并标记旧合同为 replaced
    console.log('📝 步骤2：创建换人合同（合同B，替换合同A）');
    const newContract = await Contract.create({
      contractNumber: 'TEST_NEW_CONTRACT_002',
      customerName: '测试客户',
      customerPhone: '13800000001',
      workerName: '新服务人员',
      contractType: 'hourly',
      contractStatus: 'active',
      esignStatus: '2',
      replacesContractId: oldContract._id, // 标记替换了旧合同
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  ✅ 换人合同已创建:', newContract.contractNumber);
    console.log('  replacesContractId:', newContract.replacesContractId);
    console.log('');
    
    // 更新旧合同状态为 replaced
    await Contract.findByIdAndUpdate(oldContract._id, {
      contractStatus: 'replaced',
      replacedByContractId: newContract._id,
    });
    console.log('  ✅ 旧合同已标记为 replaced');
    console.log('');
    
    // 验证状态
    const oldContractAfterReplace = await Contract.findById(oldContract._id).lean();
    console.log('📊 替换后的状态:');
    console.log('  旧合同状态:', oldContractAfterReplace.contractStatus);
    console.log('  旧合同 replacedByContractId:', oldContractAfterReplace.replacedByContractId);
    console.log('  新合同 replacesContractId:', newContract.replacesContractId);
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    
    // 步骤3：删除换人合同（这里会触发修复逻辑）
    console.log('🗑️ 步骤3：删除换人合同（合同B）');
    console.log('  ⚠️ 注意：这里应该触发修复逻辑，自动恢复旧合同状态');
    console.log('');
    
    await Contract.findByIdAndDelete(newContract._id);
    console.log('  ✅ 换人合同已删除');
    console.log('');
    
    // 步骤4：验证旧合同是否恢复
    console.log('📊 步骤4：验证旧合同是否恢复');
    const oldContractAfterDelete = await Contract.findById(oldContract._id).lean();
    
    if (!oldContractAfterDelete) {
      console.log('  ❌ 错误：旧合同也被删除了！');
    } else {
      console.log('  ✅ 旧合同仍然存在');
      console.log('  合同编号:', oldContractAfterDelete.contractNumber);
      console.log('  合同状态:', oldContractAfterDelete.contractStatus);
      console.log('  replacedByContractId:', oldContractAfterDelete.replacedByContractId || '(已清除)');
      console.log('');
      
      if (oldContractAfterDelete.contractStatus === 'active' && !oldContractAfterDelete.replacedByContractId) {
        console.log('  ✅✅✅ 测试通过！旧合同已成功恢复！');
      } else {
        console.log('  ❌ 测试失败：旧合同状态未恢复');
        console.log('  期望状态: active, 实际状态:', oldContractAfterDelete.contractStatus);
        console.log('  期望 replacedByContractId: undefined, 实际:', oldContractAfterDelete.replacedByContractId);
      }
    }
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    
    // 清理测试数据
    console.log('🧹 清理测试数据...');
    await Contract.findByIdAndDelete(oldContract._id);
    console.log('  ✅ 测试数据已清理');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
})();


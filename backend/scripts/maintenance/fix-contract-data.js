const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/housekeeping');
    console.log('✅ 连接到数据库成功\n');
    
    const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));
    
    // 查找合同
    const contract = await Contract.findOne({ contractNumber: 'CONTRACT_1770287360099_qrpa44nkb' });
    
    if (!contract) {
      console.log('❌ 未找到合同');
      process.exit(1);
    }
    
    console.log('📋 修复前的合同信息:');
    console.log(`   replacesContractId: ${contract.replacesContractId || '(未设置)'}`);
    console.log('');
    
    // 清除 replacesContractId 字段
    console.log('🔧 清除 replacesContractId 字段...');
    await Contract.updateOne(
      { contractNumber: 'CONTRACT_1770287360099_qrpa44nkb' },
      { $unset: { replacesContractId: 1 } }
    );
    
    // 验证修复结果
    const updatedContract = await Contract.findOne({ contractNumber: 'CONTRACT_1770287360099_qrpa44nkb' });
    console.log('');
    console.log('✅ 修复后的合同信息:');
    console.log(`   replacesContractId: ${updatedContract.replacesContractId || '(已清除)'}`);
    console.log('');
    console.log('🎉 现在这是一个新合同了！');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
})();


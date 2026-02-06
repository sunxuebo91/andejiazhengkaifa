/**
 * 手动同步合同状态并触发保险同步
 * 用于修复爱签回调没有触发的情况
 */

const mongoose = require('mongoose');
const axios = require('axios');

const contractNo = 'CONTRACT_1770287360099_qrpa44nkb';

async function manualSyncContractStatus() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/housekeeping');
    console.log('✅ 连接到数据库成功\n');
    
    const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));
    
    // 1. 查找合同
    const contract = await Contract.findOne({ contractNumber: contractNo });
    
    if (!contract) {
      console.log('❌ 未找到合同');
      process.exit(1);
    }
    
    console.log('📋 当前合同状态:');
    console.log(`   合同编号: ${contract.contractNumber}`);
    console.log(`   客户: ${contract.customerName}`);
    console.log(`   服务人员: ${contract.workerName}`);
    console.log(`   合同状态: ${contract.contractStatus}`);
    console.log(`   爱签状态: ${contract.esignStatus}`);
    console.log('');
    
    // 2. 更新合同状态
    console.log('🔧 更新合同状态为 active...');
    await Contract.updateOne(
      { contractNumber: contractNo },
      { 
        $set: { 
          contractStatus: 'active',
          esignStatus: '2',
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('✅ 合同状态已更新\n');
    
    // 3. 提示手动触发保险同步
    console.log('💡 下一步操作:');
    console.log('   请在前端合同详情页面，点击"同步保险"按钮');
    console.log('   或者调用API: POST /api/contracts/' + contract._id + '/sync-insurance');
    console.log('');
    
    // 4. 验证最终状态
    const updatedContract = await Contract.findOne({ contractNumber: contractNo });
    console.log('');
    console.log('📊 最终合同状态:');
    console.log(`   合同状态: ${updatedContract.contractStatus}`);
    console.log(`   爱签状态: ${updatedContract.esignStatus}`);
    console.log(`   保险同步状态: ${updatedContract.insuranceSyncStatus || '(未设置)'}`);
    console.log('');
    
    if (updatedContract.contractStatus === 'active' && updatedContract.esignStatus === '2') {
      console.log('🎉 合同状态同步成功！');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

manualSyncContractStatus();


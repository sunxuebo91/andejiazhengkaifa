const mongoose = require('mongoose');
require('dotenv').config();

async function checkUnknownContracts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/housekeeping');
    console.log('📊 连接数据库成功');
    
    const contractSchema = new mongoose.Schema({}, { collection: 'contracts', strict: false });
    const Contract = mongoose.model('Contract', contractSchema);
    
    // 查找所有合同
    const contracts = await Contract.find({}).sort({ createdAt: -1 });
    console.log(`📋 总合同数量: ${contracts.length}`);
    
    // 分类统计
    const categories = {
      unknown: [], // 未知合同（没有客户信息或异常数据）
      incomplete: [], // 不完整合同（缺少关键字段）
      normal: [] // 正常合同
    };
    
    contracts.forEach(contract => {
      const hasCustomer = contract.customerName && contract.customerPhone;
      const hasWorker = contract.workerName && contract.workerPhone;
      const hasBasicInfo = contract.contractType && contract.startDate;
      
      // 检查是否为未知合同
      if (!hasCustomer || 
          !contract.customerName || 
          contract.customerName === '未知' || 
          contract.customerName === 'undefined' ||
          contract.customerName === 'null' ||
          contract.customerPhone === 'undefined' ||
          contract.customerPhone === 'null') {
        categories.unknown.push({
          id: contract._id,
          customerName: contract.customerName || '无',
          customerPhone: contract.customerPhone || '无',
          workerName: contract.workerName || '无',
          contractType: contract.contractType || '无',
          createdAt: contract.createdAt,
          contractStatus: contract.contractStatus || '无',
          esignContractNo: contract.esignContractNo || '无'
        });
      } else if (!hasWorker || !hasBasicInfo) {
        categories.incomplete.push({
          id: contract._id,
          customerName: contract.customerName,
          customerPhone: contract.customerPhone,
          workerName: contract.workerName || '缺失',
          contractType: contract.contractType || '缺失',
          createdAt: contract.createdAt
        });
      } else {
        categories.normal.push({
          id: contract._id,
          customerName: contract.customerName,
          customerPhone: contract.customerPhone,
          workerName: contract.workerName,
          contractType: contract.contractType
        });
      }
    });
    
    console.log(`\n📊 合同分类统计:`);
    console.log(`✅ 正常合同: ${categories.normal.length}`);
    console.log(`⚠️  不完整合同: ${categories.incomplete.length}`);
    console.log(`❌ 未知/异常合同: ${categories.unknown.length}`);
    
    if (categories.unknown.length > 0) {
      console.log(`\n❌ 未知/异常合同详情:`);
      categories.unknown.forEach((contract, index) => {
        console.log(`${index + 1}. ID: ${contract.id}`);
        console.log(`   客户: ${contract.customerName} (${contract.customerPhone})`);
        console.log(`   阿姨: ${contract.workerName}`);
        console.log(`   类型: ${contract.contractType}`);
        console.log(`   状态: ${contract.contractStatus}`);
        console.log(`   爱签编号: ${contract.esignContractNo}`);
        console.log(`   创建时间: ${contract.createdAt}`);
        console.log('');
      });
      
      // 返回需要删除的合同ID列表
      return categories.unknown.map(c => c.id.toString());
    }
    
    if (categories.incomplete.length > 0) {
      console.log(`\n⚠️  不完整合同详情:`);
      categories.incomplete.forEach((contract, index) => {
        console.log(`${index + 1}. ID: ${contract.id}`);
        console.log(`   客户: ${contract.customerName} (${contract.customerPhone})`);
        console.log(`   阿姨: ${contract.workerName}`);
        console.log(`   类型: ${contract.contractType}`);
        console.log('');
      });
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ 检查合同失败:', error);
    return [];
  } finally {
    await mongoose.disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkUnknownContracts()
    .then(unknownIds => {
      if (unknownIds.length > 0) {
        console.log(`\n🗑️  发现 ${unknownIds.length} 个需要删除的未知合同`);
        console.log('合同ID列表:', unknownIds);
      } else {
        console.log('\n✅ 没有发现需要删除的未知合同');
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { checkUnknownContracts }; 
const mongoose = require('mongoose');
require('dotenv').config();

const contractSchema = new mongoose.Schema({}, { strict: false, collection: 'contracts' });
const Contract = mongoose.model('Contract', contractSchema);

async function checkContract() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库');

    const contract = await Contract.findOne({ 
      contractNumber: 'CONTRACT_1772200365385_goiyn4zut' 
    });

    if (!contract) {
      console.log('❌ 未找到合同');
      return;
    }

    console.log('\n📋 合同基本信息:');
    console.log('合同编号:', contract.contractNumber);
    console.log('客户姓名:', contract.customerName);
    console.log('客户电话:', contract.customerPhone);

    console.log('\n📝 templateParams 字段:');
    if (contract.templateParams) {
      const keys = Object.keys(contract.templateParams);
      console.log('字段总数:', keys.length);
      console.log('所有字段名:', keys);
      
      // 查找服务相关字段
      const serviceFields = keys.filter(k => 
        k.includes('服务') || k.includes('内容') || k.includes('备注') || k.includes('项目')
      );
      console.log('\n🔍 服务相关字段:', serviceFields);
      
      serviceFields.forEach(field => {
        console.log(`\n字段: ${field}`);
        console.log(`值: ${contract.templateParams[field]}`);
        console.log(`类型: ${typeof contract.templateParams[field]}`);
      });
    } else {
      console.log('❌ 没有 templateParams 字段');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

checkContract();


/**
 * 修复合同签署链接格式
 * 为现有合同的 esignSignUrls 添加 role 字段
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/housekeeping';

async function fixContractSignUrls() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ 已连接到数据库');
    
    const db = client.db();
    const contracts = db.collection('contracts');
    
    // 查找所有有 esignSignUrls 的合同
    const contractsWithSignUrls = await contracts.find({
      esignSignUrls: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`📋 找到 ${contractsWithSignUrls.length} 个需要修复的合同`);
    
    for (const contract of contractsWithSignUrls) {
      try {
        // 解析现有的签署链接
        const signUrls = JSON.parse(contract.esignSignUrls);
        
        // 检查是否已经有 role 字段
        if (signUrls.length > 0 && signUrls[0].role) {
          console.log(`⏭️  合同 ${contract.contractNumber} 已有 role 字段，跳过`);
          continue;
        }
        
        // 添加 role 字段
        const updatedSignUrls = signUrls.map((signUrl, index) => ({
          ...signUrl,
          role: index === 0 ? '甲方（客户）' : '乙方（服务人员）',
          signOrder: index + 1
        }));
        
        // 更新数据库
        await contracts.updateOne(
          { _id: contract._id },
          { $set: { esignSignUrls: JSON.stringify(updatedSignUrls) } }
        );
        
        console.log(`✅ 已修复合同 ${contract.contractNumber}`);
        console.log(`   - 客户: ${updatedSignUrls[0]?.name} (${updatedSignUrls[0]?.mobile})`);
        if (updatedSignUrls[1]) {
          console.log(`   - 服务人员: ${updatedSignUrls[1]?.name} (${updatedSignUrls[1]?.mobile})`);
        }
        
      } catch (error) {
        console.error(`❌ 修复合同 ${contract.contractNumber} 失败:`, error.message);
      }
    }
    
    console.log('\n🎉 修复完成！');
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
  } finally {
    await client.close();
    console.log('👋 已断开数据库连接');
  }
}

// 执行修复
fixContractSignUrls();


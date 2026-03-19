/**
 * 修复合同中无效的 lastUpdatedBy 字段
 * 
 * 问题：某些合同的 lastUpdatedBy 字段被设置为无效的字符串（如 "batch-sync", "miniprogram-user"）
 *       而不是有效的 MongoDB ObjectId
 * 
 * 解决方案：将这些无效值设置为 null
 * 
 * 使用方法：
 *   cd backend
 *   node fix-invalid-lastUpdatedBy.js
 */

const mongoose = require('mongoose');

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazhengcrm';

async function fixInvalidLastUpdatedBy() {
  console.log('🔧 开始修复无效的 lastUpdatedBy 字段...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    const db = mongoose.connection.db;
    
    // 1. 查找所有 lastUpdatedBy 是字符串但不是有效 ObjectId 的合同
    console.log('🔍 查找无效的 lastUpdatedBy 字段...');
    
    const contracts = await db.collection('contracts').find({
      lastUpdatedBy: { $type: 'string' }  // 查找类型为字符串的字段
    }).toArray();
    
    console.log(`📊 找到 ${contracts.length} 个 lastUpdatedBy 为字符串的合同\n`);
    
    if (contracts.length === 0) {
      console.log('✅ 没有需要修复的合同');
      await mongoose.connection.close();
      return;
    }
    
    // 2. 过滤出无效的 ObjectId（不是24位十六进制字符串的）
    const invalidContracts = contracts.filter(c => {
      const value = c.lastUpdatedBy;
      if (!value) return false;
      // 有效的 ObjectId 是24位十六进制字符串
      return !/^[a-fA-F0-9]{24}$/.test(value);
    });
    
    console.log(`📊 其中 ${invalidContracts.length} 个合同的 lastUpdatedBy 是无效值：`);
    
    // 显示详情
    const invalidValues = {};
    invalidContracts.forEach(c => {
      const value = c.lastUpdatedBy;
      if (!invalidValues[value]) {
        invalidValues[value] = [];
      }
      invalidValues[value].push(c.contractNumber || c._id);
    });
    
    for (const [value, contracts] of Object.entries(invalidValues)) {
      console.log(`   "${value}": ${contracts.length} 个合同`);
      if (contracts.length <= 5) {
        contracts.forEach(cn => console.log(`      - ${cn}`));
      } else {
        contracts.slice(0, 3).forEach(cn => console.log(`      - ${cn}`));
        console.log(`      - ... 还有 ${contracts.length - 3} 个`);
      }
    }
    
    // 3. 批量更新，将无效值设置为 null
    console.log('\n🔧 开始修复...');
    
    const result = await db.collection('contracts').updateMany(
      {
        lastUpdatedBy: { 
          $type: 'string',
          $not: /^[a-fA-F0-9]{24}$/  // 不是有效的 ObjectId 格式
        }
      },
      {
        $set: { lastUpdatedBy: null }
      }
    );
    
    console.log(`✅ 修复完成！更新了 ${result.modifiedCount} 个合同\n`);
    
    // 4. 验证修复结果
    const remaining = await db.collection('contracts').countDocuments({
      lastUpdatedBy: { 
        $type: 'string',
        $not: /^[a-fA-F0-9]{24}$/
      }
    });
    
    if (remaining === 0) {
      console.log('✅ 验证通过：所有无效值已被清除');
    } else {
      console.log(`⚠️  仍有 ${remaining} 个合同需要手动检查`);
    }
    
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  }
}

fixInvalidLastUpdatedBy();


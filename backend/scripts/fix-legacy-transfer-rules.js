/* eslint-disable */
// 一次性修复脚本：
//   1. 给所有缺少 targetModule 字段的客户线索流转规则补上 targetModule='customer'
//   2. 把老规则『48小时自动流转』禁用，避免与新规则『客户线索流转』并发竞争同一批客户
// 用法: node backend/scripts/fix-legacy-transfer-rules.js
// 备注: 脚本只改 lead_transfer_rules 集合，不触碰任何客户数据。

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`✅ 已连接: ${MONGO_URI}\n`);

  const rules = mongoose.connection.db.collection('lead_transfer_rules');

  // 1. 先把所有规则打印出来作为修改前快照
  const before = await rules.find({}).toArray();
  console.log('==== 修改前规则快照 ====');
  for (const r of before) {
    console.log({
      _id: r._id.toString(),
      ruleName: r.ruleName,
      enabled: r.enabled,
      targetModule: r.targetModule ?? '(字段不存在)',
      totalTransferred: r.statistics?.totalTransferred,
    });
  }

  // 2. 回填 targetModule：所有缺失该字段的规则一律视为 customer 模块
  const backfillResult = await rules.updateMany(
    {
      $or: [
        { targetModule: { $exists: false } },
        { targetModule: null },
        { targetModule: '' },
      ],
    },
    { $set: { targetModule: 'customer' } },
  );
  console.log(`\n🔧 回填 targetModule='customer' 的规则数: ${backfillResult.modifiedCount}`);

  // 3. 禁用老规则『48小时自动流转』（避免和新规则『客户线索流转』并发处理同一批客户）
  const disableResult = await rules.updateOne(
    { ruleName: '48小时自动流转' },
    { $set: { enabled: false, updatedAt: new Date() } },
  );
  console.log(`🛑 禁用『48小时自动流转』的修改数: ${disableResult.modifiedCount}`);

  // 4. 再次打印修改后状态
  const after = await rules.find({}).toArray();
  console.log('\n==== 修改后规则快照 ====');
  for (const r of after) {
    console.log({
      _id: r._id.toString(),
      ruleName: r.ruleName,
      enabled: r.enabled,
      targetModule: r.targetModule,
      totalTransferred: r.statistics?.totalTransferred,
    });
  }

  // 5. 验证 cron 的默认查询是否能命中
  const cronHit = await rules
    .find({ enabled: true, targetModule: 'customer' })
    .toArray();
  console.log(
    `\n🎯 cron 查询 {enabled:true, targetModule:'customer'} 命中规则: ${cronHit.map(r => r.ruleName).join(', ') || '无'}`,
  );

  await mongoose.disconnect();
  console.log('\n✅ 完成');
})().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});

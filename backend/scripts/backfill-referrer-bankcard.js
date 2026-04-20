/**
 * 数据修复脚本：把推荐人提交结算时的银行卡信息回填到 referrers 档案
 *
 * 问题：applySettlement 早期版本只存了 referral_resumes，没有同步到 referrers，
 *       导致推荐人列表显示"未填写"
 * 修复：遍历所有有 bankCard 的 referral_resumes，取每个推荐人最新一条，
 *       更新到 referrers.bankCardNumber / bankName
 *
 * 运行方式：node backend/scripts/backfill-referrer-bankcard.js
 */

const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB 已连接\n');

  const db = mongoose.connection.db;
  const resumesCol  = db.collection('referral_resumes');
  const referrersCol = db.collection('referrers');

  // 找所有有 bankCard 的推荐记录，按推荐人分组取最新一条
  const pipeline = [
    { $match: { bankCard: { $exists: true, $ne: null, $ne: '' } } },
    { $sort:  { settlementAppliedAt: -1 } },
    {
      $group: {
        _id: '$referrerId',
        bankCard:  { $first: '$bankCard'  },
        bankName:  { $first: '$bankName'  },
        appliedAt: { $first: '$settlementAppliedAt' },
      },
    },
  ];

  const rows = await resumesCol.aggregate(pipeline).toArray();
  console.log(`📋 找到有银行卡记录的推荐人：${rows.length} 位\n`);

  let updated = 0, skipped = 0, notFound = 0;

  for (const row of rows) {
    let referrerId;
    try { referrerId = new mongoose.Types.ObjectId(row._id); }
    catch { console.log(`  ⚠️  无效 referrerId: ${row._id}`); notFound++; continue; }

    const referrer = await referrersCol.findOne({ _id: referrerId });
    if (!referrer) { notFound++; continue; }

    // 如果已经有银行卡且和结算记录一致，跳过
    if (referrer.bankCardNumber === row.bankCard && referrer.bankName === row.bankName) {
      skipped++;
      continue;
    }

    await referrersCol.updateOne(
      { _id: referrerId },
      { $set: { bankCardNumber: row.bankCard, bankName: row.bankName } },
    );

    console.log(`✏️  ${referrer.name}（${referrer.phone}）银行卡: ${referrer.bankCardNumber || '空'} → ${row.bankCard}  开户行: ${row.bankName}`);
    updated++;
  }

  console.log('\n========== 回填完成 ==========');
  console.log(`✅ 已更新：${updated} 位`);
  console.log(`⏭️  已是最新，跳过：${skipped} 位`);
  console.log(`⚠️  推荐人不存在，跳过：${notFound} 位`);
  console.log('================================\n');

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });

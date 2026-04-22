/**
 * 修复 referrers 表里 sourceStaffId 不指向合法 users._id 的历史脏数据
 *
 * 背景：
 *   早期小程序海报把 miniprogram_users._id 或陈旧的 users._id 塞进了 sourceStaffId，
 *   导致后端 findById 查不到员工，来源员工收不到小程序通知/CRM 铃铛。
 *
 * 修复策略（按优先级）：
 *   1. 若 sourceStaffId 本身就是合法 users._id → 跳过
 *   2. 若 sourceStaffId 能在 miniprogram_users 中命中，且该 mp 用户有 phone →
 *      按 phone 在 users 中找到真实员工，用真实 _id 覆盖；若员工 wechatOpenId 空且
 *      mp 用户有 openid，顺手回填 users.wechatOpenId
 *   3. 兜底：用管理员 _id 覆盖（保证 sourceStaffId 永远落在合法用户上）
 *
 * 使用方法：
 *   cd backend
 *   node scripts/maintenance/fix-referrer-source-staff-id.js        # 实际执行
 *   node scripts/maintenance/fix-referrer-source-staff-id.js --dry  # 仅演练，不写库
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';
const DRY_RUN = process.argv.includes('--dry');
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function toObjectId(id) {
  try { return new mongoose.Types.ObjectId(id); } catch { return null; }
}

async function main() {
  console.log(`🔧 开始修复 referrers.sourceStaffId 脏数据 ${DRY_RUN ? '(dry-run)' : ''}`);
  console.log(`   MONGODB_URI=${MONGODB_URI}\n`);

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const referrers = db.collection('referrers');
  const users = db.collection('users');
  const mpUsers = db.collection('miniprogram_users');

  // 兜底管理员：优先 isAdmin=true 且在职，回退 role=admin
  let admin = await users.findOne({ isAdmin: true, isActive: { $ne: false } });
  if (!admin) {
    admin = await users.findOne({
      role: { $in: ['admin', '系统管理员', '管理员'] },
      active: { $ne: false },
    });
  }
  if (!admin) {
    console.error('❌ 未找到管理员用户，脚本中止');
    await mongoose.connection.close();
    process.exit(1);
  }
  console.log(`👤 兜底管理员: ${admin._id} (${admin.name || admin.username})\n`);

  const total = await referrers.countDocuments({ sourceStaffId: { $exists: true, $ne: null } });
  console.log(`📊 referrers 总数（含 sourceStaffId）: ${total}`);

  const cursor = referrers.find({ sourceStaffId: { $exists: true, $ne: null } });
  const stats = { scanned: 0, valid: 0, fixedByPhone: 0, fallbackToAdmin: 0, openIdBackfilled: 0, errors: 0 };

  while (await cursor.hasNext()) {
    const r = await cursor.next();
    stats.scanned += 1;
    const rawId = String(r.sourceStaffId || '');

    if (!OBJECT_ID_RE.test(rawId)) {
      console.log(`⚠️  [${r._id}] sourceStaffId 非合法 ObjectId: "${rawId}" → 兜底管理员`);
      await applyFix(referrers, r._id, admin._id, 'non-objectid');
      stats.fallbackToAdmin += 1;
      continue;
    }

    // 1. 命中 users → 合法，跳过
    const staff = await users.findOne({ _id: toObjectId(rawId) });
    if (staff) {
      stats.valid += 1;
      continue;
    }

    // 2. 反查 miniprogram_users
    const mp = await mpUsers.findOne({ _id: toObjectId(rawId) });
    if (mp?.phone) {
      const realStaff = await users.findOne({ phone: mp.phone });
      if (realStaff) {
        await applyFix(referrers, r._id, realStaff._id, `mp.phone=${mp.phone}`);
        stats.fixedByPhone += 1;
        // 顺手回填 wechatOpenId
        const mpOpenid = mp.openid || mp._openid;
        if (mpOpenid && !realStaff.wechatOpenId) {
          if (!DRY_RUN) {
            await users.updateOne({ _id: realStaff._id }, { $set: { wechatOpenId: mpOpenid } });
          }
          console.log(`   ↳ 回填 users.wechatOpenId: userId=${realStaff._id} openid=${mpOpenid}`);
          stats.openIdBackfilled += 1;
        }
        continue;
      }
      console.log(`⚠️  [${r._id}] mp.phone=${mp.phone} 在 users 中找不到 → 兜底管理员`);
    } else {
      console.log(`⚠️  [${r._id}] sourceStaffId=${rawId} 在 users/miniprogram_users 中均未命中 → 兜底管理员`);
    }

    await applyFix(referrers, r._id, admin._id, 'fallback-admin');
    stats.fallbackToAdmin += 1;
  }

  console.log('\n===== 修复统计 =====');
  console.log(`扫描:              ${stats.scanned}`);
  console.log(`合法（跳过）:      ${stats.valid}`);
  console.log(`phone 反查修复:    ${stats.fixedByPhone}`);
  console.log(`兜底管理员:        ${stats.fallbackToAdmin}`);
  console.log(`wechatOpenId 回填: ${stats.openIdBackfilled}`);
  console.log(`错误:              ${stats.errors}`);
  if (DRY_RUN) console.log('\n⚠️  dry-run 模式，未实际写库。');

  await mongoose.connection.close();
  console.log('\n🔌 数据库连接已关闭');
}

async function applyFix(col, referrerId, newStaffId, reason) {
  console.log(`✏️  [${referrerId}] sourceStaffId → ${newStaffId} (${reason})`);
  if (DRY_RUN) return;
  await col.updateOne({ _id: referrerId }, { $set: { sourceStaffId: String(newStaffId) } });
}

main().catch((err) => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});

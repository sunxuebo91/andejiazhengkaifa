/**
 * 数据修复脚本：同步角色权限
 *
 * 背景：
 *   1. `role.constants.ts` 里 `DEFAULT_ROLE_DEFINITIONS` 新增的权限位（如 training-order:*）
 *      不会被 `ensureDefaultRoles()` 回填到已存在的 Role 文档，导致 UI 和 JWT 里都缺失。
 *   2. 后端把权限位 `training_leads:admin` 重命名为 `training-lead:admin`
 *      （与其他权限使用 kebab-case 保持一致），已存量持有该权限的 Role/User 需要重命名。
 *
 * 本脚本做两件事：
 *   A. 把所有 Role.permissions / User.permissions 里出现的 `training_leads:admin`
 *      原地重命名为 `training-lead:admin`。
 *   B. 按 `DEFAULT_ROLE_DEFINITIONS`（本文件内置同一份清单，避免依赖 TS 构建产物）
 *      对 Role.permissions 做并集合并——只加不减，管理员在 UI 上自定义保留的权限不会丢。
 *
 * 幂等：可反复执行，已同步过的数据不会被重复修改。
 *
 * 运行方式：node backend/scripts/sync-role-permissions.js
 */

const mongoose = require('mongoose');
const {
  DEFAULT_ROLE_PERMISSIONS,
  applyRenames,
  mergePermissions,
} = require('./permissions-sync-core');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB 已连接\n');

  const db = mongoose.connection.db;
  const rolesCol = db.collection('roles');
  const usersCol = db.collection('users');

  // ── 步骤 A：角色文档重命名 + 并集合并 ─────────────────────────
  const roleDocs = await rolesCol.find({}).toArray();
  console.log(`📋 角色文档数量：${roleDocs.length}`);

  let roleRenameCount = 0;
  let roleMergeCount = 0;

  for (const role of roleDocs) {
    const original = Array.isArray(role.permissions) ? [...role.permissions] : [];

    const { list: renamed, changed: renameChanged } = applyRenames(original);
    const code = role.code;
    const defaults = code && DEFAULT_ROLE_PERMISSIONS[code] ? DEFAULT_ROLE_PERMISSIONS[code] : [];
    const { merged, added } = mergePermissions(renamed, defaults);

    if (!renameChanged && added.length === 0) {
      continue;
    }

    await rolesCol.updateOne({ _id: role._id }, { $set: { permissions: merged } });

    if (renameChanged) roleRenameCount += 1;
    if (added.length > 0) roleMergeCount += 1;

    console.log(
      `  • ${role.name || code || role._id}：` +
      (renameChanged ? `重命名 training_leads:admin→training-lead:admin；` : '') +
      (added.length > 0 ? `新增 ${added.length} 项：${added.join(', ')}` : ''),
    );
  }

  // ── 步骤 B：用户文档重命名（仅做权限重命名，不合并，避免误扩权） ──
  const userDocs = await usersCol
    .find({ permissions: 'training_leads:admin' })
    .toArray();
  console.log(`\n📋 需要重命名权限的用户数量：${userDocs.length}`);

  let userRenameCount = 0;
  for (const user of userDocs) {
    const { list, changed } = applyRenames(user.permissions);
    if (!changed) continue;
    await usersCol.updateOne({ _id: user._id }, { $set: { permissions: list } });
    userRenameCount += 1;
  }

  console.log('\n✅ 完成');
  console.log(`   角色重命名：${roleRenameCount} 条`);
  console.log(`   角色合并新权限：${roleMergeCount} 条`);
  console.log(`   用户重命名：${userRenameCount} 条`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});

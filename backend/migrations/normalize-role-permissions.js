/**
 * 数据库迁移脚本：标准化角色编码，并按角色回填用户权限快照
 *
 * 运行方式：node migrations/normalize-role-permissions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const DEFAULT_ROLE_DEFINITIONS = [
  {
    code: 'admin',
    name: '系统管理员',
    description: '拥有系统所有权限',
    permissions: ['*'],
    active: true,
  },
  {
    code: 'manager',
    name: '经理',
    description: '可以管理团队、阿姨资源、客户和合同',
    permissions: ['resume:all', 'customer:all', 'contract:all', 'insurance:all', 'background-check:all', 'user:view', 'admin:settings'],
    active: true,
  },
  {
    code: 'employee',
    name: '普通员工',
    description: '可以管理阿姨资源、客户和自己的合同',
    permissions: [
      'resume:view',
      'resume:create',
      'resume:edit',
      'customer:view',
      'customer:create',
      'customer:edit',
      'contract:view',
      'contract:create',
      'contract:edit',
      'insurance:view',
      'insurance:create',
      'background-check:view',
      'background-check:create',
    ],
    active: true,
  },
];

const ROLE_ALIASES = {
  admin: 'admin',
  administrator: 'admin',
  系统管理员: 'admin',
  管理员: 'admin',
  超级管理员: 'admin',
  manager: 'manager',
  经理: 'manager',
  主管: 'manager',
  employee: 'employee',
  staff: 'employee',
  普通员工: 'employee',
  员工: 'employee',
  销售: 'employee',
};

function normalizeRoleCode(role) {
  if (!role || typeof role !== 'string') {
    return null;
  }

  const trimmedRole = role.trim();
  return ROLE_ALIASES[trimmedRole] || ROLE_ALIASES[trimmedRole.toLowerCase()] || null;
}

async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazhengcrm';
    console.log('🔌 连接数据库:', mongoUri);

    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');

    const db = mongoose.connection.db;
    const rolesCollection = db.collection('roles');
    const usersCollection = db.collection('users');

    console.log('\n🧭 标准化默认角色...');
    let rolesUpserted = 0;
    let rolesNormalized = 0;

    for (const roleDefinition of DEFAULT_ROLE_DEFINITIONS) {
      const existingRole = await rolesCollection.findOne({
        $or: [{ code: roleDefinition.code }, { name: roleDefinition.name }],
      });

      if (!existingRole) {
        await rolesCollection.insertOne({
          ...roleDefinition,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        rolesUpserted += 1;
        console.log(`  + 新建角色 ${roleDefinition.code} (${roleDefinition.name})`);
        continue;
      }

      const update = {
        $set: {
          code: roleDefinition.code,
          name: roleDefinition.name,
          description: roleDefinition.description,
          permissions: roleDefinition.permissions,
          active: roleDefinition.active,
          updatedAt: new Date(),
        },
      };

      await rolesCollection.updateOne({ _id: existingRole._id }, update);
      rolesNormalized += 1;
      console.log(`  ~ 标准化角色 ${roleDefinition.code} (${roleDefinition.name})`);
    }

    console.log('\n👤 标准化用户角色并回填权限快照...');
    const allUsers = await usersCollection.find({}).toArray();
    let usersUpdated = 0;
    let usersSkipped = 0;

    for (const user of allUsers) {
      const normalizedRole = normalizeRoleCode(user.role);
      if (!normalizedRole) {
        usersSkipped += 1;
        console.log(`  ! 跳过用户 ${user.username || user._id}，无法识别角色: ${user.role}`);
        continue;
      }

      const roleRecord =
        (await rolesCollection.findOne({ code: normalizedRole })) ||
        DEFAULT_ROLE_DEFINITIONS.find((role) => role.code === normalizedRole);
      const nextPermissions = Array.isArray(roleRecord?.permissions) ? roleRecord.permissions : [];

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            role: normalizedRole,
            permissions: nextPermissions,
            updatedAt: new Date(),
          },
        },
      );

      usersUpdated += 1;
      console.log(`  ~ 更新用户 ${user.username || user._id}: role=${normalizedRole}, permissions=${nextPermissions.join(',') || '[]'}`);
    }

    console.log('\n🧱 检查角色编码索引...');
    const existingIndexes = await rolesCollection.indexes();
    const hasCodeIndex = existingIndexes.some((index) => index.name === 'code_1');
    if (hasCodeIndex) {
      console.log('ℹ️  roles.code 索引已存在，跳过创建');
    } else {
      await rolesCollection.createIndex({ code: 1 }, { unique: true, sparse: true });
      console.log('✅ 创建 roles.code 唯一索引');
    }

    console.log('\n🎉 迁移完成');
    console.log('\n📊 迁移统计:');
    console.log(`   - 新建默认角色: ${rolesUpserted}`);
    console.log(`   - 标准化现有角色: ${rolesNormalized}`);
    console.log(`   - 更新用户: ${usersUpdated}`);
    console.log(`   - 跳过用户: ${usersSkipped}`);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
}

migrate();

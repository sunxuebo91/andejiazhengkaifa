const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

const execAsync = promisify(exec);

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';

async function restoreUsersFromBackup() {
  try {
    console.log('🔄 从备份恢复用户数据...\n');
    console.log('='.repeat(80));
    console.log('⚠️  警告：此操作将从最新备份恢复所有用户数据！');
    console.log('='.repeat(80));

    // 使用最新的备份
    const backupFile = 'housekeeping_20251206_020001.tar.gz';
    const backupDir = path.join(__dirname, '../backups/mongodb');
    const backupPath = path.join(backupDir, backupFile);
    const tempDir = path.join('/tmp', `restore_users_${Date.now()}`);

    console.log(`\n📦 使用备份: ${backupFile}\n`);

    // 创建临时目录
    await fs.mkdir(tempDir, { recursive: true });

    // 解压备份
    console.log('1️⃣  解压备份文件...');
    await execAsync(`tar -xzf "${backupPath}" -C "${tempDir}"`);
    console.log('✅ 解压完成\n');

    // 查找 users.bson 文件
    const { stdout: findResult } = await execAsync(`find "${tempDir}" -name "users.bson"`);
    const usersBsonPath = findResult.trim();

    if (!usersBsonPath) {
      throw new Error('未找到 users.bson 文件');
    }

    console.log('2️⃣  读取备份中的用户数据...');
    
    // 使用 bsondump 导出为 JSON
    const jsonPath = path.join(tempDir, 'users.json');
    await execAsync(`bsondump "${usersBsonPath}" > "${jsonPath}"`);

    // 读取 JSON 文件
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const backupUsers = jsonContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(u => u);

    console.log(`✅ 找到 ${backupUsers.length} 个用户\n`);

    backupUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.username} (${user.name}) - ${user.role}`);
    });

    // 连接数据库
    console.log('\n3️⃣  连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // 获取当前数据库中的用户
    const currentUsers = await User.find({});
    console.log(`4️⃣  当前数据库中有 ${currentUsers.length} 个用户\n`);

    // 删除当前所有用户（除了我们刚创建的临时用户）
    console.log('5️⃣  清空当前用户表...');
    await User.deleteMany({});
    console.log('✅ 清空完成\n');

    // 恢复备份中的用户
    console.log('6️⃣  恢复备份中的用户...\n');
    
    for (const backupUser of backupUsers) {
      try {
        // 转换日期格式
        const userData = {
          _id: new mongoose.Types.ObjectId(backupUser._id.$oid),
          username: backupUser.username,
          password: backupUser.password,
          name: backupUser.name,
          phone: backupUser.phone,
          email: backupUser.email,
          avatar: backupUser.avatar,
          role: backupUser.role,
          department: backupUser.department,
          permissions: backupUser.permissions || [],
          active: backupUser.active !== false,
          createdAt: backupUser.createdAt?.$date?.$numberLong 
            ? new Date(parseInt(backupUser.createdAt.$date.$numberLong))
            : new Date(),
          updatedAt: backupUser.updatedAt?.$date?.$numberLong
            ? new Date(parseInt(backupUser.updatedAt.$date.$numberLong))
            : new Date(),
        };

        await User.create(userData);
        console.log(`✅ 恢复用户: ${userData.username} (${userData.name})`);
      } catch (error) {
        console.error(`❌ 恢复用户失败: ${backupUser.username}`, error.message);
      }
    }

    console.log('\n7️⃣  验证恢复结果...');
    const restoredUsers = await User.find({});
    console.log(`✅ 当前数据库中有 ${restoredUsers.length} 个用户\n`);

    restoredUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.username} (${user.name}) - ${user.role} - ${user.active ? '✅' : '❌'}`);
    });

    // 清理临时目录
    await execAsync(`rm -rf "${tempDir}"`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ 用户数据恢复完成！');
    console.log('='.repeat(80));
    console.log('\n📋 恢复的用户列表:');
    console.log('\n用户名\t\t姓名\t\t角色\t\t手机号');
    console.log('-'.repeat(80));
    
    restoredUsers.forEach(user => {
      console.log(`${user.username}\t${user.name}\t${user.role}\t${user.phone || '无'}`);
    });

    console.log('\n⚠️  重要提醒:');
    console.log('1. 所有用户的密码已恢复为备份时的密码');
    console.log('2. 如果用户忘记密码，可以使用 reset-user-password.js 重置');
    console.log('3. 建议通知所有用户检查账号是否正常');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

restoreUsersFromBackup();


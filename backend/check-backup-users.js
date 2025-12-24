const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

async function checkBackupUsers() {
  try {
    console.log('🔍 检查数据库备份中的用户信息...\n');
    console.log('='.repeat(80));

    // 获取最近的备份文件
    const backupDir = path.join(__dirname, '../backups/mongodb');
    
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(f => f.endsWith('.tar.gz'))
        .sort()
        .reverse()
        .slice(0, 10); // 检查最近10个备份

      console.log(`\n找到 ${backupFiles.length} 个最近的备份文件:\n`);
      backupFiles.forEach((f, i) => {
        console.log(`${i + 1}. ${f}`);
      });

      console.log('\n开始检查备份...\n');
      console.log('='.repeat(80));

      for (const backupFile of backupFiles.slice(0, 3)) { // 只检查最近3个
        console.log(`\n📦 检查备份: ${backupFile}`);
        console.log('-'.repeat(80));

        const backupPath = path.join(backupDir, backupFile);
        const tempDir = path.join('/tmp', `backup_check_${Date.now()}`);

        try {
          // 创建临时目录
          await fs.mkdir(tempDir, { recursive: true });

          // 解压备份
          console.log('解压中...');
          await execAsync(`tar -xzf "${backupPath}" -C "${tempDir}"`);

          // 查找 users.bson 文件
          const { stdout: findResult } = await execAsync(`find "${tempDir}" -name "users.bson"`);
          const usersBsonPath = findResult.trim();

          if (usersBsonPath) {
            console.log('找到 users.bson 文件');

            // 使用 bsondump 导出为 JSON
            const jsonPath = path.join(tempDir, 'users.json');
            await execAsync(`bsondump "${usersBsonPath}" > "${jsonPath}"`);

            // 读取 JSON 文件
            const jsonContent = await fs.readFile(jsonPath, 'utf-8');
            const users = jsonContent
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

            console.log(`\n该备份中有 ${users.length} 个用户:\n`);

            users.forEach((user, i) => {
              const username = user.username || '未知';
              const name = user.name || '未知';
              const createdAt = user.createdAt ? new Date(user.createdAt.$date || user.createdAt).toLocaleString('zh-CN') : '未知';
              
              console.log(`${i + 1}. ${username} (${name})`);
              console.log(`   创建时间: ${createdAt}`);
              console.log(`   状态: ${user.active !== false ? '✅' : '❌'}`);
            });

            // 检查是否有 zhaoyaoru
            const zhaoUser = users.find(u => u.username === 'zhaoyaoru');
            if (zhaoUser) {
              console.log('\n✅ 找到 zhaoyaoru 用户！');
              console.log(JSON.stringify(zhaoUser, null, 2));
            } else {
              console.log('\n❌ 该备份中没有 zhaoyaoru 用户');
            }
          } else {
            console.log('❌ 未找到 users.bson 文件');
          }

          // 清理临时目录
          await execAsync(`rm -rf "${tempDir}"`);

        } catch (error) {
          console.error('处理备份时出错:', error.message);
          // 清理临时目录
          try {
            await execAsync(`rm -rf "${tempDir}"`);
          } catch (e) {
            // 忽略清理错误
          }
        }
      }

    } catch (error) {
      console.error('读取备份目录失败:', error.message);
    }

    console.log('\n\n💡 结论:');
    console.log('='.repeat(80));
    console.log('如果在最近的备份中找到了 zhaoyaoru 用户，说明该用户之前确实存在。');
    console.log('如果没有找到，说明该用户可能从未被创建过，或者在备份之前就被删除了。');

  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

checkBackupUsers();


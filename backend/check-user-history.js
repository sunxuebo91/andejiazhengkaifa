const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';

async function checkUserHistory() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const db = mongoose.connection.db;

    // 1. 检查 users 集合的所有文档（包括已删除的）
    console.log('📋 检查 users 集合中的所有用户:');
    console.log('='.repeat(80));
    
    const users = await db.collection('users').find({}).sort({ createdAt: 1 }).toArray();
    console.log(`\n找到 ${users.length} 个用户:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.name})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   创建时间: ${new Date(user.createdAt).toLocaleString('zh-CN')}`);
      console.log(`   更新时间: ${new Date(user.updatedAt).toLocaleString('zh-CN')}`);
      console.log(`   状态: ${user.active !== false ? '✅ 已激活' : '❌ 已禁用'}`);
      console.log('');
    });

    // 2. 检查是否有审计日志或操作日志集合
    console.log('\n📊 检查数据库中的所有集合:');
    console.log('='.repeat(80));
    
    const collections = await db.listCollections().toArray();
    console.log('\n数据库中的集合列表:');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });

    // 3. 检查可能的审计日志集合
    const auditCollections = collections.filter(col => 
      col.name.includes('log') || 
      col.name.includes('audit') || 
      col.name.includes('history') ||
      col.name.includes('operation')
    );

    if (auditCollections.length > 0) {
      console.log('\n\n🔍 找到可能的日志集合:');
      console.log('='.repeat(80));
      
      for (const col of auditCollections) {
        console.log(`\n集合: ${col.name}`);
        const count = await db.collection(col.name).countDocuments();
        console.log(`记录数: ${count}`);
        
        if (count > 0) {
          const samples = await db.collection(col.name)
            .find({})
            .sort({ createdAt: -1, timestamp: -1 })
            .limit(5)
            .toArray();
          
          console.log('最近的记录:');
          samples.forEach((doc, i) => {
            console.log(`${i + 1}.`, JSON.stringify(doc, null, 2).substring(0, 200));
          });
        }
      }
    }

    // 4. 检查 loginlogs 集合中与 zhaoyaoru 相关的记录
    console.log('\n\n🔍 检查登录日志中的 zhaoyaoru 相关记录:');
    console.log('='.repeat(80));
    
    const zhaoUser = users.find(u => u.username === 'zhaoyaoru');
    if (zhaoUser) {
      const loginLogs = await db.collection('loginlogs')
        .find({ userId: zhaoUser._id.toString() })
        .sort({ timestamp: -1 })
        .toArray();
      
      console.log(`\n找到 ${loginLogs.length} 条登录记录`);
      
      if (loginLogs.length > 0) {
        loginLogs.forEach((log, i) => {
          console.log(`${i + 1}. ${log.status} - ${new Date(log.timestamp).toLocaleString('zh-CN')} - IP: ${log.ip}`);
        });
      }
    }

    // 5. 检查所有登录日志，看是否有其他相关用户
    console.log('\n\n📊 所有登录日志统计:');
    console.log('='.repeat(80));
    
    const allLoginLogs = await db.collection('loginlogs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    
    console.log(`\n总共找到 ${allLoginLogs.length} 条登录记录（最近100条）\n`);
    
    // 按用户ID分组
    const userLoginMap = {};
    for (const log of allLoginLogs) {
      if (!userLoginMap[log.userId]) {
        userLoginMap[log.userId] = [];
      }
      userLoginMap[log.userId].push(log);
    }

    console.log('按用户分组的登录记录:');
    for (const [userId, logs] of Object.entries(userLoginMap)) {
      const user = users.find(u => u._id.toString() === userId);
      const username = user ? user.username : '未知用户/已删除';
      const name = user ? user.name : '?';
      
      const successCount = logs.filter(l => l.status === 'success').length;
      const failedCount = logs.filter(l => l.status === 'failed').length;
      const firstLog = logs[logs.length - 1];
      const lastLog = logs[0];
      
      console.log(`\n- ${username} (${name})`);
      console.log(`  用户ID: ${userId}`);
      console.log(`  登录次数: ${logs.length} (成功: ${successCount}, 失败: ${failedCount})`);
      console.log(`  首次登录: ${new Date(firstLog.timestamp).toLocaleString('zh-CN')}`);
      console.log(`  最后登录: ${new Date(lastLog.timestamp).toLocaleString('zh-CN')}`);
    }

    // 6. 检查 MongoDB oplog（如果是副本集）
    console.log('\n\n🔍 尝试检查 MongoDB oplog:');
    console.log('='.repeat(80));
    
    try {
      const oplogDb = mongoose.connection.client.db('local');
      const oplog = await oplogDb.collection('oplog.rs')
        .find({ ns: 'andejiazheng.users' })
        .sort({ ts: -1 })
        .limit(50)
        .toArray();
      
      if (oplog.length > 0) {
        console.log(`\n找到 ${oplog.length} 条 users 集合的操作记录:\n`);
        oplog.forEach((op, i) => {
          console.log(`${i + 1}. ${op.op} - ${new Date(op.ts.getHighBits() * 1000).toLocaleString('zh-CN')}`);
          if (op.o && op.o.username) {
            console.log(`   用户名: ${op.o.username}`);
          }
          if (op.o2 && op.o2._id) {
            console.log(`   ID: ${op.o2._id}`);
          }
        });
      } else {
        console.log('❌ 未找到 oplog 记录（可能不是副本集模式）');
      }
    } catch (error) {
      console.log('❌ 无法访问 oplog（可能不是副本集模式或权限不足）');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkUserHistory();


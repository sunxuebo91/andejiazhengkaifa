const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';

// 用户 Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  email: String,
  phone: String,
  avatar: String,
  role: String,
  department: String,
  permissions: [String],
  active: Boolean,
}, { timestamps: true });

// 登录日志 Schema
const loginLogSchema = new mongoose.Schema({
  userId: String,
  timestamp: Date,
  ip: String,
  userAgent: String,
  status: String,
}, { timestamps: true });

async function findUsersWithHistory() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);
    const LoginLog = mongoose.model('LoginLog', loginLogSchema);

    // 获取所有用户
    const users = await User.find({}).sort({ createdAt: -1 });
    
    console.log('📋 所有用户及其登录历史:\n');
    console.log('='.repeat(80));

    for (const user of users) {
      // 查询该用户的登录记录
      const loginCount = await LoginLog.countDocuments({ userId: user._id.toString() });
      const lastLogin = await LoginLog.findOne({ userId: user._id.toString(), status: 'success' })
        .sort({ timestamp: -1 });
      
      const recentFailed = await LoginLog.countDocuments({ 
        userId: user._id.toString(), 
        status: 'failed',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 最近24小时
      });

      console.log(`\n用户: ${user.username} (${user.name})`);
      console.log('-'.repeat(80));
      console.log('角色:', user.role);
      console.log('状态:', user.active !== false ? '✅ 已激活' : '❌ 已禁用');
      console.log('创建时间:', new Date(user.createdAt).toLocaleString('zh-CN'));
      console.log('登录记录总数:', loginCount);
      
      if (lastLogin) {
        console.log('最后成功登录:', new Date(lastLogin.timestamp).toLocaleString('zh-CN'));
        console.log('最后登录IP:', lastLogin.ip);
      } else {
        console.log('最后成功登录: ❌ 从未成功登录');
      }
      
      if (recentFailed > 0) {
        console.log(`⚠️  最近24小时失败登录次数: ${recentFailed}`);
      }
    }

    // 查找包含 zhao 的所有用户（包括已删除的）
    console.log('\n\n🔍 搜索包含 "zhao" 的用户名:');
    console.log('='.repeat(80));
    
    const zhaoUsers = users.filter(u => 
      u.username?.toLowerCase().includes('zhao') || 
      u.name?.toLowerCase().includes('zhao')
    );
    
    if (zhaoUsers.length > 0) {
      zhaoUsers.forEach(user => {
        console.log(`- ${user.username} (${user.name}) - 创建于 ${new Date(user.createdAt).toLocaleString('zh-CN')}`);
      });
    } else {
      console.log('❌ 没有找到包含 "zhao" 的用户');
    }

    // 查找最近的登录日志（不管是哪个用户）
    console.log('\n\n📊 最近的所有登录尝试（最近50条）:');
    console.log('='.repeat(80));
    
    const recentLogs = await LoginLog.find({})
      .sort({ timestamp: -1 })
      .limit(50);

    if (recentLogs.length === 0) {
      console.log('❌ 没有找到任何登录日志');
    } else {
      console.log(`找到 ${recentLogs.length} 条登录记录\n`);
      
      // 按用户ID分组统计
      const userLoginStats = {};
      for (const log of recentLogs) {
        if (!userLoginStats[log.userId]) {
          userLoginStats[log.userId] = { success: 0, failed: 0, lastTime: log.timestamp };
        }
        if (log.status === 'success') {
          userLoginStats[log.userId].success++;
        } else {
          userLoginStats[log.userId].failed++;
        }
        if (log.timestamp > userLoginStats[log.userId].lastTime) {
          userLoginStats[log.userId].lastTime = log.timestamp;
        }
      }

      console.log('按用户统计:');
      for (const [userId, stats] of Object.entries(userLoginStats)) {
        const user = await User.findById(userId);
        const username = user ? user.username : '未知用户';
        console.log(`- ${username} (ID: ${userId.substring(0, 8)}...): 成功 ${stats.success} 次, 失败 ${stats.failed} 次, 最后: ${new Date(stats.lastTime).toLocaleString('zh-CN')}`);
      }

      console.log('\n最近10条详细记录:');
      recentLogs.slice(0, 10).forEach((log, index) => {
        const statusIcon = log.status === 'success' ? '✅' : '❌';
        const time = new Date(log.timestamp).toLocaleString('zh-CN');
        console.log(`${index + 1}. ${statusIcon} ${time} - UserID: ${log.userId.substring(0, 12)}... - IP: ${log.ip}`);
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

findUsersWithHistory();


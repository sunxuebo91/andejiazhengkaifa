const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

async function diagnoseUser() {
  try {
    const username = process.argv[2] || 'zhaoyaoru';
    
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);
    const LoginLog = mongoose.model('LoginLog', loginLogSchema);

    // 查找用户
    console.log(`🔍 诊断用户: ${username}`);
    console.log('='.repeat(60));
    
    const user = await User.findOne({ username });

    if (!user) {
      console.log('❌ 用户不存在！');
      console.log('\n可能的原因:');
      console.log('1. 用户被删除了');
      console.log('2. 用户名拼写错误');
      return;
    }

    // 显示用户详细信息
    console.log('\n📋 用户基本信息:');
    console.log('-'.repeat(60));
    console.log('ID:', user._id);
    console.log('用户名:', user.username);
    console.log('姓名:', user.name);
    console.log('邮箱:', user.email || '未设置');
    console.log('手机:', user.phone || '未设置');
    console.log('角色:', user.role);
    console.log('部门:', user.department || '未设置');
    console.log('权限:', user.permissions?.length > 0 ? user.permissions.join(', ') : '无');
    console.log('激活状态:', user.active !== false ? '✅ 已激活' : '❌ 已禁用');
    console.log('创建时间:', user.createdAt);
    console.log('更新时间:', user.updatedAt);
    console.log('密码哈希:', user.password ? `${user.password.substring(0, 30)}...` : '❌ 未设置');
    console.log('密码长度:', user.password ? user.password.length : 0);

    // 检查密码格式
    console.log('\n🔐 密码检查:');
    console.log('-'.repeat(60));
    if (!user.password) {
      console.log('❌ 密码未设置！');
    } else if (user.password.length < 20) {
      console.log('⚠️  密码哈希长度异常（正常应该是60个字符）');
      console.log('   当前长度:', user.password.length);
    } else if (!user.password.startsWith('$2')) {
      console.log('⚠️  密码哈希格式异常（不是bcrypt格式）');
    } else {
      console.log('✅ 密码哈希格式正常');
    }

    // 查询最近的登录日志
    console.log('\n📊 最近的登录记录（最近20条）:');
    console.log('-'.repeat(60));
    
    const logs = await LoginLog.find({ userId: user._id.toString() })
      .sort({ timestamp: -1 })
      .limit(20);

    if (logs.length === 0) {
      console.log('❌ 没有找到任何登录记录');
    } else {
      const successCount = logs.filter(l => l.status === 'success').length;
      const failedCount = logs.filter(l => l.status === 'failed').length;
      
      console.log(`总计: ${logs.length} 条记录 (成功: ${successCount}, 失败: ${failedCount})\n`);
      
      logs.forEach((log, index) => {
        const statusIcon = log.status === 'success' ? '✅' : '❌';
        const time = new Date(log.timestamp).toLocaleString('zh-CN');
        console.log(`${index + 1}. ${statusIcon} ${time} - ${log.status.toUpperCase()}`);
        console.log(`   IP: ${log.ip}`);
        if (index < 3) { // 只显示前3条的详细信息
          console.log(`   UserAgent: ${log.userAgent?.substring(0, 80)}...`);
        }
      });

      // 分析最近的登录趋势
      const recentLogs = logs.slice(0, 10);
      const recentFailed = recentLogs.filter(l => l.status === 'failed').length;
      
      console.log('\n📈 最近10次登录分析:');
      console.log('-'.repeat(60));
      if (recentFailed >= 5) {
        console.log('⚠️  警告: 最近10次登录中有', recentFailed, '次失败！');
        console.log('   可能原因: 密码错误、账号被锁定');
      } else if (recentFailed > 0) {
        console.log('ℹ️  最近10次登录中有', recentFailed, '次失败');
      } else {
        console.log('✅ 最近10次登录全部成功');
      }
    }

    // 问题诊断
    console.log('\n🔧 问题诊断:');
    console.log('='.repeat(60));
    
    const issues = [];
    
    if (user.active === false) {
      issues.push('❌ 账号已被禁用');
    }
    
    if (!user.password || user.password.length < 20) {
      issues.push('❌ 密码哈希异常');
    }
    
    if (issues.length === 0) {
      console.log('✅ 未发现明显问题');
      console.log('\n可能的原因:');
      console.log('1. 用户输入的密码错误');
      console.log('2. 浏览器缓存问题');
      console.log('3. 网络连接问题');
      console.log('4. 后端服务异常');
    } else {
      console.log('发现以下问题:');
      issues.forEach(issue => console.log(issue));
    }

    console.log('\n💡 建议的解决方案:');
    console.log('='.repeat(60));
    console.log('1. 重置用户密码:');
    console.log(`   node reset-user-password.js ${username} 123456`);
    console.log('\n2. 测试登录:');
    console.log(`   node test-login.js ${username} 123456`);
    if (user.active === false) {
      console.log('\n3. 启用账号（如果被禁用）:');
      console.log(`   需要在数据库中手动设置 active: true`);
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

diagnoseUser();


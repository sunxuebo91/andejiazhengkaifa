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
  wechatOpenId: String,
  wechatNickname: String,
  wechatAvatar: String,
}, { timestamps: true });

async function checkUser() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);

    // 查找用户
    const username = 'zhaoyaoru';
    console.log(`🔍 查找用户: ${username}`);
    const user = await User.findOne({ username });

    if (!user) {
      console.log('❌ 用户不存在！');
      return;
    }

    console.log('\n📋 用户信息:');
    console.log('-----------------------------------');
    console.log('ID:', user._id);
    console.log('用户名:', user.username);
    console.log('姓名:', user.name);
    console.log('邮箱:', user.email || '未设置');
    console.log('手机:', user.phone || '未设置');
    console.log('角色:', user.role);
    console.log('部门:', user.department || '未设置');
    console.log('权限:', user.permissions || []);
    console.log('激活状态:', user.active !== false ? '✅ 已激活' : '❌ 已禁用');
    console.log('密码哈希:', user.password ? user.password.substring(0, 20) + '...' : '未设置');
    console.log('创建时间:', user.createdAt);
    console.log('更新时间:', user.updatedAt);
    console.log('-----------------------------------\n');

    // 测试密码
    console.log('🔐 测试常见密码:');
    const testPasswords = ['123456', 'password', 'admin123', 'zhaoyaoru', user.username];
    
    for (const testPwd of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(testPwd, user.password);
        if (isMatch) {
          console.log(`✅ 密码匹配: "${testPwd}"`);
        } else {
          console.log(`❌ 密码不匹配: "${testPwd}"`);
        }
      } catch (error) {
        console.log(`⚠️  密码测试失败 "${testPwd}":`, error.message);
      }
    }

    // 检查登录日志
    console.log('\n📊 最近的登录日志:');
    const LoginLog = mongoose.model('LoginLog', new mongoose.Schema({
      userId: String,
      timestamp: Date,
      ip: String,
      userAgent: String,
      status: String,
    }, { timestamps: true }));

    const logs = await LoginLog.find({ userId: user._id.toString() })
      .sort({ timestamp: -1 })
      .limit(10);

    if (logs.length === 0) {
      console.log('❌ 没有找到登录日志');
    } else {
      logs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.timestamp} - ${log.status} - IP: ${log.ip}`);
      });
    }

    // 提供修复建议
    console.log('\n💡 问题诊断和修复建议:');
    console.log('-----------------------------------');
    
    if (user.active === false) {
      console.log('⚠️  用户账号已被禁用！');
      console.log('   修复方法: 在数据库中将 active 字段设置为 true');
    }
    
    if (!user.password || user.password.length < 20) {
      console.log('⚠️  密码哈希异常！');
      console.log('   修复方法: 重置用户密码');
    }

    console.log('\n如需重置密码，请运行:');
    console.log(`node reset-user-password.js ${username} <新密码>`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkUser();


const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';

// 用户 Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  phone: String,
  role: String,
  active: Boolean,
}, { timestamps: true });

async function testRestoredUser() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);

    // 查找 zhaoyaoru 用户
    const user = await User.findOne({ username: 'zhaoyaoru' });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    console.log('📋 用户信息:');
    console.log('='.repeat(60));
    console.log('用户名:', user.username);
    console.log('姓名:', user.name);
    console.log('手机:', user.phone);
    console.log('角色:', user.role);
    console.log('状态:', user.active ? '✅ 已激活' : '❌ 已禁用');
    console.log('创建时间:', new Date(user.createdAt).toLocaleString('zh-CN'));
    console.log('更新时间:', new Date(user.updatedAt).toLocaleString('zh-CN'));
    console.log('密码哈希:', user.password.substring(0, 30) + '...');

    console.log('\n🔐 测试常用密码:');
    console.log('='.repeat(60));

    const commonPasswords = [
      '123456',
      '123456789',
      'password',
      '111111',
      '000000',
      user.phone, // 手机号
      user.phone?.substring(user.phone.length - 6), // 手机号后6位
      user.name, // 姓名
    ].filter(p => p);

    for (const password of commonPasswords) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        console.log(`✅ 找到正确密码: ${password}`);
        console.log('\n' + '='.repeat(60));
        console.log('🎉 用户可以使用以下凭据登录:');
        console.log('='.repeat(60));
        console.log('用户名:', user.username);
        console.log('密码:', password);
        console.log('='.repeat(60));
        return;
      } else {
        console.log(`❌ ${password} - 不匹配`);
      }
    }

    console.log('\n⚠️  未找到匹配的密码');
    console.log('\n💡 解决方案:');
    console.log('='.repeat(60));
    console.log('1. 用户可能使用了自定义密码');
    console.log('2. 可以使用以下命令重置密码:');
    console.log(`   node reset-user-password.js ${user.username} 新密码`);
    console.log('\n例如:');
    console.log(`   node reset-user-password.js ${user.username} 123456`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testRestoredUser();


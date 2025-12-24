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

async function testLogin() {
  try {
    // 获取命令行参数
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('❌ 使用方法: node test-login.js <用户名> <密码>');
      console.log('示例: node test-login.js zhaoyaoru 123456');
      process.exit(1);
    }

    const username = args[0];
    const password = args[1];

    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);

    // 查找用户
    console.log(`🔍 查找用户: ${username}`);
    const user = await User.findOne({ username });

    if (!user) {
      console.log('❌ 用户不存在！');
      return;
    }

    console.log('✅ 用户找到');
    console.log('-----------------------------------');
    console.log('用户名:', user.username);
    console.log('姓名:', user.name);
    console.log('角色:', user.role);
    console.log('状态:', user.active !== false ? '✅ 已激活' : '❌ 已禁用');
    console.log('-----------------------------------\n');

    // 检查账号状态
    if (user.active === false) {
      console.log('❌ 登录失败: 账号已被禁用！');
      return;
    }

    // 验证密码
    console.log('🔐 验证密码...');
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log('✅ 密码正确！登录成功！');
      console.log('\n用户可以使用以下凭据登录:');
      console.log(`  用户名: ${username}`);
      console.log(`  密码: ${password}`);
    } else {
      console.log('❌ 密码错误！登录失败！');
      console.log('\n如需重置密码，请运行:');
      console.log(`node reset-user-password.js ${username} <新密码>`);
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

testLogin();


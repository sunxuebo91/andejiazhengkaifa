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

async function createUser() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);

    // 检查用户是否已存在
    const username = 'zhaoyaoru';
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      console.log('⚠️  用户已存在！');
      console.log('如需重置密码，请使用 reset-user-password.js 脚本');
      return;
    }

    // 创建新用户
    const password = '123456'; // 默认密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: 'zhaoyaoru',
      password: hashedPassword,
      name: '赵耀如',
      email: '',
      phone: '',
      role: 'user', // 可选: admin, manager, user
      department: '',
      permissions: [],
      active: true,
    });

    await newUser.save();

    console.log('✅ 用户创建成功！');
    console.log('-----------------------------------');
    console.log('用户名:', newUser.username);
    console.log('姓名:', newUser.name);
    console.log('默认密码:', password);
    console.log('角色:', newUser.role);
    console.log('状态:', newUser.active ? '已激活' : '已禁用');
    console.log('-----------------------------------');
    console.log('\n⚠️  请提醒用户登录后立即修改密码！');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

createUser();


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

async function resetPassword() {
  try {
    // 获取命令行参数
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('❌ 使用方法: node reset-user-password.js <用户名> <新密码>');
      console.log('示例: node reset-user-password.js zhaoyaoru 123456');
      process.exit(1);
    }

    const username = args[0];
    const newPassword = args[1];

    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);

    // 查找用户
    const user = await User.findOne({ username });

    if (!user) {
      console.log(`❌ 用户 "${username}" 不存在！`);
      console.log('\n可用的用户列表:');
      const allUsers = await User.find({}).select('username name');
      allUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.name})`);
      });
      return;
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    user.password = hashedPassword;
    await user.save();

    console.log('✅ 密码重置成功！');
    console.log('-----------------------------------');
    console.log('用户名:', user.username);
    console.log('姓名:', user.name);
    console.log('新密码:', newPassword);
    console.log('角色:', user.role);
    console.log('状态:', user.active !== false ? '已激活' : '已禁用');
    console.log('-----------------------------------');
    
    if (user.active === false) {
      console.log('\n⚠️  注意: 该用户账号当前处于禁用状态！');
      console.log('如需启用，请运行:');
      console.log(`node enable-user.js ${username}`);
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

resetPassword();


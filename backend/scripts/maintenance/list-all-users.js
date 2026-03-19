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

async function listUsers() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);

    // 查找所有用户
    const users = await User.find({}).sort({ createdAt: -1 });

    console.log(`📋 数据库中共有 ${users.length} 个用户:\n`);
    console.log('-----------------------------------');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.username}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   手机: ${user.phone || '未设置'}`);
      console.log(`   邮箱: ${user.email || '未设置'}`);
      console.log(`   状态: ${user.active !== false ? '✅ 激活' : '❌ 禁用'}`);
      console.log(`   创建时间: ${user.createdAt}`);
      console.log('-----------------------------------');
    });

    // 搜索包含 zhao 的用户
    console.log('\n🔍 搜索包含 "zhao" 的用户:');
    const zhaoUsers = users.filter(u => 
      u.username?.toLowerCase().includes('zhao') || 
      u.name?.toLowerCase().includes('zhao')
    );
    
    if (zhaoUsers.length > 0) {
      zhaoUsers.forEach(user => {
        console.log(`- ${user.username} (${user.name})`);
      });
    } else {
      console.log('❌ 没有找到包含 "zhao" 的用户');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

listUsers();


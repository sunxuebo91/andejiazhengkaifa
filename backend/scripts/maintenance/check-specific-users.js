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

async function checkUsers() {
  try {
    console.log('连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const User = mongoose.model('User', userSchema);

    // 从截图中看到的用户名列表
    const usernamesToCheck = [
      'konglingxian',
      'songling',
      'zhuiaozihong',
      'zhaoyaoru',
      'liulli',
      'yankuaixun',
      'admin'
    ];

    console.log('📋 检查以下用户名的登录账号:\n');
    console.log('-----------------------------------');

    for (const username of usernamesToCheck) {
      const user = await User.findOne({ username });
      
      if (user) {
        console.log(`✅ ${username}`);
        console.log(`   姓名: ${user.name}`);
        console.log(`   手机: ${user.phone || '未设置'}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   状态: ${user.active !== false ? '已激活' : '❌ 已禁用'}`);
        console.log(`   密码: ${user.password ? '已设置' : '❌ 未设置'}`);
        console.log(`   创建时间: ${user.createdAt}`);
      } else {
        console.log(`❌ ${username} - 用户不存在`);
      }
      console.log('-----------------------------------');
    }

    // 查询所有用户
    console.log('\n📊 数据库中所有用户列表:\n');
    const allUsers = await User.find({}).sort({ createdAt: -1 });
    
    console.log(`共有 ${allUsers.length} 个用户:`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.name}) - ${user.active !== false ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkUsers();


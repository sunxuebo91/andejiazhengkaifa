const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB连接
const MONGODB_URI = 'mongodb://localhost:27017/housekeeping';

// 连接数据库
mongoose.connect(MONGODB_URI)
.then(() => console.log('MongoDB连接成功'))
.catch(err => {
  console.error('MongoDB连接失败:', err.message);
  process.exit(1);
});

// 定义用户模式
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  realName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 创建用户模型
const User = mongoose.model('User', UserSchema);

// 创建管理员用户
async function createAdmin() {
  try {
    // 检查是否已经存在admin用户
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (adminExists) {
      console.log('删除已有管理员用户');
      await User.deleteOne({ username: 'admin' });
    }
    
    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // 创建新的管理员用户
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@andejiazheng.com',
      realName: '系统管理员',
      role: 'admin',
      isActive: true,
      permissions: {
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        modules: {
          resumes: {
            canView: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true
          },
          users: {
            canView: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true
          }
        }
      }
    });
    
    await adminUser.save();
    console.log('管理员用户创建成功:');
    console.log('用户名: admin');
    console.log('密码: admin123');
    
    // 创建一个测试用户
    const testUser = new User({
      username: 'test',
      password: await bcrypt.hash('test123', salt),
      email: 'test@andejiazheng.com',
      realName: '测试用户',
      role: 'employee',
      isActive: true,
      permissions: {
        canView: true,
        canCreate: true,
        canUpdate: false,
        canDelete: false,
        modules: {
          resumes: {
            canView: true,
            canCreate: true,
            canUpdate: false,
            canDelete: false
          },
          users: {
            canView: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false
          }
        }
      }
    });
    
    await testUser.save();
    console.log('测试用户创建成功:');
    console.log('用户名: test');
    console.log('密码: test123');
    
  } catch (error) {
    console.error('创建用户失败:', error);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin(); 
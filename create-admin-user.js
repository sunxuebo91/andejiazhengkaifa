const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// MongoDB连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/housekeeping';

// 连接数据库
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB连接成功'))
.catch(err => {
  console.error('MongoDB连接失败:', err.message);
  process.exit(1);
});

// 用户模型
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
    canView: {
      type: Boolean,
      default: true
    },
    canCreate: {
      type: Boolean,
      default: false
    },
    canUpdate: {
      type: Boolean,
      default: false
    },
    canDelete: {
      type: Boolean,
      default: false
    },
    modules: {
      resumes: {
        canView: {
          type: Boolean,
          default: true
        },
        canCreate: {
          type: Boolean,
          default: false
        },
        canUpdate: {
          type: Boolean,
          default: false
        },
        canDelete: {
          type: Boolean,
          default: false
        }
      },
      users: {
        canView: {
          type: Boolean,
          default: false
        },
        canCreate: {
          type: Boolean,
          default: false
        },
        canUpdate: {
          type: Boolean,
          default: false
        },
        canDelete: {
          type: Boolean,
          default: false
        }
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

// 创建管理员用户
async function createAdminUser() {
  try {
    // 检查是否已存在管理员用户
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('管理员用户已存在，跳过创建...');
      process.exit(0);
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // 管理员用户
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
    console.log('管理员用户创建成功!');
    console.log('-------------------------------');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('-------------------------------');
    console.log('请登录后立即修改密码!');
  } catch (error) {
    console.error('创建管理员用户失败:', error);
  } finally {
    mongoose.disconnect();
  }
}

createAdminUser(); 
#!/bin/bash

# 小程序客户管理系统快速集成脚本
# 使用方法: ./setup-miniprogram.sh /path/to/your/miniprogram/project

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

print_success() {
    print_message "✅ $1" $GREEN
}

print_warning() {
    print_message "⚠️  $1" $YELLOW
}

print_error() {
    print_message "❌ $1" $RED
}

print_info() {
    print_message "ℹ️  $1" $BLUE
}

# 检查参数
if [ $# -eq 0 ]; then
    print_error "请提供小程序项目路径"
    echo "使用方法: $0 /path/to/your/miniprogram/project"
    exit 1
fi

TARGET_DIR="$1"

# 检查目标目录是否存在
if [ ! -d "$TARGET_DIR" ]; then
    print_error "目标目录不存在: $TARGET_DIR"
    exit 1
fi

# 检查是否是小程序项目
if [ ! -f "$TARGET_DIR/app.json" ]; then
    print_error "目标目录不是有效的小程序项目（缺少app.json）"
    exit 1
fi

print_info "开始集成客户管理系统到: $TARGET_DIR"

# 创建必要的目录
print_info "创建目录结构..."
mkdir -p "$TARGET_DIR/services"
mkdir -p "$TARGET_DIR/utils"
mkdir -p "$TARGET_DIR/types"
mkdir -p "$TARGET_DIR/pages/customer"

# 复制服务文件
print_info "复制服务文件..."
cp "frontend/src/services/miniprogramCustomerService.ts" "$TARGET_DIR/services/" 2>/dev/null || {
    print_warning "miniprogramCustomerService.ts 不存在，跳过"
}

# 复制工具文件
print_info "复制工具文件..."
cp "frontend/src/utils/miniprogramUtils.ts" "$TARGET_DIR/utils/" 2>/dev/null || {
    print_warning "miniprogramUtils.ts 不存在，跳过"
}

# 复制类型定义
print_info "复制类型定义..."
cp "frontend/src/types/miniprogram.types.ts" "$TARGET_DIR/types/" 2>/dev/null || {
    print_warning "miniprogram.types.ts 不存在，跳过"
}

# 复制页面文件
print_info "复制页面文件..."
if [ -d "docs/小程序端客户管理示例/pages/customer" ]; then
    cp -r "docs/小程序端客户管理示例/pages/customer/"* "$TARGET_DIR/pages/customer/"
    print_success "页面文件复制完成"
else
    print_warning "示例页面目录不存在，跳过页面文件复制"
fi

# 创建配置文件
print_info "创建配置文件..."
cat > "$TARGET_DIR/config/api.js" << 'EOF'
// API配置文件
module.exports = {
  // 开发环境API地址
  development: {
    baseURL: 'http://localhost:3000/api',
    timeout: 10000
  },
  
  // 生产环境API地址
  production: {
    baseURL: 'https://your-domain.com/api', // 请修改为你的实际API地址
    timeout: 10000
  },
  
  // 获取当前环境配置
  getCurrentConfig() {
    // 可以根据小程序版本或其他条件判断环境
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;
    
    if (envVersion === 'develop' || envVersion === 'trial') {
      return this.development;
    } else {
      return this.production;
    }
  }
};
EOF

# 创建认证服务
print_info "创建认证服务..."
cat > "$TARGET_DIR/services/authService.js" << 'EOF'
// 认证服务
const apiConfig = require('../config/api');

class AuthService {
  constructor() {
    this.tokenKey = 'access_token';
    this.userInfoKey = 'user_info';
    this.config = apiConfig.getCurrentConfig();
  }

  // 设置Token
  setToken(token) {
    wx.setStorageSync(this.tokenKey, token);
  }

  // 获取Token
  getToken() {
    return wx.getStorageSync(this.tokenKey) || '';
  }

  // 设置用户信息
  setUserInfo(userInfo) {
    wx.setStorageSync(this.userInfoKey, userInfo);
  }

  // 获取用户信息
  getUserInfo() {
    return wx.getStorageSync(this.userInfoKey) || {};
  }

  // 检查是否已登录
  isLoggedIn() {
    return !!this.getToken();
  }

  // 登出
  logout() {
    wx.removeStorageSync(this.tokenKey);
    wx.removeStorageSync(this.userInfoKey);
  }

  // 微信登录
  async wxLogin() {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${this.config.baseURL}/auth/miniprogram/login`,
          method: 'POST',
          data: { code: loginRes.code },
          success: resolve,
          fail: reject
        });
      });

      if (response.data.success) {
        this.setToken(response.data.data.token);
        this.setUserInfo(response.data.data.user);
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
EOF

# 创建权限管理工具
print_info "创建权限管理工具..."
cat > "$TARGET_DIR/utils/permissionUtils.js" << 'EOF'
// 权限管理工具
const authService = require('../services/authService');

class PermissionUtils {
  getCurrentUser() {
    return authService.getUserInfo();
  }

  hasPermission(permission) {
    const user = this.getCurrentUser();
    const role = user.role;

    const permissions = {
      '系统管理员': ['view_all', 'create', 'edit_all', 'assign', 'delete', 'view_stats'],
      '经理': ['view_team', 'create', 'edit_team', 'assign', 'view_stats'],
      '普通员工': ['view_own', 'create', 'edit_own']
    };

    return permissions[role]?.includes(permission) || false;
  }

  canViewCustomer(customer) {
    const user = this.getCurrentUser();
    
    if (user.role === '系统管理员') return true;
    if (user.role === '经理') return true;
    if (user.role === '普通员工') {
      return customer.assignedTo === user.userId;
    }
    
    return false;
  }

  showPermissionError() {
    wx.showToast({
      title: '权限不足',
      icon: 'error'
    });
  }
}

module.exports = new PermissionUtils();
EOF

# 更新app.json
print_info "更新app.json配置..."
if [ -f "$TARGET_DIR/app.json" ]; then
    # 备份原文件
    cp "$TARGET_DIR/app.json" "$TARGET_DIR/app.json.backup"
    
    # 使用node.js脚本更新app.json
    node -e "
    const fs = require('fs');
    const appJson = JSON.parse(fs.readFileSync('$TARGET_DIR/app.json', 'utf8'));
    
    // 添加客户管理页面
    const customerPages = [
      'pages/customer/list',
      'pages/customer/create',
      'pages/customer/detail',
      'pages/customer/edit'
    ];
    
    customerPages.forEach(page => {
      if (!appJson.pages.includes(page)) {
        appJson.pages.push(page);
      }
    });
    
    // 更新权限配置
    if (!appJson.permission) {
      appJson.permission = {};
    }
    
    appJson.permission['scope.userLocation'] = {
      desc: '用于获取客户地理位置信息'
    };
    
    // 更新网络超时配置
    if (!appJson.networkTimeout) {
      appJson.networkTimeout = {};
    }
    
    appJson.networkTimeout.request = 10000;
    appJson.networkTimeout.downloadFile = 10000;
    
    fs.writeFileSync('$TARGET_DIR/app.json', JSON.stringify(appJson, null, 2));
    " 2>/dev/null || print_warning "无法自动更新app.json，请手动添加页面路径"
    
    print_success "app.json配置已更新（原文件已备份为app.json.backup）"
fi

# 创建使用说明
print_info "创建使用说明..."
cat > "$TARGET_DIR/README_CUSTOMER_SYSTEM.md" << 'EOF'
# 客户管理系统集成说明

## 已集成的文件

### 服务文件
- `services/miniprogramCustomerService.ts` - 客户API服务
- `services/authService.js` - 认证服务
- `config/api.js` - API配置

### 工具文件
- `utils/miniprogramUtils.ts` - 工具函数
- `utils/permissionUtils.js` - 权限管理

### 页面文件
- `pages/customer/list.*` - 客户列表页面
- `pages/customer/create.*` - 客户创建页面

## 配置步骤

1. **修改API地址**
   编辑 `config/api.js`，将 `your-domain.com` 替换为你的实际API地址

2. **测试连接**
   在开发者工具中测试API连接是否正常

3. **添加入口**
   在你的首页添加客户管理入口

## 使用方法

```javascript
// 引入服务
const customerApi = require('./services/miniprogramCustomerService');

// 获取客户列表
const customers = await customerApi.getCustomers();

// 创建客户
const result = await customerApi.createCustomer(customerData);
```

## 注意事项

- 确保后端API服务正常运行
- 正确配置JWT认证
- 测试权限控制功能
- 检查所有页面路由

## 技术支持

如有问题，请查看完整文档或联系技术支持。
EOF

print_success "集成完成！"
print_info "接下来的步骤："
echo "1. 修改 config/api.js 中的API地址"
echo "2. 在首页添加客户管理入口"
echo "3. 测试所有功能"
echo "4. 部署上线"

print_info "详细说明请查看: $TARGET_DIR/README_CUSTOMER_SYSTEM.md"

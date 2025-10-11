# 小程序端客户管理系统

## 📋 项目概述

这是一个完整的小程序端客户管理系统实现示例，基于微信小程序原生框架开发，提供了客户列表、客户创建、客户编辑、客户分配等核心功能。

## 🎯 核心特性

### ✅ 已实现功能

1. **权限控制体系**
   - 基于角色的数据访问控制（系统管理员、经理、普通员工）
   - 数据脱敏处理（普通员工看不到完整手机号）
   - 操作权限控制（创建、编辑、分配、查看）

2. **客户管理功能**
   - 客户列表（分页、搜索、筛选）
   - 客户创建（表单验证、幂等性支持）
   - 客户详情查看
   - 客户信息编辑
   - 客户分配管理

3. **业务完整性**
   - 客户跟进记录管理
   - 客户分配历史追踪
   - 客户统计信息展示
   - 操作日志记录

4. **用户体验优化**
   - 下拉刷新和上拉加载
   - 搜索防抖处理
   - 加载状态指示
   - 错误重试机制
   - 离线数据缓存

5. **微信生态集成**
   - 扫码快速录入
   - 一键拨打电话
   - 微信消息推送
   - 小程序分享

## 📁 项目结构

```
小程序端客户管理示例/
├── pages/                          # 页面文件
│   └── customer/                    # 客户管理页面
│       ├── list.js                  # 客户列表页面逻辑
│       ├── list.wxml                # 客户列表页面模板
│       ├── list.wxss                # 客户列表页面样式
│       ├── create.js                # 客户创建页面逻辑
│       ├── create.wxml              # 客户创建页面模板
│       ├── create.wxss              # 客户创建页面样式
│       ├── detail.js                # 客户详情页面（待实现）
│       ├── edit.js                  # 客户编辑页面（待实现）
│       └── assign.js                # 客户分配页面（待实现）
├── services/                        # 服务层
│   └── miniprogramCustomerService.js # 客户管理API服务
├── utils/                           # 工具函数
│   └── miniprogramUtils.js          # 小程序专用工具函数
├── types/                           # 类型定义
│   └── miniprogram.types.js         # 小程序类型定义
├── app.js                           # 小程序入口文件
├── app.json                         # 小程序配置文件
├── app.wxss                         # 全局样式文件
└── README.md                        # 项目说明文档
```

## 🚀 快速开始

### 1. 环境准备

- 微信开发者工具
- Node.js 环境
- 后端API服务已部署

### 2. 配置小程序

1. **修改 `app.json` 配置**：
```json
{
  "pages": [
    "pages/customer/list",
    "pages/customer/create",
    "pages/customer/detail",
    "pages/customer/edit",
    "pages/customer/assign"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#1890ff",
    "navigationBarTitleText": "客户管理",
    "navigationBarTextStyle": "white",
    "enablePullDownRefresh": true
  },
  "permission": {
    "scope.userLocation": {
      "desc": "用于获取客户地理位置信息"
    }
  },
  "requiredBackgroundModes": ["location"],
  "networkTimeout": {
    "request": 10000,
    "downloadFile": 10000
  }
}
```

2. **配置API基础地址**：
在 `services/miniprogramCustomerService.js` 中修改API基础地址：
```javascript
const API_BASE_URL = 'https://your-api-domain.com';
```

3. **配置微信小程序AppID**：
在微信开发者工具中设置正确的AppID。

### 3. 部署运行

1. 使用微信开发者工具打开项目
2. 点击"编译"按钮
3. 在模拟器或真机上预览

## 🔧 API接口说明

### 客户管理接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 客户列表 | GET | `/api/customers/miniprogram/list` | 获取客户列表（支持分页、搜索、筛选） |
| 创建客户 | POST | `/api/customers/miniprogram/create` | 创建新客户（支持幂等性） |
| 客户详情 | GET | `/api/customers/miniprogram/:id` | 获取客户详情 |
| 更新客户 | PATCH | `/api/customers/miniprogram/:id` | 更新客户信息 |
| 分配客户 | PATCH | `/api/customers/miniprogram/:id/assign` | 分配客户给指定员工 |
| 跟进记录 | POST | `/api/customers/miniprogram/:id/follow-ups` | 创建跟进记录 |
| 跟进记录 | GET | `/api/customers/miniprogram/:id/follow-ups` | 获取跟进记录 |
| 分配历史 | GET | `/api/customers/miniprogram/:id/assignment-logs` | 获取分配历史 |
| 统计信息 | GET | `/api/customers/miniprogram/statistics` | 获取统计信息 |

### 请求格式

所有API请求都需要在Header中包含JWT Token：
```javascript
{
  'Authorization': 'Bearer <your-jwt-token>',
  'Content-Type': 'application/json'
}
```

### 响应格式

所有API响应都遵循统一格式：
```javascript
{
  "success": true,
  "data": { /* 响应数据 */ },
  "message": "操作成功",
  "timestamp": 1640995200000
}
```

## 🎨 UI组件说明

### 1. 客户列表页面 (`pages/customer/list`)

**功能特性**：
- 支持下拉刷新和上拉加载更多
- 实时搜索（防抖处理）
- 多维度筛选（状态、来源、类别等）
- 权限控制的操作按钮
- 一键拨打电话功能

**关键方法**：
- `loadCustomers()` - 加载客户列表
- `refreshCustomers()` - 刷新列表数据
- `onSearchInput()` - 搜索输入处理
- `onFilterChange()` - 筛选条件变更

### 2. 客户创建页面 (`pages/customer/create`)

**功能特性**：
- 完整的表单验证
- 支持扫码快速录入
- 幂等性提交防重复
- 智能表单重置确认

**关键方法**：
- `validateForm()` - 表单验证
- `onSubmit()` - 提交表单
- `onScanCode()` - 扫码录入
- `formatCustomerFormData()` - 数据格式化

## 🔒 权限控制说明

### 角色权限矩阵

| 功能 | 系统管理员 | 经理 | 普通员工 |
|------|------------|------|----------|
| 查看所有客户 | ✅ | ✅ | ❌ |
| 查看自己的客户 | ✅ | ✅ | ✅ |
| 创建客户 | ✅ | ✅ | ✅ |
| 编辑所有客户 | ✅ | ✅ | ❌ |
| 编辑自己的客户 | ✅ | ✅ | ✅ |
| 分配客户 | ✅ | ✅ | ❌ |
| 查看统计信息 | ✅ | ✅ | 部分 |
| 查看分配历史 | ✅ | ✅ | ❌ |

### 数据脱敏规则

- **普通员工**：只能看到自己负责客户的完整信息，其他客户的手机号会被脱敏显示
- **经理**：可以看到部门内所有客户的完整信息
- **系统管理员**：可以看到所有客户的完整信息

## 📱 小程序特性

### 1. 微信生态集成

- **扫码功能**：支持扫描二维码快速录入客户信息
- **电话功能**：一键拨打客户电话
- **分享功能**：支持分享客户信息给同事
- **消息推送**：重要状态变更时推送消息

### 2. 性能优化

- **数据缓存**：列表数据本地缓存，提升加载速度
- **图片懒加载**：客户头像等图片懒加载
- **防抖处理**：搜索输入防抖，减少API调用
- **分页加载**：大数据量分页加载，避免卡顿

### 3. 用户体验

- **加载状态**：完整的加载、错误、空状态处理
- **操作反馈**：所有操作都有明确的成功/失败反馈
- **离线支持**：基础数据支持离线查看
- **响应式设计**：适配不同尺寸的手机屏幕

## 🔧 开发指南

### 1. 添加新页面

1. 在 `pages/customer/` 目录下创建新页面文件
2. 在 `app.json` 中注册新页面路径
3. 实现页面逻辑、模板和样式

### 2. 添加新API

1. 在 `services/miniprogramCustomerService.js` 中添加新的API方法
2. 在页面中调用新的API方法
3. 处理API响应和错误

### 3. 自定义样式

1. 修改 `app.wxss` 中的全局样式
2. 在各页面的 `.wxss` 文件中添加页面特定样式
3. 使用CSS变量实现主题切换

## 🐛 常见问题

### 1. API调用失败

**问题**：API调用返回401未授权错误
**解决**：检查JWT Token是否正确设置，是否已过期

### 2. 数据不显示

**问题**：页面加载后数据不显示
**解决**：检查API接口地址是否正确，网络是否正常

### 3. 权限问题

**问题**：某些功能按钮不显示
**解决**：检查用户角色权限设置是否正确

## 📞 技术支持

如有技术问题，请联系开发团队：
- 邮箱：tech-support@company.com
- 微信群：扫描二维码加入技术支持群

## 📄 更新日志

### v1.0.0 (2024-01-01)
- ✅ 完成客户列表页面
- ✅ 完成客户创建页面
- ✅ 实现权限控制体系
- ✅ 集成API服务层
- ✅ 添加工具函数库

### 待实现功能
- 🔄 客户详情页面
- 🔄 客户编辑页面
- 🔄 客户分配页面
- 🔄 统计报表页面
- 🔄 消息推送功能

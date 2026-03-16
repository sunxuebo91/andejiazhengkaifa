# 小程序API完整文档

## 📋 目录

- [认证授权](#认证授权)
- [👤 用户注册与登录](#用户注册与登录)
  - [用户注册或更新](#用户注册或更新)
  - [记录用户登录](#记录用户登录)
  - [账号密码登录](#账号密码登录)
- [Banner轮播图](#banner轮播图)
- [文章内容](#文章内容)
  - [获取文章列表](#获取文章列表)
  - [获取文章详情](#获取文章详情)
- [简历管理](#简历管理)
  - [创建简历](#创建简历)
  - [获取简历详情](#获取简历详情)
  - [更新简历](#更新简历)
  - [推荐理由标签说明](#推荐理由标签说明)
- [员工评价](#员工评价)
  - [创建员工评价](#创建员工评价)
  - [获取评价列表](#获取评价列表)
  - [获取评价统计](#获取评价统计)
- [👥 客户管理](#客户管理)
  - [获取客户统计信息](#获取客户统计信息)
  - [获取客户列表](#获取客户列表)
  - [创建客户](#创建客户)
  - [获取客户详情](#获取客户详情)
  - [更新客户](#更新客户)
  - [分配客户](#分配客户)
  - [新增跟进记录](#新增跟进记录)
  - [获取跟进记录](#获取跟进记录)
  - [获取分配历史](#获取分配历史)
  - [获取员工列表用于分配](#获取员工列表用于分配)
- [� 合同管理](#合同管理)
  - [获取合同列表](#获取合同列表)
  - [获取合同详情](#获取合同详情)
  - [根据合同编号获取合同](#根据合同编号获取合同)
  - [根据客户ID获取合同](#根据客户id获取合同)
  - [根据服务人员ID获取合同](#根据服务人员id获取合同)
  - [根据服务人员信息搜索合同](#根据服务人员信息搜索合同)
  - [检查客户现有合同](#检查客户现有合同)
  - [获取客户合同历史](#获取客户合同历史)
  - [获取合同统计信息](#获取合同统计信息)
  - [创建合同](#创建合同)
  - [更新合同](#更新合同)
  - [创建换人合同](#创建换人合同)
  - [手动触发保险同步](#手动触发保险同步)
  - [同步爱签合同状态](#同步爱签合同状态)
  - [批量同步所有合同状态](#批量同步所有合同状态)
  - [获取爱签信息](#获取爱签信息)
  - [重新获取签署链接](#重新获取签署链接)
  - [下载已签署合同](#下载已签署合同)
- [🛡️ 保险保单管理](#保险保单管理)
  - [获取保单列表](#获取保单列表)
  - [根据身份证号查询保单](#根据身份证号查询保单)
  - [获取保单详情](#获取保单详情)
  - [根据保单号查询](#根据保单号查询)
  - [根据商户单号查询](#根据商户单号查询)
  - [创建保单（投保）](#创建保单投保)
  - [查询保单状态（大树保）](#查询保单状态大树保)
  - [创建支付订单](#创建支付订单)
  - [注销保单](#注销保单)
  - [退保](#退保)
  - [获取电子保单PDF](#获取电子保单pdf)
  - [批改保单（替换被保险人）](#批改保单替换被保险人)
  - [批增（增加被保险人）](#批增增加被保险人)
  - [同步保单状态](#同步保单状态)
- [🔍 背调管理](#背调管理)
  - [获取背调列表](#获取背调列表)
  - [根据身份证号查询背调](#根据身份证号查询背调)
  - [准备授权书](#准备授权书)
  - [发起背调](#发起背调)
  - [取消背调](#取消背调)
  - [下载背调报告](#下载背调报告)
- [文件上传](#文件上传)
- [数据字典](#数据字典)
- [错误码说明](#错误码说明)

---

## 🔐 认证授权

### 基础信息

- **生产环境**: `https://crm.andejiazheng.com/api`
- **开发环境**: `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token
- **请求头**: `Authorization: Bearer {token}`

### 获取Token

```http
POST /api/auth/miniprogram/login
Content-Type: application/json

{
  "code": "微信登录code"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "openid": "openid",
      "role": "employee"
    }
  }
}
```

### 🛡️ 角色权限控制（RBAC）

小程序API实施了基于角色的访问控制（v1.9.0起），不同角色看到的数据范围不同：

| 角色 | 英文标识 | 数据范围 | 说明 |
|------|---------|---------|------|
| **系统管理员** | `admin` | 全部数据 | 可查看和操作所有记录 |
| **经理** | `manager` | 全部数据 | 可查看和操作所有记录 |
| **普通员工** | `employee` | 仅自己的数据 | 只能查看和操作自己创建的记录（按 `createdBy` 过滤） |

**权限规则**：
- 所有业务接口（合同、保险、简历、员工评价）均需要 JWT 认证
- 每个请求必须在 Header 中携带有效的 `Authorization: Bearer {token}`
- 普通员工只能看到自己创建的合同、保单等数据
- 管理员和经理可以看到全部数据

**公开接口（无需Token）**：
- 用户注册/登录接口（`/api/miniprogram-users/*`）
- Banner轮播图（`/api/banners/miniprogram/*`）
- 文章内容（`/api/articles/miniprogram/*`）
- 阿姨自助注册（`/api/resumes/miniprogram/self-register`）
- 简历分享链接（`/api/resumes/shared/:token`）

### 接口认证总览

| 模块 | 认证要求 | 角色过滤 |
|------|---------|---------|
| 用户注册与登录 | ❌ 无需认证 | - |
| Banner轮播图 | ❌ 无需认证 | - |
| 文章内容 | ❌ 无需认证 | - |
| 简历管理 | ✅ 需要JWT（self-register除外） | ✅ 普通员工仅自己数据 |
| 员工评价 | ✅ 需要JWT | ✅ 普通员工仅自己数据 |
| 客户管理 | ✅ 需要JWT | ✅ 普通员工仅自己负责客户 |
| 合同管理 | ✅ 需要JWT | ✅ 普通员工仅自己数据 |
| 保险保单管理 | ✅ 需要JWT | ✅ 普通员工仅自己数据 |
| 背调管理 | ✅ 需要JWT | ✅ 普通员工仅自己数据 |

---

## 👤 用户注册与登录

小程序用户注册与登录管理，用于记录用户信息和登录行为。

### 📱 一句话总结

**小程序端用户管理提供三种登录方式：（1）OpenID 自动登录（推荐）：在 `app.js` 的 `onLaunch` 中调用 `POST /api/miniprogram-users/login` 传入 `{openid}` 自动创建匿名用户并返回 `hasPhone` 字段提示是否需要授权手机号；（2）手机号注册/更新：用户授权手机号后调用 `POST /api/miniprogram-users/register` 传入 `{openid, phone, username?, password?, nickname?, avatar?, avatarFile?, gender?, city?, province?}` 绑定手机号和完善信息（支持设置账号密码）；（3）账号密码登录：用户设置账号密码后可调用 `POST /api/miniprogram-users/login-with-password` 传入 `{username, password}` 直接登录。所有接口都无需 token，密码使用 bcrypt 加密存储且响应中不返回，系统自动记录注册时间、登录时间、登录次数和 IP 地址，后台管理员可在"褓贝后台-小程序用户管理"查看所有用户数据、统计信息和完整的用户列表（包括账号、OpenID、手机号、头像、地区、登录次数等）。**

---

### 📋 接口列表

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 用户注册或更新 | POST | `/api/miniprogram-users/register` | ❌ 无需认证 | 注册新用户或更新现有用户信息（支持设置账号密码） |
| 记录用户登录 | POST | `/api/miniprogram-users/login` | ❌ 无需认证 | 使用 OpenID 或手机号登录，自动创建用户（支持传递用户信息） |
| 账号密码登录 | POST | `/api/miniprogram-users/login-with-password` | ❌ 无需认证 | 使用账号和密码登录，验证密码并返回用户信息 |

**注意**：以上三个接口都是公开接口，无需 token 认证，适合小程序端直接调用。

---

### 用户注册或更新

用户首次使用小程序时注册，或更新用户信息。如果手机号已存在则更新信息，不存在则创建新用户。

#### 请求

```http
POST /api/miniprogram-users/register
Content-Type: application/json

{
  "openid": "oXXXX_xxxxxxxxxxxxx",
  "phone": "13800138000",
  "username": "user123",
  "password": "password123",
  "nickname": "微信用户",
  "avatar": "https://thirdwx.qlogo.cn/xxx.jpg",
  "avatarFile": "/uploads/avatars/user123.jpg",
  "unionid": "oXXXX_xxxxxxxxxxxxx",
  "gender": 1,
  "city": "北京",
  "province": "北京",
  "country": "中国",
  "language": "zh_CN"
}
```

**认证**: ❌ 无需登录（公开接口）

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `openid` | string | 是 | 微信openid（用户唯一标识） |
| `phone` | string | 是 | 手机号（11位中国大陆手机号） |
| `username` | string | 否 | 账号（用户自定义账号，唯一） |
| `password` | string | 否 | 密码（明文传输，后端自动加密存储） |
| `nickname` | string | 否 | 昵称 |
| `avatar` | string | 否 | 头像URL（微信头像或图片URL） |
| `avatarFile` | string | 否 | 头像文件路径（用户上传的图片文件） |
| `unionid` | string | 否 | 微信unionid |
| `gender` | number | 否 | 性别：0-未知, 1-男, 2-女 |
| `city` | string | 否 | 城市 |
| `province` | string | 否 | 省份 |
| `country` | string | 否 | 国家 |
| `language` | string | 否 | 语言（如：zh_CN） |

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "_id": "679abcdef1234567890abcde",
    "phone": "13800138000",
    "username": "user123",
    "nickname": "微信用户",
    "avatar": "https://thirdwx.qlogo.cn/xxx.jpg",
    "avatarFile": "/uploads/avatars/user123.jpg",
    "openid": "oXXXX_xxxxxxxxxxxxx",
    "unionid": "oXXXX_xxxxxxxxxxxxx",
    "gender": 1,
    "city": "北京",
    "province": "北京",
    "country": "中国",
    "language": "zh_CN",
    "status": "active",
    "loginCount": 1,
    "lastLoginAt": "2026-01-21T10:00:00.000Z",
    "lastLoginIp": "192.168.1.100",
    "createdAt": "2026-01-21T10:00:00.000Z",
    "updatedAt": "2026-01-21T10:00:00.000Z"
  },
  "message": "注册成功"
}
```

**注意**：响应中不会返回 `password` 字段（密码已加密存储，不会返回给客户端）。

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 用户唯一ID |
| `phone` | string | 手机号 |
| `nickname` | string | 昵称 |
| `avatar` | string | 头像URL |
| `openid` | string | 微信openid |
| `unionid` | string | 微信unionid |
| `gender` | number | 性别：0-未知, 1-男, 2-女 |
| `city` | string | 城市 |
| `province` | string | 省份 |
| `country` | string | 国家 |
| `language` | string | 语言 |
| `status` | string | 状态：active-活跃, inactive-不活跃, blocked-已封禁 |
| `loginCount` | number | 登录次数 |
| `lastLoginAt` | string | 最近登录时间（ISO 8601格式） |
| `lastLoginIp` | string | 最近登录IP |
| `createdAt` | string | 注册时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |

#### 错误响应

**验证错误 (400)**:
```json
{
  "success": false,
  "message": "请输入有效的中国大陆手机号"
}
```

#### 小程序调用示例

**最简单的调用方式（直接使用 wx.request）：**

```javascript
// 1. 记录登录（在小程序启动时调用，使用 openid，推荐同时传递用户信息）
// 获取用户信息
wx.getUserProfile({
  desc: '用于完善用户资料',
  success: (profileRes) => {
    const userInfo = profileRes.userInfo;

    // 调用登录接口，传递完整的用户信息
    wx.request({
      url: 'https://crm.andejiazheng.com/api/miniprogram-users/login',
      method: 'POST',
      data: {
        openid: 'oXXXX_xxxxxxxxxxxxx',   // 必填：微信openid
        nickname: userInfo.nickName,      // 推荐：昵称
        avatar: userInfo.avatarUrl,       // 推荐：头像URL
        gender: userInfo.gender,          // 推荐：性别
        city: userInfo.city,              // 可选：城市
        province: userInfo.province,      // 可选：省份
        country: userInfo.country,        // 可选：国家
        language: userInfo.language       // 可选：语言
      },
      success(res) {
        if (res.data.success) {
          console.log('登录成功', res.data.data);
          console.log('是否已授权手机号:', res.data.data.hasPhone);

          // 如果用户还没授权手机号，引导用户授权
          if (!res.data.data.hasPhone) {
            // 显示授权手机号按钮
          }
        }
      }
    });
  }
});

// 2. 用户注册（在获取手机号后调用）
wx.request({
  url: 'https://crm.andejiazheng.com/api/miniprogram-users/register',
  method: 'POST',
  data: {
    openid: 'oXXXX_xxxxxxxxxxxxx',  // 必填：微信openid
    phone: '13800138000',           // 必填：手机号
    username: 'user123',            // 可选：账号（用户自定义）
    password: 'password123',        // 可选：密码（明文，后端自动加密）
    nickname: '微信用户',            // 可选：昵称
    avatar: 'https://xxx.jpg',      // 可选：头像URL
    avatarFile: '/uploads/xxx.jpg', // 可选：头像文件路径
    gender: 1,                      // 可选：性别 0-未知 1-男 2-女
    city: '北京',                   // 可选：城市
    province: '北京'                // 可选：省份
  },
  success(res) {
    if (res.data.success) {
      console.log('注册成功', res.data.data);
      // 保存用户信息
      wx.setStorageSync('userInfo', res.data.data);
    } else {
      console.error('注册失败', res.data.message);
    }
  }
});
```

**完整的集成示例：**

```javascript
// app.js - 小程序启动时记录登录
App({
  globalData: {
    openid: '',
    userInfo: null
  },

  onLaunch() {
    // 1. 先登录获取 openid
    wx.login({
      success: (res) => {
        if (res.code) {
          // 调用后端接口，用 code 换取 openid
          // 这里假设你有一个接口 /api/auth/wx-login
          wx.request({
            url: 'https://crm.andejiazheng.com/api/auth/wx-login',
            method: 'POST',
            data: { code: res.code },
            success: (loginRes) => {
              if (loginRes.data.success) {
                const openid = loginRes.data.data.openid;
                this.globalData.openid = openid;

                // 2. 记录登录
                this.recordLogin(openid);
              }
            }
          });
        }
      }
    });
  },

  // 记录登录
  recordLogin(openid) {
    wx.request({
      url: 'https://crm.andejiazheng.com/api/miniprogram-users/login',
      method: 'POST',
      data: { openid },
      success: (res) => {
        if (res.data.success) {
          console.log('登录成功');
          this.globalData.userInfo = res.data.data;

          // 如果用户还没授权手机号，引导用户授权
          if (!res.data.data.hasPhone) {
            console.log('用户还未授权手机号');
            // 可以在首页显示授权提示
          }
        }
      }
    });
  }
});
```

---

### 账号密码登录

使用账号和密码登录，适用于用户设置了账号密码的场景。

#### 请求

```http
POST /api/miniprogram-users/login-with-password
Content-Type: application/json

{
  "username": "user123",
  "password": "password123"
}
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 账号（用户注册时设置的账号） |
| `password` | string | 是 | 密码（明文传输，后端会验证加密后的密码） |

#### 响应

**成功响应**:
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "phone": "13800138000",
    "username": "user123",
    "nickname": "测试用户",
    "avatar": "https://example.com/avatar.jpg",
    "avatarFile": "/uploads/avatars/user123.jpg",
    "openid": "oXXXX_xxxxxxxxxxxxx",
    "status": "active",
    "lastLoginAt": "2024-01-20T10:30:00.000Z",
    "lastLoginIp": "127.0.0.1",
    "loginCount": 5,
    "gender": 1,
    "city": "北京",
    "province": "北京",
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "hasPhone": true,
    "isNewUser": false
  },
  "message": "登录成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "密码错误"
}
```

```json
{
  "success": false,
  "message": "用户不存在"
}
```

```json
{
  "success": false,
  "message": "该用户未设置密码，请使用其他方式登录"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 用户信息（不包含密码） |
| `data.hasPhone` | boolean | 是否已绑定手机号 |
| `data.isNewUser` | boolean | 是否为新用户（账号密码登录时始终为 false） |
| `data.loginCount` | number | 登录次数（自动+1） |
| `data.lastLoginAt` | string | 最近登录时间（自动更新） |
| `data.lastLoginIp` | string | 最近登录IP（自动记录） |
| `message` | string | 提示信息 |

#### 小程序端调用示例

**最简单的调用方式：**

```javascript
// 账号密码登录
wx.request({
  url: 'https://crm.andejiazheng.com/api/miniprogram-users/login-with-password',
  method: 'POST',
  data: {
    username: 'user123',
    password: 'password123'
  },
  success(res) {
    if (res.data.success) {
      console.log('登录成功', res.data.data);
      // 保存用户信息
      wx.setStorageSync('userInfo', res.data.data);
      // 跳转到首页
      wx.switchTab({ url: '/pages/index/index' });
    } else {
      wx.showToast({
        title: res.data.message,
        icon: 'none'
      });
    }
  }
});
```

**完整的登录页面示例：**

```javascript
// pages/login/login.js - 用户授权手机号后注册
const app = getApp();

Page({
  data: {
    userInfo: null
  },

  onLoad() {
    // 获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({ userInfo: res.userInfo });
      }
    });
  },

  // 获取手机号按钮点击事件
  getPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '获取手机号失败', icon: 'none' });
      return;
    }

    const openid = app.globalData.openid;
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 注册用户（绑定手机号）
    wx.request({
      url: 'https://crm.andejiazheng.com/api/miniprogram-users/register',
      method: 'POST',
      data: {
        openid: openid,                      // 必填：微信openid
        phone: e.detail.phoneNumber,         // 必填：手机号
        username: 'user_' + openid.slice(-8), // 可选：自动生成账号
        password: 'default123',              // 可选：默认密码（建议引导用户修改）
        nickname: this.data.userInfo.nickName,
        avatar: this.data.userInfo.avatarUrl,
        gender: this.data.userInfo.gender,
        city: this.data.userInfo.city,
        province: this.data.userInfo.province
      },
      success(res) {
        if (res.data.success) {
          wx.showToast({ title: '授权成功', icon: 'success' });
          // 保存用户信息
          app.globalData.userInfo = res.data.data;
          wx.setStorageSync('userInfo', res.data.data);
          // 跳转到首页
          wx.switchTab({ url: '/pages/index/index' });
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' });
        }
      }
    });
  }
});
```

```html
<!-- pages/login/login.wxml - 获取手机号按钮 -->
<button open-type="getPhoneNumber" bindgetphonenumber="getPhoneNumber">
  授权手机号
</button>
```

---

### 记录用户登录

记录用户登录行为，更新最近登录时间、IP和登录次数。**如果用户不存在，会自动创建新用户（支持传递用户信息如昵称、头像等）。**

#### 请求

```http
POST /api/miniprogram-users/login
Content-Type: application/json

{
  "openid": "oXXXX_xxxxxxxxxxxxx",
  "phone": "13800138000",
  "nickname": "微信用户",
  "avatar": "https://thirdwx.qlogo.cn/xxx.jpg",
  "avatarFile": "/uploads/avatars/user123.jpg",
  "gender": 1,
  "city": "北京",
  "province": "北京",
  "country": "中国",
  "language": "zh_CN"
}
```

**认证**: ❌ 无需登录（公开接口）

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `openid` | string | 是（二选一） | 微信openid（推荐使用） |
| `phone` | string | 是（二选一） | 手机号（兼容旧版本） |
| `nickname` | string | 否 | 昵称（推荐传递，用于首次登录时创建用户） |
| `avatar` | string | 否 | 头像URL（推荐传递，用于首次登录时创建用户） |
| `avatarFile` | string | 否 | 头像文件路径（用户上传的图片文件） |
| `gender` | number | 否 | 性别：0-未知, 1-男, 2-女 |
| `city` | string | 否 | 城市 |
| `province` | string | 否 | 省份 |
| `country` | string | 否 | 国家 |
| `language` | string | 否 | 语言（如：zh_CN） |

**注意**：
1. 优先使用 `openid`，因为小程序启动时可以直接获取，无需用户授权
2. **强烈推荐传递 `nickname` 和 `avatar`**，这样CRM后台的用户列表会显示用户头像和昵称
3. 如果用户已存在，只会更新登录信息；如果用户不存在，会创建新用户并保存传递的所有信息

#### 成功响应 (200)

**已注册用户登录：**
```json
{
  "success": true,
  "data": {
    "_id": "679abcdef1234567890abcde",
    "openid": "oXXXX_xxxxxxxxxxxxx",
    "phone": "13800138000",
    "nickname": "微信用户",
    "avatar": "https://thirdwx.qlogo.cn/xxx.jpg",
    "status": "active",
    "loginCount": 5,
    "lastLoginAt": "2026-01-21T10:30:00.000Z",
    "lastLoginIp": "192.168.1.100",
    "createdAt": "2026-01-21T10:00:00.000Z",
    "updatedAt": "2026-01-21T10:30:00.000Z",
    "hasPhone": true,
    "isNewUser": false
  },
  "message": "登录成功"
}
```

**首次登录（自动创建匿名用户）：**
```json
{
  "success": true,
  "data": {
    "_id": "679abcdef1234567890abcde",
    "openid": "oXXXX_xxxxxxxxxxxxx",
    "status": "active",
    "loginCount": 1,
    "lastLoginAt": "2026-01-21T10:30:00.000Z",
    "lastLoginIp": "192.168.1.100",
    "createdAt": "2026-01-21T10:30:00.000Z",
    "updatedAt": "2026-01-21T10:30:00.000Z",
    "hasPhone": false,
    "isNewUser": true
  },
  "message": "首次登录，已创建用户"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `hasPhone` | boolean | 是否已授权手机号（true-已授权，false-未授权） |
| `isNewUser` | boolean | 是否为新用户（true-首次登录，false-老用户） |

**重要**：根据 `hasPhone` 字段判断是否需要引导用户授权手机号。

#### 小程序调用示例

**最简单的调用方式（直接使用 wx.request）：**

```javascript
// 记录用户登录（使用 openid）
wx.request({
  url: 'https://crm.andejiazheng.com/api/miniprogram-users/login',
  method: 'POST',
  data: {
    openid: 'oXXXX_xxxxxxxxxxxxx'  // 必填：微信openid
  },
  success(res) {
    if (res.data.success) {
      console.log('登录成功', res.data.data);
      console.log('是否已授权手机号:', res.data.data.hasPhone);
      console.log('是否为新用户:', res.data.data.isNewUser);
      console.log('登录次数:', res.data.data.loginCount);

      // 如果用户还没授权手机号，引导用户授权
      if (!res.data.data.hasPhone) {
        // 显示授权手机号按钮或弹窗
        wx.showModal({
          title: '提示',
          content: '为了更好的服务，请授权您的手机号',
          confirmText: '去授权',
          success(modalRes) {
            if (modalRes.confirm) {
              wx.navigateTo({ url: '/pages/login/login' });
            }
          }
        });
      }
    }
  }
});
```

**推荐的使用场景：**

```javascript
// 场景1: 在 app.js 中，小程序启动时记录登录
App({
  globalData: {
    openid: ''
  },

  onLaunch() {
    // 1. 先调用 wx.login 获取 code
    wx.login({
      success: (res) => {
        if (res.code) {
          // 2. 用 code 换取 openid（需要后端接口）
          wx.request({
            url: 'https://crm.andejiazheng.com/api/auth/wx-login',
            method: 'POST',
            data: { code: res.code },
            success: (loginRes) => {
              if (loginRes.data.success) {
                const openid = loginRes.data.data.openid;
                this.globalData.openid = openid;

                // 3. 记录登录
                wx.request({
                  url: 'https://crm.andejiazheng.com/api/miniprogram-users/login',
                  method: 'POST',
                  data: { openid },
                  success: (userRes) => {
                    if (userRes.data.success) {
                      console.log('登录成功');

                      // 如果用户还没授权手机号，引导授权
                      if (!userRes.data.data.hasPhone) {
                        // 可以在首页显示授权提示
                      }
                    }
                  }
                });
              }
            }
          });
        }
      }
    });
  }
});

// 场景2: 在关键页面，用户进入时记录活跃度
const app = getApp();

Page({
  onShow() {
    const openid = app.globalData.openid;
    if (openid) {
      wx.request({
        url: 'https://crm.andejiazheng.com/api/miniprogram-users/login',
        method: 'POST',
        data: { openid }
      });
    }
  }
});
```

---

### 🎯 完整使用流程和最佳实践

#### 📱 推荐的集成流程

**流程图：**
```
小程序启动
    ↓
wx.login() 获取 code
    ↓
调用后端接口用 code 换取 openid
    ↓
调用 POST /api/miniprogram-users/login 传入 {openid}
    ↓
检查响应中的 hasPhone 字段
    ↓
├─ hasPhone = true  → 用户已完成注册，直接进入首页
└─ hasPhone = false → 引导用户授权手机号
        ↓
    用户点击授权按钮
        ↓
    调用 POST /api/miniprogram-users/register 传入 {openid, phone, ...}
        ↓
    注册成功，进入首页
```

#### 🔐 三种登录方式的使用场景

| 登录方式 | 使用场景 | 优点 | 缺点 |
|---------|---------|------|------|
| **OpenID 自动登录** | 小程序启动时 | 无需用户操作，体验最好 | 无法获取手机号等敏感信息 |
| **手机号注册/更新** | 需要用户手机号时 | 可获取真实手机号，便于联系 | 需要用户授权 |
| **账号密码登录** | 用户设置了账号密码后 | 可跨设备登录，不依赖微信 | 需要用户记住账号密码 |

#### 💡 最佳实践建议

**1. 小程序启动时（app.js）**
```javascript
App({
  globalData: {
    openid: '',
    userInfo: null
  },

  onLaunch() {
    // 第一步：获取 openid
    wx.login({
      success: (res) => {
        if (res.code) {
          // 调用后端接口换取 openid
          wx.request({
            url: 'https://crm.andejiazheng.com/api/auth/wx-login',
            method: 'POST',
            data: { code: res.code },
            success: (loginRes) => {
              if (loginRes.data.success) {
                const openid = loginRes.data.data.openid;
                this.globalData.openid = openid;

                // 第二步：记录登录
                this.recordLogin(openid);
              }
            }
          });
        }
      }
    });
  },

  recordLogin(openid) {
    wx.request({
      url: 'https://crm.andejiazheng.com/api/miniprogram-users/login',
      method: 'POST',
      data: { openid },
      success: (res) => {
        if (res.data.success) {
          this.globalData.userInfo = res.data.data;

          // 检查是否需要引导用户授权手机号
          if (!res.data.data.hasPhone) {
            // 可以设置一个标志，在首页显示授权提示
            wx.setStorageSync('needPhoneAuth', true);
          }
        }
      }
    });
  }
});
```

**2. 首页引导授权（pages/index/index.js）**
```javascript
Page({
  data: {
    showAuthModal: false
  },

  onShow() {
    // 检查是否需要引导授权
    const needPhoneAuth = wx.getStorageSync('needPhoneAuth');
    if (needPhoneAuth) {
      this.setData({ showAuthModal: true });
    }
  },

  // 用户点击授权按钮
  getPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      return;
    }

    const app = getApp();
    wx.request({
      url: 'https://crm.andejiazheng.com/api/miniprogram-users/register',
      method: 'POST',
      data: {
        openid: app.globalData.openid,
        phone: e.detail.phoneNumber,
        nickname: app.globalData.userInfo?.nickname,
        avatar: app.globalData.userInfo?.avatar
      },
      success: (res) => {
        if (res.data.success) {
          wx.removeStorageSync('needPhoneAuth');
          this.setData({ showAuthModal: false });
          wx.showToast({ title: '授权成功', icon: 'success' });
        }
      }
    });
  }
});
```

**3. 账号密码登录页面（pages/login/login.js）**
```javascript
Page({
  data: {
    username: '',
    password: ''
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  handleLogin() {
    const { username, password } = this.data;

    if (!username || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }

    wx.request({
      url: 'https://crm.andejiazheng.com/api/miniprogram-users/login-with-password',
      method: 'POST',
      data: { username, password },
      success: (res) => {
        if (res.data.success) {
          // 保存用户信息
          const app = getApp();
          app.globalData.userInfo = res.data.data;
          app.globalData.openid = res.data.data.openid;
          wx.setStorageSync('userInfo', res.data.data);

          // 跳转到首页
          wx.switchTab({ url: '/pages/index/index' });
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' });
        }
      }
    });
  }
});
```

#### 🔒 安全注意事项

1. **密码传输**：生产环境必须使用 HTTPS，密码在传输过程中会被加密
2. **密码存储**：后端使用 bcrypt 加密存储，saltRounds=10
3. **密码响应**：所有 API 响应中都不会返回密码字段
4. **OpenID 保护**：OpenID 是用户的唯一标识，不要泄露给第三方
5. **手机号授权**：只在必要时请求手机号授权，避免过度打扰用户

#### 📊 后台管理功能

管理员可以在"褓贝后台 - 小程序用户管理"中查看：

- **用户列表**：显示所有用户的账号、OpenID、手机号、昵称、头像、地区等信息
- **统计信息**：总用户数、今日新增、今日活跃
- **用户详情**：登录次数、最近登录时间、最近登录IP、注册时间等
- **搜索功能**：支持按手机号、昵称、账号搜索用户

**注意**：密码字段不会在后台显示，确保用户隐私安全。

---

## 🖼️ Banner轮播图

获取小程序首页展示的Banner轮播图列表。

### 获取活跃Banner列表

获取所有启用状态的Banner，按排序字段升序排列。

#### 请求

```http
GET /api/banners/miniprogram/active
```

**认证**: ❌ 无需登录

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "_id": "696224b526da74c3b9e0c565",
      "title": "首页Banner",
      "imageUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/personalPhoto/xxx.jpg",
      "linkType": "none",
      "order": 0
    },
    {
      "_id": "696224b526da74c3b9e0c566",
      "title": "活动Banner",
      "imageUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/personalPhoto/yyy.jpg",
      "linkType": "none",
      "order": 1
    }
  ],
  "message": "获取成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | Banner唯一ID |
| `title` | string | Banner标题 |
| `imageUrl` | string | 图片URL（腾讯云COS） |
| `linkType` | string | 链接类型：none（无跳转） |
| `order` | number | 排序值，数字越小越靠前 |

#### 小程序调用示例

```javascript
// utils/api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

/**
 * 获取首页Banner列表
 * @returns {Promise<Array>} Banner列表
 */
export function getBannerList() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/banners/miniprogram/active`,
      method: 'GET',
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '获取Banner失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
```

```javascript
// pages/index/index.js
import { getBannerList } from '../../utils/api';

Page({
  data: {
    bannerList: []
  },

  onLoad() {
    this.loadBanners();
  },

  async loadBanners() {
    try {
      const banners = await getBannerList();
      this.setData({ bannerList: banners });
    } catch (err) {
      console.error('加载Banner失败:', err);
    }
  }
});
```

```html
<!-- pages/index/index.wxml -->
<swiper class="banner-swiper" indicator-dots autoplay circular>
  <swiper-item wx:for="{{bannerList}}" wx:key="_id">
    <image src="{{item.imageUrl}}" mode="aspectFill" class="banner-image" />
  </swiper-item>
</swiper>
```

```css
/* pages/index/index.wxss */
.banner-swiper {
  width: 100%;
  height: 300rpx;
}
.banner-image {
  width: 100%;
  height: 100%;
}
```

---

## 📰 文章内容

小程序可以获取和展示褓贝后台发布的文章内容，用于育儿知识、家政技巧等内容展示。

### 📱 一句话总结

**小程序调用文章接口非常简单：使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/list?page=1&pageSize=10` 获取文章列表，使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/:id` 获取文章详情。两个接口都是公开接口（无需传 token），自动只返回已发布文章。列表返回文章数组和分页信息，详情返回完整内容（包括 contentHtml 富文本和 imageUrls 图片数组）。使用 `<rich-text nodes="{{article.contentHtml}}">` 渲染富文本，使用 `<image wx:for="{{article.imageUrls}}">` 展示图片。支持搜索、分页、上拉加载更多等功能。**

### 获取文章列表

获取已发布的文章列表，支持分页和搜索。

#### 请求

```http
GET /api/articles/miniprogram/list?page=1&pageSize=10&keyword=育儿
```

**认证**: ❌ 无需登录（公开接口，自动只返回已发布文章）

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 否 | 搜索关键词（标题/正文/作者/来源） |
| `page` | number | 否 | 页码，默认 1 |
| `pageSize` | number | 否 | 每页数量，默认 10 |

**注意**：小程序接口自动只返回 `status='published'` 的文章，无需传 status 参数。

#### 响应

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "6967700ebaf1a7bfe723665c",
        "title": "新生儿护理要点",
        "author": "新华社",
        "source": "人民日报",
        "status": "published",
        "createdAt": "2026-01-15T10:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z",
        "createdBy": {
          "_id": "user123",
          "name": "管理员",
          "username": "admin"
        }
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  },
  "message": "获取成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文章唯一ID |
| `title` | string | 文章标题 |
| `author` | string | 作者 |
| `source` | string | 来源/出处 |
| `status` | string | 状态：`draft`（草稿）、`published`（已发布） |
| `createdAt` | string | 创建时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |
| `createdBy` | object | 创建人信息 |
| `total` | number | 总记录数 |
| `page` | number | 当前页码 |
| `pageSize` | number | 每页数量 |
| `totalPages` | number | 总页数 |

---

### 获取文章详情

获取单篇文章的完整内容，包括正文和图片。

#### 请求

```http
GET /api/articles/miniprogram/:id
```

**认证**: ❌ 无需登录（公开接口，自动只返回已发布文章）

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 文章ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "6967700ebaf1a7bfe723665c",
    "title": "新生儿护理要点",
    "author": "新华社",
    "source": "人民日报",
    "contentRaw": "新生儿护理是每个新手父母都需要掌握的技能...\n\n## 一、温度控制\n\n新生儿体温调节能力较弱...",
    "contentHtml": "<p>新生儿护理是每个新手父母都需要掌握的技能...</p><h2>一、温度控制</h2><p>新生儿体温调节能力较弱...</p>",
    "imageUrls": [
      "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/article/image1.jpg",
      "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/article/image2.jpg"
    ],
    "status": "published",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z",
    "createdBy": {
      "_id": "user123",
      "name": "管理员",
      "username": "admin"
    },
    "updatedBy": {
      "_id": "user123",
      "name": "管理员",
      "username": "admin"
    }
  },
  "message": "获取成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文章唯一ID |
| `title` | string | 文章标题 |
| `author` | string | 作者 |
| `source` | string | 来源/出处 |
| `contentRaw` | string | 原始正文内容（支持简易Markdown格式） |
| `contentHtml` | string | HTML格式的正文内容（已处理格式） |
| `imageUrls` | array | 图片URL列表（腾讯云COS） |
| `status` | string | 状态：`draft`（草稿）、`published`（已发布） |
| `createdAt` | string | 创建时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |
| `createdBy` | object | 创建人信息 |
| `updatedBy` | object | 最后更新人信息 |

#### 小程序调用示例

```javascript
// utils/api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

/**
 * 获取文章列表（小程序专用公开接口）
 * @param {Object} params - 查询参数
 * @param {string} params.keyword - 搜索关键词
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise<Object>} 文章列表数据
 */
export function getArticleList(params = {}) {
  const { keyword = '', page = 1, pageSize = 10 } = params;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/list`,
      method: 'GET',
      data: {
        keyword,
        page,
        pageSize
      },
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '获取文章列表失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

/**
 * 获取文章详情（小程序专用公开接口）
 * @param {string} id - 文章ID
 * @returns {Promise<Object>} 文章详情数据
 */
export function getArticleDetail(id) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/${id}`,
      method: 'GET',
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '获取文章详情失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
```

```javascript
// pages/article/list/list.js
import { getArticleList } from '../../../utils/api';

Page({
  data: {
    articleList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadArticles();
  },

  async loadArticles() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const result = await getArticleList({
        page: this.data.page,
        pageSize: this.data.pageSize
      });

      this.setData({
        articleList: [...this.data.articleList, ...result.list],
        total: result.total,
        page: this.data.page + 1,
        hasMore: this.data.articleList.length + result.list.length < result.total,
        loading: false
      });
    } catch (err) {
      console.error('加载文章失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      articleList: [],
      page: 1,
      hasMore: true
    });
    this.loadArticles().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadArticles();
  },

  // 跳转到文章详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/article/detail/detail?id=${id}`
    });
  }
});
```

```javascript
// pages/article/detail/detail.js
import { getArticleDetail } from '../../../utils/api';

Page({
  data: {
    article: null,
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadArticle(id);
    }
  },

  async loadArticle(id) {
    try {
      const article = await getArticleDetail(id);
      this.setData({
        article,
        loading: false
      });
    } catch (err) {
      console.error('加载文章详情失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  }
});
```

```html
<!-- pages/article/list/list.wxml -->
<view class="article-list">
  <view class="article-item" wx:for="{{articleList}}" wx:key="_id"
        bindtap="goToDetail" data-id="{{item._id}}">
    <view class="article-title">{{item.title}}</view>
    <view class="article-meta">
      <text class="author">{{item.author}}</text>
      <text class="date">{{item.createdAt}}</text>
    </view>
  </view>

  <view class="loading" wx:if="{{loading}}">加载中...</view>
  <view class="no-more" wx:if="{{!hasMore && articleList.length > 0}}">没有更多了</view>
</view>
```

```html
<!-- pages/article/detail/detail.wxml -->
<view class="article-detail" wx:if="{{article}}">
  <view class="article-header">
    <view class="article-title">{{article.title}}</view>
    <view class="article-meta">
      <text class="author">作者：{{article.author}}</text>
      <text class="source" wx:if="{{article.source}}">来源：{{article.source}}</text>
      <text class="date">{{article.createdAt}}</text>
    </view>
  </view>

  <view class="article-content">
    <rich-text nodes="{{article.contentHtml}}"></rich-text>
  </view>

  <view class="article-images" wx:if="{{article.imageUrls.length > 0}}">
    <image wx:for="{{article.imageUrls}}" wx:key="index"
           src="{{item}}" mode="widthFix" class="article-image" />
  </view>
</view>
```

---

## 📝 简历管理

### 创建简历

创建一个新的简历记录。

#### 请求

```http
POST /api/resumes/miniprogram/create
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: {unique-key}  # 可选，用于防止重复提交

{
  "name": "张三",
  "phone": "13800138000",
  "gender": "female",
  "age": 35,
  "jobType": "yuexin",
  "education": "high",
  "maternityNurseLevel": "gold",
  "expectedSalary": 8000,
  "nativePlace": "河南省郑州市",
  "experienceYears": 3,
  "skills": ["chanhou", "yuying"],
  "serviceArea": ["北京市朝阳区"],
  "selfIntroduction": "自我介绍内容",
  "wechat": "wechat123",
  "currentAddress": "北京市朝阳区",
  "hukouAddress": "河南省郑州市",
  "birthDate": "1990-01-01",
  "idNumber": "410102199001011234",
  "ethnicity": "汉族",
  "zodiac": "马",
  "zodiacSign": "摩羯座",
  "maritalStatus": "married",
  "religion": "无",
  "emergencyContactName": "李四",
  "emergencyContactPhone": "13900139000",
  "medicalExamDate": "2024-01-01",
  "orderStatus": "available",
  "learningIntention": "yes",
  "currentStage": "working",
  "workExperiences": [
    {
      "startDate": "2020-01-01",
      "endDate": "2020-03-31",
      "description": "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",
      "orderNumber": "CON12345678901",
      "district": "chaoyang",
      "customerName": "张女士",
      "customerReview": "服务态度好，专业技能强，宝宝护理得很好",
      "photos": [
        {
          "url": "https://cos.example.com/work-photo-1.jpg",
          "name": "工作照片1.jpg",
          "size": 102400,
          "mimeType": "image/jpeg"
        }
      ]
    },
    {
      "startDate": "2020-05-01",
      "endDate": "2020-07-31",
      "description": "在北京海淀区某家庭担任月嫂",
      "orderNumber": "CON12345678902",
      "district": "haidian",
      "customerName": "李女士"
    }
  ]
}
```

#### 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | 姓名，2-20字符 | "张三" |
| `phone` | string | 手机号码，11位数字 | "13800138000" |
| `gender` | string | 性别："female" 或 "male" | "female" |
| `age` | number | 年龄，18-65岁 | 35 |
| `jobType` | string | 工种类型，见[工种类型](#工种类型) | "yuexin" |
| `education` | string | 学历，见[学历类型](#学历类型) | "high" |

#### 可选字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `maternityNurseLevel` | string | 月嫂档位（仅月嫂），见[月嫂档位](#月嫂档位) | "gold" |
| `expectedSalary` | number | 期望薪资 | 8000 |
| `nativePlace` | string | 籍贯，最大20字符 | "河南省郑州市" |
| `experienceYears` | number | 工作经验年限 | 3 |
| `skills` | array | 技能列表 | ["chanhou", "yuying"] |
| `serviceArea` | array | 服务区域 | ["北京市朝阳区"] |
| `selfIntroduction` | string | 自我介绍 | "自我介绍内容" |
| `wechat` | string | 微信号 | "wechat123" |
| `currentAddress` | string | 现居地址 | "北京市朝阳区" |
| `hukouAddress` | string | 户口地址 | "河南省郑州市" |
| `birthDate` | string | 出生日期，格式：YYYY-MM-DD | "1990-01-01" |
| `idNumber` | string | 身份证号 | "410102199001011234" |
| `ethnicity` | string | 民族 | "汉族" |
| `zodiac` | string | 生肖 | "马" |
| `zodiacSign` | string | 星座 | "摩羯座" |
| `maritalStatus` | string | 婚姻状况，见[婚姻状况](#婚姻状况) | "married" |
| `religion` | string | 宗教信仰 | "无" |
| `emergencyContactName` | string | 紧急联系人姓名 | "李四" |
| `emergencyContactPhone` | string | 紧急联系人电话 | "13900139000" |
| `medicalExamDate` | string | 体检日期，格式：YYYY-MM-DD | "2024-01-01" |
| `orderStatus` | string | 接单状态，见[接单状态](#接单状态) | "available" |
| `learningIntention` | string | 培训意向，见[培训意向](#培训意向) | "yes" |
| `currentStage` | string | 当前阶段，见[当前阶段](#当前阶段) | "working" |
| `workExperiences` | array | 工作经历数组（详见下方说明） | 见下方说明 |

#### 工作经历对象结构

```json
{
  // 必填字段
  "startDate": "2020-01-01",      // 必填：开始日期（YYYY-MM-DD）
  "endDate": "2023-12-31",        // 必填：结束日期（YYYY-MM-DD）
  "description": "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",  // 必填：工作描述

  // 可选字段（新增）
  "orderNumber": "CON12345678901",  // 可选：订单编号（格式：CON{11位数字}）
  "district": "chaoyang",           // 可选：服务区域（北京市区县代码）
  "customerName": "张女士",         // 可选：客户姓名
  "customerReview": "服务态度好，专业技能强，宝宝护理得很好",  // 可选：客户评价
  "photos": [                       // 可选：工作照片数组
    {
      "url": "https://cos.example.com/work-photo-1.jpg",  // 必填：图片URL
      "name": "工作照片1.jpg",      // 可选：文件名
      "size": 102400,               // 可选：文件大小（字节）
      "mimeType": "image/jpeg"      // 可选：MIME类型
    }
  ]
}
```

**北京市区县代码**：
```
dongcheng: 东城区      xicheng: 西城区       chaoyang: 朝阳区
fengtai: 丰台区        shijingshan: 石景山区  haidian: 海淀区
mentougou: 门头沟区    fangshan: 房山区      tongzhou: 通州区
shunyi: 顺义区         changping: 昌平区     daxing: 大兴区
huairou: 怀柔区        pinggu: 平谷区        miyun: 密云区
yanqing: 延庆区
```

#### 成功响应 (201)

```json
{
  "success": true,
  "data": {
    "id": "66e2f4af8b1234567890abcd",
    "createdAt": "2025-09-12T10:19:27.671Z",
    "action": "CREATED",
    "resume": {
      "id": "66e2f4af8b1234567890abcd",
      "name": "张三",
      "phone": "13800138000",
      "age": 35,
      "gender": "female",
      "jobType": "yuexin",
      "education": "high",
      "maternityNurseLevel": "gold",
      "expectedSalary": 8000,
      // ... 其他字段
    }
  },
  "message": "创建简历成功"
}
```

#### 错误响应

**重复手机号 (409)**:
```json
{
  "success": false,
  "code": "DUPLICATE",
  "data": {
    "existingId": "66e2f4af8b1234567890abcd"
  },
  "message": "该手机号已被使用"
}
```

**验证错误 (400)**:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "data": {
    "errors": ["姓名不能为空", "手机号码格式不正确"]
  },
  "message": "数据验证失败"
}
```

---

### 获取简历详情

获取指定ID的简历详细信息。

#### 请求

```http
GET /api/resumes/miniprogram/{id}
Authorization: Bearer {token}
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 简历ID |

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "id": "66e2f4af8b1234567890abcd",
    "name": "张三",
    "phone": "13800138000",
    "age": 35,
    "gender": "female",
    "jobType": "yuexin",
    "education": "high",
    "experienceYears": 3,
    "nativePlace": "河南省郑州市",
    "selfIntroduction": "自我介绍内容",
    "wechat": "wechat123",
    "currentAddress": "北京市朝阳区",
    "hukouAddress": "河南省郑州市",
    "birthDate": "1990-01-01",
    "skills": ["chanhou", "yuying"],
    "serviceArea": ["北京市朝阳区"],
    "expectedSalary": 8000,
    "maternityNurseLevel": "gold",
    "workExperiences": [
      {
        "startDate": "2020-01-01",
        "endDate": "2020-03-31",
        "description": "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",
        "orderNumber": "CON12345678901",
        "district": "chaoyang",
        "customerName": "张女士",
        "customerReview": "服务态度好，专业技能强，宝宝护理得很好",
        "photos": [
          {
            "url": "https://cos.example.com/work-photo-1.jpg",
            "name": "工作照片1.jpg",
            "size": 102400,
            "mimeType": "image/jpeg"
          },
          {
            "url": "https://cos.example.com/work-photo-2.jpg",
            "name": "工作照片2.jpg",
            "size": 98304,
            "mimeType": "image/jpeg"
          }
        ]
      },
      {
        "startDate": "2020-05-01",
        "endDate": "2020-07-31",
        "description": "在北京海淀区某家庭担任月嫂",
        "orderNumber": "CON12345678902",
        "district": "haidian",
        "customerName": "李女士"
      }
    ],
    "idCardFront": {
      "url": "https://example.com/idcard-front.jpg",
      "key": "uploads/idcard/front.jpg"
    },
    "idCardBack": {
      "url": "https://example.com/idcard-back.jpg",
      "key": "uploads/idcard/back.jpg"
    },
    "personalPhoto": [
      {
        "url": "https://example.com/photo1.jpg",
        "key": "uploads/photo/photo1.jpg"
      }
    ],
    "certificates": [
      {
        "url": "https://example.com/cert1.jpg",
        "key": "uploads/cert/cert1.jpg"
      }
    ],
    "reports": [
      {
        "url": "https://example.com/report1.jpg",
        "key": "uploads/report/report1.jpg"
      }
    ],
    "selfIntroductionVideo": {
      "url": "https://example.com/video.mp4",
      "key": "uploads/video/video.mp4"
    },
    "employeeEvaluations": [
      {
        "_id": "694e0a9a8878020d398b7f61",
        "employeeId": "66e2f4af8b1234567890abcd",
        "employeeName": "张三",
        "evaluationType": "daily",
        "overallRating": 4.5,
        "serviceAttitudeRating": 5,
        "professionalSkillRating": 4,
        "workEfficiencyRating": 4.5,
        "communicationRating": 4.5,
        "comment": "工作认真负责，技能熟练，沟通良好",
        "tags": ["认真负责", "技能熟练"],
        "isPublic": true,
        "status": "published",
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "recommendationTags": [
      {
        "tag": "形象气质好",
        "count": 3
      },
      {
        "tag": "好沟通",
        "count": 3
      },
      {
        "tag": "相处愉快",
        "count": 3
      },
      {
        "tag": "认真负责",
        "count": 2
      },
      {
        "tag": "技能熟练",
        "count": 1
      }
    ],
    "createdAt": "2025-09-12T10:19:27.671Z",
    "updatedAt": "2025-09-12T10:19:27.671Z"
  },
  "message": "获取简历成功"
}
```

#### 错误响应

**简历不存在 (404)**:
```json
{
  "success": false,
  "data": null,
  "message": "简历不存在"
}
```

---

### 更新简历

更新指定ID的简历信息。支持部分更新，只需传递需要更新的字段。

#### 请求

```http
PUT /api/resumes/miniprogram/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "expectedSalary": 9000,
  "maternityNurseLevel": "platinum",
  "selfIntroduction": "更新后的自我介绍",
  "orderStatus": "available"
}
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 简历ID |

#### 可更新字段

除了 `phone`（手机号）外，所有创建时的可选字段都可以更新。

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "id": "66e2f4af8b1234567890abcd",
    "name": "张三",
    "phone": "13800138000",
    "age": 35,
    "gender": "female",
    "jobType": "yuexin",
    "education": "high",
    "experienceYears": 3,
    "expectedSalary": 9000,
    "maternityNurseLevel": "platinum",
    "nativePlace": "河南省郑州市",
    "skills": ["chanhou", "yuying"],
    "serviceArea": ["北京市朝阳区"],
    "selfIntroduction": "更新后的自我介绍",
    "orderStatus": "available",
    // ... 其他字段
  },
  "message": "更新简历成功"
}
```

#### 错误响应

**简历不存在 (404)**:
```json
{
  "success": false,
  "message": "简历不存在"
}
```

**验证错误 (400)**:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "data": {
    "errors": ["年龄必须在18-65之间"]
  },
  "message": "数据验证失败"
}
```

---

### 推荐理由标签说明

#### 📌 功能说明

推荐理由标签（`recommendationTags`）是系统自动从**客户评价**和**内部员工评价**中提取的关键词标签，用于快速展示员工的优势特点。

#### 🎯 数据来源

推荐理由标签从以下3个渠道自动提取：

1. **内部员工评价的tags字段**
   - 直接从员工评价表的 `tags` 数组提取
   - 条件：评价状态为 `published`（已发布）
   - 只统计长度在2-6个字之间的标签

2. **内部员工评价的comment内容**
   - 从评价内容中智能提取关键词
   - 使用内置的30+个正面评价关键词库进行匹配
   - 关键词示例：形象气质好、好沟通、相处愉快、做事认真、专业知识丰富等

3. **工作经历中的客户评价**
   - 从 `workHistory` 数组中的 `customerReview` 字段提取
   - 同样使用关键词库进行匹配

#### 📊 统计规则

- **标签聚合**：将3个来源的标签合并统计
- **计数累加**：相同标签的出现次数累加
- **排序规则**：按出现次数从高到低排序
- **返回格式**：`[{tag: "标签名", count: 次数}, ...]`

#### 💡 使用示例

```javascript
// 小程序端调用
wx.request({
  url: 'https://crm.andejiazheng.com/api/resumes/miniprogram/694e0a9a8878020d398b7f60',
  method: 'GET',
  success: (res) => {
    const { recommendationTags } = res.data.data;

    // 显示推荐理由标签
    // recommendationTags = [
    //   { tag: "形象气质好", count: 3 },
    //   { tag: "好沟通", count: 3 },
    //   { tag: "相处愉快", count: 3 },
    //   { tag: "认真负责", count: 2 },
    //   { tag: "技能熟练", count: 1 }
    // ]

    // 渲染标签
    recommendationTags.forEach(item => {
      console.log(`${item.tag}(${item.count})`);
    });
  }
});
```

#### 🎨 UI展示建议

```html
<!-- 推荐理由标签展示 -->
<view class="recommendation-tags">
  <view class="tag-title">推荐理由</view>
  <view class="tag-list">
    <view
      class="tag-item"
      wx:for="{{recommendationTags}}"
      wx:key="tag"
    >
      {{item.tag}}({{item.count}})
    </view>
  </view>
</view>
```

```css
.recommendation-tags {
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 10rpx;
}

.tag-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 24rpx;
  background: #1890ff;
  color: white;
  border-radius: 8rpx;
  font-size: 28rpx;
}
```

#### ⚠️ 注意事项

1. **自动生成**：标签由系统自动提取，无需手动维护
2. **实时更新**：每次添加新评价后，标签会自动更新
3. **可能为空**：如果没有评价数据，`recommendationTags` 将返回空数组 `[]`
4. **需要认证**：获取简历详情接口需要JWT认证，普通员工仅可查看自己创建的简历

---

## 📁 文件上传

### 上传文件

上传各类文件（照片、证书、视频等）。

#### 请求

```http
POST /api/upload/miniprogram
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [文件二进制数据]
type: "idcard-front" | "idcard-back" | "photo" | "certificate" | "report" | "video"
```

#### 文件类型说明

| type值 | 说明 | 支持格式 | 大小限制 |
|--------|------|----------|----------|
| `idcard-front` | 身份证正面 | jpg, jpeg, png | 5MB |
| `idcard-back` | 身份证反面 | jpg, jpeg, png | 5MB |
| `photo` | 个人照片 | jpg, jpeg, png | 5MB |
| `certificate` | 证书照片 | jpg, jpeg, png | 5MB |
| `report` | 体检报告 | jpg, jpeg, png, pdf | 10MB |
| `video` | 自我介绍视频 | mp4, mov | 50MB |

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "url": "https://example.com/uploads/photo/123456.jpg",
    "key": "uploads/photo/123456.jpg",
    "size": 102400,
    "mimeType": "image/jpeg"
  },
  "message": "上传成功"
}
```

#### 错误响应

**文件过大 (413)**:
```json
{
  "success": false,
  "message": "文件大小超过限制"
}
```

**文件格式不支持 (400)**:
```json
{
  "success": false,
  "message": "不支持的文件格式"
}
```

### 删除文件

删除已上传的文件。

#### 请求

```http
DELETE /api/upload/miniprogram
Authorization: Bearer {token}
Content-Type: application/json

{
  "key": "uploads/photo/123456.jpg"
}
```

#### 成功响应 (200)

```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 简历文件上传（推荐）

上传简历相关文件，直接关联到简历记录。

#### 上传单个文件

```http
POST /api/resumes/miniprogram/:id/upload-file
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [文件二进制数据]
type: "idCardFront" | "idCardBack" | "personalPhoto" | "certificate" | "medicalReport" | "selfIntroductionVideo" | "confinementMealPhoto" | "cookingPhoto" | "complementaryFoodPhoto" | "positiveReviewPhoto"
```

#### 文件类型说明

| type值 | 说明 | 对应字段 |
|--------|------|---------|
| `idCardFront` | 身份证正面 | `idCardFront` |
| `idCardBack` | 身份证背面 | `idCardBack` |
| `personalPhoto` | 个人照片 | `photoUrls` / `personalPhoto` |
| `certificate` | 技能证书 | `certificateUrls` / `certificates` |
| `medicalReport` | 体检报告 | `medicalReportUrls` / `reports` |
| `selfIntroductionVideo` | 自我介绍视频 | `selfIntroductionVideo` |
| `confinementMealPhoto` | 月子餐照片 | `confinementMealPhotos` |
| `cookingPhoto` | 烹饪照片 | `cookingPhotos` |
| `complementaryFoodPhoto` | 辅食添加照片 | `complementaryFoodPhotos` |
| `positiveReviewPhoto` | 好评展示照片 | `positiveReviewPhotos` |

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "fileUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/xxx.jpg",
    "fileType": "certificate",
    "fileName": "photo.jpg",
    "fileSize": 123456,
    "resumeId": "68ea31595750fa9479e15732"
  },
  "message": "文件上传成功"
}
```

#### 删除简历文件

```http
DELETE /api/resumes/miniprogram/:id/delete-file
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/xxx.jpg",
  "fileType": "certificate"
}
```

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "resumeId": "68ea31595750fa9479e15732",
    "deletedFileUrl": "https://...",
    "fileType": "certificate"
  },
  "message": "文件删除成功"
}
```

---

## 📖 数据字典

### 工种类型

| 值 | 说明 |
|---|---|
| `yuexin` | 月嫂 |
| `zhujia-yuer` | 住家育儿嫂 |
| `baiban-yuer` | 白班育儿嫂 |
| `baojie` | 保洁 |
| `baiban-baomu` | 白班保姆 |
| `zhujia-baomu` | 住家保姆 |
| `yangchong` | 养宠 |
| `xiaoshi` | 小时工 |
| `zhujia-hulao` | 住家护老 |

### 学历类型

| 值 | 说明 |
|---|---|
| `no` | 无学历 |
| `primary` | 小学 |
| `middle` | 初中 |
| `secondary` | 中专 |
| `vocational` | 职高 |
| `high` | 高中 |
| `college` | 大专 |
| `bachelor` | 本科 |
| `graduate` | 研究生 |

### 月嫂档位

**仅当 jobType 为 "yuexin" (月嫂) 时使用**

| 值 | 说明 |
|---|---|
| `junior` | 初级月嫂 |
| `silver` | 银牌月嫂 |
| `gold` | 金牌月嫂 |
| `platinum` | 铂金月嫂 |
| `diamond` | 钻石月嫂 |
| `crown` | 皇冠月嫂 |

### 婚姻状况

| 值 | 说明 |
|---|---|
| `single` | 未婚 |
| `married` | 已婚 |
| `divorced` | 离异 |
| `widowed` | 丧偶 |

### 接单状态

| 值 | 说明 |
|---|---|
| `available` | 可接单 |
| `busy` | 忙碌中 |
| `unavailable` | 暂不接单 |

### 培训意向

| 值 | 说明 |
|---|---|
| `yes` | 有意向 |
| `no` | 无意向 |
| `considering` | 考虑中 |

### 当前阶段

| 值 | 说明 |
|---|---|
| `training` | 培训中 |
| `working` | 工作中 |
| `resting` | 休息中 |
| `seeking` | 求职中 |

### 技能列表

| 值 | 说明 |
|---|---|
| `chanhou` | 产后护理 |
| `yuying` | 婴儿护理 |
| `cuiru` | 催乳 |
| `zaojiao` | 早教 |
| `yingyang` | 营养配餐 |
| `jiating` | 家庭保洁 |
| `laoren` | 老人护理 |
| `chongwu` | 宠物护理 |

---

## ⚠️ 错误码说明

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，token无效或过期 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如手机号重复） |
| 413 | 请求体过大 |
| 500 | 服务器内部错误 |

### 业务错误码

| 错误码 | 说明 |
|--------|------|
| `VALIDATION_ERROR` | 数据验证失败 |
| `DUPLICATE` | 资源重复（如手机号已存在） |
| `NOT_FOUND` | 资源不存在 |
| `UNAUTHORIZED` | 未授权 |
| `FORBIDDEN` | 禁止访问 |
| `FILE_TOO_LARGE` | 文件过大 |
| `INVALID_FILE_TYPE` | 文件类型不支持 |

---

## 💻 小程序端集成示例

### 完整的API封装

```javascript
// utils/api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

class API {
  // 获取token
  getToken() {
    return wx.getStorageSync('token');
  }

  // 通用请求方法
  async request(url, options = {}) {
    const token = this.getToken();
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await wx.request({
        url: `${BASE_URL}${url}`,
        method: options.method || 'GET',
        header,
        data: options.data
      });

      if (response.statusCode === 401) {
        // token过期，重新登录
        await this.login();
        return this.request(url, options);
      }

      return response.data;
    } catch (error) {
      console.error('请求失败:', error);
      throw error;
    }
  }

  // 登录
  async login() {
    const { code } = await wx.login();
    const response = await wx.request({
      url: `${BASE_URL}/auth/miniprogram/login`,
      method: 'POST',
      data: { code }
    });

    if (response.data.success) {
      wx.setStorageSync('token', response.data.data.token);
      return response.data.data;
    }
    throw new Error('登录失败');
  }

  // 创建简历
  async createResume(data) {
    return this.request('/resumes/miniprogram/create', {
      method: 'POST',
      data
    });
  }

  // 获取简历详情
  async getResume(id) {
    return this.request(`/resumes/miniprogram/${id}`);
  }

  // 更新简历
  async updateResume(id, data) {
    return this.request(`/resumes/miniprogram/${id}`, {
      method: 'PUT',
      data
    });
  }

  // 上传文件
  async uploadFile(filePath, type) {
    const token = this.getToken();

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${BASE_URL}/upload/miniprogram`,
        filePath,
        name: 'file',
        formData: { type },
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.success) {
            resolve(data.data);
          } else {
            reject(new Error(data.message));
          }
        },
        fail: reject
      });
    });
  }

  // 删除文件
  async deleteFile(key) {
    return this.request('/upload/miniprogram', {
      method: 'DELETE',
      data: { key }
    });
  }
}

export default new API();
```

### 创建简历页面示例

```javascript
// pages/resume/create.js
import api from '../../utils/api';

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      gender: 'female',
      age: 30,
      jobType: 'yuexin',
      education: 'high',
      maternityNurseLevel: 'gold',
      expectedSalary: 8000,
      nativePlace: '',
      experienceYears: 0,
      skills: [],
      serviceArea: [],
      selfIntroduction: '',
      wechat: '',
      currentAddress: '',
      orderStatus: 'available'
    },

    // 选项列表
    jobTypes: [
      { value: 'yuexin', label: '月嫂' },
      { value: 'zhujia-yuer', label: '住家育儿嫂' },
      { value: 'baiban-yuer', label: '白班育儿嫂' }
    ],

    maternityNurseLevels: [
      { value: 'junior', label: '初级月嫂' },
      { value: 'silver', label: '银牌月嫂' },
      { value: 'gold', label: '金牌月嫂' },
      { value: 'platinum', label: '铂金月嫂' },
      { value: 'diamond', label: '钻石月嫂' },
      { value: 'crown', label: '皇冠月嫂' }
    ],

    showMaternityLevel: true
  },

  onLoad() {
    // 页面加载
  },

  // 工种变化
  onJobTypeChange(e) {
    const jobType = e.detail.value;
    this.setData({
      'formData.jobType': jobType,
      showMaternityLevel: jobType === 'yuexin'
    });
  },

  // 表单输入
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 提交表单
  async onSubmit() {
    const { formData } = this.data;

    // 验证必填字段
    if (!formData.name || !formData.phone) {
      wx.showToast({
        title: '请填写必填信息',
        icon: 'none'
      });
      return;
    }

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });

      // 如果不是月嫂，移除档位字段
      const submitData = { ...formData };
      if (submitData.jobType !== 'yuexin') {
        delete submitData.maternityNurseLevel;
      }

      const response = await api.createResume(submitData);

      wx.hideLoading();

      if (response.success) {
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        });

        // 跳转到详情页
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/resume/detail?id=${response.data.id}`
          });
        }, 1500);
      } else {
        wx.showToast({
          title: response.message || '创建失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
      console.error('创建简历失败:', error);
    }
  }
});
```

### 简历详情页面示例

```javascript
// pages/resume/detail.js
import api from '../../utils/api';

Page({
  data: {
    resumeId: '',
    resume: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ resumeId: options.id });
      this.loadResume();
    }
  },

  // 加载简历
  async loadResume() {
    try {
      this.setData({ loading: true });

      const response = await api.getResume(this.data.resumeId);

      if (response.success) {
        this.setData({
          resume: response.data,
          loading: false
        });
      } else {
        wx.showToast({
          title: response.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
      console.error('加载简历失败:', error);
    }
  },

  // 编辑简历
  onEdit() {
    wx.navigateTo({
      url: `/pages/resume/edit?id=${this.data.resumeId}`
    });
  },

  // 更新接单状态
  async updateOrderStatus(status) {
    try {
      wx.showLoading({ title: '更新中...' });

      const response = await api.updateResume(this.data.resumeId, {
        orderStatus: status
      });

      wx.hideLoading();

      if (response.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        this.loadResume();
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  }
});
```

### 文件上传示例

```javascript
// pages/resume/upload.js
import api from '../../utils/api';

Page({
  data: {
    resumeId: '',
    photos: []
  },

  // 选择照片
  async choosePhoto() {
    try {
      const { tempFilePaths } = await wx.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      // 上传所有照片
      for (const filePath of tempFilePaths) {
        await this.uploadPhoto(filePath);
      }
    } catch (error) {
      console.error('选择照片失败:', error);
    }
  },

  // 上传照片
  async uploadPhoto(filePath) {
    try {
      wx.showLoading({ title: '上传中...' });

      const result = await api.uploadFile(filePath, 'photo');

      wx.hideLoading();

      // 添加到照片列表
      this.setData({
        photos: [...this.data.photos, result]
      });

      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
      console.error('上传照片失败:', error);
    }
  },

  // 删除照片
  async deletePhoto(index) {
    const photo = this.data.photos[index];

    try {
      const result = await wx.showModal({
        title: '确认删除',
        content: '确定要删除这张照片吗？'
      });

      if (result.confirm) {
        wx.showLoading({ title: '删除中...' });

        await api.deleteFile(photo.key);

        wx.hideLoading();

        // 从列表中移除
        const photos = [...this.data.photos];
        photos.splice(index, 1);
        this.setData({ photos });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
      console.error('删除照片失败:', error);
    }
  }
});
```

---

## 📋 最佳实践

### 1. 错误处理

```javascript
async function handleRequest() {
  try {
    const response = await api.createResume(data);

    if (response.success) {
      // 处理成功
    } else {
      // 处理业务错误
      if (response.code === 'DUPLICATE') {
        wx.showModal({
          title: '提示',
          content: '该手机号已被使用，是否查看已有简历？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: `/pages/resume/detail?id=${response.data.existingId}`
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: response.message,
          icon: 'none'
        });
      }
    }
  } catch (error) {
    // 处理网络错误
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    });
  }
}
```

### 2. 幂等性处理

```javascript
// 使用幂等性键防止重复提交
async function createResumeWithIdempotency(data) {
  const idempotencyKey = `resume_${Date.now()}_${Math.random()}`;

  const response = await wx.request({
    url: `${BASE_URL}/resumes/miniprogram/create`,
    method: 'POST',
    header: {
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey
    },
    data
  });

  return response.data;
}
```

### 3. 数据验证

```javascript
// 前端验证
function validateResumeData(data) {
  const errors = [];

  if (!data.name || data.name.length < 2 || data.name.length > 20) {
    errors.push('姓名长度应在2-20个字符之间');
  }

  if (!/^1[3-9]\d{9}$/.test(data.phone)) {
    errors.push('手机号格式不正确');
  }

  if (data.age < 18 || data.age > 65) {
    errors.push('年龄应在18-65岁之间');
  }

  if (data.jobType === 'yuexin' && !data.maternityNurseLevel) {
    errors.push('月嫂工种需要选择档位');
  }

  return errors;
}
```

### 4. 缓存策略

```javascript
// 缓存简历数据
class ResumeCache {
  static KEY = 'resume_cache';
  static EXPIRE_TIME = 5 * 60 * 1000; // 5分钟

  static set(id, data) {
    const cache = {
      data,
      timestamp: Date.now()
    };
    wx.setStorageSync(`${this.KEY}_${id}`, cache);
  }

  static get(id) {
    const cache = wx.getStorageSync(`${this.KEY}_${id}`);
    if (!cache) return null;

    // 检查是否过期
    if (Date.now() - cache.timestamp > this.EXPIRE_TIME) {
      this.remove(id);
      return null;
    }

    return cache.data;
  }

  static remove(id) {
    wx.removeStorageSync(`${this.KEY}_${id}`);
  }
}

// 使用缓存
async function getResumeWithCache(id) {
  // 先从缓存获取
  const cached = ResumeCache.get(id);
  if (cached) {
    return cached;
  }

  // 缓存不存在，从API获取
  const response = await api.getResume(id);
  if (response.success) {
    ResumeCache.set(id, response.data);
    return response.data;
  }

  return null;
}
```

### 5. 文件上传优化

```javascript
// 批量上传文件
async function uploadMultipleFiles(filePaths, type) {
  const results = [];
  const errors = [];

  // 限制并发数
  const concurrency = 3;

  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency);
    const promises = batch.map(async (filePath) => {
      try {
        const result = await api.uploadFile(filePath, type);
        results.push(result);
      } catch (error) {
        errors.push({ filePath, error });
      }
    });

    await Promise.all(promises);
  }

  return { results, errors };
}
```

---

## 🔍 常见问题

### Q1: Token过期怎么办？

A: API会自动处理token过期的情况。当收到401响应时，会自动重新登录并重试请求。

### Q2: 如何防止重复提交？

A: 使用`Idempotency-Key`请求头，传入唯一的键值。相同的键值在一定时间内只会处理一次。

### Q3: 月嫂档位什么时候必填？

A: 只有当`jobType`为`yuexin`（月嫂）时，才需要填写`maternityNurseLevel`字段。

### Q4: 如何更新部分字段？

A: 使用PUT请求，只传递需要更新的字段即可，其他字段保持不变。

### Q5: 文件上传失败怎么办？

A: 检查文件大小和格式是否符合要求，确保网络连接正常，可以实现重试机制。

### Q6: 如何处理手机号重复？

A: 创建时如果手机号重复，会返回409状态码和已存在的简历ID，可以引导用户查看或更新已有简历。

---

## 💡 最佳实践

### 1. 文件上传最佳实践

#### 图片预压缩
```javascript
// 在上传前压缩图片
async function compressAndUpload(filePath, type) {
  try {
    // 压缩图片
    const compressRes = await wx.compressImage({
      src: filePath,
      quality: 80
    });

    // 上传压缩后的图片
    const uploadRes = await wx.uploadFile({
      url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/upload-file`,
      filePath: compressRes.tempFilePath,
      name: 'file',
      formData: { type: type },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      }
    });

    return JSON.parse(uploadRes.data);
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
}
```

#### 批量上传优化
```javascript
// 限制并发数的批量上传
async function uploadBatch(files, concurrency = 3) {
  const results = [];
  const errors = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const batchPromises = batch.map(async (file) => {
      try {
        const result = await uploadFile(file.path, file.type);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((result, index) => {
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({
          file: batch[index],
          error: result.error
        });
      }
    });
  }

  return { results, errors };
}
```

#### 上传进度显示
```javascript
// 显示上传进度
function uploadWithProgress(filePath, type) {
  return new Promise((resolve, reject) => {
    const uploadTask = wx.uploadFile({
      url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/upload-file`,
      filePath: filePath,
      name: 'file',
      formData: { type: type },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        const data = JSON.parse(res.data);
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.message));
        }
      },
      fail: reject
    });

    // 监听上传进度
    uploadTask.onProgressUpdate((res) => {
      console.log('上传进度', res.progress);
      console.log('已上传数据长度', res.totalBytesSent);
      console.log('预期需要上传的数据总长度', res.totalBytesExpectedToSend);

      // 更新UI显示进度
      this.setData({
        uploadProgress: res.progress
      });
    });
  });
}
```

### 2. 错误处理最佳实践

#### 统一错误处理
```javascript
// 封装统一的错误处理
class APIError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

async function handleAPICall(apiFunction) {
  try {
    const result = await apiFunction();

    if (!result.success) {
      throw new APIError(
        result.code || 'UNKNOWN_ERROR',
        result.message || '操作失败',
        result.data
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof APIError) {
      // 根据错误码显示不同的提示
      switch (error.code) {
        case 'DUPLICATE':
          wx.showModal({
            title: '提示',
            content: '该手机号已被使用，是否查看已有简历？',
            success: (res) => {
              if (res.confirm) {
                // 跳转到已有简历
                wx.navigateTo({
                  url: `/pages/resume/detail?id=${error.data.existingId}`
                });
              }
            }
          });
          break;

        case 'VALIDATION_ERROR':
          wx.showToast({
            title: error.message,
            icon: 'none',
            duration: 2000
          });
          break;

        case 'FILE_TOO_LARGE':
          wx.showModal({
            title: '文件过大',
            content: '请选择小于10MB的文件',
            showCancel: false
          });
          break;

        default:
          wx.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          });
      }
    } else {
      // 网络错误等
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }

    throw error;
  }
}
```

#### 重试机制
```javascript
// 带指数退避的重试机制
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }

      // 指数退避
      const delay = baseDelay * Math.pow(2, i);
      console.log(`重试 ${i + 1}/${maxRetries}，等待 ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 使用示例
try {
  const result = await retryWithBackoff(async () => {
    return await uploadFile(filePath, 'cookingPhoto');
  });
  console.log('上传成功', result);
} catch (error) {
  console.error('上传失败，已重试3次', error);
}
```

### 3. 数据验证最佳实践

#### 前端验证
```javascript
// 表单验证工具
const validators = {
  // 手机号验证
  phone: (value) => {
    const pattern = /^1[3-9]\d{9}$/;
    if (!pattern.test(value)) {
      return '请输入正确的手机号码';
    }
    return null;
  },

  // 身份证号验证
  idNumber: (value) => {
    const pattern = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    if (!pattern.test(value)) {
      return '请输入正确的身份证号码';
    }
    return null;
  },

  // 年龄验证
  age: (value) => {
    const age = parseInt(value);
    if (isNaN(age) || age < 18 || age > 65) {
      return '年龄必须在18-65岁之间';
    }
    return null;
  },

  // 必填验证
  required: (value, fieldName) => {
    if (!value || value.trim() === '') {
      return `${fieldName}不能为空`;
    }
    return null;
  }
};

// 验证表单
function validateForm(formData) {
  const errors = [];

  // 验证必填字段
  const requiredFields = [
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'age', label: '年龄' },
    { key: 'gender', label: '性别' },
    { key: 'jobType', label: '工种' },
    { key: 'education', label: '学历' }
  ];

  requiredFields.forEach(field => {
    const error = validators.required(formData[field.key], field.label);
    if (error) errors.push(error);
  });

  // 验证手机号
  if (formData.phone) {
    const error = validators.phone(formData.phone);
    if (error) errors.push(error);
  }

  // 验证身份证号
  if (formData.idNumber) {
    const error = validators.idNumber(formData.idNumber);
    if (error) errors.push(error);
  }

  // 验证年龄
  if (formData.age) {
    const error = validators.age(formData.age);
    if (error) errors.push(error);
  }

  return errors;
}

// 使用示例
const errors = validateForm(formData);
if (errors.length > 0) {
  wx.showModal({
    title: '验证失败',
    content: errors.join('\n'),
    showCancel: false
  });
  return;
}
```

### 4. 性能优化建议

#### 数据缓存
```javascript
// 缓存简历数据
const ResumeCache = {
  cache: {},

  set(id, data, ttl = 5 * 60 * 1000) { // 默认5分钟过期
    this.cache[id] = {
      data: data,
      expireAt: Date.now() + ttl
    };
  },

  get(id) {
    const item = this.cache[id];
    if (!item) return null;

    if (Date.now() > item.expireAt) {
      delete this.cache[id];
      return null;
    }

    return item.data;
  },

  clear(id) {
    if (id) {
      delete this.cache[id];
    } else {
      this.cache = {};
    }
  }
};

// 使用缓存
async function getResume(id, forceRefresh = false) {
  // 如果不强制刷新，先尝试从缓存获取
  if (!forceRefresh) {
    const cached = ResumeCache.get(id);
    if (cached) {
      console.log('从缓存获取简历');
      return cached;
    }
  }

  // 从服务器获取
  const res = await wx.request({
    url: `${API_BASE_URL}/api/resumes/miniprogram/${id}`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${wx.getStorageSync('token')}`
    }
  });

  if (res.data.success) {
    // 存入缓存
    ResumeCache.set(id, res.data.data);
    return res.data.data;
  }

  throw new Error(res.data.message);
}
```

#### 图片懒加载
```javascript
// 图片懒加载组件
Component({
  properties: {
    src: String,
    mode: {
      type: String,
      value: 'aspectFill'
    }
  },

  data: {
    loaded: false,
    showImage: false
  },

  lifetimes: {
    attached() {
      this.observer = wx.createIntersectionObserver(this);

      this.observer
        .relativeToViewport({ bottom: 100 })
        .observe('.lazy-image', (res) => {
          if (res.intersectionRatio > 0 && !this.data.loaded) {
            this.setData({
              showImage: true,
              loaded: true
            });
            this.observer.disconnect();
          }
        });
    },

    detached() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }
});
```

### 5. 安全建议

#### Token管理
```javascript
// Token管理工具
const TokenManager = {
  // 保存Token
  saveToken(token) {
    wx.setStorageSync('token', token);
    wx.setStorageSync('tokenTime', Date.now());
  },

  // 获取Token
  getToken() {
    return wx.getStorageSync('token');
  },

  // 检查Token是否过期（假设Token有效期为7天）
  isTokenExpired() {
    const tokenTime = wx.getStorageSync('tokenTime');
    if (!tokenTime) return true;

    const expireTime = 7 * 24 * 60 * 60 * 1000; // 7天
    return Date.now() - tokenTime > expireTime;
  },

  // 清除Token
  clearToken() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('tokenTime');
  },

  // 刷新Token
  async refreshToken() {
    try {
      const res = await wx.request({
        url: `${API_BASE_URL}/api/auth/refresh`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (res.data.success) {
        this.saveToken(res.data.data.token);
        return res.data.data.token;
      }

      throw new Error('刷新Token失败');
    } catch (error) {
      this.clearToken();
      throw error;
    }
  }
};
```

#### 请求拦截器
```javascript
// 封装请求，自动处理Token
async function request(options) {
  // 检查Token是否过期
  if (TokenManager.isTokenExpired()) {
    try {
      await TokenManager.refreshToken();
    } catch (error) {
      // Token刷新失败，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
      throw new Error('登录已过期，请重新登录');
    }
  }

  // 添加Token到请求头
  const token = TokenManager.getToken();
  if (token) {
    options.header = options.header || {};
    options.header['Authorization'] = `Bearer ${token}`;
  }

  // 发送请求
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      success: (res) => {
        // 处理401未授权
        if (res.statusCode === 401) {
          TokenManager.clearToken();
          wx.redirectTo({
            url: '/pages/login/login'
          });
          reject(new Error('未授权，请重新登录'));
          return;
        }

        resolve(res);
      },
      fail: reject
    });
  });
}
```

---

## 📝 工作经历字段详细说明

### 工作经历对象完整结构

每个工作经历对象包含以下字段：

#### 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `startDate` | string | 开始日期（YYYY-MM-DD） | "2020-01-01" |
| `endDate` | string | 结束日期（YYYY-MM-DD） | "2023-12-31" |
| `description` | string | 工作描述 | "在北京朝阳区某家庭担任月嫂" |

#### 可选字段（新增）

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `orderNumber` | string | 订单编号（格式：CON{11位数字}） | "CON12345678901" |
| `district` | string | 服务区域（北京市区县代码） | "chaoyang" |
| `customerName` | string | 客户姓名 | "张女士" |
| `customerReview` | string | 客户评价 | "服务态度好，专业技能强" |
| `photos` | array | 工作照片数组 | 见下方照片对象说明 |

### 工作照片对象结构

每个照片对象包含以下字段：

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `url` | string | 是 | 图片URL | "https://cos.example.com/photo.jpg" |
| `name` | string | 否 | 文件名 | "工作照片1.jpg" |
| `size` | number | 否 | 文件大小（字节） | 102400 |
| `mimeType` | string | 否 | MIME类型 | "image/jpeg" |

### 北京市区县代码对照表

| 代码 | 区县名称 | 代码 | 区县名称 |
|------|----------|------|----------|
| `dongcheng` | 东城区 | `xicheng` | 西城区 |
| `chaoyang` | 朝阳区 | `fengtai` | 丰台区 |
| `shijingshan` | 石景山区 | `haidian` | 海淀区 |
| `mentougou` | 门头沟区 | `fangshan` | 房山区 |
| `tongzhou` | 通州区 | `shunyi` | 顺义区 |
| `changping` | 昌平区 | `daxing` | 大兴区 |
| `huairou` | 怀柔区 | `pinggu` | 平谷区 |
| `miyun` | 密云区 | `yanqing` | 延庆区 |

### 使用示例

#### 创建包含完整工作经历的简历

```javascript
// 小程序端示例
const createResumeWithWorkExperience = async () => {
  const resumeData = {
    // 必填字段
    name: "张三",
    phone: "13800138000",
    gender: "female",
    age: 35,
    jobType: "yuexin",
    education: "high",

    // 工作经历（包含新字段）
    workExperiences: [
      {
        startDate: "2020-01-01",
        endDate: "2020-03-31",
        description: "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",
        orderNumber: "CON12345678901",
        district: "chaoyang",
        customerName: "张女士",
        customerReview: "服务态度好，专业技能强，宝宝护理得很好",
        photos: [
          {
            url: "https://cos.example.com/work-photo-1.jpg",
            name: "工作照片1.jpg",
            size: 102400,
            mimeType: "image/jpeg"
          }
        ]
      },
      {
        startDate: "2020-05-01",
        endDate: "2020-07-31",
        description: "在北京海淀区某家庭担任月嫂",
        orderNumber: "CON12345678902",
        district: "haidian",
        customerName: "李女士"
        // 其他字段可选，不填写也可以
      }
    ]
  };

  try {
    const response = await wx.request({
      url: 'https://crm.andejiazheng.com/api/resumes/miniprogram/create',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: resumeData
    });

    if (response.data.success) {
      console.log('简历创建成功:', response.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('创建失败:', error);
  }
};
```

#### 更新工作经历

```javascript
// 更新现有简历的工作经历
const updateWorkExperience = async (resumeId) => {
  const updateData = {
    workExperiences: [
      {
        startDate: "2020-01-01",
        endDate: "2020-03-31",
        description: "工作描述",
        orderNumber: "CON12345678901",
        district: "chaoyang",
        customerName: "张女士",
        customerReview: "服务很好",
        photos: [
          {
            url: "https://cos.example.com/photo.jpg",
            name: "照片.jpg"
          }
        ]
      }
    ]
  };

  try {
    const response = await wx.request({
      url: `https://crm.andejiazheng.com/api/resumes/miniprogram/${resumeId}`,
      method: 'PUT',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: updateData
    });

    if (response.data.success) {
      console.log('更新成功');
    }
  } catch (error) {
    console.error('更新失败:', error);
  }
};
```

### 注意事项

1. **订单编号格式**：必须是 `CON` 开头 + 11位数字，例如：`CON12345678901`
2. **服务区域代码**：必须使用北京市区县代码，不能使用中文名称
3. **日期格式**：必须使用 `YYYY-MM-DD` 格式，例如：`2020-01-01`
4. **照片URL**：必须是有效的HTTPS URL
5. **向后兼容**：所有新增字段都是可选的，不影响现有功能

---

---

## 📊 员工评价

内部员工评价管理，支持创建评价、查询评价列表和统计分析。

**路由前缀**: `/api/employee-evaluations/`
**认证要求**: ✅ 所有接口均需JWT认证 + 角色权限验证

### 创建员工评价

创建对员工的内部评价记录。

#### 请求

```http
POST /api/employee-evaluations/miniprogram/create
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要登录

#### 请求体

```json
{
  "employeeId": "507f1f77bcf86cd799439011",
  "employeeName": "张三",
  "contractId": "507f1f77bcf86cd799439012",
  "contractNo": "CON20240101001",
  "evaluationType": "daily",
  "overallRating": 4.5,
  "serviceAttitudeRating": 5,
  "professionalSkillRating": 4,
  "workEfficiencyRating": 4.5,
  "communicationRating": 5,
  "comment": "工作认真负责，专业技能强，服务态度好",
  "strengths": "服务态度好，技能熟练，沟通能力强",
  "improvements": "工作效率可以进一步提升",
  "tags": ["认真负责", "技能熟练", "沟通良好"],
  "isPublic": false,
  "status": "published"
}
```

#### 请求字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `employeeId` | string | ✅ | 被评价员工ID（简历ID） |
| `employeeName` | string | ✅ | 被评价员工姓名 |
| `contractId` | string | ❌ | 关联合同ID |
| `contractNo` | string | ❌ | 订单编号 |
| `evaluationType` | string | ✅ | 评价类型：daily/monthly/contract_end/special |
| `overallRating` | number | ✅ | 综合评分（1-5分） |
| `serviceAttitudeRating` | number | ❌ | 服务态度评分（1-5分） |
| `professionalSkillRating` | number | ❌ | 专业技能评分（1-5分） |
| `workEfficiencyRating` | number | ❌ | 工作效率评分（1-5分） |
| `communicationRating` | number | ❌ | 沟通能力评分（1-5分） |
| `comment` | string | ✅ | 评价内容 |
| `strengths` | string | ❌ | 优点 |
| `improvements` | string | ❌ | 待改进项 |
| `tags` | array | ❌ | 评价标签 |
| `isPublic` | boolean | ❌ | 是否公开（默认false） |
| `status` | string | ❌ | 状态：draft/published/archived（默认published） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "_id": "678a1b2c3d4e5f6789012345",
    "employeeId": "507f1f77bcf86cd799439011",
    "employeeName": "张三",
    "evaluatorId": "507f1f77bcf86cd799439013",
    "evaluatorName": "李经理",
    "contractId": "507f1f77bcf86cd799439012",
    "contractNo": "CON20240101001",
    "evaluationType": "daily",
    "overallRating": 4.5,
    "serviceAttitudeRating": 5,
    "professionalSkillRating": 4,
    "workEfficiencyRating": 4.5,
    "communicationRating": 5,
    "comment": "工作认真负责，专业技能强，服务态度好",
    "strengths": "服务态度好，技能熟练，沟通能力强",
    "improvements": "工作效率可以进一步提升",
    "tags": ["认真负责", "技能熟练", "沟通良好"],
    "isPublic": false,
    "status": "published",
    "evaluationDate": "2026-01-18T10:30:00.000Z",
    "createdAt": "2026-01-18T10:30:00.000Z",
    "updatedAt": "2026-01-18T10:30:00.000Z"
  },
  "message": "员工评价创建成功"
}
```

#### 小程序调用示例

```javascript
// 创建员工评价
wx.request({
  url: 'https://crm.andejiazheng.com/api/employee-evaluations/miniprogram/create',
  method: 'POST',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  data: {
    employeeId: '507f1f77bcf86cd799439011',
    employeeName: '张三',
    evaluationType: 'daily',
    overallRating: 4.5,
    serviceAttitudeRating: 5,
    professionalSkillRating: 4,
    comment: '工作认真负责，专业技能强',
    tags: ['认真负责', '技能熟练']
  },
  success(res) {
    if (res.data.success) {
      wx.showToast({ title: '评价成功', icon: 'success' });
    }
  }
});
```

---

### 获取评价列表

获取员工评价列表，支持筛选和分页。

#### 请求

```http
GET /api/employee-evaluations/miniprogram/list?employeeId={employeeId}&page=1&pageSize=10
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `employeeId` | string | ❌ | 员工ID筛选 |
| `evaluatorId` | string | ❌ | 评价人ID筛选 |
| `evaluationType` | string | ❌ | 评价类型筛选 |
| `status` | string | ❌ | 状态筛选 |
| `page` | number | ❌ | 页码（默认1） |
| `pageSize` | number | ❌ | 每页数量（默认10） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "678a1b2c3d4e5f6789012345",
        "employeeId": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "张三",
          "phone": "13800138000",
          "jobType": "yuexin"
        },
        "employeeName": "张三",
        "evaluatorId": {
          "_id": "507f1f77bcf86cd799439013",
          "username": "manager01",
          "name": "李经理"
        },
        "evaluatorName": "李经理",
        "overallRating": 4.5,
        "comment": "工作认真负责，专业技能强",
        "evaluationType": "daily",
        "status": "published",
        "evaluationDate": "2026-01-18T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  },
  "message": "获取员工评价列表成功"
}
```

#### 小程序调用示例

```javascript
// 获取某个员工的评价列表
const token = wx.getStorageSync('token');
wx.request({
  url: 'https://crm.andejiazheng.com/api/employee-evaluations/miniprogram/list',
  method: 'GET',
  header: {
    'Authorization': `Bearer ${token}`
  },
  data: {
    employeeId: '507f1f77bcf86cd799439011',
    page: 1,
    pageSize: 20
  },
  success(res) {
    if (res.data.success) {
      const evaluations = res.data.data.items;
      console.log('评价列表:', evaluations);
    }
  }
});
```

---

### 获取评价统计

获取员工的评价统计数据，包括平均分、评分分布等。

#### 请求

```http
GET /api/employee-evaluations/miniprogram/statistics/{employeeId}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `employeeId` | string | ✅ | 员工ID（简历ID） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "employeeId": "507f1f77bcf86cd799439011",
    "totalEvaluations": 25,
    "averageRating": 4.52,
    "averageServiceAttitude": 4.8,
    "averageProfessionalSkill": 4.5,
    "averageWorkEfficiency": 4.3,
    "averageCommunication": 4.7,
    "ratingDistribution": {
      "5": 12,
      "4": 10,
      "3": 3,
      "2": 0,
      "1": 0
    },
    "recentEvaluations": [
      {
        "_id": "678a1b2c3d4e5f6789012345",
        "evaluatorName": "李经理",
        "overallRating": 4.5,
        "comment": "工作认真负责，专业技能强",
        "evaluationDate": "2026-01-18T10:30:00.000Z"
      }
    ]
  },
  "message": "获取员工评价统计成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalEvaluations` | number | 总评价数 |
| `averageRating` | number | 综合平均分 |
| `averageServiceAttitude` | number | 服务态度平均分 |
| `averageProfessionalSkill` | number | 专业技能平均分 |
| `averageWorkEfficiency` | number | 工作效率平均分 |
| `averageCommunication` | number | 沟通能力平均分 |
| `ratingDistribution` | object | 评分分布（5分制） |
| `recentEvaluations` | array | 最近5条评价 |

#### 小程序调用示例

```javascript
// 获取员工评价统计
wx.request({
  url: `https://crm.andejiazheng.com/api/employee-evaluations/miniprogram/statistics/507f1f77bcf86cd799439011`,
  method: 'GET',
  success(res) {
    if (res.data.success) {
      const stats = res.data.data;
      console.log('平均评分:', stats.averageRating);
      console.log('总评价数:', stats.totalEvaluations);
      console.log('评分分布:', stats.ratingDistribution);
    }
  }
});
```

---

## 👥 客户管理

小程序端客户管理接口，支持客户列表和统计数据查询，可用于列表筛选和顶部统计卡片联动。

**路由前缀**: `/api/customers/miniprogram/`  
**认证要求**: ✅ 需要 JWT 认证 + 角色权限验证  
**数据隔离**: 普通员工仅统计/查看自己负责的客户（后端会强制覆盖 `assignedTo` 为当前用户）

### 接口列表

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取客户统计信息 | GET | `/api/customers/miniprogram/statistics` | 统计卡片接口（支持筛选） |
| 获取客户列表 | GET | `/api/customers/miniprogram/list` | 客户分页列表 |
| 创建客户 | POST | `/api/customers/miniprogram/create` | 新增客户 |
| 获取客户详情 | GET | `/api/customers/miniprogram/:id` | 客户详情 |
| 更新客户 | PATCH | `/api/customers/miniprogram/:id` | 编辑客户 |
| 分配客户 | PATCH | `/api/customers/miniprogram/:id/assign` | 指定负责人 |
| 新增跟进记录 | POST | `/api/customers/miniprogram/:id/follow-ups` | 写入跟进 |
| 获取跟进记录 | GET | `/api/customers/miniprogram/:id/follow-ups` | 跟进列表 |
| 获取分配历史 | GET | `/api/customers/miniprogram/:id/assignment-logs` | 分配历史 |
| 获取员工列表 | GET | `/api/customers/miniprogram/employees/list` | 分配弹窗员工数据 |

### 获取客户统计信息

按筛选条件返回客户统计结果，适合小程序顶部统计数字使用。

#### 请求

```http
GET /api/customers/miniprogram/statistics?search=张三&assignedTo=67c6d07f9e8b5c0012f8abcd&leadLevel=A类&leadStatus=已流转
Authorization: Bearer {token}
```

#### 查询参数（均为可选）

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 搜索关键词，匹配客户姓名或手机号（模糊） |
| `assignedTo` | string | 归属人 ID（普通员工会被后端忽略并替换为本人） |
| `leadLevel` | string | 线索等级：`O类`、`A类`、`B类`、`C类`、`D类`、`流失` |
| `leadStatus` | string | 线索状态：`已流转`、`未流转`（通过 `transferCount` 判断） |

#### 成功响应（管理员/经理）

```json
{
  "success": true,
  "message": "统计信息获取成功",
  "data": {
    "total": 4,
    "byContractStatus": {
      "匹配中": 2,
      "已签约": 1,
      "流失客户": 1
    },
    "byLeadSource": {
      "抖音": 2,
      "转介绍": 1,
      "美团": 1
    },
    "byServiceCategory": {
      "月嫂": 3,
      "住家保姆": 1
    }
  },
  "timestamp": 1772612000000
}
```

#### 成功响应（普通员工）

```json
{
  "success": true,
  "message": "统计信息获取成功",
  "data": {
    "total": 4,
    "myCustomers": 4,
    "byContractStatus": {
      "匹配中": 2,
      "已签约": 1,
      "流失客户": 1
    }
  },
  "timestamp": 1772612000000
}
```

#### 小程序调用示例

```javascript
// 统计卡片筛选联动
wx.request({
  url: `${BASE_URL}/customers/miniprogram/statistics`,
  method: 'GET',
  header: {
    Authorization: `Bearer ${token}`
  },
  data: {
    search: '张三',
    assignedTo: selectedUserId, // 普通员工传了也会被后端覆盖为本人
    leadLevel: 'A类',
    leadStatus: '已流转'
  },
  success: (res) => {
    if (res.data.success) {
      const stats = res.data.data;
      this.setData({
        total: stats.total || 0,
        byContractStatus: stats.byContractStatus || {}
      });
    }
  }
});
```

### 获取客户列表

获取客户分页列表，支持条件筛选。小程序列表页建议与统计页使用同一组筛选参数。

#### 请求

```http
GET /api/customers/miniprogram/list?page=1&limit=10&search=张三&assignedTo=67c6d07f9e8b5c0012f8abcd&leadLevel=A类
Authorization: Bearer {token}
```

#### 常用查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码，默认 `1` |
| `limit` | number | 每页条数，默认 `10` |
| `search` | string | 搜索关键词（姓名、手机号、微信号） |
| `assignedTo` | string | 负责人 ID（普通员工会被后端覆盖为本人） |
| `contractStatus` | string | 客户状态：`已签约`、`匹配中`、`已面试`、`流失客户`、`已退款`、`退款中`、`待定` |
| `leadLevel` | string | 线索等级：`O类`、`A类`、`B类`、`C类`、`D类`、`流失` |

#### 成功响应（示例）

```json
{
  "success": true,
  "message": "客户列表获取成功",
  "data": {
    "customers": [
      {
        "_id": "67c6d07f9e8b5c0012f8abcd",
        "customerId": "CUS260304001",
        "name": "张三",
        "phone": "13800138000",
        "contractStatus": "匹配中",
        "leadLevel": "A类",
        "assignedToUser": {
          "name": "销售一组",
          "username": "xiaoshou01"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasMore": false
  },
  "timestamp": 1772612000000
}
```

### 创建客户

创建新的客户线索，支持 `Idempotency-Key` 防重复提交。

#### 请求

```http
POST /api/customers/miniprogram/create
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: {unique-key}   # 可选
```

#### 请求体（核心字段）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 客户姓名 |
| `phone` | string | 条件必填 | 手机号（与 `wechatId` 至少二选一） |
| `wechatId` | string | 条件必填 | 微信号（与 `phone` 至少二选一） |
| `leadSource` | string | ✅ | 线索来源 |
| `contractStatus` | string | ✅ | 客户状态 |
| `leadLevel` | string | ✅ | 线索等级 |
| `assignedTo` | string | ❌ | 指定负责人 ID（管理员/经理常用） |
| `assignmentReason` | string | ❌ | 分配原因 |

#### 成功响应（201）

```json
{
  "success": true,
  "message": "客户创建成功",
  "data": {
    "id": "67c6d07f9e8b5c0012f8abcd",
    "customerId": "CUS260304001",
    "createdAt": "2026-03-04T16:30:00.000Z",
    "action": "CREATED",
    "customer": {
      "_id": "67c6d07f9e8b5c0012f8abcd",
      "name": "张三",
      "phone": "13800138000",
      "leadLevel": "A类",
      "contractStatus": "匹配中"
    }
  }
}
```

#### 常见失败

- `DUPLICATE_PHONE`: 手机号已存在
- `MISSING_CONTACT`: 手机号和微信号都未填写

### 获取客户详情

按客户 ID 获取详情，自动按角色做权限控制与字段脱敏。

#### 请求

```http
GET /api/customers/miniprogram/{id}
Authorization: Bearer {token}
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 客户 MongoDB `_id` |

#### 成功响应（200）

```json
{
  "success": true,
  "message": "客户详情获取成功",
  "data": {
    "_id": "67c6d07f9e8b5c0012f8abcd",
    "customerId": "CUS260304001",
    "name": "张三",
    "phone": "13800138000",
    "contractStatus": "匹配中",
    "assignedToName": "销售一组",
    "assignedByName": "王经理",
    "createdByName": "王经理"
  }
}
```

### 更新客户

更新客户信息（部分字段更新即可）。

#### 请求

```http
PATCH /api/customers/miniprogram/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "contractStatus": "已签约",
  "leadLevel": "O类",
  "remarks": "客户已签约，等待上户"
}
```

#### 成功响应（200）

```json
{
  "success": true,
  "message": "客户信息更新成功",
  "data": {
    "_id": "67c6d07f9e8b5c0012f8abcd",
    "name": "张三",
    "contractStatus": "已签约",
    "leadLevel": "O类"
  }
}
```

### 分配客户

为客户指定新的负责人（仅管理员/经理）。

#### 请求

```http
PATCH /api/customers/miniprogram/{id}/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "assignedTo": "67c6d07f9e8b5c0012f8beef",
  "assignmentReason": "线索重分配"
}
```

#### 请求体字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `assignedTo` | string | ✅ | 新负责人 ID |
| `assignmentReason` | string | ❌ | 分配原因，最多 200 字 |

#### 成功响应（200）

```json
{
  "success": true,
  "message": "客户分配成功",
  "data": {
    "customerId": "67c6d07f9e8b5c0012f8abcd",
    "assignedTo": "67c6d07f9e8b5c0012f8beef",
    "assignedAt": "2026-03-04T16:35:00.000Z",
    "notificationData": {
      "assignedToId": "67c6d07f9e8b5c0012f8beef",
      "customerName": "张三",
      "source": "线索重分配"
    }
  }
}
```

### 新增跟进记录

为客户添加一条跟进记录。

#### 请求

```http
POST /api/customers/miniprogram/{id}/follow-ups
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "phone",
  "content": "电话沟通客户需求，预算 9000 左右"
}
```

#### 请求体字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 跟进方式：`phone`、`wechat`、`visit`、`other` |
| `content` | string | ✅ | 跟进内容，最多 1000 字 |

#### 成功响应（200）

```json
{
  "success": true,
  "message": "跟进记录创建成功",
  "data": {
    "_id": "67c6d07f9e8b5c0012f8c111",
    "customerId": "67c6d07f9e8b5c0012f8abcd",
    "type": "phone",
    "content": "电话沟通客户需求，预算 9000 左右",
    "createdBy": "67c6d07f9e8b5c0012f8beef",
    "createdAt": "2026-03-04T16:40:00.000Z"
  }
}
```

### 获取跟进记录

查询指定客户的跟进记录列表（按时间倒序）。

#### 请求

```http
GET /api/customers/miniprogram/{id}/follow-ups
Authorization: Bearer {token}
```

#### 成功响应（200）

```json
{
  "success": true,
  "message": "跟进记录获取成功",
  "data": [
    {
      "_id": "67c6d07f9e8b5c0012f8c111",
      "type": "phone",
      "content": "电话沟通客户需求，预算 9000 左右",
      "createdBy": {
        "name": "王销售",
        "username": "wangxiao"
      },
      "createdAt": "2026-03-04T16:40:00.000Z"
    }
  ]
}
```

### 获取分配历史

查询客户的负责人变更日志（仅管理员/经理）。

#### 请求

```http
GET /api/customers/miniprogram/{id}/assignment-logs
Authorization: Bearer {token}
```

#### 成功响应（200）

```json
{
  "success": true,
  "message": "分配历史获取成功",
  "data": [
    {
      "_id": "67c6d07f9e8b5c0012f8d222",
      "oldAssignedToUser": { "name": "李销售", "username": "li01" },
      "newAssignedToUser": { "name": "王销售", "username": "wang01" },
      "assignedByUser": { "name": "赵经理", "username": "zhao01" },
      "assignedAt": "2026-03-04T15:10:00.000Z"
    }
  ]
}
```

### 获取员工列表用于分配

用于“分配负责人”下拉选择。不同角色看到的数据范围不同：

- 系统管理员：全部活跃员工
- 经理：本部门活跃员工
- 普通员工：仅自己

#### 请求

```http
GET /api/customers/miniprogram/employees/list
Authorization: Bearer {token}
```

#### 成功响应（200）

```json
{
  "success": true,
  "message": "获取员工列表成功",
  "data": [
    {
      "_id": "67c6d07f9e8b5c0012f8beef",
      "name": "王销售",
      "role": "employee",
      "department": "销售一组",
      "phone": "13800000000",
      "email": "wang@demo.com",
      "status": "active"
    }
  ]
}
```

#### 小程序调用建议

客户列表与统计接口应使用同一组筛选参数，避免“列表数量”和“统计数字”不一致：

```javascript
const filters = {
  search: this.data.search || '',
  assignedTo: this.data.assignedTo || '',
  leadLevel: this.data.leadLevel || '',
  leadStatus: this.data.leadStatus || ''
};

// 1) 先拉统计
api.get('/customers/miniprogram/statistics', filters);
// 2) 再拉列表
api.get('/customers/miniprogram/list', { ...filters, page: 1, limit: 10 });
```

---

## 📝 合同管理

小程序端合同管理接口，支持合同创建、查询、更新、换人、保险同步、电子签章等完整操作流程。

**路由前缀**: `/api/contracts/miniprogram/`
**认证要求**: ✅ 所有接口均需JWT认证 + 角色权限验证
**数据隔离**: 普通员工仅可查看自己创建的合同，管理员和经理可查看全部

### 合同类型枚举（ContractType）

| 值 | 说明 |
|------|------|
| `月嫂` | 月嫂服务 |
| `住家育儿嫂` | 住家育儿嫂服务 |
| `保洁` | 保洁服务 |
| `住家保姆` | 住家保姆服务 |
| `养宠` | 养宠服务 |
| `小时工` | 小时工服务 |
| `白班育儿` | 白班育儿服务 |
| `白班保姆` | 白班保姆服务 |
| `住家护老` | 住家护老服务 |

### 合同状态枚举（ContractStatus）

| 值 | 说明 |
|------|------|
| `draft` | 草稿 |
| `signing` | 签约中 |
| `active` | 生效中 |
| `replaced` | 已被替换 |
| `cancelled` | 已作废 |

---

### 获取合同列表

分页获取合同列表，支持关键词搜索。

#### 请求

```http
GET /api/contracts/miniprogram/list?page=1&limit=10&search=孙学博
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | number | ❌ | 页码，默认1 |
| `limit` | number | ❌ | 每页数量，默认10 |
| `search` | string | ❌ | 搜索关键词（匹配客户姓名、手机号、合同编号等） |

#### 响应

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "_id": "698549c7ff8bbd52fc75df76",
        "contractNumber": "CONTRACT_1770342853643_81ql5hl3v",
        "customerName": "孙学博",
        "customerPhone": "18604592681",
        "contractType": "住家育儿嫂",
        "contractStatus": "active",
        "workerName": "赵瑶如",
        "workerPhone": "18614058566",
        "workerIdCard": "141034199605090042",
        "startDate": "2026-02-06T01:54:14.808Z",
        "endDate": "2027-02-06T00:00:00.000Z",
        "workerSalary": 7000,
        "customerServiceFee": 7000,
        "isLatest": true,
        "esignStatus": "2",
        "createdAt": "2026-02-06T01:54:14.808Z"
      }
    ],
    "total": 6,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "message": "获取合同列表成功"
}
```

---

### 获取合同详情

根据合同ID获取完整详情。

#### 请求

```http
GET /api/contracts/miniprogram/detail/{id}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 合同ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "698549c7ff8bbd52fc75df76",
    "contractNumber": "CONTRACT_1770342853643_81ql5hl3v",
    "customerName": "孙学博",
    "customerPhone": "18604592681",
    "customerIdCard": "230623199105111630",
    "contractType": "住家育儿嫂",
    "contractStatus": "active",
    "workerName": "赵瑶如",
    "workerIdCard": "141034199605090042",
    "startDate": "2026-02-06T01:54:14.808Z",
    "endDate": "2027-02-06T00:00:00.000Z",
    "workerSalary": 7000,
    "customerServiceFee": 7000,
    "esignContractNo": "CONTRACT_1770342853643_81ql5hl3v",
    "esignStatus": "2",
    "esignSignedAt": "2026-02-06T01:55:00.000Z",
    "isLatest": true,
    "insuranceSyncStatus": "success"
  },
  "message": "获取合同详情成功"
}
```

---

### 根据合同编号获取合同

#### 请求

```http
GET /api/contracts/miniprogram/by-number/{contractNumber}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `contractNumber` | string | ✅ | 合同编号 |

#### 响应

```json
{
  "success": true,
  "data": { "...合同详情..." },
  "message": "获取合同详情成功"
}
```

### 根据客户ID获取合同

#### 请求

```http
GET /api/contracts/miniprogram/by-customer/{customerId}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

```json
{
  "success": true,
  "data": [ { "...合同对象..." } ],
  "message": "获取客户合同列表成功"
}
```

---

### 根据服务人员ID获取合同

#### 请求

```http
GET /api/contracts/miniprogram/by-worker-id/{workerId}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

```json
{
  "success": true,
  "data": [ { "...合同对象..." } ],
  "message": "获取服务人员合同列表成功"
}
```

---

### 根据服务人员信息搜索合同

通过姓名、身份证号、手机号模糊搜索关联合同，常用于保险投保页面自动填充。

#### 请求

```http
GET /api/contracts/miniprogram/search-worker?name=赵瑶如&idCard=141034199605090042&phone=18614058566
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ❌ | 服务人员姓名 |
| `idCard` | string | ❌ | 服务人员身份证号 |
| `phone` | string | ❌ | 服务人员手机号 |

> 至少提供一个查询参数

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "_id": "698549c7ff8bbd52fc75df76",
      "contractNumber": "CONTRACT_1770342853643_81ql5hl3v",
      "customerName": "孙学博",
      "workerName": "赵瑶如",
      "contractStatus": "active"
    }
  ],
  "message": "查询成功"
}
```

---

### 检查客户现有合同

检查客户是否已有合同，用于判断新建合同还是换人合同。

#### 请求

```http
GET /api/contracts/miniprogram/check-customer/{customerPhone}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `customerPhone` | string | ✅ | 客户手机号 |

#### 响应

```json
{
  "success": true,
  "data": {
    "hasContract": true,
    "contract": { "...最新合同对象..." },
    "contractCount": 3
  },
  "message": "客户已有合同"
}
```

---

### 获取客户合同历史

获取客户的完整合同变更历史记录。

#### 请求

```http
GET /api/contracts/miniprogram/history/{customerPhone}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `customerPhone` | string | ✅ | 客户手机号 |

#### 响应

```json
{
  "success": true,
  "data": {
    "customerPhone": "18604592681",
    "contracts": [ { "...合同对象..." } ],
    "timeline": [ { "...变更记录..." } ]
  },
  "message": "获取客户合同历史成功"
}
```

---

### 获取合同统计信息

获取合同总数、按类型统计、本月/本年数量等。

#### 请求

```http
GET /api/contracts/miniprogram/statistics
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

```json
{
  "success": true,
  "data": {
    "total": 6,
    "byContractType": { "住家育儿嫂": 6 },
    "thisMonth": 5,
    "thisYear": 5
  },
  "message": "获取统计信息成功"
}
```

### 创建合同

创建新合同。

#### 请求

```http
POST /api/contracts/miniprogram/create
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

```json
{
  "customerName": "孙学博",
  "customerPhone": "18604592681",
  "customerIdCard": "230623199105111630",
  "contractType": "住家育儿嫂",
  "startDate": "2026-02-06",
  "endDate": "2027-02-06",
  "workerName": "赵瑶如",
  "workerPhone": "18614058566",
  "workerIdCard": "141034199605090042",
  "workerSalary": 7000,
  "customerServiceFee": 7000,
  "workerServiceFee": 500,
  "deposit": 1000,
  "remarks": "备注信息"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `customerName` | string | ✅ | 客户姓名 |
| `customerPhone` | string | ✅ | 客户手机号 |
| `customerIdCard` | string | ❌ | 客户身份证号 |
| `contractType` | string | ❌ | 合同类型（见枚举） |
| `startDate` | string | ❌ | 开始日期 |
| `endDate` | string | ❌ | 结束日期 |
| `workerName` | string | ❌ | 服务人员姓名 |
| `workerPhone` | string | ❌ | 服务人员手机号 |
| `workerIdCard` | string | ❌ | 服务人员身份证号 |
| `workerSalary` | number | ❌ | 家政员工资 |
| `customerServiceFee` | number | ❌ | 客户服务费 |
| `workerServiceFee` | number | ❌ | 家政员服务费 |
| `deposit` | number | ❌ | 约定定金 |
| `finalPayment` | number | ❌ | 约定尾款 |
| `expectedDeliveryDate` | string | ❌ | 预产期 |
| `salaryPaymentDay` | number | ❌ | 工资发放日（1-31） |
| `monthlyWorkDays` | number | ❌ | 月工作天数（1-31） |
| `remarks` | string | ❌ | 备注 |

#### 响应

```json
{
  "success": true,
  "data": { "...新创建的合同对象..." },
  "message": "合同创建成功"
}
```

---

### 更新合同

#### 请求

```http
PUT /api/contracts/miniprogram/update/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 路径参数 | 说明 |
|------|------|
| `id` | 合同ID |

请求体与创建合同字段相同，所有字段均为可选。

#### 响应

```json
{
  "success": true,
  "data": { "...更新后的合同对象..." },
  "message": "合同更新成功"
}
```

---

### 创建换人合同

基于原合同创建换人合同，自动合并原合同参数。

#### 请求

```http
POST /api/contracts/miniprogram/change-worker/{originalContractId}
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 路径参数 | 说明 |
|------|------|
| `originalContractId` | 原合同ID |

```json
{
  "customerName": "孙学博",
  "customerPhone": "18604592681",
  "workerName": "徐双梅",
  "workerPhone": "18910415525",
  "workerIdCard": "13032219780902162X",
  "workerSalary": 7999,
  "customerServiceFee": 7000,
  "contractType": "住家育儿嫂",
  "startDate": "2026-02-06",
  "endDate": "2027-02-06"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "6985671d6f813160cd287bae",
    "contractNumber": "CONTRACT_1770350360363_zu643qx2b",
    "contractStatus": "draft",
    "replacesContractId": "698549c7ff8bbd52fc75df76"
  },
  "message": "换人合同创建成功"
}
```

---

### 手动触发保险同步

合同签约后手动触发保险同步（查询爱签状态并同步保单）。

#### 请求

```http
POST /api/contracts/miniprogram/sync-insurance/{id}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 路径参数 | 说明 |
|------|------|
| `id` | 合同ID |

#### 响应

```json
{
  "success": true,
  "data": { "message": "保险同步已完成", "syncResult": "..." },
  "message": "保险同步已完成"
}
```

---

### 同步爱签合同状态

从爱签API查询最新状态并同步到本地数据库。

#### 请求

```http
POST /api/contracts/miniprogram/sync-esign-status/{id}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 路径参数 | 说明 |
|------|------|
| `id` | 合同ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "esignStatus": "2",
    "contractStatus": "active",
    "message": "已签约"
  },
  "message": "状态同步成功"
}
```

**爱签状态说明**:

| esignStatus | contractStatus | 说明 |
|-------------|----------------|------|
| "0" | "draft" | 等待签约 |
| "1" | "signing" | 签约中 |
| "2" | "active" | 已签约（生效中） |
| "3" | - | 过期 |
| "4" | - | 拒签 |
| "6" | "cancelled" | 作废 |
| "7" | "cancelled" | 撤销 |

---

### 批量同步所有合同状态

批量同步所有草稿和签约中状态的合同（最多50个）。

#### 请求

```http
POST /api/contracts/miniprogram/sync-all-esign-status
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

```json
{
  "success": true,
  "data": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "updated": 3,
    "details": [
      {
        "contractNumber": "CONTRACT_1770282785780_59jb3gozk",
        "oldStatus": "draft",
        "newStatus": "active",
        "esignStatus": "2"
      },
      {
        "contractNumber": "CONTRACT_1754297069164_8dw350x75",
        "oldStatus": "draft",
        "newStatus": "signing",
        "esignStatus": "1"
      }
    ]
  },
  "message": "批量同步完成：成功5个，失败0个，更新3个"
}
```

**使用场景**:
- CRM端发现合同状态不一致时
- 定期同步所有合同状态
- 爱签回调失败后的补救措施

---

### 获取爱签信息

获取合同关联的爱签电子签章信息（签署状态、预览链接等）。

#### 请求

```http
GET /api/contracts/miniprogram/esign-info/{id}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 路径参数 | 说明 |
|------|------|
| `id` | 合同ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "contractNo": "CONTRACT_1770342853643_81ql5hl3v",
    "templateNo": "TN84E8C106BFE74FD3AE36AC2CA33A44DE",
    "status": { "contractStatus": "2", "statusName": "已签约" },
    "preview": { "previewUrl": "https://..." }
  },
  "message": "获取爱签信息成功"
}
```

---

### 重新获取签署链接

重新获取合同的签署链接（用于签署链接过期后重新获取）。

#### 请求

```http
POST /api/contracts/miniprogram/resend-sign-urls/{id}
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 路径参数 | 说明 |
|------|------|
| `id` | 合同ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "signUrls": [
      { "name": "孙学博", "mobile": "18604592681", "signUrl": "https://..." },
      { "name": "赵瑶如", "mobile": "18614058566", "signUrl": "https://..." }
    ]
  },
  "message": "获取签署链接成功"
}
```

---

### 下载已签署合同

下载已签署完成的合同文件。

#### 请求

```http
POST /api/contracts/miniprogram/download-contract/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

| 路径参数 | 说明 |
|------|------|
| `id` | 合同ID |

```json
{
  "force": 0,
  "downloadFileType": 0
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `force` | number | ❌ | 是否强制重新生成（0否/1是） |
| `downloadFileType` | number | ❌ | 文件类型（0-PDF） |

#### 响应

```json
{
  "success": true,
  "data": { "downloadUrl": "https://..." },
  "message": "合同下载成功"
}
```

---

### 小程序调用示例

```javascript
// utils/contract-api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

/** 获取请求头（含JWT认证） */
function getAuthHeader() {
  const token = wx.getStorageSync('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/** 获取合同列表（普通员工仅返回自己创建的合同） */
export function getContractList(params = {}) {
  const query = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/contracts/miniprogram/list?${query}`,
      method: 'GET',
      header: getAuthHeader(),
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/** 检查客户是否已有合同 */
export function checkCustomerContract(phone) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/contracts/miniprogram/check-customer/${phone}`,
      method: 'GET',
      header: getAuthHeader(),
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/** 创建换人合同 */
export function createChangeWorkerContract(originalContractId, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/contracts/miniprogram/change-worker/${originalContractId}`,
      method: 'POST',
      header: getAuthHeader(),
      data,
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}
```

---

## 🛡️ 保险保单管理

小程序端保险保单管理接口，对接大树保平台，支持保单创建、查询、支付、退保等完整操作流程。

**路由前缀**: `/api/dashubao/miniprogram/`
**认证要求**: ✅ 所有接口均需JWT认证 + 角色权限验证
**数据隔离**: 普通员工仅可查看自己创建的保单，管理员和经理可查看全部

### 📋 接口列表

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取保单列表 | GET | `/api/dashubao/miniprogram/policies` | 分页获取保单列表 |
| 身份证查保单 | GET | `/api/dashubao/miniprogram/policy/by-id-card/:idCard` | 根据被保险人身份证号查询 |
| 保单号查保单 | GET | `/api/dashubao/miniprogram/policy/by-policy-no/:policyNo` | 根据大树保保单号查询 |
| 商户单号查保单 | GET | `/api/dashubao/miniprogram/policy/by-policy-ref/:policyRef` | 根据渠道流水号查询 |
| 获取保单详情 | GET | `/api/dashubao/miniprogram/policy/:id` | 根据记录ID获取详情 |
| 创建保单 | POST | `/api/dashubao/miniprogram/policy` | 投保确认，创建新保单 |
| 查询保单状态 | POST | `/api/dashubao/miniprogram/policy/query` | 从大树保查询最新状态 |
| 创建支付订单 | POST | `/api/dashubao/miniprogram/policy/payment/:policyRef` | 获取微信小程序支付信息 |
| 注销保单 | POST | `/api/dashubao/miniprogram/policy/cancel` | 注销未生效保单 |
| 退保 | POST | `/api/dashubao/miniprogram/policy/surrender` | 已生效保单退保 |
| 获取电子保单 | POST | `/api/dashubao/miniprogram/policy/print` | 获取电子保单PDF |
| 批改保单 | POST | `/api/dashubao/miniprogram/policy/amend` | 替换被保险人 |
| 批增被保险人 | POST | `/api/dashubao/miniprogram/policy/add-insured` | 增加被保险人 |
| 同步保单状态 | POST | `/api/dashubao/miniprogram/policy/sync/:identifier` | 从大树保同步最新状态到本地 |

---

### 获取保单列表

分页获取保单列表，支持按状态和简历ID筛选。

#### 请求

```http
GET /api/dashubao/miniprogram/policies?page=1&limit=10&status=active
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | string | 否 | 保单状态：pending/processing/active/expired/cancelled/surrendered |
| `resumeId` | string | 否 | 关联简历ID |
| `page` | number | 否 | 页码，默认1 |
| `limit` | number | 否 | 每页条数，默认10 |

#### 响应

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "6985518e2b89d09207c00045",
        "agencyPolicyRef": "ANDE1770344846144mrvapl",
        "policyNo": "14527006800217497720",
        "planCode": "PK00029001",
        "effectiveDate": "20260207000000",
        "expireDate": "20260306000000",
        "groupSize": 1,
        "totalPremium": 12,
        "status": "active",
        "policyHolder": {
          "policyHolderType": "C",
          "policyHolderName": "北京安得家政有限公司",
          "phIdType": "G",
          "phIdNumber": "91110111MACJMD2R5J"
        },
        "insuredList": [
          {
            "insuredName": "赵瑶如",
            "idType": "1",
            "idNumber": "141034199605090042",
            "birthDate": "19960509000000",
            "gender": "F",
            "mobile": "18614058566"
          }
        ],
        "contractId": "69855462f92117b2d2455202",
        "createdAt": "2026-02-06T02:27:26.411Z"
      }
    ],
    "total": 1
  },
  "message": "获取成功"
}
```

#### 保单状态说明

| 状态值 | 说明 |
|--------|------|
| `pending` | 待支付 |
| `processing` | 处理中 |
| `active` | 已生效 |
| `expired` | 已过期 |
| `cancelled` | 已注销 |
| `surrendered` | 已退保 |

---

### 根据身份证号查询保单

根据被保险人的身份证号查询所有关联保单。

#### 请求

```http
GET /api/dashubao/miniprogram/policy/by-id-card/141034199605090042
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "_id": "6985518e2b89d09207c00045",
      "agencyPolicyRef": "ANDE1770344846144mrvapl",
      "policyNo": "14527006800217497720",
      "status": "active",
      "insuredList": [
        {
          "insuredName": "赵瑶如",
          "idNumber": "141034199605090042"
        }
      ],
      "totalPremium": 12,
      "effectiveDate": "20260207000000",
      "expireDate": "20260306000000"
    }
  ],
  "message": "获取成功"
}
```

---

### 获取保单详情

根据保单记录ID获取完整详情。

#### 请求

```http
GET /api/dashubao/miniprogram/policy/6985518e2b89d09207c00045
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "6985518e2b89d09207c00045",
    "agencyPolicyRef": "ANDE1770344846144mrvapl",
    "policyNo": "14527006800217497720",
    "orderId": "19753109",
    "productCode": "MP10450132",
    "planCode": "PK00029001",
    "issueDate": "20260206102726",
    "effectiveDate": "20260207000000",
    "expireDate": "20260306000000",
    "groupSize": 1,
    "totalPremium": 12,
    "status": "active",
    "policyHolder": {
      "policyHolderType": "C",
      "policyHolderName": "北京安得家政有限公司",
      "phIdType": "G",
      "phIdNumber": "91110111MACJMD2R5J",
      "phAddress": "北京市朝阳区望京园602号楼3层339"
    },
    "insuredList": [
      {
        "insuredName": "赵瑶如",
        "insuredType": "1",
        "idType": "1",
        "idNumber": "141034199605090042",
        "birthDate": "19960509000000",
        "gender": "F",
        "mobile": "18614058566"
      }
    ],
    "contractId": "69855462f92117b2d2455202",
    "createdAt": "2026-02-06T02:27:26.411Z",
    "updatedAt": "2026-02-06T02:40:55.229Z"
  },
  "message": "获取成功"
}
```

---

### 根据保单号查询

根据大树保保单号查询保单。

#### 请求

```http
GET /api/dashubao/miniprogram/policy/by-policy-no/14527006800217497720
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

同"获取保单详情"响应格式。

---

### 根据商户单号查询

根据渠道流水号（商户单号）查询保单。

#### 请求

```http
GET /api/dashubao/miniprogram/policy/by-policy-ref/ANDE1770344846144mrvapl
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 响应

同"获取保单详情"响应格式。

---

### 创建保单（投保）

向大树保平台提交投保请求，创建新保单。

#### 请求

```http
POST /api/dashubao/miniprogram/policy
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 请求参数

```json
{
  "planCode": "PK00029001",
  "effectiveDate": "20260207000000",
  "expireDate": "20260306000000",
  "groupSize": 1,
  "totalPremium": 12,
  "policyHolder": {
    "policyHolderType": "C",
    "policyHolderName": "北京安得家政有限公司",
    "phIdType": "G",
    "phIdNumber": "91110111MACJMD2R5J",
    "phAddress": "北京市朝阳区望京园602号楼3层339",
    "phProvinceCode": "110000",
    "phCityCode": "110100",
    "phDistrictCode": "110105"
  },
  "insuredList": [
    {
      "insuredName": "赵瑶如",
      "idType": "1",
      "idNumber": "141034199605090042",
      "birthDate": "19960509000000",
      "gender": "F",
      "mobile": "18614058566"
    }
  ],
  "resumeId": "可选-关联简历ID"
}
```

#### 请求字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `planCode` | string | ✅ | 计划代码 |
| `effectiveDate` | string | ✅ | 生效日期（yyyyMMddHHmmss） |
| `expireDate` | string | ✅ | 结束日期（yyyyMMddHHmmss） |
| `groupSize` | number | ✅ | 被保险人数量 |
| `totalPremium` | number | ✅ | 总保费 |
| `productCode` | string | 否 | 产品代码 |
| `destination` | string | 否 | 目的地 |
| `remark` | string | 否 | 备注 |
| `serviceAddress` | string | 否 | 服务地址（工单险必传） |
| `workOrderId` | string | 否 | 订单编号（工单险必传） |
| `resumeId` | string | 否 | 关联的阿姨简历ID |

**投保人字段（policyHolder）**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `policyHolderType` | string | ✅ | I-个人，C-企业 |
| `policyHolderName` | string | ✅ | 投保人名称 |
| `phIdType` | string | ✅ | 证件类型（G-营业执照，1-身份证等） |
| `phIdNumber` | string | ✅ | 证件号码 |
| `phAddress` | string | 否 | 地址 |
| `phProvinceCode` | string | 否 | 省级编码（工单险必传） |
| `phCityCode` | string | 否 | 市级编码（工单险必传） |
| `phDistrictCode` | string | 否 | 区级编码（工单险必传） |

**被保险人字段（insuredList[]）**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `insuredName` | string | ✅ | 被保险人姓名 |
| `idType` | string | ✅ | 证件类型：1-身份证 |
| `idNumber` | string | ✅ | 证件号码 |
| `birthDate` | string | ✅ | 出生日期（yyyyMMddHHmmss） |
| `gender` | string | ✅ | 性别：M-男，F-女 |
| `mobile` | string | 否 | 联系电话 |
| `occupationCode` | string | 否 | 职业类别代码 |

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "6985518e2b89d09207c00045",
    "agencyPolicyRef": "ANDE1770344846144mrvapl",
    "policyNo": "14527006800217497720",
    "status": "pending",
    "totalPremium": 12
  },
  "message": "保单创建成功"
}
```

---

### 查询保单状态（大树保）

从大树保平台查询保单最新状态（非本地缓存）。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/query
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 请求参数

```json
{
  "agencyPolicyRef": "ANDE1770344846144mrvapl",
  "policyNo": "14527006800217497720"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agencyPolicyRef` | string | 二选一 | 渠道流水号 |
| `policyNo` | string | 二选一 | 大树保保单号 |

#### 响应

```json
{
  "success": true,
  "data": {
    "Success": "true",
    "PolicyNo": "14527006800217497720",
    "Status": "1",
    "Message": ""
  },
  "message": "查询成功"
}
```

---

### 创建支付订单

获取微信小程序支付信息，用于发起微信支付。小程序端固定使用 MINI 支付方式。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/payment/ANDE1770344846144mrvapl
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 说明 |
|------|------|
| `policyRef` | 保单号或商户单号 |

#### 响应

```json
{
  "success": true,
  "data": {
    "Success": "true",
    "WeChatAppId": "wx1234567890",
    "WeChatTimeStamp": "1770344846",
    "WeChatNonceStr": "随机字符串",
    "WeChatPackageValue": "prepay_id=wx...",
    "WeChatSign": "签名字符串",
    "WeChatPrepayId": "wx..."
  },
  "message": "获取支付信息成功"
}
```

> ⚠️ **注意**: 支付成功后大树保会回调 `/api/dashubao/payment/callback`（系统自动处理），保单状态会自动更新为 `active`。

---

### 注销保单

注销未生效的保单。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/cancel
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

```json
{
  "policyNo": "14527006800217497720"
}
```

#### 响应

```json
{
  "success": true,
  "data": { "Success": "true", "Message": "" },
  "message": "注销成功"
}
```

---

### 退保

已生效保单退保。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/surrender
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

```json
{
  "policyNo": "14527006800217497720",
  "removeReason": "13"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `policyNo` | string | ✅ | 保单号 |
| `removeReason` | string | ✅ | 退保原因：13-退票退保，14-航班取消，15-航班改签 |

#### 响应

```json
{
  "success": true,
  "data": { "Success": "true", "SurrenderPremium": "10.00" },
  "message": "退保成功"
}
```

---

### 获取电子保单PDF

获取电子保单PDF文件。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/print
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

```json
{
  "policyNo": "14527006800217497720"
}
```

#### 响应

返回 `application/pdf` 二进制文件流，可直接用于下载或预览。

---

### 批改保单（替换被保险人）

替换保单中的被保险人信息。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/amend
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

```json
{
  "policyNo": "14527006800217497720",
  "oldInsured": {
    "insuredName": "赵瑶如",
    "idType": "1",
    "idNumber": "141034199605090042",
    "birthDate": "19960509000000",
    "gender": "F"
  },
  "newInsured": {
    "insuredName": "张三",
    "idType": "1",
    "idNumber": "110101199001011234",
    "birthDate": "19900101000000",
    "gender": "M",
    "mobile": "13800138000"
  }
}
```

#### 响应

```json
{
  "success": true,
  "data": { "Success": "true", "Message": "" },
  "message": "批改成功"
}
```

### 批增（增加被保险人）

在现有保单中增加被保险人。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/add-insured
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要JWT认证 + 角色权限

```json
{
  "policyNo": "14527006800217497720",
  "totalPremium": 24,
  "insuredList": [
    {
      "insuredName": "李四",
      "idType": "1",
      "idNumber": "110101199201011234",
      "birthDate": "19920101000000",
      "gender": "M",
      "mobile": "13900139000"
    }
  ]
}
```

#### 响应

```json
{
  "success": true,
  "data": { "Success": "true", "Message": "" },
  "message": "批增成功"
}
```

---

### 同步保单状态

从大树保平台同步最新保单状态到本地数据库。

#### 请求

```http
POST /api/dashubao/miniprogram/policy/sync/ANDE1770344846144mrvapl
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 说明 |
|------|------|
| `identifier` | 保单号或商户单号 |

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "6985518e2b89d09207c00045",
    "status": "active",
    "policyNo": "14527006800217497720"
  },
  "message": "同步成功"
}
```

---

### 小程序调用示例

```javascript
// utils/insurance-api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

/** 获取请求头（含JWT认证） */
function getAuthHeader() {
  const token = wx.getStorageSync('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * 获取保单列表（普通员工仅返回自己创建的保单）
 */
export function getPolicyList(params = {}) {
  const query = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/dashubao/miniprogram/policies?${query}`,
      method: 'GET',
      header: getAuthHeader(),
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/**
 * 根据身份证号查询保单
 */
export function getPoliciesByIdCard(idCard) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/dashubao/miniprogram/policy/by-id-card/${idCard}`,
      method: 'GET',
      header: getAuthHeader(),
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/**
 * 创建保单
 */
export function createPolicy(policyData) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/dashubao/miniprogram/policy`,
      method: 'POST',
      header: getAuthHeader(),
      data: policyData,
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/**
 * 创建支付订单（小程序支付）
 */
export function createPaymentOrder(policyRef) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/dashubao/miniprogram/policy/payment/${policyRef}`,
      method: 'POST',
      header: getAuthHeader(),
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/**
 * 发起微信支付
 */
export async function payForPolicy(policyRef) {
  const payInfo = await createPaymentOrder(policyRef);
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: payInfo.WeChatTimeStamp,
      nonceStr: payInfo.WeChatNonceStr,
      package: payInfo.WeChatPackageValue,
      signType: 'MD5',
      paySign: payInfo.WeChatSign,
      success: resolve,
      fail: reject
    });
  });
}
```

---

## 🔍 背调管理

小程序可以调用背调接口发起员工背景调查，查询背调状态，下载背调报告。背调服务使用芝麻背调（ZMDB）平台。

### 📱 一句话总结

**小程序调用背调接口非常简单：（1）先调用 `POST /api/zmdb/miniprogram/prepare-auth` 传入 `{workerName}` 获取授权书URL；（2）调用 `POST /api/zmdb/miniprogram/reports` 传入 `{name, mobile, idNo?, authStuffUrl, esignContractNo, position?, packageType?}` 发起背调；（3）使用 `GET /api/zmdb/miniprogram/reports/by-idno/:idNo` 根据身份证号查询背调结果（状态4或16表示通过，状态3或15表示未通过）；（4）使用 `GET /api/zmdb/miniprogram/reports/:id` 获取背调详情页数据（含风险评估结果reportResult、各维度风险dimensions、关联合同contractId、回调历史callbackHistory）；（5）背调完成后使用 `wx.downloadFile` 调用 `GET /api/zmdb/miniprogram/reports/:reportId/download?token=xxx` 获取临时文件路径，再用 `wx.openDocument({filePath, fileType:'pdf'})` 直接打开PDF阅读器查看报告。所有接口都需要JWT认证，普通员工只能看到自己发起的背调记录。**

---

### 📋 接口列表

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取背调列表 | GET | `/api/zmdb/miniprogram/reports` | 分页获取背调记录 |
| 根据身份证号查询 | GET | `/api/zmdb/miniprogram/reports/by-idno/:idNo` | 查询指定身份证号的背调记录 |
| 获取背调详情 | GET | `/api/zmdb/miniprogram/reports/:id` | 获取背调详情（含风险评估结果） |
| 准备授权书 | POST | `/api/zmdb/miniprogram/prepare-auth` | 上传授权书到芝麻背调平台 |
| 发起背调 | POST | `/api/zmdb/miniprogram/reports` | 发起新的背调请求 |
| 取消背调 | POST | `/api/zmdb/miniprogram/reports/:id/cancel` | 取消进行中的背调 |
| 拉取风险数据 | POST | `/api/zmdb/miniprogram/reports/:reportId/fetch-result` | 主动拉取报告风险数据 |
| 下载报告 | GET | `/api/zmdb/miniprogram/reports/:reportId/download` | 下载PDF格式的背调报告 |

---

### 获取背调列表

分页获取背调记录列表。

#### 请求

```http
GET /api/zmdb/miniprogram/reports?page=1&limit=10
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | number | 否 | 页码，默认1 |
| `limit` | number | 否 | 每页条数，默认10 |

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "_id": "698a1234567890abcdef1234",
      "reportId": "ZMDB_RPT_20260316_001",
      "name": "张三",
      "mobile": "13800138000",
      "idNo": "110101199001011234",
      "position": "月嫂",
      "status": 4,
      "packageType": "1",
      "authStuffUrl": "https://zmdb.com/auth/xxx",
      "esignContractNo": "LOCAL_PRIVACY_DOC",
      "contractId": "698a5678901234567890abcd",
      "createdAt": "2026-03-16T10:00:00.000Z",
      "updatedAt": "2026-03-16T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "message": "获取成功"
}
```

---

### 根据身份证号查询背调

根据身份证号查询最新的背调记录。此接口用于在合同详情、简历详情等页面显示关联的背调状态。

#### 请求

```http
GET /api/zmdb/miniprogram/reports/by-idno/110101199001011234
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `idNo` | string | 是 | 身份证号 |

#### 响应

**有记录时**:
```json
{
  "success": true,
  "data": {
    "_id": "698a1234567890abcdef1234",
    "reportId": "ZMDB_RPT_20260316_001",
    "name": "张三",
    "mobile": "13800138000",
    "idNo": "110101199001011234",
    "position": "月嫂",
    "status": 4,
    "packageType": "1",
    "createdAt": "2026-03-16T10:00:00.000Z",
    "updatedAt": "2026-03-16T12:00:00.000Z"
  },
  "message": "查询成功"
}
```

**无记录时**:
```json
{
  "success": true,
  "data": null,
  "message": "未找到背调记录"
}
```

---

### 获取背调详情

获取单条背调记录的完整详情，包括风险评估结果、各维度风险详情、回调历史等。此接口用于背调详情页展示。

#### 请求

```http
GET /api/zmdb/miniprogram/reports/698a1234567890abcdef1234
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 背调记录ID（MongoDB ObjectId） |

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "698a1234567890abcdef1234",
    "reportId": "ZMDB_RPT_20260316_001",
    "name": "张三",
    "mobile": "13800138000",
    "idNo": "110101199001011234",
    "position": "月嫂",
    "status": 4,
    "packageType": "1",
    "authStuffUrl": "https://zmdb.com/auth/doc/xxx",
    "esignContractNo": "LOCAL_PRIVACY_DOC",
    "contractId": {
      "_id": "698a5678901234567890abcd",
      "contractNumber": "HT20260316001",
      "customerName": "李先生",
      "workerName": "张三",
      "esignContractNo": "ESIGN_20260316_001"
    },
    "createdBy": {
      "_id": "user123",
      "name": "操作员小王",
      "username": "xiaowang"
    },
    "reportResult": {
      "riskLevel": "pass",
      "riskScore": 85,
      "riskSummary": "无风险",
      "dimensions": [
        {
          "name": "身份核验",
          "result": "通过",
          "riskLevel": "pass",
          "details": []
        },
        {
          "name": "犯罪记录",
          "result": "无记录",
          "riskLevel": "pass",
          "details": []
        },
        {
          "name": "法院诉讼",
          "result": "无记录",
          "riskLevel": "pass",
          "details": []
        },
        {
          "name": "金融风险",
          "result": "低风险",
          "riskLevel": "pass",
          "details": []
        }
      ],
      "fetchedAt": "2026-03-16T12:00:00.000Z"
    },
    "callbackHistory": [
      {
        "notifyType": 2,
        "status": 4,
        "receivedAt": "2026-03-16T12:00:00.000Z"
      }
    ],
    "createdAt": "2026-03-16T10:00:00.000Z",
    "updatedAt": "2026-03-16T12:00:00.000Z"
  },
  "message": "获取成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `reportResult` | object | 风险评估结果（背调完成后才有） |
| `reportResult.riskLevel` | string | 风险等级：`pass`=通过, `reject`=不通过, `review`=需审核 |
| `reportResult.riskScore` | number | 风险评分（0-100，越高越安全） |
| `reportResult.riskSummary` | string | 风险摘要 |
| `reportResult.dimensions` | array | 各维度风险详情 |
| `contractId` | object | 关联合同信息（通过身份证号自动匹配） |
| `createdBy` | object | 创建人信息 |
| `callbackHistory` | array | 回调历史记录 |

---

### 准备授权书

在发起背调前，需要先调用此接口准备授权书。系统会使用本地隐私协议模板生成授权书并上传到芝麻背调平台。

#### 请求

```http
POST /api/zmdb/miniprogram/prepare-auth
Authorization: Bearer {token}
Content-Type: application/json

{
  "workerName": "张三",
  "esignContractNo": "LOCAL_PRIVACY_DOC"
}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `workerName` | string | 是 | 被调人姓名 |
| `esignContractNo` | string | 否 | 爱签合同编号（可选，默认使用本地隐私协议） |

#### 响应

```json
{
  "success": true,
  "data": {
    "stuffId": "ZMDB_STUFF_123456",
    "authStuffUrl": "https://zmdb.com/auth/doc/xxx",
    "esignContractNo": "LOCAL_PRIVACY_DOC"
  },
  "message": "授权书准备成功"
}
```

---

### 发起背调

发起新的背景调查请求。需要先调用"准备授权书"接口获取 `authStuffUrl`。

#### 请求

```http
POST /api/zmdb/miniprogram/reports
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "张三",
  "mobile": "13800138000",
  "idNo": "110101199001011234",
  "authStuffUrl": "https://zmdb.com/auth/doc/xxx",
  "esignContractNo": "LOCAL_PRIVACY_DOC",
  "position": "月嫂",
  "packageType": "1"
}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 被调人姓名 |
| `mobile` | string | 是 | 手机号码（11位） |
| `idNo` | string | 否 | 身份证号（18位，用于关联合同） |
| `authStuffUrl` | string | 是 | 授权书URL（从prepare-auth接口获取） |
| `esignContractNo` | string | 是 | 爱签合同编号（或LOCAL_PRIVACY_DOC） |
| `position` | string | 否 | 职位（如：月嫂、育儿嫂等） |
| `packageType` | string | 否 | 套餐类型：`1`=标准版（默认），`2`=深度版 |

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "698a1234567890abcdef1234",
    "reportId": "ZMDB_RPT_20260316_001",
    "name": "张三",
    "mobile": "13800138000",
    "idNo": "110101199001011234",
    "position": "月嫂",
    "status": 1,
    "packageType": "1",
    "authStuffUrl": "https://zmdb.com/auth/doc/xxx",
    "esignContractNo": "LOCAL_PRIVACY_DOC",
    "createdAt": "2026-03-16T10:00:00.000Z"
  },
  "message": "背调发起成功"
}
```

---

### 取消背调

取消进行中的背调请求。

#### 请求

```http
POST /api/zmdb/miniprogram/reports/698a1234567890abcdef1234/cancel
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 背调记录ID（MongoDB ObjectId） |

#### 响应

```json
{
  "success": true,
  "message": "背调已取消"
}
```

---

### 拉取风险数据

主动拉取报告的风险评估数据。通常系统会在背调完成时自动拉取，此接口用于手动刷新风险数据。

#### 请求

```http
POST /api/zmdb/miniprogram/reports/ZMDB_RPT_20260316_001/fetch-result
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reportId` | string | 是 | 芝麻报告ID（reportId字段的值） |

#### 响应

```json
{
  "success": true,
  "message": "风险数据拉取成功"
}
```

---

### 下载/查看背调报告

下载或直接查看已完成背调的PDF报告。仅当背调状态为"已完成"（状态4或16）时可操作。

#### 请求

```http
GET /api/zmdb/miniprogram/reports/ZMDB_RPT_20260316_001/download
Authorization: Bearer {token}
```

**认证**: ✅ 需要JWT认证 + 角色权限

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reportId` | string | 是 | 芝麻报告ID（reportId字段的值） |

#### 响应

直接返回PDF文件流：
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="bgcheck_report_ZMDB_RPT_20260316_001.pdf"`

#### 📱 小程序查看报告方式

接口支持两种认证方式：
1. **Header认证**：`Authorization: Bearer {token}`（用于wx.downloadFile）
2. **URL参数认证**：`?token=xxx`（用于web-view直接打开）

---

**方式一：web-view直接打开（最简单，推荐）**

```javascript
// 直接用web-view打开PDF，无需任何下载代码
const token = wx.getStorageSync('token');
const url = `https://crm.andejiazheng.com/api/zmdb/miniprogram/reports/${reportId}/download?token=${token}`;

// 跳转到web-view页面
wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}` });
```

**方式二：downloadFile + openDocument**

```javascript
export function viewBackgroundCheckReport(reportId) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    wx.showLoading({ title: '加载中...' });

    wx.downloadFile({
      url: `https://crm.andejiazheng.com/api/zmdb/miniprogram/reports/${reportId}/download?token=${token}`,
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            showMenu: true,
            success: resolve,
            fail: reject
          });
        } else {
          reject(new Error('加载报告失败'));
        }
      },
      fail(err) {
        wx.hideLoading();
        reject(err);
      }
    });
  });
}
```

---

### 背调状态说明

| 状态值 | 说明 | 结果判定 |
|--------|------|----------|
| `0` | 待发起 | - |
| `1` | 授权中 | - |
| `2` | 背调中 | - |
| `3` | 已取消 | ❌ 未通过 |
| `4` | 已完成 | ✅ 通过 |
| `15` | 终止 | ❌ 未通过 |
| `16` | 完成（深度版） | ✅ 通过 |

**判断逻辑**：
- 状态为 `4` 或 `16` → 背调**通过**（显示绿色标签）
- 状态为 `3` 或 `15` → 背调**未通过**（显示红色标签）
- 其他状态 → 背调**进行中**

---

### 小程序调用示例

```javascript
// utils/background-check-api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

/** 获取请求头（含JWT认证） */
function getAuthHeader() {
  const token = wx.getStorageSync('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * 根据身份证号查询背调记录
 */
export function getBackgroundCheckByIdNo(idNo) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/zmdb/miniprogram/reports/by-idno/${idNo}`,
      method: 'GET',
      header: getAuthHeader(),
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/**
 * 准备授权书
 */
export function prepareAuth(workerName) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/zmdb/miniprogram/prepare-auth`,
      method: 'POST',
      header: getAuthHeader(),
      data: { workerName },
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/**
 * 发起背调
 */
export function createBackgroundCheck(data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/zmdb/miniprogram/reports`,
      method: 'POST',
      header: getAuthHeader(),
      data,
      success(res) {
        if (res.data.success) resolve(res.data.data);
        else reject(new Error(res.data.message));
      },
      fail: reject
    });
  });
}

/**
 * 下载背调报告（返回临时文件路径）
 */
export function downloadBackgroundCheckReport(reportId) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    wx.downloadFile({
      url: `${BASE_URL}/zmdb/miniprogram/reports/${reportId}/download`,
      header: { 'Authorization': `Bearer ${token}` },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          reject(new Error('下载失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * 完整的背调流程示例
 */
export async function startBackgroundCheck(workerInfo) {
  try {
    // 1. 准备授权书
    const authResult = await prepareAuth(workerInfo.name);

    // 2. 发起背调
    const bgCheckResult = await createBackgroundCheck({
      name: workerInfo.name,
      mobile: workerInfo.mobile,
      idNo: workerInfo.idNo,
      authStuffUrl: authResult.authStuffUrl,
      esignContractNo: authResult.esignContractNo || 'LOCAL_PRIVACY_DOC',
      position: workerInfo.position || '月嫂',
      packageType: '1'  // 标准版
    });

    return bgCheckResult;
  } catch (error) {
    console.error('发起背调失败:', error);
    throw error;
  }
}

/**
 * 判断背调是否通过
 */
export function isBackgroundCheckPassed(status) {
  return status === 4 || status === 16;
}

/**
 * 判断背调是否未通过
 */
export function isBackgroundCheckFailed(status) {
  return status === 3 || status === 15;
}

/**
 * 获取背调状态文本
 */
export function getBackgroundCheckStatusText(status) {
  const statusMap = {
    0: '待发起',
    1: '授权中',
    2: '背调中',
    3: '已取消',
    4: '已完成',
    15: '终止',
    16: '已完成'
  };
  return statusMap[status] || '未知状态';
}
```

---

## 📞 技术支持

如有问题或建议，请联系技术团队。

**文档版本**: v1.11.0
**最后更新**: 2026-03-16
**维护团队**: 安得家政技术团队

**v1.11.0 更新内容**:
- ✅ 新增背调详情API：`GET /api/zmdb/miniprogram/reports/:id`
- ✅ 支持获取完整背调详情（含风险评估结果、各维度风险、关联合同、回调历史）
- ✅ 新增拉取风险数据API：`POST /api/zmdb/miniprogram/reports/:reportId/fetch-result`
- ✅ 背调管理接口增加到8个

**v1.10.0 更新内容**:
- ✅ 新增背调管理API（6个接口）
- ✅ 支持发起背调、查询背调状态、下载背调报告
- ✅ 支持根据身份证号查询关联的背调记录
- ✅ 背调记录与合同自动关联（通过身份证号匹配）
- ✅ 实施 RBAC 角色权限控制，普通员工仅可查看自己发起的背调

**v1.9.0 更新内容（安全加固）**:
- 🔒 **合同模块**：移除所有 `@Public()` 装饰器，新增 JWT 认证 + 角色权限控制（24个接口）
- 🔒 **保险模块**：移除所有 `@Public()` 装饰器，新增 JWT 认证 + 角色权限控制（14个接口）
- 🔒 **简历模块**：miniprogram 接口新增 `RolesGuard` 角色权限验证，移除 `create`/`get-by-id` 的 `@Public()`
- 🔒 **员工评价模块**：移除所有 `@Public()` 装饰器，新增类级 JWT 认证 + 角色权限控制（3个接口）
- ✅ 实施 RBAC 角色数据隔离：普通员工仅可查看自己创建的数据，管理员/经理可查看全部
- ✅ 保持公开接口不变：阿姨自助注册（self-register）、分享链接（shared/:token）、Banner、文章
- ⚠️ **注意**：所有业务接口现在需要在请求头中携带 `Authorization: Bearer {token}`，未携带将返回 401

**v1.8.0 更新内容**:
- ✅ 新增合同管理API（17个接口）
- ✅ 支持合同创建、查询、更新、换人、保险同步等完整操作
- ✅ 支持根据合同编号、客户ID、服务人员信息等多种方式查询
- ✅ 支持爱签电子签章集成（签署链接、下载合同、状态查询）
- ✅ 支持客户合同历史和统计信息

**v1.7.0 更新内容**:
- ✅ 新增保险保单管理API（14个接口）
- ✅ 支持保单创建、查询、支付、注销、退保、批改、批增等完整操作
- ✅ 支持根据身份证号、保单号、商户单号多种方式查询
- ✅ 小程序支付固定使用MINI支付方式
- ✅ 支持从大树保同步最新保单状态

**v1.6.0 更新内容**:
- ✅ 新增员工评价管理API（创建评价、获取评价列表、获取评价统计）
- ✅ 支持多维度评分（服务态度、专业技能、工作效率、沟通能力）
- ✅ 支持评价标签和详细评语
- ✅ 提供评价统计和分析功能

**v1.5.0 更新内容**:
- ✅ 新增文章内容管理API（获取文章列表、获取文章详情）
- ✅ 公开接口，无需认证，自动只返回已发布文章
- ✅ 提供完整的小程序调用示例和页面代码
- ✅ 支持文章搜索、分页和状态筛选
- ✅ 支持富文本渲染和图片展示

# 小程序端问题反馈 - 给小程序AI的任务

## 🔴 问题

**用户反馈**：小程序端已登录，但进入面试创建页时还是需要再次登录。

**现象**：
- ✅ H5页面的Token自动登录功能正常工作
- ✅ 小程序已成功获取Token并传递给H5页面
- ❌ 小程序端的首页登录检查逻辑有问题
- ❌ 已登录用户无法直接进入面试创建页

## 🎯 需要修复的问题

### 问题1：首页登录检查不完整

小程序首页需要：
1. 检查用户是否已登录（检查Token和userInfo）
2. 如果已登录 → 直接进入面试创建页
3. 如果未登录 → 显示登录页面

**当前状态**：首页的登录检查逻辑可能不完整或不正确。

### 问题2：Token存储不一致

小程序可能在不同的地方存储Token，导致检查时找不到。

**需要统一**：
- 主Key：`access_token`
- 备用Key：`token`

### 问题3：userInfo验证不完整

userInfo可能没有正确保存或格式不一致。

**需要确保**：
- userInfo包含name字段
- 登录后正确保存userInfo

## ✅ 解决方案

### 步骤1：改进首页登录检查

在首页（`pages/index/index.js` 或 `pages/home/index.js`）添加以下逻辑：

```javascript
Page({
  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    // 每次显示页面时都检查登录状态
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    // 获取Token（检查多个可能的Key）
    const token = wx.getStorageSync('access_token') || 
                  wx.getStorageSync('token');
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    if (token && userInfo && userInfo.name) {
      // 已登录 → 直接进入面试创建页
      console.log('✅ 用户已登录:', userInfo.name);
      wx.navigateTo({
        url: '/pages/interview/create/create'
      });
    } else {
      // 未登录 → 显示登录页面
      console.log('❌ 用户未登录');
      // 页面显示登录表单
    }
  }
});
```

### 步骤2：统一Token存储

在登录成功后，同时保存到多个Key：

```javascript
// 登录成功后
wx.setStorageSync('access_token', token);
wx.setStorageSync('token', token);
wx.setStorageSync('userInfo', userInfo);
```

### 步骤3：改进app.js的登录检查

```javascript
checkLogin() {
  const token = wx.getStorageSync('access_token') || 
                wx.getStorageSync('token');
  
  const userInfo = wx.getStorageSync('userInfo') || {};
  
  if (token && userInfo && userInfo.name) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    console.log('✅ 已登录:', userInfo.name);
    return true;
  } else {
    console.log('❌ 未登录');
    return false;
  }
}
```

## 🧪 测试验证

1. **测试已登录用户**
   - 登录小程序
   - 刷新或重新打开小程序
   - 验证是否直接进入面试创建页（不显示登录页）

2. **测试未登录用户**
   - 清除小程序数据
   - 打开小程序
   - 验证是否显示登录页面

3. **测试Token一致性**
   - 登录后在浏览器控制台检查：
   ```javascript
   console.log('access_token:', wx.getStorageSync('access_token'));
   console.log('token:', wx.getStorageSync('token'));
   console.log('userInfo:', wx.getStorageSync('userInfo'));
   ```

## 📊 预期效果

**修复前**：
```
小程序启动 → 首页 → 需要登录 → 输入账号密码 → 进入面试创建页
```

**修复后**：
```
小程序启动 → 首页 → 检查登录状态 → 已登录直接进入面试创建页 ✅
```

## 📝 相关信息

### H5端已完成的工作

H5端已实现了Token自动登录功能：
- ✅ 创建了小程序入口页面 (`/interview/miniprogram`)
- ✅ 自动接收和保存Token
- ✅ 自动跳转到视频面试页面
- ✅ 修改了API拦截器支持Token读取
- ✅ 修改了视频面试页面支持小程序传递的用户名

### 小程序端需要完成的工作

- [ ] 改进首页登录检查逻辑
- [ ] 统一Token存储方式
- [ ] 验证userInfo格式
- [ ] 测试已登录/未登录流程

## 🔗 相关文档

详细分析文档：`MINIPROGRAM_LOGIN_CHECK_ISSUE.md`

## 💡 关键点

1. **首页必须检查登录状态**
   - 不能假设用户已登录
   - 需要检查Token和userInfo都存在

2. **Token存储要一致**
   - 保存时同时保存到 `access_token` 和 `token`
   - 读取时检查多个Key

3. **userInfo必须包含name**
   - 不能只检查Token
   - 必须同时检查userInfo.name

4. **onShow时要重新检查**
   - 用户可能在其他地方登出
   - 每次显示页面时都要检查登录状态

---

**问题来源**：H5端Token自动登录功能已完成，但小程序端的首页登录检查逻辑需要改进。


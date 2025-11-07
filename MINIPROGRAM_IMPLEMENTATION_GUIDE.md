# 小程序端实施指南

## 🎯 目标

在微信小程序中集成视频面试功能，通过 WebView 加载 H5 页面，完全避免"非微信官方网页"警告。

---

## 📋 前置条件检查

- [x] 微信小程序已上线
- [x] 业务域名已配置：`crm.andejiazheng.com`
- [x] 校验文件已上传并验证成功
- [x] H5 页面已支持小程序环境

---

## 🚀 实施步骤

### 步骤1：复制页面文件

将以下4个文件复制到您的小程序项目中：

```
您的小程序项目根目录/
├── pages/
│   └── interview/
│       ├── interview.wxml    ← 从 miniprogram-pages/interview/interview.wxml 复制
│       ├── interview.js      ← 从 miniprogram-pages/interview/interview.js 复制
│       ├── interview.json    ← 从 miniprogram-pages/interview/interview.json 复制
│       └── interview.wxss    ← 从 miniprogram-pages/interview/interview.wxss 复制
```

**文件内容**：

#### 1. `pages/interview/interview.wxml`
```xml
<!--
  视频面试页面
  使用 WebView 加载 H5 视频面试页面
-->
<web-view 
  src="{{webviewUrl}}" 
  bindmessage="handleMessage"
  binderror="handleError"
  bindload="handleLoad"
></web-view>
```

#### 2. `pages/interview/interview.js`
```javascript
// pages/interview/interview.js
Page({
  data: {
    webviewUrl: '',
    roomId: ''
  },

  onLoad(options) {
    console.log('📱 视频面试页面加载', options);
    
    // 获取房间ID
    const roomId = options.roomId || '';
    
    if (!roomId) {
      wx.showModal({
        title: '提示',
        content: '缺少房间ID参数',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    // 构建 WebView URL - 使用HR主持人移动端页面
    const baseUrl = 'https://crm.andejiazheng.com';
    const webviewUrl = `${baseUrl}/interview/video-mobile/${roomId}`;

    console.log('🔗 WebView URL:', webviewUrl);
    
    this.setData({
      webviewUrl,
      roomId
    });
  },

  // 处理来自 H5 的消息
  handleMessage(e) {
    console.log('📨 收到 H5 消息:', e.detail.data);
    
    const messages = e.detail.data;
    if (!messages || messages.length === 0) return;

    // 获取最后一条消息
    const lastMessage = messages[messages.length - 1];
    
    switch (lastMessage.type) {
      case 'joined':
        console.log('✅ 用户已加入房间');
        // 可以在这里记录用户行为
        break;
        
      case 'leave':
        console.log('👋 用户离开房间');
        // 返回上一页或首页
        wx.showModal({
          title: '提示',
          content: '视频面试已结束',
          showCancel: false,
          success: () => {
            wx.navigateBack({
              fail: () => {
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }
            });
          }
        });
        break;
        
      case 'error':
        console.error('❌ H5 页面错误:', lastMessage.message);
        wx.showToast({
          title: lastMessage.message || '操作失败',
          icon: 'none',
          duration: 2000
        });
        break;
        
      default:
        console.log('📬 其他消息:', lastMessage);
    }
  },

  // 处理 WebView 加载错误
  handleError(e) {
    console.error('❌ WebView 加载失败:', e.detail);
    
    wx.showModal({
      title: '加载失败',
      content: '视频面试页面加载失败，请检查网络连接后重试',
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          // 重新加载
          const { roomId } = this.data;
          const baseUrl = 'https://crm.andejiazheng.com';
          const webviewUrl = `${baseUrl}/interview/join-mobile/${roomId}`;
          this.setData({ webviewUrl });
        } else {
          // 返回上一页
          wx.navigateBack();
        }
      }
    });
  },

  // 处理 WebView 加载完成
  handleLoad(e) {
    console.log('✅ WebView 加载完成');
  },

  onUnload() {
    console.log('📱 视频面试页面卸载');
  }
});
```

#### 3. `pages/interview/interview.json`
```json
{
  "navigationBarTitleText": "视频面试",
  "navigationBarBackgroundColor": "#1890ff",
  "navigationBarTextStyle": "white",
  "disableScroll": true,
  "enablePullDownRefresh": false
}
```

#### 4. `pages/interview/interview.wxss`
```css
/* pages/interview/interview.wxss */
page {
  width: 100%;
  height: 100%;
  background-color: #000;
}

web-view {
  width: 100%;
  height: 100%;
}
```

---

### 步骤2：注册页面

编辑小程序根目录的 `app.json`，在 `pages` 数组中添加新页面：

```json
{
  "pages": [
    "pages/index/index",
    "pages/interview/interview"
  ],
  "window": {
    "navigationBarTitleText": "安得家政",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black"
  }
}
```

**注意**：
- 将 `"pages/interview/interview"` 添加到 `pages` 数组中
- 不要放在第一个位置（除非您想让它成为首页）

---

### 步骤3：创建入口（可选）

#### 方法A：在首页添加按钮

编辑 `pages/index/index.wxml`：

```xml
<!-- 添加视频面试入口 -->
<view class="interview-entry">
  <button type="primary" bindtap="goToInterview">
    进入视频面试
  </button>
</view>
```

编辑 `pages/index/index.js`：

```javascript
Page({
  // ... 其他代码

  goToInterview() {
    // 这里的 roomId 应该从服务器获取或通过其他方式传入
    const roomId = 'test_room_123'; // 测试用
    
    wx.navigateTo({
      url: `/pages/interview/interview?roomId=${roomId}`
    });
  }
});
```

#### 方法B：添加分享功能

在 `pages/interview/interview.js` 中添加：

```javascript
Page({
  // ... 其他代码

  // 分享给好友
  onShareAppMessage() {
    const { roomId } = this.data;
    return {
      title: '视频面试邀请',
      path: `/pages/interview/interview?roomId=${roomId}`,
      imageUrl: '/images/share-cover.png' // 可选：分享图片
    };
  },

  // 分享到朋友圈（需要开通权限）
  onShareTimeline() {
    const { roomId } = this.data;
    return {
      title: '视频面试邀请',
      query: `roomId=${roomId}`,
      imageUrl: '/images/share-cover.png' // 可选：分享图片
    };
  }
});
```

#### 方法C：生成小程序码（推荐）

在服务端调用微信 API 生成小程序码，用户扫码直接进入。

---

### 步骤4：测试

#### 4.1 在开发工具中测试

1. 打开微信开发者工具
2. 在模拟器中访问：`pages/interview/interview?roomId=test_room_123`
3. 检查 WebView 是否正常加载
4. 检查控制台日志

#### 4.2 真机测试

1. 点击开发工具的"预览"按钮
2. 生成二维码
3. 用微信扫码
4. 在真机上测试完整流程：
   - 进入页面
   - 填写姓名和身份
   - 加入视频通话
   - 测试音视频功能
   - 挂断并返回

#### 4.3 测试检查清单

- [ ] WebView 能正常加载 H5 页面
- [ ] 没有"非官方网页"警告
- [ ] 能正常填写姓名和选择身份
- [ ] 能正常加入视频通话
- [ ] 音视频功能正常
- [ ] 挂断后能正常返回小程序
- [ ] 分享功能正常（如果添加了）

---

### 步骤5：上传发布

#### 5.1 上传代码

1. 在微信开发者工具中点击"上传"
2. 填写版本号（例如：`1.0.1`）
3. 填写项目备注（例如：`添加视频面试功能`）
4. 点击"上传"

#### 5.2 提交审核

1. 登录微信小程序后台：https://mp.weixin.qq.com/
2. 进入"版本管理"
3. 找到刚上传的版本
4. 点击"提交审核"
5. 填写审核信息：

**功能页面**：
```
pages/interview/interview
```

**功能描述**：
```
视频面试功能，用于家政人员远程面试。
HR 可以通过 CRM 系统创建视频面试房间，生成邀请链接或小程序路径，
求职者通过小程序进入视频面试，支持多人视频通话。
```

**测试账号**（如果需要）：
```
提供一个测试账号和密码，以及测试流程说明
```

**注意事项**：
- 详细说明业务场景
- 强调是企业内部使用
- 说明涉及的权限（摄像头、麦克风）的使用场景

#### 5.3 等待审核

- 通常 1-3 个工作日会有审核结果
- 可以在小程序后台查看审核进度
- 如果被拒，根据拒绝原因修改后重新提交

#### 5.4 发布上线

审核通过后：
1. 进入"版本管理"
2. 点击"发布"按钮
3. 确认发布

---

## 🎯 使用方式

### 方式1：HR 端分享小程序路径

1. HR 在 CRM 系统中创建视频面试房间
2. 点击"邀请他人"
3. 复制"小程序路径"：`pages/interview/interview?roomId=xxx`
4. 将路径发送给求职者
5. 求职者在小程序中使用 `wx.navigateTo` 跳转

### 方式2：生成小程序码

1. HR 在 CRM 系统中创建视频面试房间
2. 系统调用微信 API 生成小程序码
3. 将小程序码发送给求职者
4. 求职者扫码直接进入视频面试

### 方式3：分享小程序卡片

1. HR 在小程序中进入视频面试页面
2. 点击右上角"..."
3. 选择"转发"
4. 发送给求职者
5. 求职者点击卡片直接进入

---

## 🔧 常见问题

### Q1：WebView 加载失败

**原因**：
- 业务域名配置错误
- 网络问题
- H5 页面不存在

**解决方案**：
1. 检查业务域名配置
2. 检查校验文件是否可访问
3. 检查 H5 页面 URL 是否正确
4. 查看控制台错误日志

### Q2：没有声音或视频

**原因**：
- 权限未授权
- ZEGO SDK 初始化失败

**解决方案**：
1. 在小程序中添加权限申请
2. 检查 ZEGO 配置
3. 查看控制台错误日志

### Q3：无法返回小程序

**原因**：
- H5 页面未正确发送消息
- 小程序未正确处理消息

**解决方案**：
1. 检查 H5 页面的 `postMessage` 调用
2. 检查小程序的 `handleMessage` 方法
3. 查看控制台日志

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 具体的错误信息
2. 控制台日志
3. 操作步骤
4. 截图或录屏

---

## ✅ 完成检查清单

- [ ] 复制4个页面文件到小程序项目
- [ ] 在 app.json 中注册页面
- [ ] 在开发工具中测试
- [ ] 真机测试
- [ ] 上传代码
- [ ] 提交审核
- [ ] 审核通过
- [ ] 发布上线
- [ ] 用户测试

---

## 🎉 预期效果

完成后，用户体验：

```
用户打开小程序
    ↓
扫码/点击分享卡片/点击按钮
    ↓
✅ 直接进入视频面试页面
    ↓
✅ 完全没有"非官方网页"警告
    ↓
填写姓名和身份
    ↓
加入视频通话
    ↓
视频面试进行中
    ↓
点击挂断
    ↓
自动返回小程序
```

**完美！无任何警告！** 🎊


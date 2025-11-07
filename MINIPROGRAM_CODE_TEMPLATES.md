# 📱 小程序视频面试 - 完整代码模板

## 📁 目录结构

```
miniprogram/
├── pages/
│   ├── interview/
│   │   ├── create/          # 创建面试房间
│   │   ├── host/            # HR主持人视频页面
│   │   ├── guest/           # 访客加入页面
│   │   └── video/           # 访客视频页面
│   └── index/               # 首页
├── utils/
│   ├── api.js               # API封装
│   └── util.js              # 工具函数
├── app.js
├── app.json
└── app.wxss
```

---

## 1️⃣ 创建面试间页面

### pages/interview/create/create.wxml

```xml
<view class="container">
  <view class="header">
    <image class="icon" src="/images/video-icon.png" mode="aspectFit"></image>
    <text class="title">视频面试</text>
    <text class="subtitle">支持 3-6 人视频面试，内置美颜、屏幕共享、聊天等功能</text>
  </view>

  <!-- 用户信息卡片 -->
  <view class="user-card">
    <view class="user-avatar">
      <text class="avatar-text">{{userName ? userName.substring(0, 1) : 'HR'}}</text>
    </view>
    <view class="user-info">
      <text class="user-name">{{userName || '加载中...'}}</text>
      <text class="user-role">面试官</text>
    </view>
  </view>

  <!-- 操作按钮 -->
  <view class="actions">
    <button class="btn-primary" bindtap="createInterview" disabled="{{!userName}}">
      <text class="btn-icon">📹</text>
      <text class="btn-text">创建面试间</text>
    </button>

    <button class="btn-secondary" bindtap="rejoinInterview" disabled="{{!lastRoomId}}" wx:if="{{lastRoomId}}">
      <text class="btn-icon">🔄</text>
      <text class="btn-text">重新进入</text>
    </button>
  </view>

  <!-- 功能说明 -->
  <view class="features">
    <view class="feature-title">功能说明</view>
    <view class="feature-item">
      <text class="feature-icon">✅</text>
      <text class="feature-text">支持 3-6 人同时视频面试</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">✅</text>
      <text class="feature-text">内置美颜功能（点击设置按钮调节）</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">✅</text>
      <text class="feature-text">支持屏幕共享（可展示简历）</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">✅</text>
      <text class="feature-text">支持文字聊天</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">✅</text>
      <text class="feature-text">支持查看成员列表</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">✅</text>
      <text class="feature-text">支持踢出成员（房主权限）</text>
    </view>
  </view>
</view>
```

### pages/interview/create/create.js

```javascript
const app = getApp();
const api = require('../../../utils/api.js');
const util = require('../../../utils/util.js');

Page({
  data: {
    userName: '',      // 当前用户名称
    lastRoomId: ''     // 上次的房间号（用于重新进入）
  },

  onLoad() {
    this.loadUserInfo();
    this.loadLastRoom();
  },

  onShow() {
    // 每次显示页面时刷新用户信息
    this.loadUserInfo();
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      // 从本地缓存读取
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.name) {
        this.setData({ userName: userInfo.name });
        return;
      }

      // 如果本地没有，从服务器获取
      util.showLoading('加载中...');
      const res = await api.request('/user/info', 'GET');
      util.hideLoading();

      if (res.success && res.data) {
        const userName = res.data.name || res.data.realName || res.data.username;
        this.setData({ userName });
        // 保存到本地
        wx.setStorageSync('userInfo', { name: userName });
      }
    } catch (error) {
      util.hideLoading();
      console.error('加载用户信息失败:', error);
      wx.showModal({
        title: '提示',
        content: '获取用户信息失败，请重新登录',
        showCancel: false
      });
    }
  },

  // 加载上次的房间信息
  loadLastRoom() {
    const lastRoomId = wx.getStorageSync('lastRoomId');
    if (lastRoomId) {
      this.setData({ lastRoomId });
    }
  },

  // 创建面试间
  async createInterview() {
    const { userName } = this.data;
    if (!userName) {
      wx.showToast({ title: '用户信息加载中，请稍候', icon: 'none' });
      return;
    }

    // 自动生成房间号
    const roomId = util.generateRoomId();

    util.showLoading('创建面试间...');
    try {
      const res = await api.createRoom({
        roomId,
        roomName: `${userName}的面试间`,
        hostName: userName
      });

      util.hideLoading();

      if (res.success) {
        // 保存房间号，用于重新进入
        wx.setStorageSync('lastRoomId', roomId);

        // 进入面试间
        wx.navigateTo({
          url: `/pages/interview/host/host?roomId=${roomId}&userName=${encodeURIComponent(userName)}`
        });
      } else {
        throw new Error(res.message || '创建面试间失败');
      }
    } catch (error) {
      util.hideLoading();
      wx.showModal({
        title: '创建失败',
        content: error.message || '创建面试间失败，请重试',
        showCancel: false
      });
    }
  },

  // 重新进入上次的面试间
  async rejoinInterview() {
    const { lastRoomId, userName } = this.data;
    if (!lastRoomId) {
      wx.showToast({ title: '没有可重新进入的面试间', icon: 'none' });
      return;
    }

    util.showLoading('进入面试间...');
    try {
      // 检查房间是否还存在
      const res = await api.getRoomInfo(lastRoomId);
      util.hideLoading();

      if (res.success && res.data) {
        // 房间存在，直接进入
        wx.navigateTo({
          url: `/pages/interview/host/host?roomId=${lastRoomId}&userName=${encodeURIComponent(userName)}`
        });
      } else {
        // 房间不存在
        wx.showModal({
          title: '提示',
          content: '该面试间已结束，请创建新的面试间',
          showCancel: false,
          success: () => {
            // 清除保存的房间号
            wx.removeStorageSync('lastRoomId');
            this.setData({ lastRoomId: '' });
          }
        });
      }
    } catch (error) {
      util.hideLoading();
      wx.showModal({
        title: '进入失败',
        content: error.message || '进入面试间失败，请重试',
        showCancel: false
      });
    }
  }
});
```

### pages/interview/create/create.wxss

```css
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #5DBFB3 0%, #4AA89E 100%);
  padding: 40rpx;
  box-sizing: border-box;
}

/* 头部 */
.header {
  text-align: center;
  padding: 60rpx 0 40rpx;
}

.icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 36rpx;
  padding: 0 40rpx;
}

/* 用户信息卡片 */
.user-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #5DBFB3 0%, #4AA89E 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 40rpx;
  color: #fff;
  font-weight: bold;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.user-role {
  font-size: 24rpx;
  color: #999;
}

/* 操作按钮 */
.actions {
  margin-bottom: 32rpx;
}

.btn-primary,
.btn-secondary {
  width: 100%;
  height: 96rpx;
  border: none;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.btn-primary {
  background: #fff;
  color: #5DBFB3;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.btn-primary[disabled] {
  background: rgba(255, 255, 255, 0.5);
  color: rgba(93, 191, 179, 0.5);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
}

.btn-secondary[disabled] {
  opacity: 0.5;
}

.btn-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.btn-text {
  font-size: 32rpx;
}

/* 功能说明 */
.features {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 24rpx;
  padding: 32rpx;
  backdrop-filter: blur(10rpx);
}

.feature-title {
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
  margin-bottom: 24rpx;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.feature-item:last-child {
  margin-bottom: 0;
}

.feature-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  line-height: 40rpx;
}

.feature-text {
  flex: 1;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.95);
  line-height: 40rpx;
}
```

### pages/interview/create/create.json

```json
{
  "navigationBarTitleText": "创建面试",
  "navigationBarBackgroundColor": "#5DBFB3",
  "navigationBarTextStyle": "white"
}
```

---

## 2️⃣ HR主持人视频页面

### pages/interview/host/host.wxml

```xml
<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>
```

### pages/interview/host/host.js

```javascript
Page({
  data: {
    webviewUrl: '',
    roomId: '',
    userName: ''
  },

  onLoad(options) {
    console.log('📱 主持人页面加载', options);
    
    const { roomId, userName } = options;
    
    if (!roomId || !userName) {
      wx.showModal({
        title: '提示',
        content: '缺少必要参数',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    // 构建 WebView URL - 主持人H5页面
    const baseUrl = 'https://crm.andejiazheng.com';
    const webviewUrl = `${baseUrl}/interview/video-mobile/${roomId}?userName=${encodeURIComponent(userName)}`;
    
    console.log('🔗 WebView URL:', webviewUrl);
    
    this.setData({
      webviewUrl,
      roomId,
      userName
    });
  },

  // 处理来自 H5 的消息
  handleMessage(e) {
    console.log('📥 收到H5消息:', e.detail.data);
    
    const messages = e.detail.data;
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.type === 'leave') {
        // 主持人离开房间
        wx.showModal({
          title: '提示',
          content: '面试已结束',
          showCancel: false,
          success: () => {
            wx.navigateBack({ delta: 2 }); // 返回到首页
          }
        });
      }
    }
  },

  // 分享给访客
  onShareAppMessage() {
    return {
      title: '视频面试邀请',
      path: `/pages/interview/guest/guest?roomId=${this.data.roomId}`,
      imageUrl: '/images/interview-share.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '视频面试邀请',
      query: `roomId=${this.data.roomId}`,
      imageUrl: '/images/interview-share.png'
    };
  }
});
```

### pages/interview/host/host.wxss

```css
page {
  width: 100%;
  height: 100%;
}
```

### pages/interview/host/host.json

```json
{
  "navigationBarTitleText": "视频面试",
  "navigationBarBackgroundColor": "#5DBFB3",
  "navigationBarTextStyle": "white",
  "disableScroll": true
}
```

---

## 3️⃣ 访客加入页面

### pages/interview/guest/guest.wxml

```xml
<view class="container">
  <view class="header">
    <image class="icon" src="/images/video-icon.png" mode="aspectFit"></image>
    <text class="title">加入视频面试</text>
  </view>

  <view class="room-info">
    <text class="room-label">房间号</text>
    <text class="room-id">{{roomId}}</text>
  </view>

  <view class="form">
    <!-- 姓名 -->
    <view class="form-item">
      <view class="label">
        <text class="required">*</text> 您的姓名
      </view>
      <input 
        class="input" 
        value="{{userName}}" 
        bindinput="onUserNameInput"
        placeholder="请输入您的姓名"
      />
    </view>

    <!-- 身份 -->
    <view class="form-item">
      <view class="label">
        <text class="required">*</text> 您的身份
      </view>
      <picker 
        mode="selector" 
        range="{{identityList}}" 
        value="{{identityIndex}}"
        bindchange="onIdentityChange"
      >
        <view class="picker">
          {{identityIndex >= 0 ? identityList[identityIndex] : '请选择您的身份'}}
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 加入面试按钮 -->
    <button 
      class="btn-primary" 
      bindtap="joinInterview"
      disabled="{{!userName || identityIndex < 0}}"
    >
      ✅ 加入面试
    </button>
  </view>

  <!-- 温馨提示 -->
  <view class="tips">
    <view class="tips-title">💡 温馨提示</view>
    <view class="tips-item">• 请确保网络连接稳定</view>
    <view class="tips-item">• 请允许访问摄像头和麦克风</view>
    <view class="tips-item">• 建议使用耳机以获得更好的音质</view>
  </view>
</view>
```

### pages/interview/guest/guest.js

```javascript
const api = require('../../../utils/api.js');

Page({
  data: {
    roomId: '',
    userName: '',
    identityList: ['求职者', '家政人员', '其他'],
    identityIndex: -1
  },

  onLoad(options) {
    console.log('📱 访客加入页面加载', options);
    
    const { roomId } = options;
    
    if (!roomId) {
      wx.showModal({
        title: '提示',
        content: '缺少房间号参数',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/index/index' });
        }
      });
      return;
    }

    this.setData({ roomId });
    
    // 检查房间是否存在
    this.checkRoom();
  },

  // 检查房间状态
  async checkRoom() {
    try {
      const res = await api.getRoomInfo(this.data.roomId);
      if (!res.success || res.data.status !== 'active') {
        wx.showModal({
          title: '提示',
          content: '房间不存在或已结束',
          showCancel: false,
          success: () => {
            wx.switchTab({ url: '/pages/index/index' });
          }
        });
      }
    } catch (error) {
      console.error('检查房间失败:', error);
    }
  },

  // 输入姓名
  onUserNameInput(e) {
    this.setData({
      userName: e.detail.value
    });
  },

  // 选择身份
  onIdentityChange(e) {
    this.setData({
      identityIndex: parseInt(e.detail.value)
    });
  },

  // 加入面试
  joinInterview() {
    const { roomId, userName, identityList, identityIndex } = this.data;

    if (!userName) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }

    if (identityIndex < 0) {
      wx.showToast({
        title: '请选择身份',
        icon: 'none'
      });
      return;
    }

    const identity = identityList[identityIndex];

    // 跳转到访客视频页面
    wx.navigateTo({
      url: `/pages/interview/video/video?roomId=${roomId}&userName=${encodeURIComponent(userName)}&identity=${encodeURIComponent(identity)}`
    });
  }
});
```

### pages/interview/guest/guest.wxss

```css
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #5DBFB3 0%, #4A9D93 100%);
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
}

.room-info {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  text-align: center;
}

.room-label {
  display: block;
  font-size: 24rpx;
  color: #fff;
  opacity: 0.8;
  margin-bottom: 8rpx;
}

.room-id {
  display: block;
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}

.form {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 32rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.required {
  color: #ff4d4f;
  margin-right: 4rpx;
}

.input {
  width: 100%;
  height: 88rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker {
  width: 100%;
  height: 88rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #333;
}

.arrow {
  color: #999;
  font-size: 24rpx;
}

.btn-primary {
  width: 100%;
  height: 96rpx;
  background: #5DBFB3;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 40rpx;
}

.btn-primary[disabled] {
  background: #ccc;
}

.tips {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-top: 40rpx;
}

.tips-title {
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.tips-item {
  font-size: 24rpx;
  color: #fff;
  line-height: 40rpx;
  opacity: 0.9;
}
```

### pages/interview/guest/guest.json

```json
{
  "navigationBarTitleText": "加入面试",
  "navigationBarBackgroundColor": "#5DBFB3",
  "navigationBarTextStyle": "white"
}
```

---

## 📄 下一部分

由于内容较多，我将在下一个文件中继续提供：
- 访客视频页面代码
- 工具函数代码
- API封装代码
- app.js/app.json配置

请查看 `MINIPROGRAM_CODE_TEMPLATES_PART2.md`


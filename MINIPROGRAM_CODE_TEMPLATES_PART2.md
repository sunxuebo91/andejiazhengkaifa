# 📱 小程序视频面试 - 完整代码模板（第2部分）

## 4️⃣ 访客视频页面

### pages/interview/video/video.wxml

```xml
<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>
```

### pages/interview/video/video.js

```javascript
Page({
  data: {
    webviewUrl: '',
    roomId: '',
    userName: '',
    identity: ''
  },

  onLoad(options) {
    console.log('📱 访客视频页面加载', options);
    
    const { roomId, userName, identity } = options;
    
    if (!roomId || !userName || !identity) {
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

    // 构建 WebView URL - 访客H5页面
    const baseUrl = 'https://crm.andejiazheng.com';
    const webviewUrl = `${baseUrl}/interview/join-mobile/${roomId}?userName=${encodeURIComponent(userName)}&identity=${encodeURIComponent(identity)}`;
    
    console.log('🔗 WebView URL:', webviewUrl);
    
    this.setData({
      webviewUrl,
      roomId,
      userName,
      identity
    });
  },

  // 处理来自 H5 的消息
  handleMessage(e) {
    console.log('📥 收到H5消息:', e.detail.data);
    
    const messages = e.detail.data;
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.type === 'leave') {
        // 访客离开房间
        wx.showModal({
          title: '提示',
          content: '面试已结束，感谢您的参与',
          showCancel: false,
          success: () => {
            wx.navigateBack({ delta: 2 }); // 返回到首页
          }
        });
      } else if (lastMessage.type === 'kicked') {
        // 被踢出房间
        wx.showModal({
          title: '提示',
          content: '您已被移出房间',
          showCancel: false,
          success: () => {
            wx.navigateBack({ delta: 2 });
          }
        });
      }
    }
  }
});
```

### pages/interview/video/video.wxss

```css
page {
  width: 100%;
  height: 100%;
}
```

### pages/interview/video/video.json

```json
{
  "navigationBarTitleText": "视频面试",
  "navigationBarBackgroundColor": "#5DBFB3",
  "navigationBarTextStyle": "white",
  "disableScroll": true
}
```

---

## 5️⃣ 工具函数

### utils/util.js

```javascript
/**
 * 生成房间号
 * 格式：room_时间戳_随机字符串
 */
function generateRoomId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `room_${timestamp}_${random}`;
}

/**
 * 格式化时间
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`;
}

function formatNumber(n) {
  n = n.toString();
  return n[1] ? n : `0${n}`;
}

/**
 * 显示加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示成功提示
 */
function showSuccess(title) {
  wx.showToast({
    title,
    icon: 'success',
    duration: 2000
  });
}

/**
 * 显示错误提示
 */
function showError(title) {
  wx.showToast({
    title,
    icon: 'none',
    duration: 2000
  });
}

/**
 * 显示确认对话框
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
}

module.exports = {
  generateRoomId,
  formatTime,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm
};
```

---

## 6️⃣ API封装

### utils/api.js

```javascript
const BASE_URL = 'https://crm.andejiazheng.com/api';

/**
 * 封装请求方法
 */
function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    // 获取token
    const token = wx.getStorageSync('token');
    
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token过期，跳转登录
          wx.showModal({
            title: '提示',
            content: '登录已过期，请重新登录',
            showCancel: false,
            success: () => {
              wx.redirectTo({
                url: '/pages/login/login'
              });
            }
          });
          reject(new Error('未授权'));
        } else {
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (error) => {
        console.error('请求失败:', error);
        reject(error);
      }
    });
  });
}

/**
 * 创建房间
 */
function createRoom(data) {
  return request('/interview/create-room', 'POST', data);
}

/**
 * 获取房间信息
 */
function getRoomInfo(roomId) {
  return request(`/interview/room/${roomId}`, 'GET');
}

/**
 * 结束房间
 */
function endRoom(roomId) {
  return request(`/interview/room/${roomId}/end`, 'POST');
}

/**
 * 获取房间列表
 */
function getRoomList(params = {}) {
  const query = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
  return request(`/interview/rooms?${query}`, 'GET');
}

/**
 * 微信登录
 */
function wxLogin(code) {
  return request('/wechat/login', 'POST', { code });
}

/**
 * 生成小程序码
 */
function generateQRCode(data) {
  return request('/wechat/generate-qrcode', 'POST', data);
}

module.exports = {
  request,
  createRoom,
  getRoomInfo,
  endRoom,
  getRoomList,
  wxLogin,
  generateQRCode
};
```

---

## 7️⃣ 全局配置

### app.js

```javascript
const api = require('./utils/api.js');

App({
  globalData: {
    userInfo: null,
    token: null
  },

  onLaunch() {
    console.log('📱 小程序启动');
    
    // 检查登录状态
    this.checkLogin();
    
    // 检查更新
    this.checkUpdate();
  },

  // 检查登录状态
  checkLogin() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      console.log('✅ 已登录:', userInfo);
    } else {
      console.log('❌ 未登录');
    }
  },

  // 微信登录
  async doWxLogin() {
    try {
      // 1. 获取微信登录code
      const { code } = await wx.login();
      console.log('获取到code:', code);
      
      // 2. 发送到后端换取token
      const res = await api.wxLogin(code);
      
      if (res.success) {
        // 3. 保存token和用户信息
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', res.data.userInfo);
        
        this.globalData.token = res.data.token;
        this.globalData.userInfo = res.data.userInfo;
        
        console.log('✅ 登录成功:', res.data.userInfo);
        return res.data;
      } else {
        throw new Error(res.message || '登录失败');
      }
    } catch (error) {
      console.error('❌ 登录失败:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
      throw error;
    }
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    this.globalData.token = null;
    this.globalData.userInfo = null;
    
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  // 检查更新
  checkUpdate() {
    const updateManager = wx.getUpdateManager();
    
    updateManager.onCheckForUpdate((res) => {
      console.log('检查更新:', res.hasUpdate);
    });
    
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        }
      });
    });
    
    updateManager.onUpdateFailed(() => {
      console.error('更新失败');
    });
  }
});
```

### app.json

```json
{
  "pages": [
    "pages/index/index",
    "pages/interview/create/create",
    "pages/interview/host/host",
    "pages/interview/guest/guest",
    "pages/interview/video/video"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#5DBFB3",
    "navigationBarTitleText": "视频面试",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f5f5f5"
  },
  "tabBar": {
    "color": "#666",
    "selectedColor": "#5DBFB3",
    "backgroundColor": "#fff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/tab-home.png",
        "selectedIconPath": "images/tab-home-active.png"
      },
      {
        "pagePath": "pages/interview/create/create",
        "text": "创建面试",
        "iconPath": "images/tab-create.png",
        "selectedIconPath": "images/tab-create-active.png"
      }
    ]
  },
  "permission": {
    "scope.camera": {
      "desc": "用于视频面试"
    },
    "scope.record": {
      "desc": "用于视频面试"
    }
  },
  "requiredPrivateInfos": [],
  "usingComponents": {}
}
```

### app.wxss

```css
/**app.wxss**/
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}

/* 全局容器 */
.container {
  min-height: 100vh;
  box-sizing: border-box;
}

/* 全局按钮样式 */
button {
  border-radius: 8rpx;
  font-size: 28rpx;
}

button::after {
  border: none;
}

/* 全局输入框样式 */
input {
  font-size: 28rpx;
}

/* 全局文本样式 */
text {
  font-size: 28rpx;
}

/* 主题色 */
.theme-color {
  color: #5DBFB3;
}

.theme-bg {
  background-color: #5DBFB3;
}

/* 工具类 */
.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.bold {
  font-weight: bold;
}

/* 间距 */
.mt-10 { margin-top: 10rpx; }
.mt-20 { margin-top: 20rpx; }
.mt-30 { margin-top: 30rpx; }
.mt-40 { margin-top: 40rpx; }

.mb-10 { margin-bottom: 10rpx; }
.mb-20 { margin-bottom: 20rpx; }
.mb-30 { margin-bottom: 30rpx; }
.mb-40 { margin-bottom: 40rpx; }

.ml-10 { margin-left: 10rpx; }
.ml-20 { margin-left: 20rpx; }

.mr-10 { margin-right: 10rpx; }
.mr-20 { margin-right: 20rpx; }

.p-10 { padding: 10rpx; }
.p-20 { padding: 20rpx; }
.p-30 { padding: 30rpx; }
.p-40 { padding: 40rpx; }
```

---

## 8️⃣ 首页示例

### pages/index/index.wxml

```xml
<view class="container">
  <view class="header">
    <image class="logo" src="/images/logo.png" mode="aspectFit"></image>
    <text class="title">视频面试系统</text>
    <text class="subtitle">专业的在线视频面试解决方案</text>
  </view>

  <view class="actions">
    <navigator url="/pages/interview/create/create" class="action-card">
      <view class="action-icon">🎥</view>
      <view class="action-title">创建面试</view>
      <view class="action-desc">发起新的视频面试</view>
    </navigator>

    <view class="action-card" bindtap="scanQRCode">
      <view class="action-icon">📷</view>
      <view class="action-title">扫码加入</view>
      <view class="action-desc">扫描二维码加入面试</view>
    </view>
  </view>

  <view class="features">
    <view class="feature-item">
      <text class="feature-icon">✨</text>
      <text class="feature-text">高清视频通话</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">🎤</text>
      <text class="feature-text">实时音频交流</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">📱</text>
      <text class="feature-text">多端互通</text>
    </view>
    <view class="feature-item">
      <text class="feature-icon">🔒</text>
      <text class="feature-text">安全可靠</text>
    </view>
  </view>
</view>
```

### pages/index/index.js

```javascript
const app = getApp();

Page({
  data: {
    userInfo: null
  },

  onLoad() {
    this.setData({
      userInfo: app.globalData.userInfo
    });
  },

  onShow() {
    // 每次显示时检查登录状态
    this.setData({
      userInfo: app.globalData.userInfo
    });
  },

  // 扫码加入
  scanQRCode() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res);
        
        // 解析二维码内容
        // 假设格式为：roomId=xxx
        const roomId = this.parseRoomId(res.result);
        
        if (roomId) {
          wx.navigateTo({
            url: `/pages/interview/guest/guest?roomId=${roomId}`
          });
        } else {
          wx.showToast({
            title: '无效的二维码',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        console.error('扫码失败:', error);
      }
    });
  },

  // 解析房间号
  parseRoomId(qrContent) {
    // 从二维码内容中提取房间号
    // 支持多种格式
    try {
      // 格式1: roomId=xxx
      if (qrContent.includes('roomId=')) {
        return qrContent.split('roomId=')[1].split('&')[0];
      }
      
      // 格式2: 直接是房间号
      if (qrContent.startsWith('room_')) {
        return qrContent;
      }
      
      // 格式3: 完整URL
      if (qrContent.includes('/interview/guest/guest?roomId=')) {
        const url = new URL(qrContent);
        return url.searchParams.get('roomId');
      }
      
      return null;
    } catch (error) {
      console.error('解析房间号失败:', error);
      return null;
    }
  }
});
```

---

## 📝 总结

现在您已经拥有了完整的小程序视频面试功能代码！

### ✅ 包含的功能
1. ✅ 创建面试房间
2. ✅ HR主持人视频页面
3. ✅ 访客加入页面
4. ✅ 访客视频页面
5. ✅ 分享功能
6. ✅ 扫码加入
7. ✅ API封装
8. ✅ 工具函数
9. ✅ 全局配置

### 🚀 下一步
1. 复制代码到您的小程序项目
2. 准备图片资源（logo、图标等）
3. 配置域名白名单
4. 测试完整流程
5. 提交审核

需要我帮您生成后端API接口文档吗？


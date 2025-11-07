# 微信小程序集成指南 - 解决"非官方网页"警告

## 🎯 目标

通过微信小程序 WebView 加载 H5 视频面试页面，彻底解决"非微信官方网页"警告问题。

## 📋 前置条件

- ✅ 已有上线的微信小程序
- ✅ 域名：`crm.andejiazheng.com`
- ✅ H5 移动端页面已完成

## 🚀 实施步骤

### 步骤1：配置小程序业务域名（最重要！）

#### 1.1 登录小程序后台

访问：https://mp.weixin.qq.com/

#### 1.2 配置业务域名

1. 进入：**开发** → **开发管理** → **开发设置** → **业务域名**
2. 点击 **"修改"** 或 **"添加"**
3. 输入域名：`crm.andejiazheng.com`
4. 点击 **"下载校验文件"**

#### 1.3 上传校验文件到服务器

微信会提供一个校验文件，文件名类似：
```
WxVerifyFile_xxxxxxxxxx.txt
```

**上传到服务器根目录**，确保可以通过以下 URL 访问：
```
https://crm.andejiazheng.com/WxVerifyFile_xxxxxxxxxx.txt
```

**如何上传**：
```bash
# 方法1：使用 scp 上传
scp WxVerifyFile_xxxxxxxxxx.txt user@server:/path/to/frontend/dist/

# 方法2：如果使用 Nginx，上传到 Nginx 静态文件目录
scp WxVerifyFile_xxxxxxxxxx.txt user@server:/var/www/html/

# 方法3：如果使用 Docker，复制到容器中
docker cp WxVerifyFile_xxxxxxxxxx.txt container_name:/app/dist/
```

**验证文件是否可访问**：
```bash
curl https://crm.andejiazheng.com/WxVerifyFile_xxxxxxxxxx.txt
```

#### 1.4 完成验证

1. 在小程序后台点击 **"验证"**
2. 验证成功后点击 **"保存"**
3. ✅ 配置完成！

---

### 步骤2：创建小程序 WebView 页面

在您的小程序项目中创建新页面：

#### 2.1 创建页面目录

```bash
mkdir -p pages/interview
```

#### 2.2 创建页面文件

**pages/interview/interview.wxml**
```xml
<!-- 视频面试页面 -->
<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>
```

**pages/interview/interview.js**
```javascript
Page({
  data: {
    webviewUrl: ''
  },

  onLoad(options) {
    // 从页面参数获取房间ID
    const roomId = options.roomId || '';
    
    // 构建 H5 页面 URL
    const h5Url = `https://crm.andejiazheng.com/interview/join-mobile/${roomId}`;
    
    console.log('📱 加载视频面试页面:', h5Url);
    
    this.setData({
      webviewUrl: h5Url
    });
  },

  // 接收 H5 页面发送的消息
  handleMessage(e) {
    console.log('📥 收到H5消息:', e.detail.data);
    
    // 处理不同的消息类型
    const messages = e.detail.data;
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      switch (lastMessage.type) {
        case 'joined':
          // 用户成功加入视频通话
          console.log('✅ 用户已加入视频面试');
          break;
          
        case 'leave':
          // 用户离开视频通话，返回上一页
          console.log('👋 用户离开视频面试');
          wx.navigateBack({
            delta: 1
          });
          break;
          
        case 'error':
          // 发生错误
          wx.showToast({
            title: lastMessage.message || '发生错误',
            icon: 'none',
            duration: 2000
          });
          break;
      }
    }
  },

  onUnload() {
    console.log('📱 视频面试页面卸载');
  }
});
```

**pages/interview/interview.json**
```json
{
  "navigationBarTitleText": "视频面试",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "disableScroll": true
}
```

**pages/interview/interview.wxss**
```css
/* 视频面试页面样式 */
page {
  height: 100%;
  background-color: #f5f5f5;
}

web-view {
  width: 100%;
  height: 100%;
}
```

#### 2.3 在 app.json 中注册页面

编辑 `app.json`，在 `pages` 数组中添加：

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

---

### 步骤3：创建入口页面（可选）

如果需要在小程序中创建一个入口页面，让用户输入房间号：

**pages/interview-entry/interview-entry.wxml**
```xml
<view class="container">
  <view class="header">
    <text class="title">视频面试</text>
  </view>
  
  <view class="form">
    <view class="form-item">
      <text class="label">房间号</text>
      <input 
        class="input" 
        placeholder="请输入房间号" 
        value="{{roomId}}"
        bindinput="onRoomIdInput"
      />
    </view>
    
    <button class="btn-primary" bindtap="joinInterview">
      加入面试
    </button>
  </view>
</view>
```

**pages/interview-entry/interview-entry.js**
```javascript
Page({
  data: {
    roomId: ''
  },

  onRoomIdInput(e) {
    this.setData({
      roomId: e.detail.value
    });
  },

  joinInterview() {
    const { roomId } = this.data;
    
    if (!roomId) {
      wx.showToast({
        title: '请输入房间号',
        icon: 'none'
      });
      return;
    }

    // 跳转到视频面试页面
    wx.navigateTo({
      url: `/pages/interview/interview?roomId=${roomId}`
    });
  }
});
```

---

### 步骤4：生成小程序码（可选）

如果需要生成小程序码供用户扫码进入：

#### 4.1 在后端添加生成小程序码的接口

```typescript
// backend/src/modules/wechat/wechat.controller.ts

@Post('generate-miniprogram-qrcode')
async generateMiniprogramQRCode(@Body() body: { roomId: string }) {
  const { roomId } = body;
  
  // 调用微信 API 生成小程序码
  const result = await this.wechatService.generateQRCode({
    page: 'pages/interview/interview',
    scene: `roomId=${roomId}`,
    width: 280
  });
  
  return {
    success: true,
    data: {
      qrcode: result.buffer.toString('base64')
    }
  };
}
```

#### 4.2 在 HR 端显示小程序码

```typescript
// 在 VideoInterview.tsx 中
const generateMiniprogramQRCode = async () => {
  const response = await axios.post('/api/wechat/generate-miniprogram-qrcode', {
    roomId: roomInfo.roomId
  });
  
  // 显示小程序码
  const qrcodeUrl = `data:image/png;base64,${response.data.data.qrcode}`;
  // ... 显示二维码
};
```

---

## 🧪 测试步骤

### 1. 测试业务域名配置

在小程序开发工具中：
1. 打开 **调试器** → **Network**
2. 访问 WebView 页面
3. 检查是否有域名错误

### 2. 测试 WebView 页面

1. 在小程序开发工具中打开项目
2. 在模拟器中访问：`pages/interview/interview?roomId=test_room_123`
3. 检查是否正常加载 H5 页面
4. 检查视频通话功能是否正常

### 3. 测试真机

1. 点击 **预览**，生成二维码
2. 使用微信扫码
3. 在真机上测试完整流程

---

## 📱 使用方式

### 方式1：直接跳转（推荐）

在小程序的任何页面中，通过按钮跳转：

```xml
<button bindtap="goToInterview">进入视频面试</button>
```

```javascript
goToInterview() {
  const roomId = 'room_123456'; // 从服务器获取
  wx.navigateTo({
    url: `/pages/interview/interview?roomId=${roomId}`
  });
}
```

### 方式2：扫码进入

1. HR 端生成小程序码
2. 用户扫码直接进入视频面试

### 方式3：分享卡片

```javascript
// 在 interview.js 中添加
onShareAppMessage() {
  return {
    title: '视频面试邀请',
    path: `/pages/interview/interview?roomId=${this.data.roomId}`,
    imageUrl: '/images/share-cover.png'
  };
}
```

---

## 🔧 常见问题

### Q1: 提示"业务域名校验失败"

**原因**：校验文件未正确上传或无法访问

**解决**：
1. 检查文件是否上传到服务器根目录
2. 使用浏览器访问校验文件 URL
3. 检查 Nginx 配置是否正确

### Q2: WebView 显示空白

**原因**：H5 页面加载失败

**解决**：
1. 检查 H5 页面 URL 是否正确
2. 检查域名是否配置在业务域名中
3. 检查 HTTPS 证书是否有效

### Q3: 视频通话无法使用

**原因**：权限问题或网络问题

**解决**：
1. 在小程序中申请摄像头和麦克风权限
2. 检查网络连接
3. 检查 ZEGO SDK 配置

### Q4: 小程序无法接收 H5 消息

**原因**：postMessage 只在特定时机触发

**解决**：
- postMessage 只在以下时机触发：
  - 小程序后退
  - 组件销毁
  - 分享
- 如需实时通信，考虑使用 WebSocket

---

## 📊 完整流程图

```
用户打开小程序
    ↓
进入视频面试页面
    ↓
加载 WebView (H5页面)
    ↓
H5 页面加载完成
    ↓
用户填写姓名和身份
    ↓
加入视频通话
    ↓
H5 发送消息给小程序 (joined)
    ↓
视频通话进行中
    ↓
用户点击挂断
    ↓
H5 发送消息给小程序 (leave)
    ↓
小程序返回上一页
```

---

## ✅ 验证清单

- [ ] 业务域名配置成功
- [ ] 校验文件可以访问
- [ ] 小程序页面创建完成
- [ ] app.json 已注册页面
- [ ] 开发工具中测试通过
- [ ] 真机测试通过
- [ ] 视频通话功能正常
- [ ] 小程序与 H5 通信正常

---

## 🎉 完成后的效果

1. ✅ 用户在微信中打开小程序
2. ✅ **不会出现"非官方网页"警告**
3. ✅ 直接进入视频面试页面
4. ✅ 用户体验流畅
5. ✅ 符合微信规范

---

## 📞 技术支持

如果遇到问题：
1. 检查微信开发者工具的控制台错误
2. 检查 H5 页面的控制台错误
3. 检查网络请求是否成功
4. 参考微信官方文档：https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html

---

**版本**：v1.0.0  
**更新时间**：2025-01-07  
**作者**：Augment Agent


# 小程序视频面试H5文件

## 📁 文件说明

本目录包含用于微信小程序WebView的视频面试H5页面。

### 文件列表

- `video-interview-host.html` - HR端视频面试页面
- `video-interview.html` - 访客端视频面试页面
- `ZegoExpressWebRTC-standalone.js` - ZEGO Web SDK（独立打包版本）

## 🌐 访问地址

部署后的访问地址：

- **HR端**: `https://crm.andejiazheng.com/miniprogram/video-interview-host.html`
- **访客端**: `https://crm.andejiazheng.com/miniprogram/video-interview.html?room={roomId}`

## 📱 小程序集成方式

### 方法1：使用web-view组件

在小程序页面中使用web-view组件加载H5页面：

```xml
<!-- pages/interview/interview.wxml -->
<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>
```

```javascript
// pages/interview/interview.js
Page({
  data: {
    webviewUrl: ''
  },

  onLoad(options) {
    const roomId = options.roomId || '';
    const role = options.role || 'guest'; // 'host' 或 'guest'
    
    let url = '';
    if (role === 'host') {
      // HR端
      url = 'https://crm.andejiazheng.com/miniprogram/video-interview-host.html';
    } else {
      // 访客端
      url = `https://crm.andejiazheng.com/miniprogram/video-interview.html?room=${roomId}`;
    }
    
    this.setData({ webviewUrl: url });
  },

  handleMessage(e) {
    console.log('收到H5消息:', e.detail.data);
    const msg = e.detail.data[e.detail.data.length - 1];
    if (msg.type === 'leave') {
      wx.navigateBack();
    }
  }
});
```

### 方法2：在外部浏览器中打开

```javascript
wx.openUrl({
  url: 'https://crm.andejiazheng.com/miniprogram/video-interview-host.html',
  success: () => {
    console.log('成功打开外部浏览器');
  }
});
```

## ⚙️ 配置说明

### ZEGO配置

H5文件中已内置ZEGO配置，需要确保：

1. **AppID**: 已配置在HTML文件中
2. **ServerSecret**: 用于生成Token（后端配置）
3. **域名白名单**: 在ZEGO控制台添加 `crm.andejiazheng.com`

### 小程序配置

在小程序管理后台配置业务域名：

1. 登录微信公众平台
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 在"业务域名"中添加：`crm.andejiazheng.com`
4. 下载校验文件并上传到服务器根目录

## 🔧 部署说明

### 自动部署

这些文件位于 `frontend/public/miniprogram/` 目录，会在前端构建时自动复制到 `dist/miniprogram/` 目录。

### Nginx配置

```nginx
# 小程序H5文件 - 禁用缓存
location /miniprogram/ {
    try_files $uri =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

## 📝 更新说明

如需更新H5文件：

1. 替换 `frontend/public/miniprogram/` 目录下的文件
2. 重新构建前端：`cd frontend && npm run build`
3. 重启前端服务：`pm2 restart frontend-prod`

## 🔗 相关文档

- [小程序集成完整指南](../../../小程序集成文档.md)
- [快速开始](../../../小程序H5文件/快速开始.md)
- [部署配置说明](../../../小程序H5文件/部署配置说明.md)

## ⚠️ 注意事项

1. **HTTPS要求**: 小程序WebView只支持HTTPS协议
2. **域名白名单**: 必须在小程序后台配置业务域名
3. **WebRTC支持**: 小程序WebView不支持WebRTC，建议使用外部浏览器打开
4. **跨域问题**: 确保后端API配置了正确的CORS策略

## 📞 技术支持

如有问题，请联系技术团队。


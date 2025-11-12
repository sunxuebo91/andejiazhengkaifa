# 视频面试 H5 部署包

## 📦 包含文件

```
小程序H5文件/
├── README.md                           # 本文件（部署说明）
├── video-interview-host.html          # HR端视频面试页面
├── video-interview.html               # 访客端视频面试页面
├── ZegoExpressWebRTC-standalone.js    # ZEGO Web SDK（独立打包版本）
└── 部署配置说明.md                     # 详细配置说明
```

---

## 🚀 快速部署

### 第 1 步：上传文件到服务器

将以下文件上传到你的服务器根目录（或指定目录）：

```bash
# 假设你的服务器目录是 /var/www/html/h5/
video-interview-host.html
video-interview.html
ZegoExpressWebRTC-standalone.js
```

**上传方式：**
- FTP/SFTP 工具（如 FileZilla）
- SCP 命令
- 服务器控制面板（如宝塔面板）

---

### 第 2 步：配置域名和 HTTPS

**重要：** 视频面试功能必须使用 HTTPS 协议！

#### 方案 A：使用已有域名（推荐）

假设你的域名是 `api.yourdomain.com`，配置如下：

1. **配置 Nginx**（示例）：

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    # H5 文件目录
    location /h5/ {
        root /var/www/html;
        index index.html;
        
        # 允许跨域（如果需要）
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
    }
}
```

2. **访问地址**：
   - HR端：`https://api.yourdomain.com/h5/video-interview-host.html`
   - 访客端：`https://api.yourdomain.com/h5/video-interview.html?room=xxx`

#### 方案 B：使用子域名

创建子域名 `interview.yourdomain.com`：

```nginx
server {
    listen 443 ssl http2;
    server_name interview.yourdomain.com;
    
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    root /var/www/html/h5;
    index video-interview-host.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

访问地址：
- HR端：`https://interview.yourdomain.com/video-interview-host.html`
- 访客端：`https://interview.yourdomain.com/video-interview.html?room=xxx`

---

### 第 3 步：配置小程序业务域名

1. **登录微信小程序后台**：https://mp.weixin.qq.com/

2. **进入开发管理**：
   ```
   开发 → 开发管理 → 开发设置 → 业务域名
   ```

3. **添加域名**：
   ```
   api.yourdomain.com
   或
   interview.yourdomain.com
   ```

4. **下载校验文件**：
   - 点击"下载校验文件"
   - 上传到服务器根目录
   - 点击"验证"

---

### 第 4 步：修改小程序代码

修改 `miniprogram/pages/video-interview-webview/index.js`：

```javascript
onLoad(options) {
  console.log('WebView 页面加载，参数:', options);

  const role = options.role || 'guest';
  const roomId = options.roomId || options.room || '';

  // 🔥 修改这里：使用你自己的域名
  const h5Domain = 'https://api.yourdomain.com/h5';  // 或 'https://interview.yourdomain.com'
  
  let h5Url = '';
  let webviewUrl = '';

  if (role === 'host') {
    // HR端
    h5Url = `${h5Domain}/video-interview-host.html`;
    webviewUrl = h5Url;
  } else {
    // 访客端
    if (!roomId) {
      wx.showModal({
        title: '提示',
        content: '缺少房间号参数',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }
    h5Url = `${h5Domain}/video-interview.html`;
    webviewUrl = `${h5Url}?room=${roomId}`;
  }

  this.setData({
    roomId: roomId,
    role: role,
    webviewUrl: webviewUrl
  });
}
```

---

### 第 5 步：测试部署

#### 测试 HR 端：

1. 在浏览器中访问：
   ```
   https://api.yourdomain.com/h5/video-interview-host.html
   ```

2. 检查：
   - ✅ 页面正常加载
   - ✅ 没有 SSL 证书错误
   - ✅ 控制台没有报错
   - ✅ 点击"创建面试间"能正常创建

#### 测试访客端：

1. 在浏览器中访问：
   ```
   https://api.yourdomain.com/h5/video-interview.html?room=test_room_123
   ```

2. 检查：
   - ✅ 页面正常加载
   - ✅ 房间号正确显示
   - ✅ 能输入姓名和选择身份
   - ✅ 点击"加入面试"能正常加入

#### 测试小程序：

1. 在小程序中点击"视频面试"
2. 检查是否正常加载 HR 端页面
3. 创建面试间并测试分享功能

---

## ⚙️ ZEGO 配置说明

### AppID 和 ServerSecret

当前配置（在 HTML 文件中）：

```javascript
const appID = 1279160453;
const serverSecret = 'e18cc600e2939d412c48f152e157f01d';
```

**如果需要更换 ZEGO 账号：**

1. 登录 ZEGO 控制台：https://console.zego.im/
2. 创建项目并获取 AppID 和 ServerSecret
3. 修改两个 HTML 文件中的配置：
   - `video-interview-host.html` 第 590-592 行
   - `video-interview.html` 第 473-476 行

---

## 🔧 常见问题

### 1. 页面无法加载

**原因：** 域名未配置 HTTPS 或证书无效

**解决：**
- 确保使用 HTTPS 协议
- 检查 SSL 证书是否有效
- 使用 Let's Encrypt 免费证书

### 2. 小程序提示"不在业务域名列表中"

**原因：** 未在小程序后台配置业务域名

**解决：**
- 登录小程序后台
- 添加业务域名
- 上传校验文件

### 3. 视频无法显示

**原因：** 浏览器权限问题或 ZEGO 配置错误

**解决：**
- 检查浏览器是否允许摄像头和麦克风权限
- 检查 ZEGO AppID 和 ServerSecret 是否正确
- 查看浏览器控制台错误信息

### 4. Token 认证失败

**原因：** ServerSecret 配置错误或时间不同步

**解决：**
- 确认 ServerSecret 正确
- 检查服务器时间是否准确
- 查看控制台 Token 生成日志

---

## 📞 技术支持

如有问题，请查看：
- ZEGO 官方文档：https://doc-zh.zego.im/
- 微信小程序文档：https://developers.weixin.qq.com/miniprogram/dev/

---

## 📝 更新日志

### v2.1 (2025-11-11)
- ✅ 修复 HR 端 Token 生成问题
- ✅ 统一访客端和 HR 端配置
- ✅ 添加 SDK 加载等待机制
- ✅ 优化调试日志输出

### v2.0 (2025-11-10)
- ✅ 完成 HR 端和访客端 H5 页面
- ✅ 集成 ZEGO Web SDK
- ✅ 支持多人视频通话
- ✅ 支持小程序 WebView 集成


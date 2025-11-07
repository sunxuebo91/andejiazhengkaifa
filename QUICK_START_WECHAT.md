# 快速解决微信"非官方网页"警告 - 5步搞定！

## 🎯 目标

彻底解决微信中打开链接时的"非微信官方网页，请确认是否继续访问"警告。

---

## ⚡ 快速步骤（30分钟完成）

### 第1步：配置小程序业务域名（10分钟）

1. **登录小程序后台**
   - 访问：https://mp.weixin.qq.com/
   - 使用管理员账号登录

2. **进入业务域名配置**
   ```
   开发 → 开发管理 → 开发设置 → 业务域名 → 点击"修改"
   ```

3. **添加域名**
   ```
   输入：crm.andejiazheng.com
   点击"下载校验文件"
   ```

4. **上传校验文件**
   - 下载的文件名类似：`WxVerifyFile_xxxxxxxxxx.txt`
   - 上传到服务器，确保可以访问：
   ```
   https://crm.andejiazheng.com/WxVerifyFile_xxxxxxxxxx.txt
   ```

5. **完成验证**
   - 点击"验证"按钮
   - 验证成功后点击"保存"

✅ **第1步完成！**

---

### 第2步：复制小程序页面代码（5分钟）

在您的小程序项目中创建 `pages/interview` 目录，复制以下4个文件：

#### 文件1：interview.wxml
```xml
<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>
```

#### 文件2：interview.js
```javascript
Page({
  data: {
    webviewUrl: ''
  },
  onLoad(options) {
    const roomId = options.roomId || '';
    // 使用HR主持人移动端页面
    const h5Url = `https://crm.andejiazheng.com/interview/video-mobile/${roomId}`;
    this.setData({ webviewUrl: h5Url });
  },
  handleMessage(e) {
    const messages = e.detail.data;
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'leave') {
        wx.navigateBack();
      }
    }
  }
});
```

#### 文件3：interview.json
```json
{
  "navigationBarTitleText": "视频面试",
  "disableScroll": true
}
```

#### 文件4：interview.wxss
```css
page { height: 100%; }
web-view { width: 100%; height: 100%; }
```

✅ **第2步完成！**

---

### 第3步：注册页面（1分钟）

编辑 `app.json`，在 `pages` 数组中添加：

```json
{
  "pages": [
    "pages/index/index",
    "pages/interview/interview"
  ]
}
```

✅ **第3步完成！**

---

### 第4步：测试（5分钟）

1. **在开发工具中测试**
   ```
   在模拟器中访问：
   pages/interview/interview?roomId=test_room_123
   ```

2. **真机测试**
   - 点击"预览"生成二维码
   - 用微信扫码测试

✅ **第4步完成！**

---

### 第5步：上传发布（10分钟）

1. **上传代码**
   - 点击"上传"
   - 填写版本号和备注

2. **提交审核**
   - 在小程序后台提交审核
   - 等待审核通过（通常1-3天）

3. **发布上线**
   - 审核通过后点击"发布"

✅ **第5步完成！全部搞定！🎉**

---

## 📱 使用方式

### 方式1：在小程序中跳转

```javascript
// 在任何页面中
wx.navigateTo({
  url: `/pages/interview/interview?roomId=room_123456`
});
```

### 方式2：生成小程序码

用户扫码直接进入视频面试（无需任何警告！）

---

## 🎉 完成后的效果

**之前**：
```
打开链接 → ⚠️ "非微信官方网页" → 点击"继续访问" → 进入页面
```

**现在**：
```
打开小程序 → ✅ 直接进入视频面试 → 无任何警告！
```

---

## 🔧 如何上传校验文件？

### 方法1：使用 FTP/SFTP 工具

1. 使用 FileZilla 或其他 FTP 工具
2. 连接到服务器
3. 上传到网站根目录

### 方法2：使用命令行

```bash
# SSH 登录服务器
ssh user@your-server.com

# 进入网站根目录
cd /var/www/html  # 或您的网站目录

# 上传文件（从本地）
scp WxVerifyFile_*.txt user@your-server.com:/var/www/html/
```

### 方法3：如果使用 Nginx

```bash
# 找到 Nginx 配置的 root 目录
cat /etc/nginx/sites-available/default | grep root

# 上传到该目录
```

### 方法4：如果使用 Docker

```bash
# 复制到容器
docker cp WxVerifyFile_*.txt container_name:/app/dist/

# 或者在 Dockerfile 中添加
COPY WxVerifyFile_*.txt /app/dist/
```

---

## ❓ 常见问题

### Q1: 校验文件上传后无法访问？

**检查**：
```bash
# 测试文件是否可访问
curl https://crm.andejiazheng.com/WxVerifyFile_xxxxxxxxxx.txt

# 检查文件权限
ls -la WxVerifyFile_*.txt
chmod 644 WxVerifyFile_*.txt  # 如果权限不对
```

### Q2: 小程序显示空白？

**原因**：域名未配置或 H5 页面有问题

**解决**：
1. 检查业务域名是否配置成功
2. 在浏览器中直接访问 H5 页面测试
3. 检查小程序开发工具的控制台错误

### Q3: 视频通话无法使用？

**原因**：权限问题

**解决**：
在小程序中添加权限申请：
```json
// app.json
{
  "permission": {
    "scope.camera": {
      "desc": "用于视频通话"
    },
    "scope.record": {
      "desc": "用于语音通话"
    }
  }
}
```

---

## 📞 需要帮助？

如果遇到问题：
1. 检查微信开发者工具的控制台
2. 检查 H5 页面的控制台
3. 参考完整文档：`WECHAT_MINIPROGRAM_SETUP.md`

---

## ✅ 验证清单

- [ ] 业务域名配置成功
- [ ] 校验文件可以访问（用浏览器测试）
- [ ] 小程序页面创建完成
- [ ] app.json 已注册页面
- [ ] 开发工具测试通过
- [ ] 真机测试通过
- [ ] 无"非官方网页"警告

---

**预计完成时间**：30分钟  
**难度**：⭐⭐☆☆☆（简单）  
**效果**：⭐⭐⭐⭐⭐（完美）

🎉 **祝您配置顺利！**


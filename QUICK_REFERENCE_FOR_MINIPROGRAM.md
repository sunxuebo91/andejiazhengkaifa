# 小程序集成快速参考

## 🎯 一句话总结

在小程序中创建一个页面，使用 `<web-view>` 加载 `https://crm.andejiazheng.com/interview/join-mobile/{roomId}`

---

## 📁 需要创建的文件

```
pages/interview/
├── interview.wxml   # 只有一行：<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>
├── interview.js     # 处理 roomId 参数和 H5 消息
├── interview.json   # 页面配置
└── interview.wxss   # 全屏样式
```

---

## 🔗 关键代码

### interview.wxml
```xml
<web-view src="{{webviewUrl}}" bindmessage="handleMessage"></web-view>
```

### interview.js（核心逻辑）
```javascript
Page({
  data: { webviewUrl: '' },

  onLoad(options) {
    const roomId = options.roomId;
    // 使用HR主持人移动端页面
    this.setData({
      webviewUrl: `https://crm.andejiazheng.com/interview/video-mobile/${roomId}`
    });
  },

  handleMessage(e) {
    const msg = e.detail.data[e.detail.data.length - 1];
    if (msg.type === 'leave') {
      wx.navigateBack();
    }
  }
});
```

### app.json（注册页面）
```json
{
  "pages": [
    "pages/index/index",
    "pages/interview/interview"
  ]
}
```

---

## 🚀 使用方式

### 跳转到视频面试
```javascript
wx.navigateTo({
  url: `/pages/interview/interview?roomId=${roomId}`
});
```

### 小程序路径
```
pages/interview/interview?roomId=xxx
```

---

## ✅ 测试清单

- [ ] 能正常加载 H5 页面
- [ ] 没有"非官方网页"警告
- [ ] 能加入视频通话
- [ ] 挂断后能返回

---

## 📞 完整文档

详细说明请查看：
- `FOR_MINIPROGRAM_DEVELOPER.md` - 给开发者的详细指令
- `MINIPROGRAM_IMPLEMENTATION_GUIDE.md` - 完整实施指南

---

## 🎯 预期效果

✅ 用户打开小程序 → 直接进入视频面试 → 无任何警告 → 完美！


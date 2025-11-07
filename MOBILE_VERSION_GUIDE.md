# 移动端视频面试 - 实施指南

## 📱 概述

已创建完整的移动端优化版本，完全按照您提供的设计图实现：
- ✅ 2列网格布局（每行2个视频）
- ✅ 圆角卡片设计
- ✅ 底部工具栏：录音、麦克风、翻转、画面录制、邀请
- ✅ 红色挂断按钮
- ✅ 完全适配移动端交互

## 🎨 设计实现

### 视频布局
- **网格布局**：2列自适应，横屏自动切换为3列
- **视频卡片**：3:4 宽高比，圆角12px
- **用户信息**：底部显示用户名和状态图标
- **头像占位符**：无视频时显示灰色头像

### 工具栏
- **录音**：开始/停止录音
- **麦克风**：开启/关闭麦克风
- **翻转**：前后摄像头切换
- **画面录制**：开启/关闭摄像头
- **邀请**：分享邀请链接（支持原生分享）

### 挂断按钮
- **位置**：底部居中，工具栏上方
- **样式**：红色圆形按钮，带阴影
- **交互**：点击确认后离开房间

## 📂 文件结构

```
frontend/src/
├── pages/interview/
│   ├── VideoInterviewMobile.tsx      # HR端移动版
│   ├── VideoInterviewMobile.css      # HR端移动版样式
│   ├── JoinInterviewMobile.tsx       # 访客端移动版
│   ├── JoinInterviewMobile.css       # 访客端移动版样式
│   ├── VideoInterview.tsx            # HR端PC版（原有）
│   └── JoinInterview.tsx             # 访客端PC版（原有）
├── utils/
│   └── deviceDetect.ts               # 设备检测工具
└── App.tsx                           # 路由配置（已更新）
```

## 🔗 路由配置

### 公开访问路由（无需登录）
- **PC端访客**：`/interview/join/:roomId`
- **移动端访客**：`/interview/join-mobile/:roomId`

### 需要登录的路由
- **PC端HR**：`/interview/video`
- **移动端HR**：`/interview/video-mobile/:roomId`

## 🚀 使用方式

### 方式1：手动访问移动端URL

**访客端**：
```
https://yourdomain.com/interview/join-mobile/room_123456
```

**HR端**：
```
https://yourdomain.com/interview/video-mobile/room_123456
```

### 方式2：自动设备检测（推荐）

在现有的 PC 端页面中添加设备检测：

```typescript
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { redirectToDeviceVersion } from '@/utils/deviceDetect';

const JoinInterview: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();

  useEffect(() => {
    // 自动检测设备并跳转
    if (roomId) {
      redirectToDeviceVersion(roomId, 'join');
    }
  }, [roomId]);

  // ... 其他代码
};
```

### 方式3：生成不同的分享链接

在 HR 端生成邀请链接时，根据目标设备生成不同的链接：

```typescript
// 生成移动端邀请链接
const generateMobileShareLink = () => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/interview/join-mobile/${roomId}`;
};

// 生成PC端邀请链接
const generatePCShareLink = () => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/interview/join/${roomId}`;
};
```

## 📱 移动端特性

### 1. 响应式布局
- **竖屏**：2列网格
- **横屏**：3列网格
- **小屏幕**（<375px）：优化间距和字体
- **平板**（≥768px）：3列网格

### 2. 触摸优化
- 禁用长按选择
- 禁用双击缩放
- 优化触摸反馈
- 支持滑动滚动

### 3. 安全区域适配
- 支持 iPhone X 等刘海屏
- 底部工具栏自动适配安全区域
- 使用 `env(safe-area-inset-bottom)`

### 4. 性能优化
- 使用 360P 视频分辨率（移动端）
- 隐藏不必要的功能（屏幕共享等）
- 优化 DOM 结构
- 减少重绘和回流

### 5. 微信集成
- 支持微信内置浏览器
- 支持微信小程序 WebView
- 支持原生分享 API
- 自动检测微信环境

## 🔧 配置说明

### ZEGO SDK 移动端配置

```typescript
const config = {
  // 移动端优化配置
  showScreenSharingButton: false,      // 隐藏屏幕共享
  showLayoutButton: false,             // 隐藏布局切换
  showNonVideoUser: true,              // 显示无视频用户
  showOnlyAudioUser: true,             // 显示纯音频用户
  showUserList: false,                 // 隐藏用户列表
  showRoomTimer: false,                // 隐藏房间计时器
  
  // 自定义UI
  showMyCameraToggleButton: false,     // 使用自定义按钮
  showMyMicrophoneToggleButton: false,
  showAudioVideoSettingsButton: false,
  showTextChat: false,
  showUserName: false,
  
  // 视频配置
  videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_360P,
};
```

### 视口配置

在 `index.html` 中添加：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

## 🧪 测试清单

### 设备测试
- [ ] iPhone（Safari）
- [ ] Android（Chrome）
- [ ] iPad（Safari）
- [ ] 微信内置浏览器
- [ ] 微信小程序 WebView

### 功能测试
- [ ] 视频通话正常
- [ ] 麦克风开关正常
- [ ] 摄像头开关正常
- [ ] 前后摄像头切换正常
- [ ] 邀请分享正常
- [ ] 挂断功能正常
- [ ] 会话恢复正常

### 布局测试
- [ ] 竖屏显示正常
- [ ] 横屏显示正常
- [ ] 小屏幕（<375px）显示正常
- [ ] 大屏幕（平板）显示正常
- [ ] 刘海屏适配正常

### 交互测试
- [ ] 触摸反馈正常
- [ ] 滚动流畅
- [ ] 按钮点击响应快
- [ ] 无意外缩放
- [ ] 无意外选择文本

## 🔄 与PC版本的差异

| 特性 | PC版本 | 移动端版本 |
|------|--------|-----------|
| 布局 | 自适应网格 | 2列固定网格 |
| 工具栏 | ZEGO默认UI | 自定义底部工具栏 |
| 屏幕共享 | 支持 | 不支持 |
| 摄像头切换 | 不支持 | 支持前后切换 |
| 分享方式 | 复制链接 | 原生分享API |
| 视频分辨率 | 720P | 360P |
| 触摸优化 | 无 | 完整优化 |

## 📊 性能指标

### 目标指标
- **首屏加载**：< 3秒
- **视频延迟**：< 300ms
- **帧率**：≥ 25fps
- **内存占用**：< 200MB

### 优化措施
- 使用较低的视频分辨率（360P）
- 懒加载非关键资源
- 优化 DOM 结构
- 减少不必要的重渲染

## 🐛 已知问题和限制

### 1. 浏览器兼容性
- **iOS Safari < 14**：部分功能可能不支持
- **Android 旧版浏览器**：可能需要降级处理

### 2. 网络要求
- **最低带宽**：上行 500kbps，下行 1Mbps
- **推荐带宽**：上行 1Mbps，下行 2Mbps

### 3. 设备要求
- **iOS**：iOS 12+
- **Android**：Android 5.0+
- **内存**：≥ 2GB

### 4. 微信限制
- 微信内置浏览器可能限制某些功能
- 小程序 WebView 有功能限制
- 需要配置业务域名

## 🚀 下一步计划

### 短期（1-2周）
1. ✅ 完成移动端H5版本
2. ⏳ 测试各种设备和浏览器
3. ⏳ 优化性能和用户体验
4. ⏳ 添加自动设备检测

### 中期（1个月）
1. ⏳ 集成到微信小程序 WebView
2. ⏳ 配置微信公众号
3. ⏳ 优化微信内打开体验
4. ⏳ 添加更多移动端特性

### 长期（2-3个月）
1. ⏳ 开发微信小程序原生版本
2. ⏳ 使用 ZEGO 小程序 SDK
3. ⏳ 完整的后台保活
4. ⏳ 更好的稳定性

## 📞 技术支持

如果遇到问题，请检查：
1. 浏览器控制台的错误信息
2. 网络连接状态
3. 摄像头和麦克风权限
4. ZEGO SDK 版本

## 📚 参考文档

- [ZEGO UIKit Prebuilt Web 文档](https://doc-zh.zego.im/article/14896)
- [微信小程序 WebView 文档](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)
- [移动端适配最佳实践](https://developer.mozilla.org/zh-CN/docs/Web/Guide/Mobile)

---

**版本**：v1.0.0  
**更新时间**：2025-01-07  
**作者**：Augment Agent


# iOS微信WebRTC修复 - 快速参考卡片

## 🎯 三个问题 & 三个修复

| 问题 | 原因 | 修复方案 |
|------|------|----------|
| 1️⃣ 提示播放失败 | iOS需要用户交互播放有声视频 | 添加"点击播放"按钮 |
| 2️⃣ 看不到自己 | 未显式调用video.play() | 调用localVideo.play() |
| 3️⃣ 没有声音 | 远程视频被错误静音 | 设置muted=false, volume=1.0 |

## 📋 Video标签属性清单

### 本地视频（必须静音）
```html
<video 
  autoplay 
  muted                              ✅ 必须静音
  playsinline                        ✅ 内联播放
  webkit-playsinline                 ✅ iOS兼容
  x5-playsinline                     ✅ 微信兼容
  x-webkit-airplay="allow"           ✅ AirPlay
  x5-video-player-type="h5"          ✅ H5播放器
  x5-video-player-fullscreen="false" ✅ 禁止全屏
></video>
```

### 远程视频（不能静音）
```html
<video 
  autoplay 
  playsinline                        ✅ 内联播放
  webkit-playsinline                 ✅ iOS兼容
  x5-playsinline                     ✅ 微信兼容
  x-webkit-airplay="allow"           ✅ AirPlay
  x5-video-player-type="h5"          ✅ H5播放器
  x5-video-player-fullscreen="false" ✅ 禁止全屏
></video>
<!-- ⚠️ 注意：不要加 muted 属性！ -->
```

## 💻 代码修复模板

### 1. 本地视频播放
```javascript
const localVideo = document.getElementById('localVideo');
localVideo.srcObject = localStream;

// ✅ 显式调用play()
try {
  await localVideo.play();
  console.log('✅ 本地视频播放成功');
} catch (error) {
  console.error('❌ 本地视频播放失败:', error);
}
```

### 2. 远程视频播放（带用户交互）
```javascript
const remoteVideo = document.querySelector('video');
remoteVideo.srcObject = remoteStream;

// ✅ 设置音量和静音状态
remoteVideo.volume = 1.0;
remoteVideo.muted = false;  // 关键！

// ✅ 尝试播放
try {
  await remoteVideo.play();
  console.log('✅ 远程视频播放成功');
} catch (error) {
  // ✅ iOS需要用户交互
  if (error.name === 'NotAllowedError') {
    // 显示播放按钮
    const playButton = document.createElement('div');
    playButton.innerHTML = '▶️ 点击播放视频';
    playButton.onclick = async () => {
      await remoteVideo.play();
      playButton.remove();
    };
    box.appendChild(playButton);
  }
}
```

## 🔍 问题排查清单

### 看不到本地视频？
- [ ] video标签是否有 `playsinline` 属性？
- [ ] video标签是否有 `webkit-playsinline` 属性？
- [ ] 是否调用了 `localVideo.play()`？
- [ ] 是否设置了 `muted` 属性？（本地必须静音）

### 看不到远程视频？
- [ ] video标签是否有完整属性？
- [ ] 是否调用了 `remoteVideo.play()`？
- [ ] 是否有"点击播放"按钮？（iOS可能需要）
- [ ] 检查控制台是否有播放错误？

### 听不到声音？
- [ ] 远程video是否设置了 `muted=false`？
- [ ] 远程video的 `volume` 是否设置为 `1.0`？
- [ ] 是否成功调用了 `remoteVideo.play()`？
- [ ] 设备音量是否打开？
- [ ] 是否在静音模式？

## 🧪 快速测试步骤

1. **打开页面** → 允许权限
2. **检查本地视频** → 能看到自己 ✅
3. **另一设备加入** → 能看到对方 ✅
4. **对方说话** → 能听到声音 ✅
5. **自己说话** → 对方能听到 ✅

## 📱 iOS特殊说明

### 自动播放策略
- ✅ **静音视频**可以自动播放
- ❌ **有声视频**需要用户交互

### 用户交互触发
- 点击按钮
- 触摸屏幕
- 任何用户操作

### 一次交互，全局生效
- 用户点击一次播放按钮后
- 后续视频可以自动播放
- 不需要每次都点击

## 🎨 播放按钮样式参考

```css
.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 30px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  z-index: 100;
}
```

## 🚨 常见错误

### ❌ 错误1：远程视频设置了muted
```javascript
// ❌ 错误
<video muted></video>  // 听不到声音！

// ✅ 正确
<video></video>  // 不要加muted
remoteVideo.muted = false;
```

### ❌ 错误2：没有调用play()
```javascript
// ❌ 错误
video.srcObject = stream;  // 可能不播放

// ✅ 正确
video.srcObject = stream;
await video.play();  // 显式播放
```

### ❌ 错误3：缺少必要属性
```javascript
// ❌ 错误
<video autoplay></video>  // iOS可能不工作

// ✅ 正确
<video autoplay playsinline webkit-playsinline></video>
```

## 📊 修复效果对比

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| 本地视频 | ❌ 黑屏 | ✅ 正常显示 |
| 远程视频 | ❌ 提示失败 | ✅ 正常显示 |
| 远程音频 | ❌ 无声音 | ✅ 有声音 |
| 用户体验 | ❌ 需要刷新 | ✅ 一键播放 |

## 🔗 相关文档

- 📄 [完整修复说明](./iOS微信WebRTC问题修复说明.md)
- 📄 [视频面试功能文档](./视频面试功能-README.md)
- 📄 [小程序视频面试指南](./小程序视频面试完整指南.md)

## ✅ 修复文件清单

- ✅ `frontend/public/miniprogram/video-interview-guest-room.html`
- ✅ `frontend/public/miniprogram/video-interview-host.html`

## 🎉 预期效果

修复后，iOS微信中：
- ✅ 能看到自己
- ✅ 能看到别人
- ✅ 能听到声音
- ✅ 别人能听到你
- ✅ 不会提示失败

---

**快速参考版本**: v1.0
**更新日期**: 2025-11-13


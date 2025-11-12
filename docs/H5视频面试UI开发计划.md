# H5 视频面试 UI 开发计划

## 📋 项目概述

将 H5 移动端视频面试从 `ZegoUIKitPrebuilt`（预制 UI）迁移到 `zego-express-engine-webrtc`（底层 SDK），实现完全自定义的移动端视频面试 UI。

**目标用户**：
- 主持人（HR）：完整功能，包括提词器控制、参与者管理、房间管理
- 普通访客（客户）：基础音视频功能
- 阿姨访客（helper）：基础音视频功能 + 接收提词器

---

## 🎨 UI 设计要求

### 1. 整体布局（基于 iPhone 14 Pro: 393×852px）

```
┌─────────────────────────────────────────┐
│ 📱 房间: room_123  📶信号  ⏱️ 00:15:32  │ ← 顶部状态栏 (60px)
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┬──────────────┐       │
│  │              │              │       │
│  │   张三(我)   │   李四(客户) │       │ ← 4宫格视频区域
│  │              │              │       │   (flex: 1, 自适应)
│  │   🔇 📹 👢   │              │       │   右下角操作按钮(仅主持人)
│  └──────────────┴──────────────┘       │
│  ┌──────────────┬──────────────┐       │
│  │              │              │       │
│  │  王五(阿姨)  │    (空位)    │       │
│  │              │              │       │
│  │   🔇 📹 👢   │              │       │
│  └──────────────┴──────────────┘       │
│                                         │
│  ↓ 下滑查看更多参与者 ↓                │ ← 可滑动提示
│  ┌──────────────┬──────────────┐       │
│  │  赵六(观察)  │  孙七(记录)  │       │ ← 第5、6人(需上滑)
│  └──────────────┴──────────────┘       │
│                                         │
├─────────────────────────────────────────┤
│  🎤   📹   🔄   🎨   ⭕   ▶️     │ ← 底部工具栏 (100px)
│  麦   视   翻   美   挂   展     │
│  克   频   转   颜   断   开     │
└─────────────────────────────────────────┘
```

### 2. 尺寸规范

#### 顶部状态栏
- **高度**：60px
- **背景**：`rgba(0, 0, 0, 0.7)` + `backdrop-filter: blur(10px)`
- **内容**：
  - 左侧：房间号（14px 字体）
  - 中间：信号强度指示器（4 个竖条，4px 宽，高度递增）
  - 右侧：时长计时器（14px 字体，等宽数字）

#### 视频区域
- **布局**：2×2 网格（`display: grid`）
- **间距**：4px
- **每个容器**：
  - 宽度：~190px（自适应）
  - 高度：~343px（自适应）
  - 圆角：12px
  - 边框：2px solid rgba(255, 255, 255, 0.1)
- **视频标签**：
  - 位置：左下角，距离 8px
  - 背景：`rgba(0, 0, 0, 0.6)` + `backdrop-filter: blur(8px)`
  - 内边距：4px 12px
  - 圆角：12px
  - 字体：13px，500 字重

#### 小容器操作按钮（仅主持人）
- **尺寸**：32px × 32px
- **位置**：右下角，距离 8px
- **背景**：`rgba(0, 0, 0, 0.7)` + `backdrop-filter: blur(8px)`
- **图标**：16px
- **间距**：6px
- **按钮**：
  - 🔇 禁言
  - 📹 禁视频
  - 👢 踢人

#### 底部工具栏
- **高度**：100px
- **背景**：`rgba(0, 0, 0, 0.8)` + `backdrop-filter: blur(10px)`
- **按钮尺寸**：
  - 主按钮：56px × 56px（麦克风、摄像头、翻转、美颜）
  - 挂断按钮：64px × 64px（红色，更大）
  - 展开按钮：48px × 48px（右侧）
- **图标**：28px
- **间距**：12px
- **按钮样式**：
  - 背景：`rgba(255, 255, 255, 0.15)`
  - 边框：2px solid rgba(255, 255, 255, 0.2)
  - 圆角：50%
  - 激活状态：背景 #5DBFB3

#### 右侧抽屉
- **宽度**：280px
- **背景**：白色
- **阴影**：`-4px 0 20px rgba(0, 0, 0, 0.3)`
- **菜单项高度**：56px
- **图标**：24px
- **字体**：16px，500 字重
- **内容**：
  - 📝 提词器控制（仅主持人）/ 提词器（仅阿姨）
  - 👥 参与者列表
  - 🔗 分享链接（仅主持人）
  - ⚙️ 设置
  - 🚪 离开房间
  - ⚠️ 解散房间（仅主持人，红色）

#### 提词器半屏
- **高度**：50vh (~426px)
- **宽度**：`calc(100vw - 20px)`（距离两侧 10px）
- **位置**：距离顶部 60px
- **背景**：`rgba(255, 255, 255, 0.98)` + `backdrop-filter: blur(20px)`
- **圆角**：16px
- **阴影**：`0 8px 32px rgba(0, 0, 0, 0.3)`
- **标题栏**：56px 高
- **内容区**：可滚动，20px 内边距

### 3. 响应式适配

**小屏幕（≤375px）**：
- 主按钮：48px × 48px
- 挂断按钮：56px × 56px
- 展开按钮：40px × 40px
- 图标：24px
- 间距：8px

---

## ✅ 已完成的工作

### 1. SDK 迁移（100%）
- ✅ 从 `ZegoUIKitPrebuilt` 迁移到 `zego-express-engine-webrtc`
- ✅ 实现 ZEGO 引擎初始化
- ✅ 实现房间登录/登出
- ✅ 实现本地流创建和推送
- ✅ 实现远端流拉取
- ✅ 实现事件监听（roomStreamUpdate, roomStateUpdate）
- ✅ 实现参与者列表管理
- ✅ 实现清理逻辑

### 2. 核心组件创建（100%）
- ✅ **H5VideoRoom.tsx**：核心视频房间组件
  - 完整的 ZEGO SDK 集成
  - 角色权限控制（host/guest/helper）
  - 音视频控制函数（toggleMicrophone, toggleCamera, switchCamera, toggleBeauty）
  - 参与者管理函数（handleMuteUser, handleMuteVideo, handleKickUser）
  - 状态管理（duration, signalStrength, participants）

- ✅ **H5VideoRoom.css**：精心设计的样式
  - 所有尺寸精确计算
  - 流畅的动画效果
  - 现代化的视觉风格
  - 响应式适配

- ✅ **H5Entry.tsx**：简化的入口页面
  - 清爽的登录界面
  - 房间号生成功能
  - 自动保存上次房间号
  - 进入房间后自动切换到 H5VideoRoom

### 3. UI 布局（90%）
- ✅ 顶部状态栏（房间号、信号、时长）
- ✅ 4宫格视频布局（2×2 网格）
- ✅ 底部工具栏（6 个按钮）
- ✅ 右侧抽屉（菜单项）
- ✅ 提词器半屏（结构）
- ✅ 小容器操作按钮（结构）
- ⚠️ 本地视频渲染（已实现）
- ⚠️ 远端视频渲染（结构已有，需完善动态渲染）

### 4. 编译测试（100%）
- ✅ TypeScript 编译通过
- ✅ Vite 构建成功
- ✅ 无类型错误
- ✅ 无语法错误

---

## 🔨 待完成的工作

### 优先级 P0（核心功能，必须完成）

#### 1. 远端视频动态渲染 ⭐⭐⭐
**问题**：当前远端流已经拉取，但没有动态创建 `<video>` 元素并绑定

**解决方案**：
```tsx
// 在 H5VideoRoom.tsx 中添加
useEffect(() => {
  participants.forEach(participant => {
    if (participant.stream) {
      const videoElement = remoteVideoRefs.current.get(participant.streamId);
      if (videoElement && videoElement.srcObject !== participant.stream) {
        videoElement.srcObject = participant.stream;
        videoElement.play().catch(err => {
          console.error('播放远端视频失败:', err);
        });
      }
    }
  });
}, [participants]);
```

**文件位置**：`frontend/src/pages/interview/H5VideoRoom.tsx` 第 170-180 行

**预计时间**：30 分钟

---

#### 2. 滑动查看第 5、6 人 ⭐⭐
**需求**：主屏显示 4 人，第 5、6 人在下方，需要上滑才能看到

**解决方案**：
```tsx
// 修改视频容器
<div className="video-container" style={{ overflowY: 'auto' }}>
  {/* 前 4 人 */}
  <div className="video-grid-main">
    {[localVideo, ...participants.slice(0, 3)].map(...)}
  </div>
  
  {/* 第 5、6 人 */}
  {participants.length > 3 && (
    <div className="video-grid-extra">
      {participants.slice(3, 5).map(...)}
    </div>
  )}
</div>
```

**CSS 调整**：
```css
.video-container {
  overflow-y: auto;
  scroll-behavior: smooth;
}

.video-grid-main {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 4px;
  min-height: calc(100vh - 160px);
}

.video-grid-extra {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding-top: 4px;
}
```

**文件位置**：
- `frontend/src/pages/interview/H5VideoRoom.tsx` 第 290-330 行
- `frontend/src/pages/interview/H5VideoRoom.css` 第 50-80 行

**预计时间**：1 小时

---

#### 3. 提词器功能完善 ⭐⭐⭐
**需求**：
- 主持人：推送提词器内容、控制播放/暂停/停止
- 阿姨：接收并显示提词器内容

**解决方案**：

**主持人端**：
```tsx
// 推送提词器
const pushTeleprompter = async () => {
  try {
    await apiService.post('/api/zego/push-teleprompter', {
      roomId,
      content: teleprompterContent,
      targetUserIds: ['helper'], // 只推送给阿姨
      scrollSpeed: 50,
      displayHeight: '50vh'
    });
    message.success('提词器已推送');
  } catch (error) {
    message.error('推送失败');
  }
};
```

**阿姨端**：
```tsx
// 监听提词器消息
useEffect(() => {
  if (role === 'helper' && zegoEngineRef.current) {
    zegoEngineRef.current.on('roomExtraInfoUpdate', (roomID, data) => {
      if (data.type === 'TELEPROMPTER') {
        setTeleprompterContent(data.content);
        setIsTeleprompterOpen(true);
      }
    });
  }
}, [role]);
```

**文件位置**：`frontend/src/pages/interview/H5VideoRoom.tsx` 第 200-250 行

**预计时间**：2 小时

---

### 优先级 P1（重要功能，尽快完成）

#### 4. 参与者管理功能 ⭐⭐
**需求**：
- 显示参与者列表
- 禁言/禁视频/踢人功能
- 实时状态更新

**解决方案**：
```tsx
// 参与者列表抽屉
<div className="participants-list">
  {participants.map(p => (
    <div key={p.userId} className="participant-item">
      <span>{p.userName}</span>
      {role === 'host' && (
        <Space>
          <Button onClick={() => handleMuteUser(p)}>禁言</Button>
          <Button onClick={() => handleMuteVideo(p)}>禁视频</Button>
          <Button danger onClick={() => handleKickUser(p)}>踢出</Button>
        </Space>
      )}
    </div>
  ))}
</div>
```

**后端 API 调用**：
- `/api/zego/mute-user` - 禁言
- `/api/zego/mute-video` - 禁视频
- `/api/zego/kick-user` - 踢人

**文件位置**：`frontend/src/pages/interview/H5VideoRoom.tsx` 第 350-400 行

**预计时间**：1.5 小时

---

#### 5. 分享链接功能 ⭐
**需求**：生成邀请链接，复制到剪贴板

**解决方案**：
```tsx
const generateShareLink = () => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/interview/join/${roomId}`;
};

const copyShareLink = () => {
  const link = generateShareLink();
  navigator.clipboard.writeText(link).then(() => {
    message.success('链接已复制');
  });
};
```

**文件位置**：`frontend/src/pages/interview/H5VideoRoom.tsx` 第 250-270 行

**预计时间**：30 分钟

---

### 优先级 P2（优化功能，有时间再做）

#### 6. 美颜功能 ⭐
**需求**：使用 ZegoExpressEngine 的美颜 API

**解决方案**：
```tsx
const toggleBeauty = () => {
  if (!zegoEngineRef.current) return;
  
  const newState = !beautyEnabled;
  setBeautyEnabled(newState);
  
  // ZEGO 美颜 API（需要查阅文档）
  zegoEngineRef.current.enableBeautify(newState);
  
  if (newState) {
    zegoEngineRef.current.setBeautifyOption({
      whitening: 50,
      smoothing: 60,
      sharpening: 30
    });
  }
};
```

**文件位置**：`frontend/src/pages/interview/H5VideoRoom.tsx` 第 200-220 行

**预计时间**：1 小时（需要查阅 ZEGO 文档）

---

#### 7. 摄像头翻转 ⭐
**需求**：切换前后摄像头

**解决方案**：
```tsx
const switchCamera = async () => {
  if (!zegoEngineRef.current || !roomInfo) return;
  
  try {
    // 停止当前流
    await zegoEngineRef.current.stopPublishingStream(`${roomInfo.roomId}_${roomInfo.userId}_main`);
    
    // 销毁当前流
    if (localStreamRef.current) {
      zegoEngineRef.current.destroyStream(localStreamRef.current);
    }
    
    // 创建新流（切换摄像头）
    const newStream = await zegoEngineRef.current.createStream({
      camera: {
        audio: true,
        video: true,
        videoInput: isFrontCamera ? 'environment' : 'user'
      }
    });
    
    localStreamRef.current = newStream;
    setIsFrontCamera(!isFrontCamera);
    
    // 重新推流
    await zegoEngineRef.current.startPublishingStream(
      `${roomInfo.roomId}_${roomInfo.userId}_main`,
      newStream
    );
    
    message.success('摄像头已翻转');
  } catch (error) {
    message.error('翻转失败');
  }
};
```

**文件位置**：`frontend/src/pages/interview/H5VideoRoom.tsx` 第 220-250 行

**预计时间**：1 小时

---

#### 8. 访客端实现 ⭐⭐
**需求**：复用 H5VideoRoom 组件，实现访客端（guest 和 helper）

**解决方案**：
```tsx
// 在 JoinInterviewMobile.tsx 中
if (isMobile && inMeeting && roomInfo) {
  return (
    <H5VideoRoom
      roomId={roomInfo.roomId}
      userId={roomInfo.userId}
      userName={roomInfo.userName}
      role="guest" // 或 "helper"
      onLeave={handleLeave}
    />
  );
}
```

**文件位置**：`frontend/src/pages/interview/JoinInterviewMobile.tsx`

**预计时间**：1 小时

---

## 📂 相关文件清单

### 新创建的文件
- ✅ `frontend/src/pages/interview/H5VideoRoom.tsx` - 核心视频房间组件
- ✅ `frontend/src/pages/interview/H5VideoRoom.css` - 样式文件
- ✅ `frontend/src/pages/interview/H5Entry.tsx` - 入口页面（已重写）

### 需要修改的文件
- ⏳ `frontend/src/pages/interview/JoinInterviewMobile.tsx` - 访客端集成
- ⏳ `frontend/src/services/zego.ts` - 可能需要添加新的 API 调用

### 不要修改的文件
- ❌ `frontend/src/pages/interview/VideoInterview.tsx` - PC 端 HR 界面（用户明确要求不动）
- ❌ `frontend/src/pages/interview/JoinInterview.tsx` - PC 端访客界面

---

## 🚀 下次工作从这里开始

### 第一步：测试基础功能（15 分钟）
1. 启动开发服务器：
   ```bash
   cd frontend
   npm run dev
   ```

2. 访问：`http://localhost:5173/interview/h5-entry`

3. 测试：
   - ✅ 创建房间
   - ✅ 本地视频显示
   - ⚠️ 远端视频显示（预计会有问题）
   - ✅ 底部工具栏按钮
   - ✅ 右侧抽屉展开

### 第二步：修复远端视频渲染（30 分钟）
**文件**：`frontend/src/pages/interview/H5VideoRoom.tsx`

**位置**：第 170 行左右，在现有的 `useEffect` 后面添加：

```tsx
// 渲染远端视频
useEffect(() => {
  participants.forEach(participant => {
    if (participant.stream) {
      const videoElement = remoteVideoRefs.current.get(participant.streamId);
      if (videoElement && videoElement.srcObject !== participant.stream) {
        videoElement.srcObject = participant.stream;
        videoElement.play().catch(err => {
          console.error('播放远端视频失败:', err);
        });
      }
    }
  });
}, [participants]);
```

### 第三步：实现滑动查看第 5、6 人（1 小时）
按照上面 "待完成的工作 - 优先级 P0 - 第 2 项" 的方案实现。

### 第四步：完善提词器功能（2 小时）
按照上面 "待完成的工作 - 优先级 P0 - 第 3 项" 的方案实现。

---

## 📊 进度总结

| 模块 | 进度 | 状态 |
|------|------|------|
| SDK 迁移 | 100% | ✅ 完成 |
| 核心组件 | 100% | ✅ 完成 |
| UI 布局 | 90% | ⚠️ 进行中 |
| 本地视频 | 100% | ✅ 完成 |
| 远端视频 | 70% | ⚠️ 待完善 |
| 音视频控制 | 80% | ⚠️ 待完善 |
| 提词器 | 30% | ⏳ 待开发 |
| 参与者管理 | 50% | ⏳ 待开发 |
| 分享链接 | 0% | ⏳ 待开发 |
| 美颜功能 | 20% | ⏳ 待开发 |
| 摄像头翻转 | 20% | ⏳ 待开发 |
| 访客端 | 0% | ⏳ 待开发 |

**总体进度**：约 60%

---

## 💡 技术要点提醒

1. **ZEGO SDK 文档**：https://doc-zh.zego.im/article/7637
2. **视频元素必须设置**：`autoPlay`, `playsInline`, `muted`（本地视频）
3. **远端视频播放**：需要调用 `.play()` 方法，并处理 Promise
4. **移动端权限**：首次访问需要用户授权摄像头和麦克风
5. **网络要求**：建议 WiFi 或 4G/5G，3G 可能卡顿
6. **浏览器兼容**：iOS Safari 14+, Android Chrome 90+

---

## 🎯 最终目标

实现一个**完全自定义**的移动端视频面试 UI，包括：
- ✅ 精美的视觉设计
- ✅ 流畅的交互体验
- ⏳ 完整的功能支持
- ⏳ 稳定的音视频通话
- ⏳ 角色权限控制
- ⏳ 提词器功能（核心卖点）

---

**祝您下班愉快！下次继续加油！** 🚀


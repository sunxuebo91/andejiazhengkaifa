# 视频面试功能 - 总览文档

> **版本**：v1.0.0  
> **最后更新**：2024-01-15  
> **维护者**：安得家政技术团队

---

## 📚 文档导航

| 文档名称 | 说明 | 适用人群 |
|---------|------|---------|
| **小程序视频面试完整指南.md** | 小程序端完整集成指南 | 小程序开发者（必读） |

---

## 🎯 功能概述

### 核心功能

1. **视频通话**
   - 多人视频通话（最多6人）
   - 720P高清视频质量
   - 实时音视频传输
   - 自动布局切换

2. **美颜功能**
   - 美白、磨皮、锐化、红润调节
   - 实时预览效果

3. **提词器功能**
   - 主持人推送提词内容
   - 指定用户接收
   - 滚动速度控制

4. **房间管理**
   - 创建面试房间
   - 邀请他人加入
   - 解散房间

---

## 🚀 快速开始

### 小程序端集成

#### 1. 配置业务域名
在微信小程序后台添加业务域名：
```
https://crm.andejiazheng.com
```

#### 2. 配置服务器域名
添加以下域名到服务器域名白名单：
```
https://crm.andejiazheng.com
https://zego-webrtc-*.zego.im
wss://zego-webrtc-*.zego.im
```

#### 3. 创建视频面试页面
参考 `docs/小程序视频面试完整指南.md` 中的完整代码示例

---

## 🔌 核心API接口

### 1. 生成ZEGO Token（已登录用户）

**接口**：`POST /api/zego/generate-token`  
**认证**：✅ 需要JWT Token  
**用途**：HR用户创建房间并生成Token

**请求示例**：
```javascript
const { request } = require('../../../utils/request');

const res = await request('/zego/generate-token', 'POST', {
  userId: wx.getStorageSync('userId'),
  roomId: 'room_1234567_abc',
  userName: '张三',
  expireTime: 7200
});
```

### 2. 生成访客Token（无需登录）

**接口**：`POST /api/zego/generate-guest-token`  
**认证**：❌ 无需认证  
**用途**：访客（应聘者）加入房间

**请求示例**：
```javascript
const { publicRequest } = require('../../../utils/request');

const res = await publicRequest('/zego/generate-guest-token', 'POST', {
  userId: 'guest_456',
  roomId: 'room_1234567_abc',
  userName: '李四',
  expireTime: 7200
});
```

### 3. 检查房间状态

**接口**：`POST /api/zego/check-room`  
**认证**：❌ 无需认证  
**用途**：检查房间是否存在、是否已解散

**请求示例**：
```javascript
const res = await publicRequest('/zego/check-room', 'POST', {
  roomId: 'room_1234567_abc'
});
```

### 4. 解散房间

**接口**：`POST /api/zego/dismiss-room`  
**认证**：✅ 需要JWT Token（仅主持人）  
**用途**：主持人解散房间，强制踢出所有用户

**请求示例**：
```javascript
const res = await request('/zego/dismiss-room', 'POST', {
  roomId: 'room_1234567_abc'
});
```

---

## 📱 业务流程

### HR创建面试流程

```
1. 小程序登录（获取JWT Token）
   ↓
2. 点击"创建面试"
   ↓
3. 生成房间号（前端生成）
   ↓
4. 调用 /api/zego/generate-token（自动创建房间）
   ↓
5. 跳转到WebView视频页面
   ↓
6. 分享房间号/小程序码给应聘者
```

### 访客加入流程

```
1. 收到分享链接/扫码
   ↓
2. 打开小程序访客加入页面
   ↓
3. 填写姓名
   ↓
4. 调用 /api/zego/generate-guest-token
   ↓
5. 跳转到WebView视频页面
   ↓
6. 参与视频面试
```

---

## 🎨 设计规范

### 主题色
- **主色**：#5DBFB3（青绿色）
- **辅助色**：#4A9D93（深青绿）

### UI要求
- 按钮大小：至少44x44px（易于点击）
- 字体大小：14-16px（清晰易读）
- 提词器字体：16-32px可调（确保阿姨们看得清）

---

## ⚠️ 重要说明

### 1. 认证机制

- **已登录用户（HR）**：使用 `POST /api/zego/generate-token`，需要JWT Token
- **访客用户（应聘者）**：使用 `POST /api/zego/generate-guest-token`，无需认证

### 2. 房间创建

- 房间号由**前端生成**：`room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
- 调用 `/api/zego/generate-token` 时会**自动创建房间**
- 只有主持人可以创建房间，访客只能加入已存在的房间

### 3. WebView通信

- H5页面通过 `window.wx.miniProgram.postMessage()` 向小程序发送消息
- 小程序通过 `bindmessage` 接收消息
- **注意**：postMessage只在特定时机触发（页面后退、组件销毁、分享）

### 4. 权限检查

- 视频面试需要摄像头和麦克风权限
- 加入前必须检查并请求权限
- 参考 `utils/permission.js` 工具函数

---

## 🔧 技术栈

- **前端**：微信小程序原生 + React H5（WebView）
- **后端**：NestJS + TypeScript
- **数据库**：MySQL
- **视频SDK**：ZEGO Cloud UIKit Prebuilt
- **认证**：JWT Token

---

## 📞 技术支持

如有问题，请查看：
1. `docs/小程序视频面试完整指南.md` - 完整集成指南
2. 后端API实现：`backend/src/modules/zego/zego.controller.ts`
3. 前端H5实现：`frontend/src/pages/interview/VideoInterviewMiniprogram.tsx`

---

## 📝 更新日志

### v1.0.0 (2024-01-15)
- ✅ 完成小程序视频面试功能
- ✅ 支持已登录用户和访客两种模式
- ✅ 集成美颜、提词器功能
- ✅ 完善文档和代码示例

---

**维护者**：安得家政技术团队  
**联系方式**：技术支持群


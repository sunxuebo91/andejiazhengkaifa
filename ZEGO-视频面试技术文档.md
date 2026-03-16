# Zego 视频面试技术文档

## 一、概述

你的安得家政 CRM 系统使用 **Zego（极光）** 实时音视频服务来实现视频面试功能。

- **产品名称**: ZEGO Express Video（极速视频）
- **接入方式**: ZEGO UIKit（Web 端）+ 自有后端 Token 认证
- **应用场景**: 面试间一对一视频面试

---

## 二、架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   前端 Web      │────▶│   NestJS 后端     │────▶│   Zego 云服务    │
│ (ZEGO UIKit)   │     │  (生成 Token)     │     │  (实时音视频)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 前后端交互流程

1. **前端** → 请求后端 `/api/zego/generate-token`
2. **后端** → 使用 ZEGO Server Secret 生成 Token
3. **后端** → 返回 Token + AppID 给前端
4. **前端** → 使用 Token 初始化 ZEGO UIKit 加入房间

---

## 三、前端集成

### 3.1 依赖

```bash
# ZEGO UIKit (已在你的项目中)
npm install zego-uikit-prebuilt
```

### 3.2 核心代码

**Token 生成服务** (`/frontend/src/services/zego.ts`):

```typescript
// 请求参数
interface GenerateTokenParams {
  userId: string;      // 用户ID
  roomId: string;      // 房间ID
  userName: string;    // 用户名称
  expireTime?: number; // 过期时间(秒)，默认7200
}

// 获取 Token
export const generateZegoToken = async (params: GenerateTokenParams) => {
  return await apiService.post<GenerateTokenData>(
    '/api/zego/generate-token',
    params
  );
};

// 获取 ZEGO 配置
export const getZegoConfig = async () => {
  return await apiService.get<ZegoConfigData>('/api/zego/config');
};
```

### 3.3 初始化视频面试

```typescript
import { ZegoUIKitPrebuilt } from '@zego-uikit/prebuilt';

const zp = ZegoUIKitPrebuilt.create(yourAppId);
zp.joinRoom({
  token: tokenFromServer,
  container: document.querySelector('#root'),
  // ...
});
```

---

## 四、后端集成

### 4.1 依赖配置

**环境变量**:
```
ZEGO_APP_ID=你的AppID
ZEGO_SERVER_SECRET=你的ServerSecret
```

### 4.2 Token 生成

使用 ZEGO 官方 `zegoServerAssistant` 生成 Token04:

```typescript
const { generateToken04 } = require('./server/zegoServerAssistant');

const token = generateToken04(
  appId,        // ZEGO AppID
  userId,       // 用户ID
  serverSecret, // Server Secret
  expireTime,   // 过期时间(秒)
  payload       // UIKit 为空字符串
);
```

### 4.3 房间管理

后端 `ZegoService` 实现了完整的房间管理:

| 功能 | 说明 |
|------|------|
| `createRoom` | 创建房间 |
| `joinRoom` | 用户加入 |
| `leaveRoom` | 用户离开 |
| `kickUser` | 踢出用户（主持人权限） |
| `dismissRoom` | 解散房间 |
| `checkRoom` | 检查房间状态 |

### 4.4 高级功能

| 功能 | 说明 |
|------|------|
| **提词器** | 主持人推送面试题目，候选人端同步显示 |
| **远程控制** | 主持人可开启/关闭候选人摄像头/麦克风 |
| **超时自动关闭** | 10分钟无活动自动关闭房间 |

---

## 五、API 接口

### 5.1 生成 Token

```
POST /api/zego/generate-token
```

**请求**:
```json
{
  "userId": "user_123",
  "roomId": "interview_room_456",
  "userName": "张三"
}
```

**响应**:
```json
{
  "token": "xxxxx",
  "appId": 123456789
}
```

### 5.2 获取配置

```
GET /api/zego/config
```

**响应**:
```json
{
  "appId": 123456789
}
```

---

## 六、角色与权限

| 角色 | 权限 |
|------|------|
| **主持人 (Host)** | 创建房间、解散房间、踢人、远程控制、提词器 |
| **候选人 (Guest)** | 加入/离开房间、接收提词器内容 |

---

## 七、房间生命周期

```
创建房间 ──▶ 候选人加入 ──▶ 面试进行 ──▶ 面试结束 ──▶ 房间解散
    │              │               │              │
    │              │               │              │
 10分钟无活动自动关闭   主持人离开10分钟    手动解散
    (兜底)            无人自动关闭
```

---

## 八、技术指标

| 指标 | 数值 |
|------|------|
| 端到端延迟 | 200-400ms |
| 视频分辨率 | 最高 4K 60fps |
| 音频采样率 | 16-48kHz |
| 抗丢包（音频） | 80% |
| 抗丢包（视频） | 70% |
| 抗低带宽 | 最低 30kbps |

---

## 九、相关文件

| 路径 | 说明 |
|------|------|
| `frontend/src/services/zego.ts` | 前端 ZEGO 服务 |
| `frontend/src/services/interview.service.ts` | 面试服务 |
| `backend/src/modules/zego/zego.service.ts` | 后端 ZEGO 服务 |
| `backend/src/modules/zego/zego.controller.ts` | 后端 API 控制器 |
| `backend/src/modules/interview/` | 面试间业务逻辑 |

---

## 十、注意事项

1. **Token 安全性**: Token 生成在服务端，前端只负责使用
2. **房间超时**: 10分钟无活动自动清理，需处理前端断线重连
3. **主持人权限**: 只有主持人才有踢人、解散房间权限
4. **黑名单机制**: 被踢出的用户无法再次加入同一房间
5. **ZEGO UIKit**: 使用预构建的 UI 组件，快速接入

---

## 附录：ZEGO 官方资源

- 官网: https://zego.im
- 文档: https://doc-zh.zego.im
- 控制台: https://console.zego.im

---

## 附录二：ZEGO 完整能力一览

### 你正在使用的功能 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| 实时音视频通话 | ✅ | 1v1 视频面试 |
| Token 认证 | ✅ | 后端生成 Token |
| 房间管理 | ✅ | 创建/加入/解散/踢人 |
| 提词器 | ✅ | 推送面试题目 |
| 远程控制 | ✅ | 开关摄像头/麦克风 |
| 超时自动关闭 | ✅ | 10分钟无活动自动清理 |

### 可用但未使用的功能 📌

| 功能 | 说明 | 接入难度 |
|------|------|----------|
| **屏幕共享** | 候选人共享本地屏幕 | ⭐⭐ |
| **视频录制** | 面试全程录制保存 | ⭐⭐ |
| **截图** | 面试中截图存档 | ⭐ |
| **美颜/滤镜** | 基础美颜、贴纸 | ⭐ |
| **AI 降噪** | 智能降噪背景噪音 | ⭐ |
| **背景虚化/分割** | 虚拟背景 | ⭐⭐ |
| **变声/混响** | 30+ 种音效 | ⭐⭐ |
| **设备检测** | 通话前检测摄像头/麦克风 | ⭐ |
| **网络检测** | 实时网络质量监控 | ⭐ |
| **多房间直播** | 面试官可同时看多场面试 | ⭐⭐⭐ |
| **旁路转推 CDN** | 直播推送到 CDN | ⭐⭐⭐ |

### 未来扩展建议

1. **录制面试** - 面试回放/存档
2. **设备检测** - 候选人进入前自检
3. **屏幕共享** - 候选人展示作品
4. **美颜** - 提升形象

---

## 附录三：常见问题

**Q: 如何更换 ZEGO AppID?**
> 修改后端环境变量 `ZEGO_APP_ID` 和 `ZEGO_SERVER_SECRET`

**Q: 视频卡顿怎么办?**
> 开启 AI 降噪、检查网络、在设置中降低分辨率

**Q: 如何实现面试录制?**
> 需要在 ZEGO 控制台开启云录制，或使用本地录制

**Q: 支持多少人同时面试?**
> Web 端支持 50 路实时通话，1v1 面试完全够用

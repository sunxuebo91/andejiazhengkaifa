# 📹 视频面试角色与流程说明

## 🎭 两种角色

### 1️⃣ HR/主持人（Host）
- **身份**：面试官、HR、招聘人员
- **权限**：创建房间、邀请他人、管理参与者、结束面试
- **使用场景**：发起面试、主持面试过程

### 2️⃣ 访客/求职者（Guest）
- **身份**：求职者、应聘者
- **权限**：加入房间、参与面试（权限受限）
- **使用场景**：接受邀请、参加面试

---

## 🔄 完整流程

### 方式一：PC端流程

#### HR主持人（PC端）
1. 登录系统：https://crm.andejiazheng.com
2. 点击左侧菜单 **"视频面试"**
3. 点击 **"生成新房间号"** 按钮
4. 点击 **"加入视频面试"** 按钮（以主持人身份进入）
5. 点击 **"邀请他人"** 按钮，复制分享链接
6. 将链接发送给求职者

#### 求职者（PC端）
1. 收到HR发送的链接（例如：`https://crm.andejiazheng.com/interview/join/room_xxx`）
2. 点击链接打开页面
3. 填写姓名和身份信息
4. 点击 **"加入面试"** 按钮
5. 以访客身份进入面试房间

---

### 方式二：小程序流程

#### HR主持人（小程序）
1. 在小程序中创建面试房间（获得房间号）
2. 跳转到视频面试页面：
   ```javascript
   wx.navigateTo({
     url: `/pages/interview/interview?roomId=${roomId}`
   })
   ```
3. 小程序自动加载 H5 页面：`https://crm.andejiazheng.com/interview/video-mobile/${roomId}`
4. **以主持人身份进入房间**（自动使用登录用户信息）
5. 在房间内可以邀请他人、管理参与者

#### 求职者（小程序或H5）
1. 收到HR发送的链接或房间号
2. 访问访客加入页面：`https://crm.andejiazheng.com/interview/join-mobile/${roomId}`
3. 填写姓名和身份信息
4. 点击 **"加入面试"** 按钮
5. 以访客身份进入面试房间

---

## 🔗 URL 路由说明

### HR主持人页面
| 平台 | 路由 | 说明 |
|------|------|------|
| PC端 | `/interview/video` | 需要登录，可创建/加入房间 |
| 移动端 | `/interview/video-mobile/:roomId` | 需要登录，直接进入指定房间 |

### 访客加入页面
| 平台 | 路由 | 说明 |
|------|------|------|
| PC端 | `/interview/join/:roomId` | 无需登录，填写信息后加入 |
| 移动端 | `/interview/join-mobile/:roomId` | 无需登录，填写信息后加入 |

---

## 📱 小程序集成说明

### 当前实现
小程序的 `pages/interview/interview.js` 页面：
- **用途**：HR主持人创建面试后，跳转到此页面
- **加载的H5页面**：`/interview/video-mobile/:roomId`
- **身份**：主持人（使用登录用户信息）
- **权限**：完整的主持人权限

### 代码示例
```javascript
// miniprogram-pages/interview/interview.js
Page({
  data: {
    webviewUrl: '',
    roomId: ''
  },

  onLoad(options) {
    const roomId = options.roomId || '';
    
    if (!roomId) {
      wx.showToast({
        title: '房间号不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 构建 H5 页面 URL - 使用HR主持人移动端页面
    const h5Url = `https://crm.andejiazheng.com/interview/video-mobile/${roomId}`;
    
    this.setData({
      webviewUrl: h5Url,
      roomId: roomId
    });
  }
});
```

---

## 🎯 关键区别

| 特性 | HR主持人 | 访客/求职者 |
|------|----------|------------|
| **登录要求** | ✅ 需要登录 | ❌ 无需登录 |
| **创建房间** | ✅ 可以 | ❌ 不可以 |
| **邀请他人** | ✅ 可以 | ❌ 不可以 |
| **管理参与者** | ✅ 可以 | ❌ 不可以 |
| **结束面试** | ✅ 可以 | ❌ 不可以 |
| **音视频控制** | ✅ 完整控制 | ✅ 仅控制自己 |
| **屏幕共享** | ✅ 可以 | ✅ 可以 |
| **文字聊天** | ✅ 可以 | ✅ 可以 |

---

## 🔧 技术实现

### HR主持人页面
- **PC端**：`VideoInterview.tsx`
- **移动端**：`VideoInterviewMobile.tsx`
- **特点**：
  - 需要登录验证
  - 自动获取用户信息
  - 完整的房间管理功能
  - 可以生成邀请链接

### 访客加入页面
- **PC端**：`JoinInterview.tsx`
- **移动端**：`JoinInterviewMobile.tsx`
- **特点**：
  - 无需登录
  - 需要填写姓名和身份
  - 权限受限
  - 自动生成访客ID

---

## 📝 使用建议

### 对于HR/面试官
1. 使用PC端或小程序创建面试房间
2. 提前进入房间测试设备
3. 通过"邀请他人"功能获取链接
4. 将链接发送给求职者
5. 等待求职者加入后开始面试

### 对于求职者
1. 收到HR发送的链接后，点击打开
2. 填写真实姓名和身份信息
3. 确保网络稳定、设备正常
4. 点击"加入面试"按钮
5. 进入房间后等待面试开始

---

## ⚠️ 注意事项

1. **小程序跳转**：小程序中的面试页面是为HR主持人设计的，不是访客页面
2. **URL区别**：
   - 主持人：`/interview/video-mobile/:roomId`
   - 访客：`/interview/join-mobile/:roomId`
3. **权限控制**：访客无法创建房间、邀请他人或管理参与者
4. **登录状态**：主持人页面需要登录，访客页面无需登录

---

## 🎨 主题色

所有视频面试页面统一使用主题色：**#5DBFB3**（青绿色）

- 按钮主色调
- 图标激活状态
- 强调元素
- 品牌标识

---

## 📞 技术支持

如有问题，请联系技术团队。


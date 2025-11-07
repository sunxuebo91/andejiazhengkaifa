# 访客重复进入视频房间问题修复

## 问题描述

当同一个访客（客户或阿姨）退出视频面试房间后再次进入时，原来的视频画面仍然存在，导致同一个人的画面出现多次，且原来的画面"卡"在那里不会消失。

## 根本原因

问题有两个层面：

### 1. 用户ID不一致
每次访客进入房间时，系统都会生成一个新的随机 `guestId`：

```javascript
const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
```

这导致 ZEGO SDK 认为这是一个**全新的用户**加入房间，而不是同一个用户重新进入。

### 2. 视频画面未清理
当用户离开房间时，ZEGO SDK 应该自动清理该用户的视频流和 DOM 元素，但由于某种原因（可能是网络延迟、SDK bug 或状态同步问题），**离开用户的视频画面会"卡"在界面上**，不会被自动移除。

因此：
1. 旧的用户会话不会被自动清理
2. 旧的视频画面会继续显示在房间中（卡住）
3. 新的用户会话会创建新的视频画面
4. 结果就是同一个人的画面出现多次

## 解决方案

采用**三重修复策略**：

### 策略1：持久化访客ID（解决用户ID不一致问题）
使用 **localStorage** 为每个访客生成并存储一个持久化的唯一ID，确保同一个访客在退出重新进入时使用相同的 `userId`。

### 策略2：手动清理视频元素（解决画面卡住问题）
在 `onUserLeave` 回调中，**手动查找并删除离开用户的视频 DOM 元素**，确保画面被立即清理。

### 策略3：监听页面关闭事件（解决点击X关闭标签页的问题）⭐
使用 `beforeunload` 事件监听器，在用户关闭标签页时：
1. 使用 `navigator.sendBeacon` 立即通知后端用户离开
2. 销毁 ZEGO 实例
3. ZEGO SDK 会自动检测到断线并在几秒内触发其他用户的 `onUserLeave` 回调

### 核心逻辑

#### 策略1：持久化访客ID

```javascript
// 生成存储键：基于房间ID + 用户名 + 角色
const storageKey = `guest_id_${roomId}_${userName}_${role}`;

// 尝试从 localStorage 获取已有的访客ID
let guestId = localStorage.getItem(storageKey);

if (!guestId) {
  // 首次进入，生成新的访客ID
  guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(storageKey, guestId);
  console.log('✅ 首次进入，生成新访客ID:', guestId);
} else {
  // 重新进入，使用已有的访客ID
  console.log('✅ 重新进入，使用已有访客ID:', guestId);
}
```

#### 策略2：手动清理视频元素

```javascript
onUserLeave: (users: any[]) => {
  console.log('🔧 用户离开房间:', users);

  // 🔧 手动清理离开用户的视频元素，防止画面卡住
  users.forEach(user => {
    try {
      // ZEGO UIKit 会为每个用户创建一个带有 data-userid 属性的视频容器
      const userVideoElements = meetingContainerRef.current?.querySelectorAll(
        `[data-userid="${user.userID}"], [id*="${user.userID}"]`
      );

      if (userVideoElements && userVideoElements.length > 0) {
        userVideoElements.forEach(element => {
          console.log(`✅ 清理用户 ${user.userName} (${user.userID}) 的视频元素`);
          element.remove();
        });
      }
    } catch (error) {
      console.error(`清理用户 ${user.userName} 视频元素失败:`, error);
    }
  });

  message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
}
```

#### 策略3：监听页面关闭事件

```javascript
useEffect(() => {
  const handleBeforeUnload = () => {
    console.log('🔧 检测到页面即将关闭/刷新');

    // 使用 sendBeacon 确保请求在页面关闭前发送
    if (guestInfo && roomId) {
      const userId = guestInfo.userId || `guest_${guestInfo.userName}`;
      const leaveData = JSON.stringify({ roomId, userId });
      const blob = new Blob([leaveData], { type: 'application/json' });
      navigator.sendBeacon(
        `${import.meta.env.VITE_API_URL}/api/zego/leave-room`,
        blob
      );
    }

    // 销毁 ZEGO 实例
    if (zegoInstanceRef.current) {
      zegoInstanceRef.current.destroy();
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [guestInfo, roomId]);
```

### 清理策略

访客ID会在以下情况下被清理：

1. **主动离开房间**：用户点击"离开"按钮时
2. **房间被解散**：HR解散房间时

这样可以确保：
- 同一个访客在同一个房间内重新进入时使用相同的ID（避免重复画面）
- 访客正常离开或房间解散后，下次进入会获得新的ID（避免ID冲突）

## 修改的文件

### `frontend/src/pages/interview/JoinInterview.tsx`（访客端）

#### 1. 生成持久化的访客ID（第277-303行）

```javascript
// 🔧 生成或获取持久化的访客 ID
// 使用 localStorage 存储访客ID，确保同一个访客重新进入时使用相同的ID
const storageKey = `guest_id_${roomId}_${values.userName}_${values.role}`;
let guestId = localStorage.getItem(storageKey);

if (!guestId) {
  // 首次进入，生成新的访客ID
  guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(storageKey, guestId);
  console.log('✅ 首次进入，生成新访客ID:', guestId);
} else {
  console.log('✅ 重新进入，使用已有访客ID:', guestId);
}
```

#### 2. 房间解散时清理访客ID（第184-189行）

```javascript
// 🔧 清理 localStorage 中的访客ID（房间解散时）
if (guestInfo && roomId) {
  const storageKey = `guest_id_${roomId}_${guestInfo.userName}_${guestInfo.role}`;
  localStorage.removeItem(storageKey);
  console.log('✅ 已清理访客ID缓存（房间解散）');
}
```

#### 3. 主动离开时清理访客ID（第451-456行）

```javascript
// 🔧 清理 localStorage 中的访客ID（主动离开时）
if (guestInfo && roomId) {
  const storageKey = `guest_id_${roomId}_${guestInfo.userName}_${guestInfo.role}`;
  localStorage.removeItem(storageKey);
  console.log('✅ 已清理访客ID缓存（主动离开）');
}
```

#### 4. 用户离开时手动清理视频元素（第468-497行）

```javascript
onUserLeave: (users: any[]) => {
  console.log('🔧 用户离开房间:', users);

  // 🔧 手动清理离开用户的视频元素，防止画面卡住
  users.forEach(user => {
    try {
      const userVideoElements = meetingContainerRef.current?.querySelectorAll(
        `[data-userid="${user.userID}"], [id*="${user.userID}"]`
      );

      if (userVideoElements && userVideoElements.length > 0) {
        userVideoElements.forEach(element => {
          console.log(`✅ 清理用户 ${user.userName} (${user.userID}) 的视频元素`);
          element.remove();
        });
      }
    } catch (error) {
      console.error(`清理用户 ${user.userName} 视频元素失败:`, error);
    }
  });

  message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
}
```

### `frontend/src/pages/interview/VideoInterview.tsx`（HR端）

#### 用户离开时手动清理视频元素（第310-338行）

```javascript
onUserLeave: (users: any[]) => {
  console.log('🔧 用户离开房间:', users);

  // 🔧 手动清理离开用户的视频元素，防止画面卡住
  users.forEach(user => {
    try {
      const userVideoElements = meetingContainerRef.current?.querySelectorAll(
        `[data-userid="${user.userID}"], [id*="${user.userID}"]`
      );

      if (userVideoElements && userVideoElements.length > 0) {
        userVideoElements.forEach(element => {
          console.log(`✅ 清理用户 ${user.userName} (${user.userID}) 的视频元素`);
          element.remove();
        });
      }
    } catch (error) {
      console.error(`清理用户 ${user.userName} 视频元素失败:`, error);
    }
  });

  message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
  setParticipants(prev => prev.filter(p => !users.some(u => u.userID === p.userId)));
}
```

## 测试场景

### 场景1：访客重新进入房间（核心场景）

1. 访客A（张三，客户）首次进入房间
   - 生成新的 guestId，例如：`guest_1234567890_abc123`
   - 存储到 localStorage
   - 加入 ZEGO 房间

2. 访客A点击"离开"按钮
   - 清理 localStorage 中的 guestId
   - 离开 ZEGO 房间
   - 旧的视频画面被清理

3. 访客A再次进入同一个房间
   - 由于已清理，会生成新的 guestId
   - 不会出现重复画面

### 场景2：访客意外断线后重新进入

1. 访客A首次进入房间
   - 生成并存储 guestId

2. 访客A网络断开或浏览器崩溃
   - localStorage 中的 guestId 仍然保留

3. 访客A重新打开链接进入房间
   - 使用相同的 guestId
   - ZEGO SDK 识别为同一个用户重新连接
   - 不会出现重复画面

### 场景3：房间被解散

1. 访客A在房间中
2. HR解散房间
   - 清理 localStorage 中的 guestId
   - 所有用户被踢出房间

3. 访客A尝试重新进入（如果房间重新创建）
   - 会生成新的 guestId

## 优势

1. **彻底解决重复画面问题**：
   - 持久化ID确保同一访客使用相同的 userId
   - 手动清理确保离开用户的画面立即消失

2. **处理意外断线**：网络问题或浏览器崩溃后，访客可以无缝重新连接

3. **自动清理**：正常离开或房间解散时自动清理，避免ID冲突

4. **无需后端改动**：完全在前端实现，不影响后端逻辑

5. **双重保障**：即使 ZEGO SDK 的自动清理失败，手动清理也能确保画面被移除

## 注意事项

1. **localStorage 的作用域**：localStorage 是基于域名的，同一个浏览器的不同标签页会共享数据
2. **隐私模式**：在浏览器的隐私模式下，localStorage 可能不可用或在关闭窗口后被清除
3. **存储键的唯一性**：使用 `roomId + userName + role` 组合确保不同房间、不同用户的ID不会冲突

## 后续优化建议

如果需要更严格的控制，可以考虑：

1. **后端管理访客会话**：在后端维护访客ID和会话状态
2. **添加过期时间**：为 localStorage 中的访客ID添加过期时间
3. **使用 sessionStorage**：如果希望关闭标签页后立即清除ID，可以使用 sessionStorage 替代 localStorage


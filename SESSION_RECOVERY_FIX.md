# 视频画面重复显示问题 - 会话恢复方案

## 🎯 问题的本质

根据 **ZEGO 官方文档**，问题的核心是：

### 错误的实现方式 ❌
```typescript
// 每次进入都生成新的随机ID
const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
```

**问题**：
- 用户离开后重新进入，生成了**新的 userID**
- ZEGO SDK 认为这是一个**全新的用户**
- 旧用户的画面没有被清理
- 新用户的画面被创建
- **结果：同一个人出现多个画面**

### 正确的实现方式 ✅
```typescript
// 使用 localStorage 持久化用户ID
const storageKey = `guest_id_${roomId}_${userName}_${role}`;
let guestId = localStorage.getItem(storageKey);

if (!guestId || isExpired) {
  // 首次进入或ID已过期，生成新的访客ID
  guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(storageKey, guestId);
  console.log('✅ 首次进入，生成新访客ID:', guestId);
} else {
  // 重新进入，使用已有的访客ID（会话恢复）
  console.log('🔄 会话恢复，使用已有访客ID:', guestId);
}
```

**优势**：
- ✅ 同一用户使用相同的 userID
- ✅ ZEGO SDK 识别为"重新登录"（relogin = 1）
- ✅ 不会创建新用户
- ✅ **不会出现重复画面**

## 📋 ZEGO 官方文档的关键要点

### 1. 用户ID唯一性原则
> **同一个用户每次进入房间必须使用相同的 userID**

- 同一个 AppID 内，userID 必须全局唯一
- 同一个用户每次进入必须使用相同的 userID
- userID 不能为空

### 2. 重新登录的识别机制
ZEGO SDK 提供了 `relogin` 参数：
- `relogin = 0`：首次登录
- `relogin = 1`：重新登录（系统识别为同一用户）

### 3. 会话管理
- 每次登录都会生成新的 `session_id`
- 但 `userID` 必须保持不变
- 这样 ZEGO SDK 才能正确识别为"同一用户重新连接"

### 4. 退出原因
ZEGO SDK 会告知退出原因：
- `0`：正常退出
- `1`：业务层心跳超时
- `2`：接入层连接断开或心跳超时
- `3`：被踢出
- `4`：token过期退出

## 🔧 实现细节

### 文件：`frontend/src/pages/interview/JoinInterview.tsx`

#### 1. 持久化用户ID（第295-319行）

```typescript
// 🔧 生成或获取持久化的访客 ID（支持会话恢复）
const storageKey = `guest_id_${roomId}_${values.userName}_${values.role}`;
const storageTimeKey = `guest_id_time_${roomId}_${values.userName}_${values.role}`;

let guestId = localStorage.getItem(storageKey);
const storedTime = localStorage.getItem(storageTimeKey);

// 检查是否过期（1小时 = 3600000ms）
const isExpired = storedTime && (Date.now() - parseInt(storedTime)) > 3600000;

if (!guestId || isExpired) {
  // 首次进入或ID已过期，生成新的访客ID
  guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(storageKey, guestId);
  localStorage.setItem(storageTimeKey, Date.now().toString());
  console.log(isExpired ? '⏰ ID已过期，生成新访客ID:' : '✅ 首次进入，生成新访客ID:', guestId);
} else {
  // 重新进入，使用已有的访客ID（会话恢复）
  console.log('🔄 会话恢复，使用已有访客ID:', guestId);
  // 更新时间戳
  localStorage.setItem(storageTimeKey, Date.now().toString());
}
```

**关键特性**：
- 使用 `localStorage` 存储用户ID
- 存储键包含：`roomId` + `userName` + `role`
- 设置1小时过期时间，避免ID永久保留
- 每次进入时更新时间戳

#### 2. 不再清理用户ID（第452-457行）

```typescript
// 🎯 关键修改：不再清理 localStorage 中的访客ID
// 保留访客ID，让用户重新进入时能够恢复会话，避免重复画面
// localStorage 中的ID会在房间解散时清理，或者1小时后自动过期
if (guestInfo && roomId) {
  console.log('✅ 保留访客ID缓存，支持会话恢复');
}
```

**重要变更**：
- ❌ 之前：用户离开时清理 localStorage
- ✅ 现在：用户离开时**保留** localStorage
- 只在房间解散时清理
- 或者1小时后自动过期

#### 3. 房间解散时清理（第185-192行）

```typescript
// 🔧 清理 localStorage 中的访客ID和时间戳（房间解散时）
if (guestInfo && roomId) {
  const storageKey = `guest_id_${roomId}_${guestInfo.userName}_${guestInfo.role}`;
  const storageTimeKey = `guest_id_time_${roomId}_${guestInfo.userName}_${guestInfo.role}`;
  localStorage.removeItem(storageKey);
  localStorage.removeItem(storageTimeKey);
  console.log('✅ 已清理访客ID缓存（房间解散）');
}
```

## 🧪 测试场景

### 场景1：会话恢复（核心场景）⭐⭐⭐

**步骤**：
1. 访客A 进入房间（姓名"张三"，角色"客户"）
2. 访客A 点击 X 关闭标签页
3. 等待 3-5 秒
4. 访客A 重新打开邀请链接
5. **使用相同的姓名"张三"和角色"客户"** 进入

**预期结果**：
- ✅ 不应该出现两个"张三"的画面
- ✅ 控制台显示：`🔄 会话恢复，使用已有访客ID: guest_...`
- ✅ ZEGO SDK 识别为"重新登录"

**如果失败**：
- 检查控制台是否显示 `✅ 首次进入，生成新访客ID`（错误！）
- 检查 localStorage 中是否有 `guest_id_...` 键
- 检查是否超过1小时（ID会过期）

### 场景2：不同姓名或角色

**步骤**：
1. 访客A 进入房间（姓名"张三"，角色"客户"）
2. 访客A 离开
3. 访客A 重新进入，但使用不同的姓名"李四"或角色"阿姨"

**预期结果**：
- ✅ 会生成新的 userID（因为 storageKey 不同）
- ✅ ZEGO SDK 识别为新用户
- ✅ 不会出现重复画面

### 场景3：ID过期

**步骤**：
1. 访客A 进入房间
2. 访客A 离开
3. 等待 1 小时以上
4. 访客A 重新进入

**预期结果**：
- ✅ 会生成新的 userID（因为ID已过期）
- ✅ 控制台显示：`⏰ ID已过期，生成新访客ID: ...`

### 场景4：房间解散

**步骤**：
1. 访客A 进入房间
2. HR 解散房间
3. HR 创建新房间
4. 访客A 进入新房间

**预期结果**：
- ✅ 会生成新的 userID（因为 localStorage 已被清理）
- ✅ 不会出现重复画面

## 📊 调试日志

### 首次进入
```
✅ 首次进入，生成新访客ID: guest_1234567890_abc123
```

### 会话恢复
```
🔄 会话恢复，使用已有访客ID: guest_1234567890_abc123
```

### ID过期
```
⏰ ID已过期，生成新访客ID: guest_9876543210_xyz789
```

### 保留ID
```
✅ 保留访客ID缓存，支持会话恢复
```

### 清理ID
```
✅ 已清理访客ID缓存（房间解散）
```

## 🎉 预期效果

### 修复前 ❌
1. 用户进入房间：`guest_1234567890_abc123`
2. 用户离开
3. 用户重新进入：`guest_9876543210_xyz789`（新ID！）
4. **结果：出现两个画面**

### 修复后 ✅
1. 用户进入房间：`guest_1234567890_abc123`
2. 用户离开
3. 用户重新进入：`guest_1234567890_abc123`（相同ID！）
4. **结果：ZEGO SDK 识别为重新登录，不会出现重复画面**

## 📚 参考文档

- ZEGO 官方文档：用户ID唯一性原则
- ZEGO 官方文档：重新登录识别机制
- ZEGO 官方文档：会话管理
- ZEGO 官方文档：房间进出回调

## 🔍 故障排查

### 问题：仍然出现重复画面

**检查清单**：
1. ✅ 确认控制台显示 `🔄 会话恢复，使用已有访客ID`
2. ✅ 确认使用相同的姓名和角色进入
3. ✅ 确认没有超过1小时（ID未过期）
4. ✅ 确认 localStorage 中有对应的 `guest_id_...` 键
5. ✅ 确认浏览器支持 localStorage

### 问题：无法进入房间

**可能原因**：
- Token 过期
- 网络连接问题
- ZEGO AppID 配置错误
- userID 为空

## 💡 最佳实践

1. **保持 userID 一致性**：同一用户必须使用相同的 userID
2. **设置合理的过期时间**：避免ID永久保留导致冲突
3. **及时清理**：房间解散时清理 localStorage
4. **详细的日志**：记录ID生成、恢复、过期等关键事件
5. **错误处理**：处理 localStorage 不可用的情况

## ✅ 总结

这个修复方案的核心是：**让同一个用户在重新进入时使用相同的 userID**，这样 ZEGO SDK 就能正确识别为"重新登录"，而不是"新用户加入"，从而避免重复画面的问题。

这是符合 ZEGO 官方文档要求的正确实现方式！🎉


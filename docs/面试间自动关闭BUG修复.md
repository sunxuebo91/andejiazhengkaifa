# 面试间自动关闭BUG修复文档

## 🐛 问题描述

### 现象
当主持人离开面试间后，虽然后端 ZEGO 服务会在10分钟后自动清理内存中的房间数据，但是**数据库中的面试间记录状态仍然是 `active`**，导致：
- 面试间列表中显示该房间还在"进行中"（🟢 进行中）
- 用户误以为面试间还在开放状态
- 无法准确统计面试间的实际使用情况

### 根本原因
`ZegoService` 的定时清理任务只删除了内存中的房间数据，没有同步更新数据库中的面试间状态。

```typescript
// ❌ 原有代码（有问题）
roomsToDelete.forEach(roomId => {
  this.rooms.delete(roomId);  // 只删除了内存数据
});
```

---

## ✅ 解决方案

### 1. 修改 `ZegoService`

#### 1.1 注入 `InterviewService`
为了避免循环依赖，使用延迟注入的方式：

```typescript
// backend/src/modules/zego/zego.service.ts

// 延迟注入 InterviewService 避免循环依赖
private interviewService: any;

/**
 * 设置 InterviewService（用于避免循环依赖）
 */
setInterviewService(interviewService: any): void {
  this.interviewService = interviewService;
}
```

#### 1.2 更新清理任务逻辑
在清理任务中同时更新数据库状态：

```typescript
private startCleanupTask(): void {
  this.cleanupInterval = setInterval(async () => {
    const now = Date.now();
    const roomsToDelete: string[] = [];

    this.rooms.forEach((room, roomId) => {
      // 如果房间无人且超过10分钟，自动关闭
      if (room.participants.size === 0 && now - room.lastActivityAt > this.ROOM_TIMEOUT) {
        roomsToDelete.push(roomId);
        this.logger.log(`房间 ${roomId} 超过10分钟无人，自动关闭`);
      }
    });

    // 删除超时的房间并更新数据库状态
    for (const roomId of roomsToDelete) {
      // 1. 删除内存中的房间数据
      this.rooms.delete(roomId);

      // 2. 🔥 更新数据库中的面试间状态为 ended
      if (this.interviewService) {
        try {
          await this.interviewService.autoEndRoom(roomId);
          this.logger.log(`✅ 房间 ${roomId} 数据库状态已更新为 ended`);
        } catch (error) {
          this.logger.error(`❌ 更新房间 ${roomId} 数据库状态失败:`, error.message);
        }
      }
    }

    if (roomsToDelete.length > 0) {
      this.logger.log(`清理了 ${roomsToDelete.length} 个超时房间`);
    }
  }, 60 * 1000); // 每分钟检查一次
}
```

### 2. 修改 `InterviewService`

#### 2.1 在构造函数中设置关联
```typescript
// backend/src/modules/interview/interview.service.ts

constructor(
  @InjectModel(InterviewRoom.name)
  private readonly interviewRoomModel: Model<InterviewRoom>,
  @Inject(forwardRef(() => ZegoService))
  private readonly zegoService: ZegoService,
) {
  // 🔥 设置 InterviewService 到 ZegoService（避免循环依赖）
  this.zegoService.setInterviewService(this);
}
```

#### 2.2 添加 `autoEndRoom` 方法
```typescript
/**
 * 自动结束面试间（由 ZegoService 定时任务调用）
 * 用于处理10分钟无人自动关闭的情况
 */
async autoEndRoom(roomId: string): Promise<void> {
  this.logger.log(`🤖 自动结束面试间: ${roomId}`);

  const room = await this.interviewRoomModel.findOne({ roomId }).exec();

  if (!room) {
    this.logger.warn(`面试间不存在: ${roomId}`);
    return;
  }

  // 如果已经结束，跳过
  if (room.status === 'ended') {
    this.logger.log(`面试间已结束，跳过: ${roomId}`);
    return;
  }

  // 更新状态
  const endedAt = new Date();
  const duration = Math.floor((endedAt.getTime() - room.createdAt.getTime()) / 1000);

  room.status = 'ended';
  room.endedAt = endedAt;
  room.duration = duration;

  await room.save();
  this.logger.log(`✅ 面试间已自动结束: ${roomId}, 持续时长: ${duration}秒`);
}
```

---

## 🎯 修复效果

### 修复前
- ❌ 房间无人10分钟后，内存数据被清理，但数据库状态仍为 `active`
- ❌ 列表显示：🟢 进行中（错误）

### 修复后
- ✅ 房间无人10分钟后，内存数据被清理，数据库状态同步更新为 `ended`
- ✅ 列表显示：🔴 已结束（正确）
- ✅ 自动记录面试持续时长
- ✅ 自动记录结束时间

---

## 📝 测试验证

### 手动测试步骤
1. 创建一个面试间
2. 主持人进入面试间
3. 主持人离开面试间（不点击"结束面试"按钮）
4. 等待10分钟
5. 查看面试间列表，状态应该自动变为"🔴 已结束"

### 自动化测试
已添加单元测试：`backend/src/modules/zego/zego.service.spec.ts`

---

## 🔍 相关文件

- `backend/src/modules/zego/zego.service.ts` - ZEGO服务（清理任务）
- `backend/src/modules/interview/interview.service.ts` - 面试间服务（数据库更新）
- `backend/src/modules/zego/zego.service.spec.ts` - 单元测试

---

## 📊 影响范围

- ✅ 不影响现有功能
- ✅ 不需要前端修改
- ✅ 不需要数据库迁移
- ✅ 向后兼容

---

## 🚀 部署说明

1. 拉取最新代码
2. 重启后端服务
3. 观察日志，确认清理任务正常运行

---

## 📅 修复日期
2025-11-19


# CRM端 - 线索分配通知实现说明

> **最新更新**: 2025-12-24
> **实施方案**: ~~方案1（已废弃）~~ → **方案2（CRM端主动调用云函数）✅**

---

## 🔄 方案变更说明

### ❌ 方案1（已废弃）- 返回notificationData让小程序处理

**问题**: 当在CRM网页端操作时，小程序代码根本不会执行，`notificationData` 只是返回了数据但没人去调用发送。

### ✅ 方案2（已实施）- CRM端主动调用云函数

**优势**:
- CRM端主动推送，不依赖小程序端
- 无论从哪个端操作都能发送通知
- 异步执行，不阻塞用户操作
- 通知失败不影响分配操作

**详细文档**:
- `CRM端主动调用云函数-实现完成报告.md`
- `CRM端主动调用云函数-快速参考.md`

---

## ✅ 已完成的修改

### 1. 修改的接口列表

已为以下4个客户分配接口添加了 `notificationData` 字段：

#### 1️⃣ **单个客户分配** (Web端)
- **接口**: `PATCH /api/customers/:id/assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第413-443行)
- **说明**: 用于Web端单个客户分配

#### 2️⃣ **单个客户分配** (小程序端)
- **接口**: `PATCH /api/customers/miniprogram/:id/assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第689-737行)
- **说明**: 用于小程序端单个客户分配

#### 3️⃣ **批量分配客户**
- **接口**: `POST /api/customers/batch-assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第226-262行)
- **说明**: 用于批量分配多个客户给同一个员工

#### 4️⃣ **从公海分配客户**
- **接口**: `POST /api/customers/public-pool/assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第328-359行)
- **说明**: 用于从公海批量分配客户

---

## 📋 返回数据格式

### 单个客户分配返回格式

```json
{
  "success": true,
  "message": "客户分配成功",
  "data": {
    "_id": "60f7b3c4e1b2c3d4e5f6g7h8",
    "name": "张三",
    "phone": "13800138000",
    "assignedTo": "60f7b3c4e1b2c3d4e5f6g7h9",
    "assignedAt": "2025-12-21T10:30:00.000Z",
    // ... 其他客户字段
    
    "notificationData": {
      "assignedToId": "60f7b3c4e1b2c3d4e5f6g7h9",  // 被分配人ID
      "customerName": "张三",                        // 客户姓名
      "customerPhone": "13800138000",                // 客户电话
      "source": "客户要求更换负责人",                 // 分配原因
      "assignerName": "李经理",                      // 分配人姓名
      "customerId": "60f7b3c4e1b2c3d4e5f6g7h8",     // 客户ID
      "assignTime": "2025-12-21T10:30:00.000Z",      // 分配时间
      "serviceCategory": "月嫂",                     // 服务类别
      "leadSource": "美团"                           // 线索来源
    }
  }
}
```

### 批量分配返回格式

```json
{
  "success": true,
  "message": "批量分配完成：成功 5 个，失败 0 个",
  "data": {
    "success": 5,
    "failed": 0,
    "errors": [],
    
    "notificationData": {
      "assignedToId": "60f7b3c4e1b2c3d4e5f6g7h9",
      "source": "批量分配",
      "assignerName": "李经理",
      "assignTime": "2025-12-21T10:30:00.000Z",
      "customerCount": 5,                            // 成功分配的客户数量
      "customerIds": [                               // 客户ID列表
        "60f7b3c4e1b2c3d4e5f6g7h8",
        "60f7b3c4e1b2c3d4e5f6g7h7",
        // ...
      ]
    }
  }
}
```

---

## 🔧 小程序端如何使用

小程序端在接收到分配成功的响应后，可以：

1. **检查是否有 `notificationData` 字段**
2. **提取通知所需的信息**
3. **调用微信订阅消息API发送通知**

### 示例代码（小程序端）

```javascript
// 分配客户
async function assignCustomer(customerId, assignedTo, reason) {
  const response = await wx.request({
    url: `${API_BASE}/customers/miniprogram/${customerId}/assign`,
    method: 'PATCH',
    data: {
      assignedTo: assignedTo,
      assignmentReason: reason
    }
  });

  if (response.data.success && response.data.data.notificationData) {
    // 发送订阅消息通知
    await sendSubscribeNotification(response.data.data.notificationData);
  }
}

// 发送订阅消息
async function sendSubscribeNotification(notificationData) {
  // 调用云函数或后端接口发送微信订阅消息
  await wx.cloud.callFunction({
    name: 'sendNotification',
    data: {
      type: 'customer_assign',
      ...notificationData
    }
  });
}
```

---

## 🎯 通知数据字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `assignedToId` | string | 被分配人的用户ID | `"60f7b3c4..."` |
| `customerName` | string | 客户姓名 | `"张三"` |
| `customerPhone` | string | 客户电话（单个分配时） | `"13800138000"` |
| `source` | string | 分配原因/线索来源 | `"手动分配"` |
| `assignerName` | string | 分配人姓名 | `"李经理"` |
| `customerId` | string | 客户ID（单个分配时） | `"60f7b3c4..."` |
| `assignTime` | Date | 分配时间 | `"2025-12-21T10:30:00.000Z"` |
| `serviceCategory` | string | 服务类别（单个分配时） | `"月嫂"` |
| `leadSource` | string | 线索来源（单个分配时） | `"美团"` |
| `customerCount` | number | 客户数量（批量分配时） | `5` |
| `customerIds` | string[] | 客户ID列表（批量分配时） | `["60f7b3c4..."]` |
| `fromPublicPool` | boolean | 是否来自公海（公海分配时） | `true` |

---

## ✅ 优势

1. **解耦**: CRM端不需要关心通知逻辑，只负责提供数据
2. **简单**: 只需在返回数据中添加一个字段
3. **灵活**: 小程序端可以根据需要决定是否发送通知
4. **可靠**: 通知失败不影响分配操作
5. **完整**: 包含了发送通知所需的所有信息

---

## 🧪 测试建议

### 1. 单个客户分配测试
```bash
curl -X PATCH "http://localhost:3000/api/customers/miniprogram/CUSTOMER_ID/assign" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedTo": "USER_ID",
    "assignmentReason": "测试分配"
  }'
```

### 2. 批量分配测试
```bash
curl -X POST "http://localhost:3000/api/customers/batch-assign" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerIds": ["CUSTOMER_ID_1", "CUSTOMER_ID_2"],
    "assignedTo": "USER_ID",
    "assignmentReason": "批量测试"
  }'
```

---

## 📝 注意事项

1. **向后兼容**: 添加的 `notificationData` 字段不会影响现有功能
2. **可选字段**: 小程序端可以选择性使用这个字段
3. **数据完整性**: 确保所有必要的用户信息都已加载（如 `req.user.name`）
4. **错误处理**: 即使构建通知数据失败，也不应影响分配操作

---

## 🎉 总结

通过在4个分配接口的返回数据中添加 `notificationData` 字段，CRM端已经完成了对小程序订阅消息通知的支持。

**小程序端只需要**：
1. 接收返回数据中的 `notificationData`
2. 调用微信订阅消息API发送通知

**CRM端不需要**：
- 调用微信API
- 管理订阅状态
- 处理通知失败

这是一个简单、解耦、可靠的实现方案！ 🎊


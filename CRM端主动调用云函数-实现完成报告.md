# CRM端主动调用云函数发送通知 - 实现完成报告

> **实施日期**: 2025-12-24  
> **实施方案**: CRM端在分配成功后主动调用微信云函数发送订阅消息通知

---

## ✅ 已完成的工作

### 1. 环境变量配置

在 `backend/.env` 文件中添加了小程序配置：

```env
# 微信小程序配置（用于云函数调用）
MINIPROGRAM_APPID=wxb2c4e35d16d99fd3
MINIPROGRAM_APPSECRET=your_miniprogram_secret_here
MINIPROGRAM_CLOUD_ENV=cloud1-4gi0bpoje72fedd1
```

**⚠️ 重要**: 需要从小程序管理后台获取真实的 `MINIPROGRAM_APPSECRET` 并替换。

---

### 2. 创建微信云函数调用服务

**文件**: `backend/src/modules/weixin/services/wechat-cloud.service.ts`

**功能**:
- 获取小程序 access_token（带缓存机制）
- 调用微信云开发 HTTP API
- 发送单个客户分配通知
- 发送批量客户分配通知

**核心方法**:
```typescript
// 发送单个客户分配通知
async sendCustomerAssignNotification(notificationData: any): Promise<void>

// 发送批量客户分配通知
async sendBatchCustomerAssignNotification(notificationData: any): Promise<void>
```

**API调用**:
```
POST https://api.weixin.qq.com/tcb/invokecloudfunction
参数:
  - access_token: 小程序访问令牌
  - env: 云环境ID (cloud1-4gi0bpoje72fedd1)
  - name: 云函数名称 (quickstartFunctions)
```

---

### 3. 修改客户分配接口

已为以下4个接口添加了云函数调用逻辑：

#### 1️⃣ **单个客户分配（小程序端）**
- **接口**: `PATCH /api/customers/miniprogram/:id/assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第730-797行)
- **修改**: 在分配成功后异步调用 `wechatCloudService.sendCustomerAssignNotification()`

#### 2️⃣ **单个客户分配（Web端）**
- **接口**: `PATCH /api/customers/:id/assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第443-485行)
- **修改**: 在分配成功后异步调用 `wechatCloudService.sendCustomerAssignNotification()`

#### 3️⃣ **批量分配客户**
- **接口**: `POST /api/customers/batch-assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第228-276行)
- **修改**: 在分配成功后异步调用 `wechatCloudService.sendBatchCustomerAssignNotification()`

#### 4️⃣ **从公海分配客户**
- **接口**: `POST /api/customers/public-pool/assign`
- **文件**: `backend/src/modules/customers/customers.controller.ts` (第336-381行)
- **修改**: 在分配成功后异步调用 `wechatCloudService.sendBatchCustomerAssignNotification()`

---

## 🔧 技术实现细节

### 异步执行，不阻塞响应

所有云函数调用都是异步执行的，不会阻塞分配接口的响应：

```typescript
// 🚀 CRM端主动调用云函数发送通知（异步执行，不阻塞响应）
this.wechatCloudService.sendCustomerAssignNotification(notificationData)
  .catch(error => {
    this.logger.error(`发送通知失败: ${error.message}`);
  });
```

### 错误处理

- 通知发送失败不影响分配操作本身
- 所有错误都会记录到日志中
- 如果 AppSecret 未配置，会跳过通知发送并记录警告

### Access Token 缓存

- access_token 会缓存在内存中
- 提前5分钟过期，自动刷新
- 避免频繁请求微信API

---

## 📋 云函数请求格式

### 请求数据结构

```json
{
  "type": "sendCustomerAssignNotify",
  "notificationData": {
    "assignedToId": "被分配人ID",
    "customerName": "客户姓名",
    "source": "分配原因",
    "assignerName": "分配人姓名",
    "customerId": "客户ID",
    "assignTime": "2025-12-24T10:30:00.000Z"
  }
}
```

### 批量分配请求数据

```json
{
  "type": "sendCustomerAssignNotify",
  "notificationData": {
    "assignedToId": "被分配人ID",
    "customerName": "5个客户",
    "source": "批量分配",
    "assignerName": "分配人姓名",
    "customerId": "第一个客户ID",
    "assignTime": "2025-12-24T10:30:00.000Z"
  }
}
```

---

## 🧪 测试指南

### 1. 配置小程序 AppSecret

在 `backend/.env` 文件中配置真实的 AppSecret：

```env
MINIPROGRAM_APPSECRET=your_real_secret_here
```

### 2. 重启后端服务

```bash
cd backend
pm2 restart backend-dev
# 或
pm2 restart backend-prod
```

### 3. 使用测试脚本

```bash
# 编辑测试脚本，填入真实的 TOKEN、CUSTOMER_ID、ASSIGNED_TO_USER_ID
node test_cloud_function_notification.js
```

### 4. 查看日志

```bash
# 查看后端日志
pm2 logs backend-dev

# 或查看日志文件
tail -f logs/backend-dev-out.log
```

**期望看到的日志**:
```
✅ 微信云函数服务初始化完成 - AppID: wxb2c4e35d16d99fd3
🔑 获取小程序access_token
✅ 成功获取access_token
📱 调用云函数发送通知 - 被分配人: xxx
✅ 云函数调用成功
```

---

## 📝 小程序端需要做的工作

### 1. 实现云函数 `quickstartFunctions`

**文件**: `cloudfunctions/quickstartFunctions/index.js`

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { type, notificationData } = event;

  if (type === 'sendCustomerAssignNotify') {
    // 发送订阅消息
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: notificationData.assignedToId,  // 需要映射为openid
        templateId: 'YOUR_TEMPLATE_ID',
        page: 'pages/customer/detail',
        data: {
          thing1: { value: notificationData.customerName },
          thing2: { value: notificationData.source },
          name3: { value: notificationData.assignerName },
          time4: { value: notificationData.assignTime }
        }
      });
      return { success: true, message: '通知发送成功' };
    } catch (error) {
      console.error('发送通知失败:', error);
      return { success: false, message: error.message };
    }
  }

  return { success: false, message: '未知的操作类型' };
};
```

### 2. 配置订阅消息模板

1. 登录小程序后台：https://mp.weixin.qq.com
2. 功能 → 订阅消息 → 公共模板库
3. 搜索"任务分配"或"工作提醒"
4. 添加模板，获取模板ID
5. 更新到云函数代码中

---

## ⚠️ 注意事项

1. **AppSecret 安全**: 不要将 AppSecret 提交到代码仓库
2. **用户ID映射**: 云函数中需要将 `assignedToId` 映射为用户的 `openid`
3. **订阅授权**: 用户必须先授权订阅消息才能收到通知
4. **云函数部署**: 确保云函数已部署到正确的云环境
5. **日志监控**: 定期检查日志，确保通知发送正常

---

## 🎯 优势

1. **主动推送**: CRM端主动调用，不依赖小程序端处理
2. **异步执行**: 不阻塞分配操作，不影响用户体验
3. **错误隔离**: 通知失败不影响分配操作本身
4. **统一管理**: 所有通知逻辑集中在云函数中
5. **易于维护**: 修改通知逻辑只需更新云函数

---

## 📞 技术支持

如有问题，请检查：
1. 小程序 AppSecret 是否正确配置
2. 云函数是否已部署
3. 后端日志中的错误信息
4. 微信云开发控制台的调用记录

---

**实施完成时间**: 2025-12-24  
**实施人员**: AI Assistant  
**状态**: ✅ 已完成，待测试


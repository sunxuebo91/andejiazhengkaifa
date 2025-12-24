# CRM端主动调用云函数 - 快速参考指南

## 🎯 方案概述

**问题**: 方案1（小程序端处理通知）有缺陷，因为CRM网页端操作时小程序代码不会执行。

**解决方案**: CRM端在分配成功后主动调用微信云函数发送通知。

---

## ✅ CRM端已完成的工作

### 1. 配置文件

**文件**: `backend/.env`

```env
MINIPROGRAM_APPID=wxb2c4e35d16d99fd3
MINIPROGRAM_APPSECRET=需要配置真实的Secret
MINIPROGRAM_CLOUD_ENV=cloud1-4gi0bpoje72fedd1
```

### 2. 核心服务

**文件**: `backend/src/modules/weixin/services/wechat-cloud.service.ts`

- ✅ 获取小程序 access_token
- ✅ 调用云函数发送通知
- ✅ 异步执行，不阻塞响应
- ✅ 完善的错误处理

### 3. 已修改的接口

| 接口 | 路径 | 说明 |
|------|------|------|
| 小程序分配 | `PATCH /api/customers/miniprogram/:id/assign` | ✅ 已添加 |
| Web端分配 | `PATCH /api/customers/:id/assign` | ✅ 已添加 |
| 批量分配 | `POST /api/customers/batch-assign` | ✅ 已添加 |
| 公海分配 | `POST /api/customers/public-pool/assign` | ✅ 已添加 |

---

## 📋 小程序端待办事项

### 步骤1: 配置小程序AppSecret

从小程序管理后台获取AppSecret，配置到CRM后端的 `.env` 文件中。

### 步骤2: 实现云函数

**文件**: `cloudfunctions/quickstartFunctions/index.js`

参考文件: `小程序云函数示例-quickstartFunctions.js`

**核心逻辑**:
```javascript
// 1. 接收CRM端的请求
const { type, notificationData } = event;

// 2. 查询用户openid
const user = await db.collection('users').doc(assignedToId).get();
const openid = user.data.openid;

// 3. 发送订阅消息
await cloud.openapi.subscribeMessage.send({
  touser: openid,
  templateId: 'YOUR_TEMPLATE_ID',
  page: `pages/customer/detail?id=${customerId}`,
  data: { ... }
});
```

### 步骤3: 配置订阅消息模板

1. 登录小程序后台: https://mp.weixin.qq.com
2. 功能 → 订阅消息 → 公共模板库
3. 搜索"任务分配"或"工作提醒"
4. 选择包含以下字段的模板:
   - 客户姓名 (thing)
   - 分配原因 (thing)
   - 分配人 (name)
   - 分配时间 (time)
5. 获取模板ID，更新到云函数中

### 步骤4: 部署云函数

```bash
# 在小程序开发工具中
右键 cloudfunctions/quickstartFunctions → 上传并部署：云端安装依赖
```

### 步骤5: 测试

1. 在CRM端分配客户
2. 查看后端日志，确认云函数调用成功
3. 检查小程序端是否收到通知

---

## 🔧 调试指南

### CRM端日志

```bash
# 查看后端日志
pm2 logs backend-dev

# 期望看到的日志
✅ 微信云函数服务初始化完成
🔑 获取小程序access_token
✅ 成功获取access_token
📱 调用云函数发送通知
✅ 云函数调用成功
```

### 小程序端日志

在微信开发者工具的云开发控制台查看云函数日志：

```
📥 收到云函数调用
✅ 找到用户openid
✅ 订阅消息发送成功
```

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| access_token获取失败 | AppSecret错误 | 检查 `.env` 配置 |
| 云函数调用失败 | 云函数未部署 | 部署云函数 |
| 未找到用户 | 用户openid未存储 | 确保用户登录时保存openid |
| 订阅消息发送失败 | 用户未授权 | 引导用户授权订阅消息 |

---

## 📊 数据流程

```
CRM端分配客户
    ↓
构建通知数据
    ↓
调用 wechatCloudService.sendCustomerAssignNotification()
    ↓
获取小程序 access_token
    ↓
调用微信云开发 HTTP API
    ↓
云函数 quickstartFunctions 接收请求
    ↓
查询用户 openid
    ↓
调用 cloud.openapi.subscribeMessage.send()
    ↓
用户收到订阅消息通知
```

---

## 🎉 优势

1. **可靠**: CRM端主动推送，不依赖小程序端
2. **快速**: 异步执行，不阻塞用户操作
3. **安全**: 通知失败不影响分配操作
4. **统一**: 所有通知逻辑集中管理
5. **灵活**: 易于扩展和维护

---

## 📞 技术支持

**CRM端相关问题**:
- 检查 `backend/.env` 配置
- 查看 `logs/backend-dev-out.log` 日志
- 运行测试脚本 `test_cloud_function_notification.js`

**小程序端相关问题**:
- 检查云函数是否部署
- 查看云开发控制台日志
- 确认订阅消息模板配置

---

**文档版本**: v1.0  
**更新日期**: 2025-12-24  
**状态**: ✅ CRM端已完成，小程序端待实现


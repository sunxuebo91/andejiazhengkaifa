# 微信API集成文档

## 📋 概述

本文档描述了CRM系统与微信小程序的API集成功能，包括用户认证、客户行为记录、自动客户线索创建和订阅消息推送等功能。

## 🔧 配置要求

### 环境变量
```env
# 微信小程序配置
WECHAT_APP_ID=wx49e364f40a26e5a9
WECHAT_APP_SECRET=your_app_secret_here
```

### 数据库表
系统会自动创建以下MongoDB集合：
- `advisorsubscribes`: 顾问订阅状态
- `customeractions`: 客户行为记录
- `customers`: 客户信息（复用现有表）

## 🚀 API接口

### 1. 获取用户OpenID

**接口地址**: `POST /api/wechat/openid`

**功能**: 通过微信登录code获取用户openid

**请求参数**:
```json
{
  "code": "微信登录code"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "openid": "wx_openid_123456789"
  },
  "message": "获取openid成功",
  "timestamp": 1626342025123
}
```

---

### 2. 保存顾问订阅状态

**接口地址**: `POST /api/advisor/subscribe`

**功能**: 保存顾问的订阅消息授权状态

**请求参数**:
```json
{
  "advisorId": "顾问ID",
  "openid": "微信openid",
  "templateId": "订阅消息模板ID",
  "subscribed": true,
  "subscribeData": {
    "source": "miniprogram",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "userAgent": {},
    "subscriptionStatus": "accept"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "advisorId": "advisor_123",
    "openid": "wx_openid_123456",
    "templateId": "template_123",
    "subscribed": true,
    "subscribeTime": "2024-01-01T12:00:00.000Z"
  },
  "message": "保存订阅状态成功",
  "timestamp": 1626342025123
}
```

---

### 3. 记录客户行为（增强版）

**接口地址**: `POST /api/customer/action`

**功能**: 记录客户行为，支持自动创建客户线索

**请求参数**:
```json
{
  "customerId": "客户openid",
  "advisorId": "顾问ID",
  "actionType": "view_resume",
  "actionData": {
    "resumeId": "简历ID",
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "customerName": "客户姓名",
  "customerPhone": "客户电话"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "actionId": "507f1f77bcf86cd799439011",
    "customerCreated": true,
    "customerId": "507f1f77bcf86cd799439012",
    "action": {
      "_id": "507f1f77bcf86cd799439011",
      "customerId": "wx_openid_123456",
      "advisorId": "advisor_123",
      "actionType": "view_resume",
      "customerRecordId": "507f1f77bcf86cd799439012",
      "notified": false
    },
    "customer": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "张三",
      "phone": "13800138000",
      "leadSource": "其他",
      "customerId": "CUS12345678901"
    }
  },
  "message": "记录客户行为成功，已创建新客户线索",
  "timestamp": 1626342025123
}
```

#### 🆕 自动客户线索创建规则

1. **触发条件**: 请求中包含有效的`customerPhone`字段
2. **手机号验证**: 必须是有效的中国手机号格式（1开头，11位数字）
3. **重复检查**: 系统会检查手机号是否已存在，避免重复创建
4. **客户信息**:
   - 姓名: `customerName`
   - 电话: `customerPhone`
   - 微信号: `customerId`（openid）
   - 线索来源: "其他"
   - 签约状态: "待定"
   - 创建人: `advisorId`
   - 备注: 自动生成，包含行为类型

#### 行为类型说明

| 行为类型 | 描述 | 触发场景 |
|---------|------|---------|
| `view_resume` | 查看简历 | 客户在小程序中查看顾问简历 |
| `contact_advisor` | 联系顾问 | 客户点击联系顾问按钮 |
| `book_service` | 预约服务 | 客户预约家政服务 |

---

### 4. 发送订阅消息

**接口地址**: `POST /api/message/send`

**功能**: 调用微信API发送订阅消息给顾问

**请求参数**:
```json
{
  "touser": "接收者openid",
  "template_id": "订阅消息模板ID",
  "data": {
    "thing1": {"value": "客户张三查看了您的简历"},
    "time2": {"value": "2024-01-01 12:00:00"},
    "thing3": {"value": "13800138000"},
    "thing7": {"value": "张三"}
  },
  "page": "pages/customer/detail?id=customer_123",
  "miniprogram_state": "formal"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "errcode": 0,
    "errmsg": "ok",
    "msgid": 123456789
  },
  "message": "发送订阅消息成功",
  "timestamp": 1626342025123
}
```

#### 🆕 消息内容增强

系统会根据客户状态自动调整消息内容：

**新客户行为**:
- `view_resume`: "新客户查看了您的简历"
- `contact_advisor`: "新客户想要联系您"
- `book_service`: "新客户预约了您的服务"

**普通客户行为**:
- `view_resume`: "客户查看了您的简历"
- `contact_advisor`: "客户想要联系您"
- `book_service`: "客户预约了您的服务"

## 🔄 业务流程

### 完整的客户行为处理流程

1. **接收行为记录请求**
2. **客户线索创建检查**:
   - 如果有手机号且格式正确 → 尝试创建客户
   - 检查手机号是否已存在 → 避免重复创建
   - 创建成功 → 标记为新客户
3. **保存行为记录**:
   - 记录客户行为详情
   - 关联客户记录ID（如果创建了客户）
4. **异步消息通知**:
   - 检查顾问订阅状态
   - 构建消息内容（区分新客户/普通客户）
   - 发送订阅消息

### 自动通知触发机制

当客户行为被记录时，系统会自动：
1. 查询对应顾问的订阅状态
2. 如果顾问已订阅，构建并发送通知消息
3. 消息内容会根据是否为新客户进行调整
4. 记录消息发送结果

## 🧪 测试

### 测试脚本

项目根目录提供了以下测试脚本：

1. `test_weixin_api.js` - 基础API功能测试
2. `test_customer_creation.js` - 客户创建功能测试
3. `test_message_content.js` - 消息内容测试

### 运行测试

```bash
# 启动后端服务
cd backend && npm run start:dev

# 运行测试（在项目根目录）
node test_customer_creation.js
```

### 测试场景

- ✅ 有手机号的新客户 → 创建客户记录
- ✅ 有手机号的老客户 → 不重复创建
- ✅ 没有手机号的客户 → 不创建客户记录
- ✅ 手机号格式错误 → 不创建客户记录
- ✅ 新客户消息内容 → 显示"新客户xxx"
- ✅ 普通客户消息内容 → 显示"客户xxx"

## 📊 数据统计

### 客户创建统计

可以通过以下MongoDB查询获取统计数据：

```javascript
// 查看通过微信创建的客户
db.customers.find({
  leadSource: "其他",
  remarks: /微信小程序.*自动创建/
}).count()

// 查看客户行为记录
db.customeractions.find({
  customerRecordId: { $exists: true }
}).count()
```

## 🔒 安全考虑

1. **手机号验证**: 严格验证手机号格式，防止无效数据
2. **重复检查**: 避免重复创建客户记录
3. **权限控制**: 确保只有有效的顾问ID可以创建客户
4. **数据完整性**: 所有客户记录都包含必要的字段

## 📈 性能优化

1. **缓存机制**: access_token自动缓存和刷新
2. **异步处理**: 消息发送采用异步处理，不阻塞主流程
3. **数据库索引**: 在手机号字段上建立索引，提高查询效率
4. **错误处理**: 完善的错误处理和重试机制

## 🚀 部署说明

1. **环境变量**: 确保配置正确的微信小程序凭证
2. **数据库**: MongoDB自动创建所需集合
3. **日志**: 所有操作都有详细的日志记录
4. **监控**: 建议监控客户创建成功率和消息发送成功率

---

**文档版本**: v1.0  
**最后更新**: 2024-01-01  
**维护者**: CRM开发团队

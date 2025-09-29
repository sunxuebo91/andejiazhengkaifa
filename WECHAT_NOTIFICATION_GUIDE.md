# 微信服务号通知功能实现指南

## 🎉 功能概述

已成功实现微信服务号通知功能，当管理员分配线索给员工时，系统会自动发送微信通知。

## 📋 已实现的功能

### 1. 后端微信服务
- ✅ 微信API集成（使用 wechat-api SDK）
- ✅ 模板消息发送功能
- ✅ 二维码生成（用于员工绑定）
- ✅ 用户绑定处理
- ✅ 手机号脱敏处理（138****1234）
- ✅ 异步通知发送，不影响主业务流程

### 2. 数据库扩展
- ✅ 用户表添加微信字段：
  - `wechatOpenId`: 微信用户唯一标识
  - `wechatNickname`: 微信昵称
  - `wechatAvatar`: 微信头像

### 3. 业务集成
- ✅ 客户分配时自动发送微信通知
- ✅ 错误处理和日志记录
- ✅ 通知内容包含：客户姓名、脱敏电话、线索来源、服务需求、分配时间

### 4. 前端页面
- ✅ 微信绑定页面：`/wechat/bind`
- ✅ 微信测试页面：`/wechat/test`
- ✅ 二维码显示和绑定状态检查

## 🔧 配置步骤

### 1. 微信公众平台配置

请登录微信公众平台 (https://mp.weixin.qq.com/) 完成以下配置：

#### A. 设置服务器配置
- URL: `https://crm.andejiazheng.com/api/wechat/event`
- Token: 自定义一个token（需要在后端配置）
- EncodingAESKey: 随机生成
- 消息加解密方式：明文模式

#### B. 创建消息模板
需要创建以下模板：

**线索分配通知模板**：
```
标题：新线索分配通知
内容：
{{first.DATA}}
客户姓名：{{keyword1.DATA}}
联系电话：{{keyword2.DATA}}
线索来源：{{keyword3.DATA}}
服务需求：{{keyword4.DATA}}
分配时间：{{keyword5.DATA}}
{{remark.DATA}}
```

### 2. 后端环境配置

在后端 `.env` 文件中添加：
```env
WECHAT_APPID=wx986d99b2dab1b026
WECHAT_APPSECRET=93a50c000e7c708fdd33bc569f375387
WECHAT_TOKEN=your_custom_token
FRONTEND_URL=https://crm.andejiazheng.com
```

## 📱 使用流程

### 1. 员工绑定微信
1. 员工访问：`https://crm.andejiazheng.com/wechat/bind`
2. 扫描二维码关注"安得家政"服务号
3. 系统自动完成绑定

### 2. 线索分配通知
1. 管理员在CRM中分配线索给员工
2. 系统自动检查员工是否绑定微信
3. 如已绑定，发送微信通知
4. 员工收到通知，点击可跳转到客户详情页

### 3. 通知消息格式
```
📋 新线索分配通知

客户姓名：张三
联系电话：138****1234
线索来源：美团
服务需求：月嫂服务
分配时间：2025-09-29 14:30

分配原因：客户所在区域匹配

请及时跟进处理！点击查看详情。
```

## 🧪 测试功能

### 1. 测试绑定功能
访问：`https://crm.andejiazheng.com/wechat/bind`

### 2. 测试通知功能
访问：`https://crm.andejiazheng.com/wechat/test`

### 3. API测试
```bash
# 生成绑定二维码
curl -X GET "http://localhost:3000/api/wechat/bind-qrcode/USER_ID"

# 发送测试消息
curl -X POST "http://localhost:3000/api/wechat/test-message" \
  -H "Content-Type: application/json" \
  -d '{
    "openId": "微信OpenID",
    "templateData": {
      "name": "张三",
      "phone": "138****1234",
      "leadSource": "美团",
      "serviceCategory": "月嫂服务",
      "assignedAt": "2025-09-29 14:30",
      "assignmentReason": "客户所在区域匹配"
    },
    "url": "https://crm.andejiazheng.com/customers/detail/123"
  }'
```

## 🔍 技术实现细节

### 1. 核心文件
- `backend/src/modules/wechat/wechat.service.ts` - 微信服务核心逻辑
- `backend/src/modules/wechat/wechat.controller.ts` - 微信API控制器
- `backend/src/modules/customers/customers.service.ts` - 集成通知发送
- `frontend/src/pages/wechat/WeChatBind.tsx` - 绑定页面
- `frontend/src/pages/wechat/WeChatTest.tsx` - 测试页面

### 2. 关键特性
- 异步处理：通知发送不阻塞主业务流程
- 错误处理：网络异常时记录日志，不影响分配操作
- 数据脱敏：电话号码自动脱敏显示
- 用户体验：绑定状态实时检查，操作反馈清晰

## 🚀 扩展功能

未来可以添加的功能：
- 线索状态变更通知
- 客户跟进记录通知
- 每日工作汇总推送
- 通知发送统计和管理
- 群组通知功能
- 语音通知支持

## 📞 技术支持

如有问题，请检查：
1. 微信公众平台配置是否正确
2. 后端环境变量是否配置
3. 员工是否已绑定微信
4. 网络连接是否正常
5. 查看后端日志获取详细错误信息

---

**状态**: ✅ 已完成基础功能实现
**版本**: v1.0.0
**更新时间**: 2025-09-29

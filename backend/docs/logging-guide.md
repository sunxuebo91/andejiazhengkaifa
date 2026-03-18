# 日志与排障指南

## 目标

当前后端日志体系分为三类：

- 运行日志：结构化 JSON，输出到标准输出，供 PM2/日志平台收集
- 错误日志：同样走结构化 JSON，带 `requestId`
- 审计日志：写入 MongoDB `customer_operation_logs`

## 关键字段

运行日志统一字段：

- `timestamp`
- `level`
- `context`
- `message`
- `requestId`
- `method`
- `path`
- `userId`
- `ip`

审计日志新增字段：

- `entityType`
- `entityId`
- `requestId`

## requestId 机制

- 每个请求进入后端都会自动生成或继承 `x-request-id`
- 后端响应体会返回 `requestId`
- 异常响应也会返回 `requestId`
- 日志中可以用 `requestId` 串起一次完整请求链路

前端或调用方也可以主动传入：

```http
x-request-id: req-20260318-abc123
```

## 查看日志

### PM2

开发环境：

```bash
cd /home/ubuntu/andejiazhengcrm/backend
pm2 logs backend-dev
```

生产环境：

```bash
cd /home/ubuntu/andejiazhengcrm/backend
pm2 logs backend-prod
```

### 按 requestId 查

```bash
pm2 logs backend-prod | rg "d7f5c3d4"
```

### 按客户或合同查

```bash
pm2 logs backend-prod | rg "69b91aeb8f01a743999e16e6"
pm2 logs backend-prod | rg "CONTRACT_1773739040771_q5dhdrtza"
```

## 审计日志查询

审计日志集合：

- `customer_operation_logs`

示例：

```javascript
db.customer_operation_logs.find({
  entityType: 'contract',
  entityId: '69b91c1f8f01a743999e18e0'
}).sort({ operatedAt: -1 })
```

查询某客户：

```javascript
db.customer_operation_logs.find({
  customerId: ObjectId('69b91aeb8f01a743999e16e6')
}).sort({ operatedAt: -1 })
```

## 常见排障路径

### 1. 客户签约后没有第一时间变为 O 类

先查合同签约回调日志：

```bash
pm2 logs backend-prod | rg "esign.callback"
```

再查合同创建/签约关联日志：

```bash
pm2 logs backend-prod | rg "contract.create|contract.detail|customer.lead_level_o"
```

最后查审计日志：

```javascript
db.customer_operation_logs.find({
  customerId: ObjectId('客户MongoId')
}).sort({ operatedAt: -1 })
```

### 2. 客户被自动流转了

查运行日志：

```bash
pm2 logs backend-prod | rg "系统自动流转|customer"
```

查审计日志：

```javascript
db.customer_operation_logs.find({
  operationName: '系统自动流转',
  customerId: ObjectId('客户MongoId')
}).sort({ operatedAt: -1 })
```

### 3. 微信通知为什么没发

查：

```bash
pm2 logs backend-prod | rg "wechat.assignment_notification|wechat.batch_assignment_notification"
```

重点看：

- `skipped_no_openid`
- `sent`
- `failed`

## 脱敏规则

以下内容会自动脱敏后写入运行日志：

- 手机号
- 身份证号
- token / authorization / cookie
- openid
- privateKey / publicKey
- 地址
- 签署链接等敏感字段

## 开发约束

- 新代码不要直接新增 `console.log` / `console.error`
- 优先使用 `AppLogger`
- 审计类变更通过统一审计模型写入
- 外部接口日志只打摘要，不打印完整敏感数据


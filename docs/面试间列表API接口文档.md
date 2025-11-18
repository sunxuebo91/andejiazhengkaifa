# 📡 面试间列表 API 接口文档

## 基础信息

- **Base URL**: `/api/interview`
- **认证方式**: JWT Token (Header: `Authorization: Bearer <token>`)
- **响应格式**: JSON

---

## 接口列表

### 1. 创建面试间

**POST** `/api/interview/rooms`

#### 请求参数

```json
{
  "roomId": "room_1234567890",
  "roomName": "张三的面试间",
  "hostName": "张三",
  "hostZegoUserId": "user_1234567890"
}
```

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| roomId | string | ✅ | 房间ID（唯一） |
| roomName | string | ✅ | 房间名称 |
| hostName | string | ✅ | 主持人姓名 |
| hostZegoUserId | string | ✅ | 主持人ZEGO用户ID |

#### 响应示例

```json
{
  "success": true,
  "message": "面试间创建成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "roomId": "room_1234567890",
    "roomName": "张三的面试间",
    "hostUserId": "507f191e810c19729de860ea",
    "hostName": "张三",
    "hostZegoUserId": "user_1234567890",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "participants": [
      {
        "userId": "user_1234567890",
        "userName": "张三",
        "role": "host",
        "joinedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 2. 获取面试间列表

**GET** `/api/interview/rooms`

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| pageSize | number | ❌ | 10 | 每页数量 |
| status | string | ❌ | - | 状态筛选：`active` 或 `ended` |
| search | string | ❌ | - | 搜索房间名称 |

#### 请求示例

```
GET /api/interview/rooms?page=1&pageSize=10&status=active&search=张三
```

#### 响应示例

```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "roomId": "room_1234567890",
        "roomName": "张三的面试间",
        "hostUserId": "507f191e810c19729de860ea",
        "hostName": "张三",
        "hostZegoUserId": "user_1234567890",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "participants": [
          {
            "userId": "user_1234567890",
            "userName": "张三",
            "role": "host",
            "joinedAt": "2024-01-15T10:30:00.000Z"
          },
          {
            "userId": "guest_9876543210",
            "userName": "李四",
            "role": "guest",
            "identity": "前端工程师",
            "joinedAt": "2024-01-15T10:32:00.000Z"
          }
        ]
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

---

### 3. 获取面试间详情

**GET** `/api/interview/rooms/:roomId`

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| roomId | string | ✅ | 房间ID |

#### 请求示例

```
GET /api/interview/rooms/room_1234567890
```

#### 响应示例

```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "roomId": "room_1234567890",
    "roomName": "张三的面试间",
    "hostUserId": "507f191e810c19729de860ea",
    "hostName": "张三",
    "hostZegoUserId": "user_1234567890",
    "status": "ended",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "endedAt": "2024-01-15T11:15:00.000Z",
    "duration": 2700,
    "participants": [
      {
        "userId": "user_1234567890",
        "userName": "张三",
        "role": "host",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "leftAt": "2024-01-15T11:15:00.000Z"
      },
      {
        "userId": "guest_9876543210",
        "userName": "李四",
        "role": "guest",
        "identity": "前端工程师",
        "joinedAt": "2024-01-15T10:32:00.000Z",
        "leftAt": "2024-01-15T11:10:00.000Z"
      }
    ]
  }
}
```

---

### 4. 结束面试间

**POST** `/api/interview/rooms/:roomId/end`

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| roomId | string | ✅ | 房间ID |

#### 请求示例

```
POST /api/interview/rooms/room_1234567890/end
```

#### 响应示例

```json
{
  "success": true,
  "message": "面试间已结束",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "roomId": "room_1234567890",
    "roomName": "张三的面试间",
    "hostUserId": "507f191e810c19729de860ea",
    "hostName": "张三",
    "hostZegoUserId": "user_1234567890",
    "status": "ended",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "endedAt": "2024-01-15T11:15:00.000Z",
    "duration": 2700,
    "participants": [...]
  }
}
```

---

### 5. 检查房间状态

**GET** `/api/interview/rooms/:roomId/status`

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| roomId | string | ✅ | 房间ID |

#### 请求示例

```
GET /api/interview/rooms/room_1234567890/status
```

#### 响应示例（可以进入）

```json
{
  "success": true,
  "message": "检查成功",
  "data": {
    "exists": true,
    "canJoin": true,
    "reason": "可以进入",
    "room": {
      "_id": "507f1f77bcf86cd799439011",
      "roomId": "room_1234567890",
      "roomName": "张三的面试间",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### 响应示例（房间已结束）

```json
{
  "success": true,
  "message": "检查成功",
  "data": {
    "exists": true,
    "canJoin": false,
    "reason": "面试间已结束"
  }
}
```

#### 响应示例（房间不存在）

```json
{
  "success": true,
  "message": "检查成功",
  "data": {
    "exists": false,
    "canJoin": false,
    "reason": "面试间不存在"
  }
}
```

---

## 错误响应

### 401 未授权

```json
{
  "success": false,
  "message": "未授权，请先登录",
  "error": "UNAUTHORIZED"
}
```

### 403 无权限

```json
{
  "success": false,
  "message": "无权访问此面试间",
  "error": "ForbiddenException"
}
```

### 404 不存在

```json
{
  "success": false,
  "message": "面试间不存在",
  "error": "NotFoundException"
}
```

### 400 请求错误

```json
{
  "success": false,
  "message": "创建面试间失败",
  "error": "CREATE_FAILED"
}
```

---

## 权限说明

### 权限规则

1. ✅ **所有接口都需要登录**（JWT Token）
2. ✅ **只能访问自己创建的面试间**
3. ✅ **只能结束自己创建的面试间**

### 权限验证流程

```
1. 前端请求携带 JWT Token
   ↓
2. 后端验证 Token，获取 userId
   ↓
3. 查询数据库时过滤 hostUserId === userId
   ↓
4. 操作前验证所有权
   ↓
5. 返回结果或拒绝访问
```

---

## 数据字段说明

### InterviewRoom 对象

| 字段 | 类型 | 说明 |
|-----|------|------|
| _id | string | MongoDB 文档ID |
| roomId | string | 房间ID（唯一标识） |
| roomName | string | 房间名称 |
| hostUserId | string | 主持人用户ID（关联User表） |
| hostName | string | 主持人姓名 |
| hostZegoUserId | string | 主持人ZEGO用户ID |
| status | string | 状态：`active` 或 `ended` |
| createdAt | string | 创建时间（ISO 8601） |
| endedAt | string | 结束时间（ISO 8601，可选） |
| duration | number | 持续时长（秒，可选） |
| participants | array | 参与者列表 |

### Participant 对象

| 字段 | 类型 | 说明 |
|-----|------|------|
| userId | string | ZEGO用户ID |
| userName | string | 用户姓名 |
| role | string | 角色：`host` 或 `guest` |
| identity | string | 访客身份（可选） |
| joinedAt | string | 加入时间（ISO 8601） |
| leftAt | string | 离开时间（ISO 8601，可选） |

---

## 使用示例

### 前端调用示例

```typescript
import apiService from './api';

// 1. 获取面试间列表
const getRooms = async () => {
  const response = await apiService.get('/api/interview/rooms', {
    params: {
      page: 1,
      pageSize: 10,
      status: 'active',
    },
  });
  console.log(response.data.list);
};

// 2. 创建面试间
const createRoom = async () => {
  const response = await apiService.post('/api/interview/rooms', {
    roomId: 'room_1234567890',
    roomName: '张三的面试间',
    hostName: '张三',
    hostZegoUserId: 'user_1234567890',
  });
  console.log(response.data);
};

// 3. 结束面试间
const endRoom = async (roomId: string) => {
  const response = await apiService.post(`/api/interview/rooms/${roomId}/end`);
  console.log(response.data);
};

// 4. 检查房间状态
const checkStatus = async (roomId: string) => {
  const response = await apiService.get(`/api/interview/rooms/${roomId}/status`);
  if (response.data.canJoin) {
    // 可以进入房间
    window.location.href = `/interview/room/${roomId}`;
  } else {
    // 无法进入
    alert(response.data.reason);
  }
};
```

---

## 测试建议

### Postman 测试步骤

1. **登录获取 Token**
   ```
   POST /api/auth/login
   Body: { "username": "test", "password": "123456" }
   ```

2. **设置 Authorization Header**
   ```
   Authorization: Bearer <your_token>
   ```

3. **测试创建面试间**
   ```
   POST /api/interview/rooms
   Body: { "roomId": "room_test", "roomName": "测试", ... }
   ```

4. **测试获取列表**
   ```
   GET /api/interview/rooms?page=1&pageSize=10
   ```

5. **测试结束面试间**
   ```
   POST /api/interview/rooms/room_test/end
   ```

### 权限测试

1. 用户A创建面试间
2. 用户B尝试访问用户A的面试间（应该返回 403）
3. 用户A可以正常访问自己的面试间

---

## 注意事项

1. ✅ **所有时间都使用 ISO 8601 格式**
2. ✅ **duration 单位是秒**
3. ✅ **roomId 必须唯一**
4. ✅ **status 只有两个值：`active` 和 `ended`**
5. ✅ **participants 数组至少包含主持人**
6. ✅ **JWT Token 必须在 Header 中携带**
7. ✅ **所有接口都有权限验证**

---

## 快速参考

| 接口 | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 创建面试间 | POST | `/api/interview/rooms` | 创建新的面试间 |
| 获取列表 | GET | `/api/interview/rooms` | 获取当前用户的面试间列表 |
| 获取详情 | GET | `/api/interview/rooms/:roomId` | 获取指定面试间详情 |
| 结束面试 | POST | `/api/interview/rooms/:roomId/end` | 结束指定面试间 |
| 检查状态 | GET | `/api/interview/rooms/:roomId/status` | 检查房间是否可进入 |

---

**文档版本**: v1.0
**最后更新**: 2024-01-15
**维护者**: 开发团队

# 📡 小程序视频面试 - 后端API接口文档

## 🔗 基础信息

**Base URL**: `https://crm.andejiazheng.com/api`

**认证方式**: Bearer Token（部分接口需要）

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**响应格式**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

---

## 1️⃣ 房间管理接口

### 1.1 创建房间

**接口**: `POST /interview/create-room`

**需要认证**: ✅ 是

**请求参数**:
```json
{
  "roomId": "room_1234567_abc",
  "roomName": "张经理的面试房间",
  "hostName": "张经理"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "创建成功",
  "data": {
    "roomId": "room_1234567_abc",
    "roomName": "张经理的面试房间",
    "hostName": "张经理",
    "status": "active",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "房间号已存在",
  "code": "ROOM_EXISTS"
}
```

---

### 1.2 获取房间信息

**接口**: `GET /interview/room/:roomId`

**需要认证**: ❌ 否（公开接口）

**URL参数**:
- `roomId`: 房间号

**响应示例**:
```json
{
  "success": true,
  "data": {
    "roomId": "room_1234567_abc",
    "roomName": "张经理的面试房间",
    "hostName": "张经理",
    "status": "active",
    "participants": [
      {
        "userId": "user_001",
        "userName": "张经理",
        "role": "host",
        "joinedAt": "2024-01-01T10:00:00Z"
      },
      {
        "userId": "guest_001",
        "userName": "李明",
        "role": "guest",
        "identity": "求职者",
        "joinedAt": "2024-01-01T10:05:00Z"
      }
    ],
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "房间不存在",
  "code": "ROOM_NOT_FOUND"
}
```

---

### 1.3 结束房间

**接口**: `POST /interview/room/:roomId/end`

**需要认证**: ✅ 是（仅主持人）

**URL参数**:
- `roomId`: 房间号

**响应示例**:
```json
{
  "success": true,
  "message": "房间已结束",
  "data": {
    "roomId": "room_1234567_abc",
    "status": "ended",
    "endedAt": "2024-01-01T11:00:00Z"
  }
}
```

---

### 1.4 获取房间列表

**接口**: `GET /interview/rooms`

**需要认证**: ✅ 是

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认10）
- `status`: 状态筛选（active/ended）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "list": [
      {
        "roomId": "room_1234567_abc",
        "roomName": "张经理的面试房间",
        "hostName": "张经理",
        "status": "active",
        "participantCount": 3,
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

---

## 2️⃣ ZEGO Token接口

### 2.1 生成ZEGO Token

**接口**: `POST /zego/generate-token`

**需要认证**: ❌ 否（公开接口，但需要验证房间）

**请求参数**:
```json
{
  "userId": "user_001",
  "userName": "张经理",
  "roomId": "room_1234567_abc",
  "expireTime": 7200
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "04AAAAAGXXX...",
    "appId": 123456789,
    "serverSecret": "xxx",
    "userId": "user_001",
    "roomId": "room_1234567_abc",
    "expireTime": 7200
  }
}
```

---

## 3️⃣ 微信登录接口

### 3.1 微信小程序登录

**接口**: `POST /wechat/login`

**需要认证**: ❌ 否

**请求参数**:
```json
{
  "code": "081xxxxx"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": "user_001",
      "name": "张经理",
      "avatar": "https://xxx.com/avatar.png",
      "phone": "138****8888",
      "openid": "oXXXX",
      "role": "hr"
    }
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "登录失败，请重试",
  "code": "LOGIN_FAILED"
}
```

---

### 3.2 获取手机号

**接口**: `POST /wechat/get-phone`

**需要认证**: ✅ 是

**请求参数**:
```json
{
  "code": "xxx"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "phoneNumber": "13800138000",
    "purePhoneNumber": "13800138000",
    "countryCode": "86"
  }
}
```

---

## 4️⃣ 小程序码接口

### 4.1 生成小程序码

**接口**: `POST /wechat/generate-qrcode`

**需要认证**: ✅ 是

**请求参数**:
```json
{
  "page": "pages/interview/guest/guest",
  "scene": "roomId=room_1234567_abc",
  "width": 280,
  "autoColor": false,
  "lineColor": {
    "r": 93,
    "g": 191,
    "b": 179
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "qrcodeUrl": "https://crm.andejiazheng.com/uploads/qrcode/xxx.png",
    "buffer": "base64编码的图片数据"
  }
}
```

---

## 5️⃣ 访客管理接口

### 5.1 访客加入房间

**接口**: `POST /interview/guest/join`

**需要认证**: ❌ 否

**请求参数**:
```json
{
  "roomId": "room_1234567_abc",
  "userName": "李明",
  "identity": "求职者"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "guestId": "guest_001",
    "roomId": "room_1234567_abc",
    "userName": "李明",
    "identity": "求职者",
    "joinedAt": "2024-01-01T10:05:00Z"
  }
}
```

---

### 5.2 访客离开房间

**接口**: `POST /interview/guest/leave`

**需要认证**: ❌ 否

**请求参数**:
```json
{
  "roomId": "room_1234567_abc",
  "guestId": "guest_001"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "已离开房间"
}
```

---

## 6️⃣ 错误码说明

| 错误码 | 说明 | HTTP状态码 |
|--------|------|-----------|
| `SUCCESS` | 成功 | 200 |
| `INVALID_PARAMS` | 参数错误 | 400 |
| `UNAUTHORIZED` | 未授权 | 401 |
| `FORBIDDEN` | 禁止访问 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `ROOM_EXISTS` | 房间已存在 | 400 |
| `ROOM_NOT_FOUND` | 房间不存在 | 404 |
| `ROOM_ENDED` | 房间已结束 | 400 |
| `LOGIN_FAILED` | 登录失败 | 401 |
| `TOKEN_EXPIRED` | Token过期 | 401 |
| `INTERNAL_ERROR` | 服务器错误 | 500 |

---

## 7️⃣ 后端实现示例（Node.js）

### 创建房间接口实现

```javascript
// routes/interview.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const interviewService = require('../services/interviewService');

// 创建房间
router.post('/create-room', authenticateToken, async (req, res) => {
  try {
    const { roomId, roomName, hostName } = req.body;
    const userId = req.user.id;

    // 验证参数
    if (!roomId || !roomName || !hostName) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
        code: 'INVALID_PARAMS'
      });
    }

    // 检查房间是否已存在
    const existingRoom = await interviewService.getRoomById(roomId);
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: '房间号已存在',
        code: 'ROOM_EXISTS'
      });
    }

    // 创建房间
    const room = await interviewService.createRoom({
      roomId,
      roomName,
      hostName,
      hostId: userId,
      status: 'active',
      createdAt: new Date()
    });

    res.json({
      success: true,
      message: '创建成功',
      data: room
    });
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({
      success: false,
      message: '创建失败',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 获取房间信息
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await interviewService.getRoomById(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在',
        code: 'ROOM_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('获取房间信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取失败',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
```

### ZEGO Token生成实现

```javascript
// routes/zego.js
const express = require('express');
const router = express.Router();
const { generateToken04 } = require('../utils/zegoToken');

router.post('/generate-token', async (req, res) => {
  try {
    const { userId, userName, roomId, expireTime = 7200 } = req.body;

    // 验证参数
    if (!userId || !userName || !roomId) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
        code: 'INVALID_PARAMS'
      });
    }

    // ZEGO配置（从环境变量读取）
    const appId = parseInt(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    // 生成Token
    const token = generateToken04(
      appId,
      userId,
      serverSecret,
      expireTime,
      ''
    );

    res.json({
      success: true,
      data: {
        token,
        appId,
        userId,
        roomId,
        expireTime
      }
    });
  } catch (error) {
    console.error('生成Token失败:', error);
    res.status(500).json({
      success: false,
      message: '生成Token失败',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
```

### 微信登录实现

```javascript
// routes/wechat.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');

router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少code参数',
        code: 'INVALID_PARAMS'
      });
    }

    // 调用微信接口获取openid
    const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WX_APPID,
        secret: process.env.WX_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (wxRes.data.errcode) {
      throw new Error(wxRes.data.errmsg);
    }

    const { openid, session_key } = wxRes.data;

    // 查找或创建用户
    let user = await userService.findByOpenid(openid);
    if (!user) {
      user = await userService.create({
        openid,
        session_key,
        role: 'hr'
      });
    }

    // 生成JWT Token
    const token = jwt.sign(
      { id: user.id, openid: user.openid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        userInfo: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      code: 'LOGIN_FAILED'
    });
  }
});

module.exports = router;
```

---

## 8️⃣ 数据库设计

### 房间表 (interview_rooms)

```sql
CREATE TABLE interview_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id VARCHAR(100) UNIQUE NOT NULL,
  room_name VARCHAR(200) NOT NULL,
  host_id INT NOT NULL,
  host_name VARCHAR(100) NOT NULL,
  status ENUM('active', 'ended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  INDEX idx_room_id (room_id),
  INDEX idx_host_id (host_id),
  INDEX idx_status (status)
);
```

### 参与者表 (interview_participants)

```sql
CREATE TABLE interview_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  role ENUM('host', 'guest') NOT NULL,
  identity VARCHAR(50),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,
  INDEX idx_room_id (room_id),
  INDEX idx_user_id (user_id)
);
```

### 用户表 (users)

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100),
  avatar VARCHAR(500),
  phone VARCHAR(20),
  role ENUM('hr', 'admin') DEFAULT 'hr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid)
);
```

---

## 📝 环境变量配置

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=interview_db
DB_USER=root
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key

# 微信小程序配置
WX_APPID=your_wx_appid
WX_SECRET=your_wx_secret

# ZEGO配置
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret
```

---

## 🚀 下一步

查看 `MINIPROGRAM_DEPLOYMENT_GUIDE.md` 了解完整的部署流程。


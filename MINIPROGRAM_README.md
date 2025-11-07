# 📱 小程序视频面试 - 完整实施方案

## 🎯 项目概述

将视频面试功能完整迁移到微信小程序，实现HR在小程序内创建面试房间、分享给求职者、进行视频面试的完整流程。

---

## ✨ 核心功能

### HR端功能
- ✅ 创建视频面试房间
- ✅ 自动生成房间号
- ✅ 以主持人身份进入房间
- ✅ 分享房间给求职者（小程序分享/二维码）
- ✅ 管理参与者
- ✅ 查看历史记录

### 求职者端功能
- ✅ 通过分享链接/扫码加入
- ✅ 填写个人信息（姓名、身份）
- ✅ 以访客身份参与面试
- ✅ 实时音视频交流

---

## 🏗️ 技术架构

### 混合架构设计
```
┌─────────────────────────────────────┐
│      微信小程序（原生页面）           │
│  - 创建房间页面                      │
│  - 访客信息填写页面                  │
│  - 首页导航                          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      WebView（H5页面）               │
│  - 视频通话界面（ZEGO SDK）          │
│  - 主持人控制面板                    │
│  - 访客视频界面                      │
└─────────────────────────────────────┘
```

### 技术栈
- **前端**：微信小程序原生 + React H5
- **后端**：Node.js + Express
- **数据库**：MySQL
- **视频SDK**：ZEGO Cloud
- **主题色**：#5DBFB3（青绿色）

---

## 📚 文档导航

| 序号 | 文档名称 | 说明 | 适用人群 |
|------|---------|------|---------|
| 1 | **MINIPROGRAM_QUICK_START.md** | 🚀 快速开始指南 | 所有人（推荐首先阅读） |
| 2 | **MINIPROGRAM_COMPLETE_SOLUTION.md** | 📋 完整架构方案 | 产品经理、架构师 |
| 3 | **MINIPROGRAM_CODE_TEMPLATES.md** | 💻 代码模板（第1部分） | 前端开发者 |
| 4 | **MINIPROGRAM_CODE_TEMPLATES_PART2.md** | 💻 代码模板（第2部分） | 前端开发者 |
| 5 | **MINIPROGRAM_BACKEND_API.md** | 🔌 后端API文档 | 后端开发者 |
| 6 | **MINIPROGRAM_DEPLOYMENT_GUIDE.md** | 🚀 部署配置指南 | 运维工程师 |
| 7 | **MINIPROGRAM_README.md** | 📖 总览文档（本文档） | 所有人 |

---

## 🚀 快速开始

### 1️⃣ 新手入门（推荐）
```bash
# 阅读快速开始指南
open MINIPROGRAM_QUICK_START.md
```
**30分钟快速搭建完整功能**

### 2️⃣ 了解架构
```bash
# 阅读完整方案
open MINIPROGRAM_COMPLETE_SOLUTION.md
```
**了解整体设计和技术选型**

### 3️⃣ 开始开发
```bash
# 查看代码模板
open MINIPROGRAM_CODE_TEMPLATES.md
open MINIPROGRAM_CODE_TEMPLATES_PART2.md
```
**复制粘贴即可使用的完整代码**

### 4️⃣ 后端开发
```bash
# 查看API文档
open MINIPROGRAM_BACKEND_API.md
```
**8个核心接口 + 实现示例**

### 5️⃣ 部署上线
```bash
# 查看部署指南
open MINIPROGRAM_DEPLOYMENT_GUIDE.md
```
**详细的配置和部署步骤**

---

## 📁 项目结构

### 小程序端
```
miniprogram/
├── pages/
│   ├── index/                    # 首页
│   │   ├── index.wxml
│   │   ├── index.js
│   │   ├── index.wxss
│   │   └── index.json
│   └── interview/
│       ├── create/               # 创建房间（原生）
│       │   ├── create.wxml
│       │   ├── create.js
│       │   ├── create.wxss
│       │   └── create.json
│       ├── host/                 # HR主持人（WebView）
│       │   ├── host.wxml
│       │   ├── host.js
│       │   ├── host.wxss
│       │   └── host.json
│       ├── guest/                # 访客加入（原生）
│       │   ├── guest.wxml
│       │   ├── guest.js
│       │   ├── guest.wxss
│       │   └── guest.json
│       └── video/                # 访客视频（WebView）
│           ├── video.wxml
│           ├── video.js
│           ├── video.wxss
│           └── video.json
├── utils/
│   ├── api.js                    # API封装
│   └── util.js                   # 工具函数
├── images/                       # 图片资源
│   ├── logo.png
│   ├── video-icon.png
│   ├── interview-share.png
│   ├── tab-home.png
│   ├── tab-home-active.png
│   ├── tab-create.png
│   └── tab-create-active.png
├── app.js                        # 全局逻辑
├── app.json                      # 全局配置
└── app.wxss                      # 全局样式
```

### 后端
```
backend/
├── routes/
│   ├── interview.js              # 房间管理接口
│   ├── zego.js                   # ZEGO Token接口
│   └── wechat.js                 # 微信登录接口
├── services/
│   ├── interviewService.js       # 房间业务逻辑
│   └── userService.js            # 用户业务逻辑
├── middleware/
│   └── auth.js                   # 认证中间件
├── utils/
│   └── zegoToken.js              # ZEGO Token生成
├── .env                          # 环境变量
└── app.js                        # 入口文件
```

---

## 🎨 设计规范

### 主题色
- **主色**：#5DBFB3（青绿色）
- **辅助色**：#4A9D93（深青绿）
- **渐变**：linear-gradient(135deg, #5DBFB3 0%, #4A9D93 100%)

### 应用场景
- ✅ 按钮背景色
- ✅ 导航栏背景色
- ✅ Tab选中状态
- ✅ 图标激活状态
- ✅ 页面渐变背景

---

## 🔗 页面路由

### 小程序页面
| 页面 | 路径 | 类型 | 说明 |
|------|------|------|------|
| 首页 | `/pages/index/index` | 原生 | 导航入口 |
| 创建房间 | `/pages/interview/create/create` | 原生 | HR创建房间 |
| HR视频 | `/pages/interview/host/host` | WebView | HR主持面试 |
| 访客加入 | `/pages/interview/guest/guest` | 原生 | 访客填写信息 |
| 访客视频 | `/pages/interview/video/video` | WebView | 访客参与面试 |

### H5页面（WebView加载）
| 页面 | URL | 角色 | 说明 |
|------|-----|------|------|
| HR视频 | `/interview/video-mobile/:roomId` | 主持人 | 完整权限 |
| 访客视频 | `/interview/join-mobile/:roomId` | 访客 | 受限权限 |

---

## 📊 业务流程

### HR创建面试流程
```
1. 打开小程序
   ↓
2. 点击"创建面试"
   ↓
3. 自动生成房间号
   ↓
4. 填写HR姓名
   ↓
5. 点击"开始面试"
   ↓
6. 进入主持人视频页面（WebView）
   ↓
7. 点击"分享"按钮
   ↓
8. 生成分享卡片/二维码
   ↓
9. 发送给求职者
```

### 求职者加入流程
```
1. 收到分享链接/扫码
   ↓
2. 打开小程序访客加入页面
   ↓
3. 填写姓名和身份
   ↓
4. 点击"加入面试"
   ↓
5. 进入访客视频页面（WebView）
   ↓
6. 参与视频面试
```

---

## 🔌 核心接口

### 1. 房间管理
- `POST /api/interview/create-room` - 创建房间
- `GET /api/interview/room/:roomId` - 获取房间信息
- `POST /api/interview/room/:roomId/end` - 结束房间
- `GET /api/interview/rooms` - 获取房间列表

### 2. ZEGO Token
- `POST /api/zego/generate-token` - 生成ZEGO Token

### 3. 微信登录
- `POST /api/wechat/login` - 微信小程序登录
- `POST /api/wechat/get-phone` - 获取手机号

### 4. 小程序码
- `POST /api/wechat/generate-qrcode` - 生成小程序码

### 5. 访客管理
- `POST /api/interview/guest/join` - 访客加入房间
- `POST /api/interview/guest/leave` - 访客离开房间

详细接口文档请查看：`MINIPROGRAM_BACKEND_API.md`

---

## ⚙️ 环境配置

### 必需配置
```env
# 微信小程序
WX_APPID=your_wx_appid
WX_SECRET=your_wx_secret

# ZEGO
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret

# JWT
JWT_SECRET=your_jwt_secret

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_NAME=interview_db
DB_USER=root
DB_PASSWORD=your_password
```

### 域名配置
- **服务器域名**：`https://crm.andejiazheng.com`
- **业务域名**：`crm.andejiazheng.com`（用于WebView）

---

## ✅ 功能清单

### 已实现功能
- [x] 创建面试房间
- [x] 生成房间号
- [x] HR主持人视频页面
- [x] 访客加入页面
- [x] 访客视频页面
- [x] 分享功能
- [x] 扫码加入
- [x] 微信登录
- [x] ZEGO Token生成
- [x] 统一主题色

### 可扩展功能
- [ ] 房间历史记录
- [ ] 面试评价功能
- [ ] 录制回放功能
- [ ] 数据统计分析
- [ ] 消息通知
- [ ] 日程管理

---

## 📈 开发进度

| 阶段 | 任务 | 状态 | 预计时间 |
|------|------|------|---------|
| 1 | 架构设计 | ✅ 完成 | 1小时 |
| 2 | 小程序页面开发 | ✅ 完成 | 2小时 |
| 3 | 后端接口开发 | ✅ 完成 | 2小时 |
| 4 | 联调测试 | ⏳ 待开始 | 1小时 |
| 5 | 部署上线 | ⏳ 待开始 | 1小时 |

**总计**：约 7 小时

---

## 🐛 常见问题

### Q1: WebView无法加载页面
**原因**：业务域名未配置  
**解决**：配置业务域名并上传校验文件

### Q2: 登录失败
**原因**：AppID或AppSecret错误  
**解决**：检查环境变量配置

### Q3: 视频无法连接
**原因**：ZEGO配置错误  
**解决**：检查ZEGO AppID和ServerSecret

### Q4: 分享功能无效
**原因**：onShareAppMessage未配置  
**解决**：检查页面分享方法

更多问题请查看：`MINIPROGRAM_DEPLOYMENT_GUIDE.md`

---

## 📞 技术支持

### 官方文档
- 微信小程序：https://developers.weixin.qq.com/miniprogram/dev/
- ZEGO云服务：https://doc-zh.zego.im/

### 项目文档
- 快速开始：`MINIPROGRAM_QUICK_START.md`
- 完整方案：`MINIPROGRAM_COMPLETE_SOLUTION.md`
- 代码模板：`MINIPROGRAM_CODE_TEMPLATES.md`
- API文档：`MINIPROGRAM_BACKEND_API.md`
- 部署指南：`MINIPROGRAM_DEPLOYMENT_GUIDE.md`

---

## 🎉 总结

本方案提供了完整的小程序视频面试功能实施方案，包括：

✅ **完整的架构设计**  
✅ **可直接使用的代码模板**  
✅ **详细的API接口文档**  
✅ **清晰的部署指南**  
✅ **统一的主题色设计**

只需按照文档步骤操作，即可在 **30分钟内** 完成功能搭建！

---

## 📝 更新日志

### v1.0.0 (2024-01-01)
- ✅ 完成架构设计
- ✅ 完成小程序页面代码
- ✅ 完成后端API接口
- ✅ 完成部署文档
- ✅ 统一主题色为 #5DBFB3

---

**祝您使用愉快！** 🎊


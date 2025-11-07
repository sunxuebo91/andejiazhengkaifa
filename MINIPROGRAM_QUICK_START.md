# 🚀 小程序视频面试 - 快速开始指南

## 📖 概述

本指南将帮助您在 **30分钟内** 快速搭建小程序视频面试功能。

---

## 🎯 功能特性

✅ **HR端功能**
- 创建视频面试房间
- 生成房间号
- 分享给求职者
- 主持视频面试
- 管理参与者

✅ **求职者端功能**
- 扫码或链接加入
- 填写个人信息
- 参与视频面试
- 实时音视频交流

✅ **技术特性**
- 混合架构（小程序原生 + WebView H5）
- 统一主题色 #5DBFB3
- 响应式设计
- 跨平台支持

---

## 📁 文档导航

| 文档 | 说明 | 适用人群 |
|------|------|---------|
| **MINIPROGRAM_COMPLETE_SOLUTION.md** | 完整架构方案 | 产品经理、架构师 |
| **MINIPROGRAM_CODE_TEMPLATES.md** | 小程序代码模板（第1部分） | 前端开发者 |
| **MINIPROGRAM_CODE_TEMPLATES_PART2.md** | 小程序代码模板（第2部分） | 前端开发者 |
| **MINIPROGRAM_BACKEND_API.md** | 后端API接口文档 | 后端开发者 |
| **MINIPROGRAM_DEPLOYMENT_GUIDE.md** | 部署配置指南 | 运维工程师 |
| **MINIPROGRAM_QUICK_START.md** | 快速开始指南（本文档） | 所有人 |

---

## ⚡ 5分钟快速预览

### 1. 查看完整方案
```bash
# 打开完整架构文档
open MINIPROGRAM_COMPLETE_SOLUTION.md
```

**了解内容**：
- 整体架构设计
- 页面流程图
- 功能模块划分
- 技术选型

### 2. 查看代码模板
```bash
# 打开代码模板
open MINIPROGRAM_CODE_TEMPLATES.md
open MINIPROGRAM_CODE_TEMPLATES_PART2.md
```

**包含内容**：
- 5个完整页面代码
- 工具函数封装
- API接口封装
- 全局配置文件

### 3. 查看API文档
```bash
# 打开API文档
open MINIPROGRAM_BACKEND_API.md
```

**包含内容**：
- 8个核心接口
- 请求/响应示例
- 错误码说明
- 后端实现示例

---

## 🛠️ 30分钟完整实施

### 第一步：准备工作（5分钟）

**1.1 检查清单**
- [ ] 微信小程序账号（AppID）
- [ ] 已备案的HTTPS域名
- [ ] ZEGO账号（AppID + ServerSecret）
- [ ] 服务器环境（Node.js 14+）

**1.2 下载工具**
- [ ] 微信开发者工具
- [ ] 代码编辑器（VS Code推荐）

---

### 第二步：创建小程序项目（5分钟）

**2.1 创建项目**
```bash
# 创建项目目录
mkdir video-interview-miniprogram
cd video-interview-miniprogram
```

**2.2 复制代码**

从 `MINIPROGRAM_CODE_TEMPLATES.md` 和 `MINIPROGRAM_CODE_TEMPLATES_PART2.md` 复制以下文件：

```
miniprogram/
├── pages/
│   ├── index/              # 首页
│   │   ├── index.wxml
│   │   ├── index.js
│   │   ├── index.wxss
│   │   └── index.json
│   └── interview/
│       ├── create/         # 创建房间
│       ├── host/           # HR主持人
│       ├── guest/          # 访客加入
│       └── video/          # 访客视频
├── utils/
│   ├── api.js             # API封装
│   └── util.js            # 工具函数
├── images/                # 图片资源
├── app.js
├── app.json
└── app.wxss
```

**2.3 准备图片**

在 `images/` 目录准备以下图片：
- logo.png (200x200)
- video-icon.png (120x120)
- interview-share.png (500x400)
- tab-home.png (81x81)
- tab-home-active.png (81x81)
- tab-create.png (81x81)
- tab-create-active.png (81x81)

---

### 第三步：配置小程序（5分钟）

**3.1 修改 utils/api.js**
```javascript
// 修改第1行
const BASE_URL = 'https://crm.andejiazheng.com/api';
// 改为您的域名
const BASE_URL = 'https://your-domain.com/api';
```

**3.2 配置微信公众平台**

登录 https://mp.weixin.qq.com

1. **配置服务器域名**
   - 开发 → 开发管理 → 开发设置 → 服务器域名
   - 添加：`https://your-domain.com`

2. **配置业务域名**
   - 开发 → 开发管理 → 开发设置 → 业务域名
   - 添加：`your-domain.com`
   - 下载校验文件并上传到服务器根目录

---

### 第四步：部署后端（10分钟）

**4.1 创建后端项目**
```bash
cd backend
npm init -y
npm install express cors dotenv jsonwebtoken axios mysql2
```

**4.2 创建 .env 文件**
```env
PORT=3000
WX_APPID=your_wx_appid
WX_SECRET=your_wx_secret
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret
JWT_SECRET=your_jwt_secret
```

**4.3 复制后端代码**

从 `MINIPROGRAM_BACKEND_API.md` 复制后端实现代码：
- routes/interview.js
- routes/zego.js
- routes/wechat.js

**4.4 启动服务**
```bash
npm run start
# 或使用 PM2
pm2 start app.js --name interview-api
```

---

### 第五步：测试（5分钟）

**5.1 本地测试**
1. 打开微信开发者工具
2. 导入项目（填写AppID）
3. 点击"编译"
4. 测试创建房间功能

**5.2 真机测试**
1. 点击"预览"
2. 微信扫码
3. 测试完整流程：
   - 创建房间 ✅
   - 进入视频页面 ✅
   - 分享功能 ✅
   - 访客加入 ✅

---

## 📊 页面流程图

### HR主持人流程
```
首页
  ↓
创建房间页面
  ↓ (生成房间号)
主持人视频页面 (WebView)
  ↓ (分享)
访客收到邀请
```

### 访客流程
```
收到分享/扫码
  ↓
访客加入页面
  ↓ (填写信息)
访客视频页面 (WebView)
  ↓
参与面试
```

---

## 🎨 主题色配置

所有页面统一使用主题色：**#5DBFB3**（青绿色）

**已应用位置**：
- ✅ 按钮背景色
- ✅ 导航栏背景色
- ✅ Tab选中颜色
- ✅ 图标激活颜色
- ✅ 渐变背景色

---

## 🔗 URL路由说明

| 页面 | 路径 | 角色 | 说明 |
|------|------|------|------|
| 创建房间 | `/pages/interview/create/create` | HR | 小程序原生页面 |
| HR视频 | `/pages/interview/host/host` | HR | WebView加载H5 |
| 访客加入 | `/pages/interview/guest/guest` | 访客 | 小程序原生页面 |
| 访客视频 | `/pages/interview/video/video` | 访客 | WebView加载H5 |

**WebView加载的H5页面**：
- HR: `https://crm.andejiazheng.com/interview/video-mobile/:roomId`
- 访客: `https://crm.andejiazheng.com/interview/join-mobile/:roomId`

---

## ⚠️ 注意事项

### 1. 域名配置
- ✅ 必须使用HTTPS
- ✅ 必须已备案
- ✅ 需要配置业务域名（WebView）
- ✅ 需要上传校验文件

### 2. 权限配置
- ✅ 摄像头权限
- ✅ 麦克风权限
- ✅ 用户信息权限

### 3. 审核注意
- ✅ 选择正确类目：商业服务 → 人力资源/招聘
- ✅ 详细描述功能
- ✅ 提供测试账号

---

## 🐛 常见问题

### Q1: WebView白屏
**解决**：检查业务域名配置和校验文件

### Q2: 登录失败
**解决**：检查AppID和AppSecret配置

### Q3: 视频无法连接
**解决**：检查ZEGO配置和Token生成

### Q4: 分享无效
**解决**：检查onShareAppMessage方法和路径

---

## 📞 获取帮助

### 查看详细文档
- 架构设计：`MINIPROGRAM_COMPLETE_SOLUTION.md`
- 代码实现：`MINIPROGRAM_CODE_TEMPLATES.md`
- API接口：`MINIPROGRAM_BACKEND_API.md`
- 部署配置：`MINIPROGRAM_DEPLOYMENT_GUIDE.md`

### 技术支持
- 微信开发文档：https://developers.weixin.qq.com/miniprogram/dev/
- ZEGO文档：https://doc-zh.zego.im/

---

## ✅ 检查清单

部署前请确认：

**小程序配置**
- [ ] AppID已配置
- [ ] 服务器域名已配置
- [ ] 业务域名已配置并验证
- [ ] 权限已开通

**后端配置**
- [ ] 环境变量已配置
- [ ] 数据库已初始化
- [ ] 服务已启动
- [ ] API可正常访问

**功能测试**
- [ ] 创建房间功能正常
- [ ] WebView可正常加载
- [ ] 视频通话功能正常
- [ ] 分享功能正常
- [ ] 访客加入功能正常

**准备提审**
- [ ] 代码已上传
- [ ] 类目已选择
- [ ] 功能描述已填写
- [ ] 测试账号已提供

---

## 🎉 完成！

恭喜您完成了小程序视频面试功能的快速搭建！

### 下一步：
1. 📱 提交审核
2. 🚀 发布上线
3. 📊 监控数据
4. 🔧 持续优化

祝您使用愉快！ 🎊


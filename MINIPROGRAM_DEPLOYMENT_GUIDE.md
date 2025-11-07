# 🚀 小程序视频面试 - 部署指南

## 📋 前置准备

### 1. 微信小程序账号
- ✅ 已注册微信小程序
- ✅ 已完成企业认证
- ✅ 获取 AppID 和 AppSecret

### 2. 服务器要求
- ✅ 域名已备案
- ✅ 已配置 HTTPS（SSL证书）
- ✅ 服务器环境：Node.js 14+ 或其他后端环境

### 3. ZEGO账号
- ✅ 已注册 ZEGO 账号
- ✅ 获取 AppID 和 ServerSecret

---

## 🔧 第一步：配置小程序

### 1.1 下载微信开发者工具

访问：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 1.2 创建小程序项目

1. 打开微信开发者工具
2. 点击"+"创建新项目
3. 填写项目信息：
   - 项目名称：视频面试
   - 目录：选择您的项目目录
   - AppID：填写您的小程序AppID
   - 开发模式：小程序
   - 后端服务：不使用云服务

### 1.3 复制代码

将以下文件复制到小程序项目中：

```
miniprogram/
├── pages/
│   ├── index/
│   ├── interview/
│   │   ├── create/
│   │   ├── host/
│   │   ├── guest/
│   │   └── video/
├── utils/
│   ├── api.js
│   └── util.js
├── images/          # 需要准备的图片资源
├── app.js
├── app.json
└── app.wxss
```

### 1.4 准备图片资源

需要准备以下图片（放在 `images/` 目录）：

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `logo.png` | 200x200 | 应用Logo |
| `video-icon.png` | 120x120 | 视频图标 |
| `interview-share.png` | 500x400 | 分享卡片图片 |
| `tab-home.png` | 81x81 | 首页Tab图标 |
| `tab-home-active.png` | 81x81 | 首页Tab选中图标 |
| `tab-create.png` | 81x81 | 创建Tab图标 |
| `tab-create-active.png` | 81x81 | 创建Tab选中图标 |

**图标设计建议**：
- 使用主题色 #5DBFB3
- 简洁明了
- 符合微信设计规范

---

## 🌐 第二步：配置服务器域名

### 2.1 登录微信公众平台

访问：https://mp.weixin.qq.com

### 2.2 配置服务器域名

进入：开发 → 开发管理 → 开发设置 → 服务器域名

**request合法域名**：
```
https://crm.andejiazheng.com
```

**uploadFile合法域名**：
```
https://crm.andejiazheng.com
```

**downloadFile合法域名**：
```
https://crm.andejiazheng.com
```

**业务域名**（用于WebView）：
```
https://crm.andejiazheng.com
```

⚠️ **重要**：
- 域名必须使用 HTTPS
- 域名必须已备案
- 需要下载校验文件并放到服务器根目录

---

## 🔐 第三步：配置业务域名（WebView）

### 3.1 下载校验文件

1. 进入：开发 → 开发管理 → 开发设置 → 业务域名
2. 点击"添加"
3. 输入域名：`crm.andejiazheng.com`
4. 下载校验文件（例如：`xxx.txt`）

### 3.2 上传校验文件到服务器

将校验文件上传到服务器根目录：

```bash
# 使用 scp 上传
scp xxx.txt root@your-server:/var/www/html/

# 或使用 FTP 工具上传到网站根目录
```

确保可以访问：`https://crm.andejiazheng.com/xxx.txt`

### 3.3 完成验证

返回微信公众平台，点击"验证"按钮。

---

## 📱 第四步：配置小程序权限

### 4.1 配置接口权限

进入：开发 → 接口设置

需要开通的接口：
- ✅ wx.login（用户登录）
- ✅ wx.getUserProfile（获取用户信息）
- ✅ getPhoneNumber（获取手机号）
- ✅ wx.scanCode（扫码）
- ✅ wx.navigateTo（页面跳转）

### 4.2 配置隐私设置

进入：设置 → 基本设置 → 服务内容声明

添加以下内容：
```
本小程序提供视频面试服务，需要使用摄像头和麦克风进行视频通话。
我们承诺不会收集、存储或分享您的个人隐私信息。
```

### 4.3 配置用户隐私保护指引

进入：设置 → 基本设置 → 用户隐私保护指引

添加以下权限说明：
- **摄像头**：用于视频面试
- **麦克风**：用于视频面试
- **位置信息**：（如需要）用于记录面试地点

---

## 🔧 第五步：修改配置文件

### 5.1 修改 utils/api.js

```javascript
// 修改 BASE_URL
const BASE_URL = 'https://crm.andejiazheng.com/api';
```

### 5.2 修改 app.js

确保微信登录配置正确：

```javascript
// 检查是否需要修改登录逻辑
async doWxLogin() {
  const { code } = await wx.login();
  const res = await api.wxLogin(code);
  // ...
}
```

---

## 🖥️ 第六步：部署后端服务

### 6.1 安装依赖

```bash
cd backend
npm install
```

### 6.2 配置环境变量

创建 `.env` 文件：

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
JWT_SECRET=your_jwt_secret_key_here

# 微信小程序配置
WX_APPID=your_wx_appid
WX_SECRET=your_wx_secret

# ZEGO配置
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret
```

### 6.3 初始化数据库

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE interview_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入表结构
mysql -u root -p interview_db < database/schema.sql
```

### 6.4 启动服务

```bash
# 开发环境
npm run dev

# 生产环境
npm run start

# 使用 PM2（推荐）
pm2 start app.js --name interview-api
pm2 save
pm2 startup
```

---

## 🧪 第七步：测试

### 7.1 本地测试

1. 在微信开发者工具中打开项目
2. 点击"编译"
3. 测试各个页面功能：
   - ✅ 创建房间
   - ✅ 进入视频页面
   - ✅ 分享功能
   - ✅ 访客加入

### 7.2 真机测试

1. 点击"预览"
2. 使用微信扫码
3. 在真机上测试完整流程

### 7.3 WebView测试

确保WebView可以正常加载H5页面：
- `https://crm.andejiazheng.com/interview/video-mobile/:roomId`
- `https://crm.andejiazheng.com/interview/join-mobile/:roomId`

---

## 📤 第八步：提交审核

### 8.1 上传代码

1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 点击"上传"

### 8.2 提交审核

1. 登录微信公众平台
2. 进入：管理 → 版本管理
3. 找到刚上传的版本
4. 点击"提交审核"

### 8.3 填写审核信息

**小程序类目**：
- 一级类目：商业服务
- 二级类目：人力资源/招聘

**测试账号**：
提供测试账号和密码（如需要）

**补充说明**：
```
本小程序提供视频面试功能，用于企业HR与求职者进行远程视频面试。

主要功能：
1. HR创建面试房间
2. 分享房间给求职者
3. 多人视频通话
4. 实时音视频交流

使用场景：
HR在小程序中创建面试房间，通过分享功能邀请求职者加入，
双方通过视频进行远程面试。

技术说明：
视频通话功能通过WebView加载H5页面实现，使用ZEGO云服务提供音视频能力。
```

---

## ⚠️ 常见问题

### Q1: WebView无法加载页面

**原因**：业务域名未配置或校验文件未上传

**解决**：
1. 检查业务域名配置
2. 确保校验文件可访问
3. 重新验证域名

### Q2: 登录失败

**原因**：AppID或AppSecret配置错误

**解决**：
1. 检查 `.env` 文件中的配置
2. 确认AppID和AppSecret正确
3. 检查后端登录接口日志

### Q3: 视频无法连接

**原因**：ZEGO配置错误或Token生成失败

**解决**：
1. 检查ZEGO AppID和ServerSecret
2. 查看Token生成接口日志
3. 确认ZEGO账号余额充足

### Q4: 分享功能无效

**原因**：未配置分享接口

**解决**：
1. 检查 `onShareAppMessage` 方法
2. 确保页面路径正确
3. 测试分享卡片显示

### Q5: 审核被拒

**常见原因**：
- 类目选择不正确
- 功能描述不清晰
- 缺少必要的资质

**解决**：
1. 选择正确的类目
2. 详细描述功能和使用场景
3. 提供必要的资质证明

---

## 📊 监控和维护

### 1. 日志监控

使用 PM2 查看日志：

```bash
# 查看实时日志
pm2 logs interview-api

# 查看错误日志
pm2 logs interview-api --err
```

### 2. 性能监控

在微信公众平台查看：
- 用户访问量
- 页面性能
- 接口调用情况

### 3. 定期维护

- ✅ 每周检查服务器状态
- ✅ 每月检查ZEGO余额
- ✅ 定期备份数据库
- ✅ 及时更新依赖包

---

## 🎉 完成！

恭喜您完成了小程序视频面试功能的部署！

### 下一步建议：

1. **优化用户体验**
   - 添加加载动画
   - 优化页面过渡效果
   - 添加错误提示

2. **增加功能**
   - 房间历史记录
   - 面试评价功能
   - 录制回放功能

3. **数据分析**
   - 统计面试次数
   - 分析用户行为
   - 优化转化率

---

## 📞 技术支持

如有问题，请查看：
- `MINIPROGRAM_COMPLETE_SOLUTION.md` - 完整方案
- `MINIPROGRAM_CODE_TEMPLATES.md` - 代码模板
- `MINIPROGRAM_BACKEND_API.md` - API文档

或联系技术团队获取支持。


# ZEGO 视频面试功能配置指南

## 📋 功能说明

已成功集成 **ZEGO UIKitPrebuilt (CallKit)** 视频面试功能，支持：

- ✅ **3-6 人视频面试**：支持多人同时在线面试
- ✅ **美颜功能**：内置美颜，可在设置中调节
- ✅ **屏幕共享**：可展示简历、文档等
- ✅ **文字聊天**：支持实时文字交流
- ✅ **成员管理**：查看成员列表、踢出成员（房主权限）
- ✅ **音视频控制**：开关摄像头、麦克风
- ✅ **自动布局**：根据人数自动调整视频布局

## 🚀 快速开始

### 1. 注册 ZEGO 账号并获取凭证

1. 访问 ZEGO 控制台：https://console.zego.im/
2. 注册/登录账号
3. 创建项目，获取：
   - **AppID**：应用ID（数字）
   - **ServerSecret**：服务器密钥（字符串）

### 2. 配置后端环境变量

编辑 `backend/.env` 文件，替换以下配置：

```env
# ZEGO 即构视频配置
ZEGO_APP_ID=your_app_id_here          # 替换为您的 AppID
ZEGO_SERVER_SECRET=your_server_secret_here  # 替换为您的 ServerSecret
```

### 3. 重启服务

```bash
# 重新构建后端
cd backend
npm run build

# 重启 PM2 服务
pm2 restart all
```

### 4. 访问视频面试功能

1. 登录系统
2. 点击左侧菜单 **"视频面试"**
3. 输入房间号和您的名称
4. 点击 **"加入视频面试"** 按钮

## 📊 费用说明

### 免费额度
- **10,000 分钟/月** 免费

### 计费方式
- 按视频时长计费
- 高清视频（720P）：约 **10-14 元/千分钟**

### 实际费用估算

**场景**：每次面试 30 分钟，5 人参与，每月 100 次面试

- **月用量**：100 次 × 30 分钟 × 5 人 = 15,000 分钟
- **免费额度**：10,000 分钟
- **超出部分**：5,000 分钟
- **实际费用**：约 **50-70 元/月**

## 🔧 技术架构

### 后端模块

**位置**：`backend/src/modules/zego/`

- `zego.module.ts` - ZEGO 模块定义
- `zego.service.ts` - Token 生成服务
- `zego.controller.ts` - API 控制器
- `dto/generate-token.dto.ts` - 请求参数验证

**API 接口**：

1. **生成 Token**
   - 路径：`POST /api/zego/generate-token`
   - 需要 JWT 认证
   - 参数：
     ```json
     {
       "userId": "用户ID",
       "roomId": "房间ID",
       "userName": "用户名称",
       "expireTime": 7200  // 可选，默认2小时
     }
     ```

2. **获取配置**
   - 路径：`GET /api/zego/config`
   - 需要 JWT 认证
   - 返回：AppID（不返回 ServerSecret）

### 前端组件

**位置**：`frontend/src/pages/interview/VideoInterview.tsx`

**核心功能**：
- 房间管理（创建、加入、离开）
- 用户信息管理
- ZEGO UIKit 集成
- 视频会议控制

**API 服务**：`frontend/src/services/zego.ts`

### 依赖包

**前端**：
```json
{
  "@zegocloud/zego-uikit-prebuilt": "^latest"
}
```

**后端**：
- 使用 Node.js 内置 `crypto` 模块生成 Token
- 无需额外依赖

## 🎯 使用场景

### 1. 家政人员面试

**参与者**：
- HR（房主）
- 客户
- 家政人员（阿姨）

**流程**：
1. HR 创建房间，获取房间号
2. 将房间号分享给客户和阿姨
3. 所有人输入相同房间号加入
4. 开始视频面试
5. HR 可以踢出不合适的参与者
6. 面试结束后，所有人离开房间

### 2. 多人面试

**支持场景**：
- 1 对 1 面试
- 1 对多面试（1个HR，多个候选人）
- 多对 1 面试（多个HR，1个候选人）
- 多对多面试（最多6人）

## 🔐 安全说明

1. **Token 生成**：
   - Token 在后端生成，使用 HMAC-SHA256 签名
   - ServerSecret 不会暴露到前端
   - Token 有效期默认 2 小时

2. **权限控制**：
   - 所有 API 接口需要 JWT 认证
   - 只有登录用户才能生成 Token
   - 房主有踢人权限

3. **房间隔离**：
   - 不同房间号的用户互不干扰
   - 房间号建议使用随机生成

## 📝 后续优化建议

### 1. 与业务系统集成

- [ ] 关联简历系统（面试哪个阿姨）
- [ ] 关联客户系统（哪个客户）
- [ ] 保存面试记录（时间、参与者、时长）
- [ ] 面试评价功能

### 2. 房间管理优化

- [ ] 预约面试功能（提前创建房间）
- [ ] 房间历史记录
- [ ] 邀请链接生成（一键分享）
- [ ] 房间密码保护

### 3. 功能增强

- [ ] 录制面试视频（需额外付费）
- [ ] AI 面试评估（语音转文字、情绪分析）
- [ ] 面试报告生成

## 🐛 常见问题

### 1. 无法加入房间

**可能原因**：
- ZEGO 配置未正确设置
- Token 生成失败
- 网络问题

**解决方法**：
1. 检查 `backend/.env` 中的 ZEGO 配置
2. 查看浏览器控制台错误信息
3. 检查后端日志：`pm2 logs backend-prod`

### 2. 视频卡顿

**可能原因**：
- 网络带宽不足
- 参与人数过多
- 设备性能不足

**解决方法**：
1. 降低视频分辨率（在设置中调整）
2. 关闭不必要的摄像头
3. 减少参与人数

### 3. 美颜效果不明显

**解决方法**：
1. 点击视频界面的 **"设置"** 按钮
2. 找到 **"美颜"** 选项
3. 调整美颜参数（磨皮、美白等）

## 📞 技术支持

- **ZEGO 官方文档**：https://doc-zh.zego.im/
- **ZEGO 控制台**：https://console.zego.im/
- **技术支持**：联系 ZEGO 客服

## 📄 相关文档

- [ZEGO UIKitPrebuilt 文档](https://doc-zh.zego.im/article/14826)
- [ZEGO Web SDK 文档](https://doc-zh.zego.im/article/api?doc=Express_Video_SDK_API~javascript_web~class~ZegoExpressEngine)
- [React 集成指南](https://doc-zh.zego.im/article/14826)

---

**集成完成时间**：2025-11-06
**集成版本**：ZEGO UIKitPrebuilt v2.x
**状态**：✅ 已完成，待配置 ZEGO 凭证


# 小程序Token自动登录实现指南

## 📋 功能概述

解决了小程序中已登录用户进入视频面试H5页面时还需要再次登录的问题。现在用户可以无缝地从小程序跳转到H5页面，自动完成登录。

## 🎯 实现流程

### 1. 小程序端修改 (`miniprogram-pages/interview/interview.js`)

**修改内容**：
- 获取小程序本地存储的Token（`access_token` 或 `token`）
- 获取用户信息（用户名）
- 构建H5 URL时添加Token和用户名参数

**关键代码**：
```javascript
const token = wx.getStorageSync('access_token') || wx.getStorageSync('token');
const userInfo = wx.getStorageSync('userInfo') || {};
const userName = userInfo.name || userInfo.realName || userInfo.username || '用户';

let h5Url = `https://crm.andejiazheng.com/interview/miniprogram?roomId=${roomId}`;
if (token) {
  h5Url += `&token=${encodeURIComponent(token)}`;
}
if (userName) {
  h5Url += `&userName=${encodeURIComponent(userName)}`;
}
```

### 2. H5端新增小程序入口页面 (`frontend/src/pages/interview/MiniProgramEntry.tsx`)

**功能**：
- 接收URL参数（token、roomId、userName等）
- 保存Token到localStorage
- 自动跳转到视频面试页面

**路由**：`/interview/miniprogram`

**关键代码**：
```typescript
const token = searchParams.get('token');
const roomId = searchParams.get('roomId');
const userName = searchParams.get('userName');

if (token) {
  setToken(token, false); // 保存Token
  localStorage.setItem('access_token', token);
  localStorage.setItem('isLoggedIn', 'true');
}

if (userName) {
  localStorage.setItem('userName', decodeURIComponent(userName));
}

// 跳转到视频面试页面
navigate(`/interview/video-mobile/${roomId}`, { replace: true });
```

### 3. 修改认证服务 (`frontend/src/services/auth.ts`)

**修改内容**：
- 更新 `getToken()` 函数，支持读取小程序传递的Token

**关键代码**：
```typescript
export const getToken = (): string | null => {
  let token = Cookies.load(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  
  // 如果没有找到，检查小程序传递的token
  if (!token) {
    token = localStorage.getItem('access_token') || localStorage.getItem('token');
  }
  
  return token;
};
```

### 4. 修改视频面试页面

**修改的文件**：
- `VideoInterviewMobile.tsx`
- `VideoInterview.tsx`
- `VideoInterviewMiniprogram.tsx`

**修改内容**：
- 更新 `getCurrentUser()` 函数，支持读取小程序传递的用户名

**关键代码**：
```typescript
const getCurrentUser = () => {
  // ... 原有逻辑 ...
  
  // 检查小程序传递的用户名
  const miniprogramUserName = localStorage.getItem('userName');
  if (miniprogramUserName) {
    return {
      id: `user_${Date.now()}`,
      name: miniprogramUserName,
      avatar: null,
    };
  }
  
  return { /* 默认值 */ };
};
```

### 5. 路由配置 (`frontend/src/App.tsx`)

**修改内容**：
- 添加 `MiniProgramEntry` 组件导入
- 将 `/interview/miniprogram` 路由指向 `MiniProgramEntry` 组件
- 确保该路由不需要登录验证

**关键代码**：
```typescript
const MiniProgramEntry = React.lazy(() => import('./pages/interview/MiniProgramEntry'));

// 在公开访问页面中
<Route path="/interview/miniprogram" element={<MiniProgramEntry />} />
```

## 🧪 测试验证

### 测试场景1：HR模式（已登录用户）

1. **小程序端**：
   - 确保已登录（Token存储在 `access_token` 或 `token`）
   - 点击"视频面试"按钮
   - 观察WebView加载的URL是否包含Token参数

2. **H5端**：
   - 观察是否显示加载页面（"正在进入视频面试..."）
   - 检查localStorage中是否保存了Token
   - 验证是否自动跳转到视频面试页面
   - 确认用户名是否正确显示

3. **浏览器控制台验证**：
```javascript
// 检查Token是否已保存
console.log('Token:', localStorage.getItem('token'));
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Auth Token:', localStorage.getItem('auth_token'));

// 检查用户名是否已保存
console.log('用户名:', localStorage.getItem('userName'));

// 检查登录状态
console.log('是否已登录:', localStorage.getItem('isLoggedIn'));
```

### 测试场景2：访客模式（未登录用户）

1. **小程序端**：
   - 未登录状态
   - 点击"视频面试"按钮
   - 观察WebView加载的URL

2. **H5端**：
   - 观察是否显示加载页面
   - 检查是否设置了访客标记
   - 验证是否能正常进入视频面试

### 测试场景3：Token过期处理

1. **修改localStorage中的Token**为过期的Token
2. **刷新页面**
3. **验证**是否正确处理401错误并重定向到登录页

## 📊 实现清单

- [x] 修改小程序端 `interview.js` - 添加Token传递
- [x] 创建H5端小程序入口页面 `MiniProgramEntry.tsx`
- [x] 修改路由配置 - 确保小程序入口不需要登录
- [x] 修改API拦截器 - 支持从localStorage读取Token
- [x] 修改视频面试页面 - 支持读取小程序传递的用户名

## 🔍 关键文件修改

| 文件 | 修改内容 |
|------|--------|
| `miniprogram-pages/interview/interview.js` | 添加Token和用户名参数到URL |
| `frontend/src/pages/interview/MiniProgramEntry.tsx` | 新建小程序入口页面 |
| `frontend/src/pages/interview/MiniProgramEntry.css` | 新建样式文件 |
| `frontend/src/services/auth.ts` | 修改getToken()函数 |
| `frontend/src/pages/interview/VideoInterviewMobile.tsx` | 修改getCurrentUser()函数 |
| `frontend/src/pages/interview/VideoInterview.tsx` | 修改getCurrentUser()函数 |
| `frontend/src/pages/interview/VideoInterviewMiniprogram.tsx` | 修改getCurrentUser()函数 |
| `frontend/src/App.tsx` | 添加MiniProgramEntry路由 |

## ⚠️ 注意事项

1. **Token安全**：Token通过URL传递，建议设置较短的过期时间（如2小时）
2. **HTTPS传输**：确保生产环境使用HTTPS，防止Token泄露
3. **浏览器兼容性**：确保支持localStorage API
4. **微信内置浏览器**：测试在微信内置浏览器中的表现

## 🎉 预期效果

**修复前**：
```
小程序 → H5页面 → 显示登录页 → 用户输入账号密码 → 进入视频面试
```

**修复后**：
```
小程序 → H5页面 → 自动登录 → 直接进入视频面试 ✅
```

## 📞 故障排查

### 问题1：Token未被保存

**检查**：
1. 小程序是否正确获取了Token
2. URL参数是否正确编码
3. MiniProgramEntry页面是否正确执行

**解决**：
```javascript
// 在浏览器控制台检查
console.log('URL:', window.location.href);
console.log('Token参数:', new URLSearchParams(window.location.search).get('token'));
```

### 问题2：自动跳转失败

**检查**：
1. roomId参数是否存在
2. 路由配置是否正确
3. 浏览器控制台是否有错误

**解决**：
```javascript
// 在MiniProgramEntry中添加调试日志
console.log('跳转参数:', { roomId, token, userName });
```

### 问题3：用户名显示不正确

**检查**：
1. 小程序是否正确传递了userName参数
2. localStorage中是否保存了用户名
3. getCurrentUser()函数是否正确读取

**解决**：
```javascript
// 检查localStorage
console.log('保存的用户名:', localStorage.getItem('userName'));
```


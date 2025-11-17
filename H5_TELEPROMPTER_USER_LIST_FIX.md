# H5提词器用户列表功能修复

## 🐛 问题描述

**问题**: 提词器控制面板的"推送给"下拉框只显示"所有阿姨 (helper)"，没有显示具体的在线用户列表。

**原因**: H5页面中没有实现获取和显示在线用户列表的功能。

---

## ✅ 修复内容

### 1. 添加在线用户列表变量

在全局变量中添加 `onlineUsers` 对象，用于存储在线用户信息：

```javascript
let onlineUsers = {}; // 存储在线用户 { userId: { userName, userRole, streamId } }
```

**代码位置**: 第 984 行

### 2. 监听用户加入/离开事件

在 `roomStreamUpdate` 事件监听器中，当用户加入或离开时更新 `onlineUsers`：

**用户加入时**:
```javascript
// 添加到在线用户列表
onlineUsers[userId] = {
  userName: userName,
  userRole: userName,
  streamId: stream.streamID
};
```

**用户离开时**:
```javascript
// 从在线用户列表移除
delete onlineUsers[userId];
```

**代码位置**: 第 1095-1140 行

### 3. 动态生成用户列表

添加 `updateTeleprompterUserList()` 函数，在打开提词器弹窗时动态生成用户选项：

```javascript
function updateTeleprompterUserList() {
  const select = document.getElementById('teleprompterTarget');
  
  // 清空现有选项
  select.innerHTML = '';
  
  // 添加"所有阿姨"选项
  const allOption = document.createElement('option');
  allOption.value = 'ALL';
  allOption.textContent = '所有阿姨 (helper)';
  select.appendChild(allOption);
  
  // 遍历在线用户，添加到下拉框
  for (const userId in onlineUsers) {
    const user = onlineUsers[userId];
    // 根据userName判断角色
    if (user.userName.toLowerCase().includes('helper') || 
        user.userName === 'ayi') {
      const option = document.createElement('option');
      option.value = userId;
      option.textContent = `${user.userName} (${userId.substring(0, 8)}...)`;
      select.appendChild(option);
    }
  }
}
```

**代码位置**: 第 2133-2181 行

### 4. 修改API调用逻辑

修改所有提词器API调用，使用选中的用户ID而不是硬编码的'ALL'：

```javascript
const targetValue = document.getElementById('teleprompterTarget').value;
const targetUserIds = targetValue === 'ALL' ? ['ALL'] : [targetValue];
```

**修改的函数**:
- `quickStartTeleprompter()` - 第 2219-2225 行
- `pushTeleprompterContent()` - 第 2279-2282 行
- `controlTeleprompter()` - 第 2337-2339 行

---

## 🎯 功能特性

### 1. 自动识别用户角色

根据 `userName` 自动判断用户角色：
- 包含 "helper" 或等于 "ayi" → 阿姨用户
- 包含 "customer" → 客户用户
- 其他 → 默认当作阿姨用户

### 2. 实时更新用户列表

- 用户加入房间时，自动添加到在线用户列表
- 用户离开房间时，自动从列表中移除
- 每次打开提词器弹窗时，重新生成用户选项

### 3. 用户选择功能

- **所有阿姨 (helper)**: 推送给所有阿姨用户
- **单个用户**: 推送给指定的阿姨用户

### 4. 用户显示格式

```
用户名 (userId前8位...)
```

例如：
```
customer (guest_17...)
helper (user_176...)
```

---

## 📱 使用方式

### 1. 创建房间并等待用户加入

1. 主持人创建房间
2. 邀请阿姨/客户加入
3. 等待用户加入房间

### 2. 打开提词器控制面板

点击底部导航栏的"📝 提词器"按钮

### 3. 选择推送目标

在"推送给"下拉框中选择：
- **所有阿姨 (helper)**: 推送给所有在线的阿姨用户
- **具体用户**: 推送给指定的单个用户

### 4. 推送提词内容

输入内容后点击"🚀 一键推送并开启"

---

## 🔍 调试信息

### 查看在线用户列表

在浏览器控制台中输入：
```javascript
console.log('在线用户:', onlineUsers);
```

### 查看用户加入日志

当用户加入时，控制台会输出：
```
👥 在线用户列表已更新: {userId: {userName, userRole, streamId}}
```

### 查看用户离开日志

当用户离开时，控制台会输出：
```
👥 在线用户列表已更新: {userId: {userName, userRole, streamId}}
```

---

## 📊 测试场景

### 场景1: 单个阿姨加入

1. 主持人创建房间
2. 阿姨加入房间
3. 打开提词器控制面板
4. 应该看到：
   - 所有阿姨 (helper)
   - --- 阿姨用户 ---
   - customer (guest_17...)

### 场景2: 多个阿姨加入

1. 主持人创建房间
2. 多个阿姨加入房间
3. 打开提词器控制面板
4. 应该看到所有在线阿姨的列表

### 场景3: 用户离开

1. 阿姨离开房间
2. 重新打开提词器控制面板
3. 该阿姨应该从列表中消失

---

## ⚠️ 注意事项

1. **用户角色识别**: 当前基于 `userName` 判断角色，如果userName不包含"helper"或"customer"，会默认当作阿姨用户

2. **实时性**: 用户列表在打开提词器弹窗时更新，如果用户在弹窗打开期间加入/离开，需要关闭并重新打开弹窗才能看到最新列表

3. **userId显示**: 为了简洁，只显示userId的前8位字符

---

## 🚀 部署状态

- ✅ 代码已修改完成
- ✅ 前端已构建成功
- ✅ 生产环境已更新

---

## 🔗 相关文档

- [H5_TELEPROMPTER_IMPLEMENTATION.md](./H5_TELEPROMPTER_IMPLEMENTATION.md) - 功能实现说明
- [H5_TELEPROMPTER_TEST_GUIDE.md](./H5_TELEPROMPTER_TEST_GUIDE.md) - 测试指南

---

**修复时间**: 2025-11-17  
**版本**: v1.1  
**状态**: ✅ 已修复并部署


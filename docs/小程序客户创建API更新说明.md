# 小程序客户创建API更新说明

## 更新日期
2025-12-22

## 🚨 重要提示
**小程序端必须更新前端验证逻辑！** 当前小程序端的验证逻辑是旧的，会在提交前拦截请求，导致新的验证规则无法生效。

## 概述
小程序的客户创建和更新API已自动适配新的验证规则：**手机号和微信号必须至少填写一个**。

## 影响的接口

### 1. 创建客户接口
**接口地址：** `POST /api/customers/miniprogram/create`

**必填字段（共5项）：**
1. **客户姓名** (`name`) - 字符串，1-20个字符
2. **线索来源** (`leadSource`) - 枚举值（见下方）
3. **客户状态** (`contractStatus`) - 枚举值（见下方）
4. **线索等级** (`leadLevel`) - 枚举值（见下方）⚠️ **小程序端可能缺少此字段！**
5. **联系方式** - `phone` 或 `wechatId` 至少填一个

**验证规则：**
- 手机号（`phone`）和微信号（`wechatId`）必须至少填写一个
- 如果两者都为空，返回错误
- 如果填写手机号，必须是有效的11位中国手机号（1开头）

**枚举值选项：**
- **线索来源：** 美团、抖音、快手、小红书、转介绍、杭州同馨、握个手平台、线索购买、莲心、美家、天机鹿、孕妈联盟、高阁、星星、妈妈网、其他
- **客户状态：** 已签约、匹配中、已面试、流失客户、已退款、退款中、待定
- **线索等级：** O类、A类、B类、C类、D类、流失

**请求示例（有效）：**
```json
{
  "name": "张三",
  "phone": "13812345678",
  "leadSource": "美团",
  "contractStatus": "匹配中",
  "leadLevel": "A类"
}
```

或

```json
{
  "name": "李四",
  "wechatId": "wechat_lisi",
  "leadSource": "抖音",
  "contractStatus": "匹配中",
  "leadLevel": "B类"
}
```

**请求示例（无效 - 缺少线索等级）：**
```json
{
  "name": "测试",
  "phone": "13812345678",
  "leadSource": "握个手平台",
  "contractStatus": "匹配中"
  // ❌ 缺少 leadLevel
}
```

**请求示例（无效 - 缺少联系方式）：**
```json
{
  "name": "王五",
  "phone": "",  // ❌ 空字符串
  "leadSource": "小红书",
  "contractStatus": "待定",
  "leadLevel": "C类"
  // ❌ 没有 wechatId
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "请填写手机号或微信号",
  "data": null,
  "error": "MISSING_CONTACT"
}
```

---

### 2. 更新客户接口
**接口地址：** `PATCH /api/customers/miniprogram/:id`

**验证规则：**
- 更新时也需要确保至少保留一个联系方式
- 不能同时清空手机号和微信号

**请求示例（有效）：**
```json
{
  "phone": "",
  "wechatId": "new_wechat_id"
}
```

**请求示例（无效）：**
```json
{
  "phone": "",
  "wechatId": ""
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "请填写手机号或微信号",
  "data": null,
  "error": "MISSING_CONTACT"
}
```

---

## 错误码说明

### 新增错误码：`MISSING_CONTACT`
- **含义：** 手机号和微信号都未填写
- **错误消息：** "请填写手机号或微信号"
- **HTTP状态码：** 400 Bad Request

### 现有错误码
- `DUPLICATE_PHONE` - 手机号已存在
- `FORBIDDEN` - 无权限访问/修改

---

## 前端服务更新

### 修改的文件
`frontend/src/services/miniprogramCustomerService.ts`

### 错误处理示例
```typescript
// 创建客户
try {
  const result = await miniprogramCustomerService.createCustomer({
    name: '张三',
    leadSource: '美团',
    contractStatus: '匹配中',
    leadLevel: 'A类'
    // 缺少 phone 和 wechatId
  });
} catch (error) {
  // error.message === '请填写手机号或微信号'
  console.error(error.message);
}

// 更新客户
try {
  const result = await miniprogramCustomerService.updateCustomer('customer123', {
    phone: '',
    wechatId: ''
  });
} catch (error) {
  // error.message === '请填写手机号或微信号'
  console.error(error.message);
}
```

---

## 🔧 小程序端必须修改的内容

### ⚠️ 问题说明
当前小程序端的验证逻辑会在提交前拦截请求，错误消息为："请填写必填字段：姓名、电话、线索来源、客户状态"。这是**旧的验证逻辑**，需要更新！

### 1. 添加"线索等级"字段到表单

**WXML 添加：**
```xml
<!-- pages/customer/create.wxml -->
<view class="form-item required">
  <text class="label">线索等级</text>
  <picker
    mode="selector"
    range="{{leadLevelOptions}}"
    value="{{leadLevelIndex}}"
    bindchange="onLeadLevelChange"
  >
    <view class="picker">
      {{formData.leadLevel || '请选择线索等级（必填）'}}
    </view>
  </picker>
  <text class="error" wx:if="{{errors.leadLevel}}">{{errors.leadLevel}}</text>
</view>
```

**JS 添加：**
```javascript
// pages/customer/create.js
data: {
  leadLevelOptions: ['O类', 'A类', 'B类', 'C类', 'D类', '流失'],
  leadLevelIndex: -1,
  formData: {
    name: '',
    phone: '',
    wechatId: '',
    leadSource: '',
    contractStatus: '匹配中',
    leadLevel: '',  // ⚠️ 添加这个字段
    // ... 其他字段
  }
},

// 添加选择器变更事件
onLeadLevelChange(e) {
  const index = e.detail.value;
  this.setData({
    leadLevelIndex: index,
    'formData.leadLevel': this.data.leadLevelOptions[index]
  });
}
```

### 2. 更新表单验证逻辑

**完整的验证函数：**
```javascript
// pages/customer/create.js
validateForm(data) {
  const errors = [];

  // 1. 验证客户姓名
  if (!data.name?.trim()) {
    errors.push({ field: 'name', message: '请填写客户姓名' });
  }

  // 2. 验证线索来源
  if (!data.leadSource) {
    errors.push({ field: 'leadSource', message: '请选择线索来源' });
  }

  // 3. 验证客户状态
  if (!data.contractStatus) {
    errors.push({ field: 'contractStatus', message: '请选择客户状态' });
  }

  // 4. ⚠️ 验证线索等级（新增必填）
  if (!data.leadLevel) {
    errors.push({ field: 'leadLevel', message: '请选择线索等级' });
  }

  // 5. ⚠️ 验证联系方式（手机号或微信号至少填一个）
  const phone = data.phone?.trim();
  const wechatId = data.wechatId?.trim();

  if (!phone && !wechatId) {
    errors.push({ field: 'contact', message: '请填写手机号或微信号' });
  }

  // 6. 如果填写了手机号，验证格式
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    errors.push({ field: 'phone', message: '请输入有效的11位手机号码' });
  }

  return errors;
}
```

### 3. 更新提交数据处理

**⚠️ 重要：空字符串要转为 undefined**
```javascript
// pages/customer/create.js
async onSubmit() {
  // 验证表单
  const errors = this.validateForm(this.data.formData);
  if (errors.length > 0) {
    wx.showToast({
      title: errors[0].message,
      icon: 'none'
    });
    return;
  }

  // 准备提交数据
  const submitData = {
    name: this.data.formData.name,
    phone: this.data.formData.phone?.trim() || undefined,  // ⚠️ 空字符串转为 undefined
    wechatId: this.data.formData.wechatId?.trim() || undefined,  // ⚠️ 空字符串转为 undefined
    leadSource: this.data.formData.leadSource,
    contractStatus: this.data.formData.contractStatus,
    leadLevel: this.data.formData.leadLevel,  // ⚠️ 必须包含
    // ... 其他可选字段
  };

  try {
    wx.showLoading({ title: '创建中...', mask: true });

    const result = await customerApi.createCustomer(submitData);

    wx.hideLoading();
    wx.showToast({ title: '创建成功', icon: 'success' });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);

  } catch (error) {
    wx.hideLoading();

    // 处理错误码
    if (error.message.includes('请填写手机号或微信号')) {
      wx.showToast({ title: '请填写手机号或微信号', icon: 'none' });
    } else if (error.message.includes('该手机号已存在')) {
      wx.showToast({ title: '该手机号已存在', icon: 'none' });
    } else {
      wx.showToast({ title: error.message || '创建失败', icon: 'none' });
    }
  }
}
```

### 4. 错误码处理
处理API返回的错误码：

| 错误码 | 含义 | 错误消息 |
|--------|------|----------|
| `MISSING_CONTACT` | 手机号和微信号都未填写 | "请填写手机号或微信号" |
| `DUPLICATE_PHONE` | 手机号已存在 | "该手机号已存在客户记录" |
| `FORBIDDEN` | 无权限 | "无权限访问/修改此客户信息" |

---

## ✅ 测试建议

### 必须测试的场景
1. ✅ 填写所有必填字段（包括 leadLevel）+ 只填手机号 - 应该成功
2. ✅ 填写所有必填字段（包括 leadLevel）+ 只填微信号 - 应该成功
3. ✅ 填写所有必填字段（包括 leadLevel）+ 同时填写手机号和微信号 - 应该成功
4. ❌ 缺少 leadLevel - 应该在前端验证时拦截
5. ❌ 两者都不填写 - 应该在前端验证时拦截，或返回 `MISSING_CONTACT` 错误
6. ❌ 手机号格式错误 - 应该在前端验证时拦截
7. ❌ 更新时清空所有联系方式 - 应该返回 `MISSING_CONTACT` 错误

### 测试数据示例

**有效数据1：**
```json
{
  "name": "测试用户1",
  "phone": "13812345678",
  "leadSource": "美团",
  "contractStatus": "匹配中",
  "leadLevel": "A类"
}
```

**有效数据2：**
```json
{
  "name": "测试用户2",
  "wechatId": "wechat_test",
  "leadSource": "抖音",
  "contractStatus": "待定",
  "leadLevel": "B类"
}
```

**无效数据1（缺少 leadLevel）：**
```json
{
  "name": "测试用户3",
  "phone": "13912345678",
  "leadSource": "小红书",
  "contractStatus": "匹配中"
}
```

**无效数据2（缺少联系方式）：**
```json
{
  "name": "测试用户4",
  "phone": "",
  "leadSource": "快手",
  "contractStatus": "匹配中",
  "leadLevel": "C类"
}
```

---

## 🎯 关键要点总结

1. ✅ **必须添加"线索等级"字段** - 这是必填的，小程序端可能缺少！
2. ✅ **手机号和微信号至少填一个** - 不能都为空或空字符串
3. ✅ **空字符串要转为 `undefined`** - 提交时不要发送空字符串
4. ✅ **更新前端验证逻辑** - 旧的验证逻辑会拦截请求
5. ✅ **处理新的错误码 `MISSING_CONTACT`**

---

## 向后兼容性

- ✅ 现有的有效数据不受影响
- ⚠️ 小程序端必须添加"线索等级"字段
- ⚠️ 小程序端必须更新验证逻辑
- ⚠️ 数据库中可能存在既没有手机号也没有微信号的历史数据，编辑时需要至少填写一个

---

## 📋 部署清单

### 后端（已完成）
- [x] 后端API已更新（自动适配）
- [x] 后端错误处理已完善
- [x] 后端错误码 `MISSING_CONTACT` 已添加
- [x] 前端服务已更新
- [x] 前端测试已更新

### 小程序端（待完成）⚠️
- [ ] **添加"线索等级"字段到表单**
- [ ] **更新表单验证逻辑**
- [ ] **更新提交数据处理（空字符串转 undefined）**
- [ ] **处理新的错误码 `MISSING_CONTACT`**
- [ ] **测试所有场景**


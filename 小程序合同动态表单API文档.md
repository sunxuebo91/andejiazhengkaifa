# 小程序合同动态表单API文档

## 📋 概述

本文档描述了小程序如何通过动态表单方式创建合同。核心思路是：
1. **从爱签获取模板控件信息** - 后端调用爱签API获取模板的所有字段定义
2. **动态渲染表单** - 小程序根据返回的字段信息动态生成表单
3. **提交数据创建合同** - 用户填写后提交到后端，后端调用爱签创建合同

## 🎯 核心优势

- ✅ **灵活性高**：模板字段变化时，无需修改代码
- ✅ **维护简单**：字段定义由爱签模板统一管理
- ✅ **扩展性强**：支持各种类型的表单控件
- ✅ **公开接口**：所有接口均为公开接口，无需JWT认证

---

## 🔄 完整业务流程

```
┌─────────────┐
│  小程序启动  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ 1. 获取模板信息                  │
│ GET /api/esign/templates         │
└──────┬──────────────────────────┘
       │ 返回: 模板列表
       ▼
┌─────────────────────────────────┐
│ 2. 获取模板控件信息              │
│ POST /api/esign/template/data    │
│ { templateIdent: "TN84..." }    │
└──────┬──────────────────────────┘
       │ 返回: 所有字段定义
       ▼
┌─────────────────────────────────┐
│ 3. 动态渲染表单                  │
│ 根据字段类型生成对应的表单控件   │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. 用户填写表单                  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 5. 提交创建合同                  │
│ POST /api/contracts/miniprogram/create │
└──────┬──────────────────────────┘
       │ 返回: 合同信息 + 签署链接
       ▼
┌─────────────────────────────────┐
│ 6. 跳转签署                      │
│ 使用 WebView 打开签署链接        │
└─────────────────────────────────┘
```

---

## ⚠️ 重要说明

### 接口认证

所有小程序相关的接口都是**公开接口**，无需JWT认证。包括：

- ✅ `GET /api/esign/templates` - 获取模板列表
- ✅ `POST /api/esign/template/data` - 获取模板控件信息
- ✅ `POST /api/contracts/miniprogram/create` - 创建合同
- ✅ `GET /api/contracts/miniprogram/list` - 查询合同列表
- ✅ `GET /api/contracts/miniprogram/:id` - 查询合同详情
- ✅ `POST /api/contracts/miniprogram/sync-esign-status/:id` - 同步合同状态
- ✅ `GET /api/contracts/miniprogram/signers-status/:id` - 查看签署进度

**注意**：如果遇到401认证错误，请检查后端代码中的 `@Public()` 装饰器是否在 `@Get()` 或 `@Post()` **之前**。

### 装饰器顺序

正确的装饰器顺序：
```typescript
@Public()  // ✅ 必须在路由装饰器之前
@Post('template/data')
async getTemplateData() { ... }
```

错误的装饰器顺序：
```typescript
@Post('template/data')
@Public()  // ❌ 在路由装饰器之后会导致认证失败
async getTemplateData() { ... }
```

---

## 📡 API接口详解

### 1. 获取模板列表

**接口地址**：`GET /api/esign/templates`

**认证要求**：❌ 无需认证（公开接口）

**请求示例**：
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/esign/templates',
  method: 'GET',
  success(res) {
    console.log('模板列表:', res.data);
    // res.data.data[0].templateNo 就是模板编号
  }
});
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "templateNo": "TN84E8C106BFE74FD3AE36AC2CA33A44DE",
      "templateName": "家政服务合同模板",
      "description": "基于爱签平台的真实模板",
      "fields": []
    }
  ],
  "message": "获取模板列表成功"
}
```

---

### 2. 获取模板控件信息（核心接口）

**接口地址**：`POST /api/esign/template/data`

**认证要求**：❌ 无需认证（公开接口）

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateIdent | String | 是 | 模板编号 |

**请求示例**：
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/esign/template/data',
  method: 'POST',
  data: {
    templateIdent: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE'
  },
  success(res) {
    if (res.data.code === 100000) {
      const fields = res.data.data; // 字段数组
      // 根据 fields 动态渲染表单
      this.renderDynamicForm(fields);
    }
  }
});
```

**响应示例**：
```json
{
  "code": 100000,
  "msg": "成功",
  "data": [
    {
      "dataKey": "客户姓名",
      "dataType": 1,
      "required": 1,
      "defaultValue": ""
    },
    {
      "dataKey": "客户电话",
      "dataType": 1,
      "required": 1,
      "defaultValue": ""
    },
    {
      "dataKey": "阿姨工资",
      "dataType": 1,
      "required": 1,
      "defaultValue": ""
    },
    {
      "dataKey": "服务备注",
      "dataType": 8,
      "required": 0,
      "defaultValue": ""
    },
    {
      "dataKey": "多选服务项目",
      "dataType": 9,
      "required": 0,
      "options": [
        {"index": 0, "label": "做饭", "selected": false},
        {"index": 1, "label": "打扫卫生", "selected": false},
        {"index": 2, "label": "照顾老人", "selected": false}
      ]
    }
  ]
}
```

---

### 3. 字段类型说明（dataType）

| dataType | 类型名称 | 说明 | 渲染组件 |
|----------|---------|------|---------|
| 1 | 单行文本 | 普通文本输入 | `<input type="text">` |
| 2 | 日期 | 日期选择 | `<picker mode="date">` |
| 3 | 身份证号 | 身份证输入 | `<input type="idcard">` |
| 4 | 手机号 | 手机号输入 | `<input type="number">` |
| 8 | 多行文本 | 长文本输入 | `<textarea>` |
| 9 | 多选 | 多选框 | `<checkbox-group>` |
| 16 | 下拉选择 | 下拉框 | `<picker mode="selector">` |

---

### 4. 动态表单渲染示例

**核心代码**：
```javascript
// pages/contract/create.js
Page({
  data: {
    templateFields: [],  // 模板字段定义
    formData: {}         // 用户填写的数据
  },

  onLoad() {
    this.loadTemplateFields();
  },

  // 加载模板字段
  loadTemplateFields() {
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: 'https://crm.andejiazheng.com/api/esign/template/data',
      method: 'POST',
      data: {
        templateIdent: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE'
      },
      success: (res) => {
        wx.hideLoading();

        if (res.data.code === 100000) {
          this.setData({
            templateFields: res.data.data
          });
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 处理输入变化
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;

    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 处理多选变化
  handleCheckboxChange(e) {
    const { field } = e.currentTarget.dataset;
    const values = e.detail.value;

    // 将数组转换为分号分隔的字符串
    const valueStr = values.join('；');

    this.setData({
      [`formData.${field}`]: valueStr
    });
  },

  // 提交表单
  submitForm() {
    // 验证必填字段
    const missingFields = this.validateForm();
    if (missingFields.length > 0) {
      wx.showToast({
        title: `请填写：${missingFields.join('、')}`,
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '创建中...' });

    wx.request({
      url: 'https://crm.andejiazheng.com/api/contracts/miniprogram/create',
      method: 'POST',
      data: {
        templateNo: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE',
        ...this.data.formData
      },
      success: (res) => {
        wx.hideLoading();

        if (res.data.success) {
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });

          // 跳转到签署页面
          const signUrl = res.data.data.esignSignUrls?.customer;
          if (signUrl) {
            wx.navigateTo({
              url: `/pages/sign/index?url=${encodeURIComponent(signUrl)}`
            });
          }
        }
      }
    });
  },

  // 验证表单
  validateForm() {
    const missingFields = [];

    this.data.templateFields.forEach(field => {
      if (field.required === 1) {
        const value = this.data.formData[field.dataKey];
        if (!value || value.trim() === '') {
          missingFields.push(field.dataKey);
        }
      }
    });

    return missingFields;
  }
});
```

**WXML模板**：
```xml
<!-- pages/contract/create.wxml -->
<view class="container">
  <form bindsubmit="submitForm">
    <!-- 动态渲染表单字段 -->
    <block wx:for="{{templateFields}}" wx:key="dataKey">
      <view class="form-item">
        <view class="label">
          {{item.dataKey}}
          <text wx:if="{{item.required === 1}}" class="required">*</text>
        </view>

        <!-- 单行文本 -->
        <input
          wx:if="{{item.dataType === 1}}"
          class="input"
          placeholder="请输入{{item.dataKey}}"
          data-field="{{item.dataKey}}"
          bindinput="handleInput"
        />

        <!-- 多行文本 -->
        <textarea
          wx:elif="{{item.dataType === 8}}"
          class="textarea"
          placeholder="请输入{{item.dataKey}}"
          data-field="{{item.dataKey}}"
          bindinput="handleInput"
        />

        <!-- 多选框 -->
        <checkbox-group
          wx:elif="{{item.dataType === 9}}"
          data-field="{{item.dataKey}}"
          bindchange="handleCheckboxChange"
        >
          <label wx:for="{{item.options}}" wx:for-item="option" wx:key="index">
            <checkbox value="{{option.label}}" />
            {{option.label}}
          </label>
        </checkbox-group>

        <!-- 日期选择 -->
        <picker
          wx:elif="{{item.dataType === 2}}"
          mode="date"
          data-field="{{item.dataKey}}"
          bindchange="handleInput"
        >
          <view class="picker">
            {{formData[item.dataKey] || '请选择日期'}}
          </view>
        </picker>
      </view>
    </block>

    <button class="submit-btn" formType="submit">创建合同</button>
  </form>
</view>
```

---

### 5. 创建合同接口

**接口地址**：`POST /api/contracts/miniprogram/create`

**请求参数**：
```javascript
{
  // 基础信息（必填）
  "customerName": "张三",
  "customerPhone": "13800138000",
  "customerIdCard": "110101199001011234",
  "workerName": "李四",
  "workerPhone": "13900139000",
  "workerIdCard": "110101198001011234",

  // 合同信息（必填）
  "contractType": "住家保姆",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "workerSalary": "5000",

  // 费用信息（根据模板字段动态填写）
  "阿姨工资": "5000",
  "客户服务费": "1000",
  "家政员服务费": "500",
  "约定定金": "1000",
  "约定尾款": "4000",

  // 备注信息（可选）
  "服务备注": "做饭；打扫卫生；照顾老人",

  // 多选字段（可选）
  "多选服务项目": "做饭；打扫卫生；照顾老人"
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": 123,
    "contractNo": "HT20240101001",
    "contractStatus": "signing",
    "esignContractNo": "ES123456789",
    "esignSignUrls": {
      "customer": "https://oapi.asign.cn/sign/xxx",
      "worker": "https://oapi.asign.cn/sign/yyy"
    }
  },
  "message": "合同创建成功"
}
```

---

### 6. 签署合同

**签署流程**：
1. 从创建合同的响应中获取 `esignSignUrls`
2. 根据签署角色选择对应的链接
3. 使用 `<web-view>` 组件打开签署链接

**示例代码**：
```javascript
// pages/sign/index.js
Page({
  data: {
    signUrl: ''
  },

  onLoad(options) {
    const signUrl = decodeURIComponent(options.url);
    this.setData({ signUrl });
  }
});
```

```xml
<!-- pages/sign/index.wxml -->
<web-view src="{{signUrl}}"></web-view>
```

---

### 7. 查询合同列表

**接口地址**：`GET /api/contracts/miniprogram/list`

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| customerPhone | String | 否 | 客户手机号 |
| workerPhone | String | 否 | 阿姨手机号 |
| contractStatus | String | 否 | 合同状态 |
| syncStatus | Boolean | 否 | 是否同步爱签状态（true/false） |

**请求示例**：
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/contracts/miniprogram/list',
  method: 'GET',
  data: {
    customerPhone: '13800138000',
    syncStatus: true  // 自动同步最新状态
  },
  success(res) {
    console.log('合同列表:', res.data);
  }
});
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "contractNo": "HT20240101001",
      "customerName": "张三",
      "workerName": "李四",
      "contractStatus": "active",
      "esignStatus": 2,
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "message": "查询成功"
}
```

---

### 8. 查询合同详情

**接口地址**：`GET /api/contracts/miniprogram/:id`

**请求示例**：
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/contracts/miniprogram/123',
  method: 'GET',
  success(res) {
    console.log('合同详情:', res.data);
  }
});
```

---

### 9. 同步合同状态

**接口地址**：`POST /api/contracts/miniprogram/sync-esign-status/:id`

**说明**：手动同步单个合同的爱签状态

**请求示例**：
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/contracts/miniprogram/sync-esign-status/123',
  method: 'POST',
  success(res) {
    console.log('同步结果:', res.data);
  }
});
```

---

### 10. 查看签署进度

**接口地址**：`GET /api/contracts/miniprogram/signers-status/:id`

**说明**：查看合同各方的签署状态

**请求示例**：
```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/contracts/miniprogram/signers-status/123',
  method: 'GET',
  success(res) {
    console.log('签署进度:', res.data);
  }
});
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "contractNo": "ES123456789",
    "signers": [
      {
        "name": "张三",
        "mobile": "13800138000",
        "signStatus": 2,
        "signStatusText": "已签署",
        "signTime": "2024-01-01T10:30:00.000Z"
      },
      {
        "name": "李四",
        "mobile": "13900139000",
        "signStatus": 0,
        "signStatusText": "待签署",
        "signTime": null
      }
    ]
  }
}
```

---

## 📊 状态说明

### 合同状态（contractStatus）

| 状态值 | 说明 | 描述 |
|--------|------|------|
| draft | 草稿 | 合同已创建但未提交签署 |
| signing | 签署中 | 合同正在签署流程中 |
| active | 生效中 | 合同已签署完成并生效 |
| cancelled | 已取消 | 合同已取消 |
| expired | 已过期 | 合同已过期 |

### 爱签状态（esignStatus）

| 状态码 | 说明 |
|--------|------|
| 0 | 等待签署 |
| 1 | 签署中 |
| 2 | 已签署 |
| 3 | 已过期 |
| 4 | 已拒签 |
| 6 | 已作废 |
| 7 | 已撤销 |

### 签署方状态（signStatus）

| 状态码 | 说明 |
|--------|------|
| 0 | 待签署 |
| 1 | 签署中 |
| 2 | 已签署 |
| 3 | 已拒签 |

---

## 💡 最佳实践

### 1. 表单验证

```javascript
// 验证必填字段
validateForm() {
  const missingFields = [];

  this.data.templateFields.forEach(field => {
    if (field.required === 1) {
      const value = this.data.formData[field.dataKey];
      if (!value || value.trim() === '') {
        missingFields.push(field.dataKey);
      }
    }
  });

  return missingFields;
}

// 验证手机号
validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 验证身份证号
validateIdCard(idCard) {
  return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard);
}
```

### 2. 错误处理

```javascript
wx.request({
  url: 'https://crm.andejiazheng.com/api/contracts/miniprogram/create',
  method: 'POST',
  data: formData,
  success: (res) => {
    if (res.data.success) {
      // 成功处理
      wx.showToast({
        title: '创建成功',
        icon: 'success'
      });
    } else {
      // 业务错误
      wx.showToast({
        title: res.data.message || '创建失败',
        icon: 'none'
      });
    }
  },
  fail: (err) => {
    // 网络错误
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    });
  }
});
```

### 3. 缓存模板字段

```javascript
// 缓存模板字段，避免重复请求
loadTemplateFields() {
  const cacheKey = 'template_fields';
  const cachedData = wx.getStorageSync(cacheKey);

  if (cachedData && Date.now() - cachedData.timestamp < 3600000) {
    // 缓存未过期（1小时）
    this.setData({
      templateFields: cachedData.fields
    });
    return;
  }

  // 从服务器获取
  wx.request({
    url: 'https://crm.andejiazheng.com/api/esign/template/data',
    method: 'POST',
    data: {
      templateIdent: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE'
    },
    success: (res) => {
      if (res.data.code === 100000) {
        const fields = res.data.data;

        // 保存到缓存
        wx.setStorageSync(cacheKey, {
          fields: fields,
          timestamp: Date.now()
        });

        this.setData({
          templateFields: fields
        });
      }
    }
  });
}
```

### 4. 定时同步状态

```javascript
// 在合同详情页定时同步状态
Page({
  data: {
    contractId: null,
    syncTimer: null
  },

  onLoad(options) {
    this.setData({
      contractId: options.id
    });

    // 启动定时同步（每30秒）
    this.startSyncTimer();
  },

  onUnload() {
    // 页面卸载时清除定时器
    this.stopSyncTimer();
  },

  startSyncTimer() {
    this.syncTimer = setInterval(() => {
      this.syncContractStatus();
    }, 30000);
  },

  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  },

  syncContractStatus() {
    wx.request({
      url: `https://crm.andejiazheng.com/api/contracts/miniprogram/sync-esign-status/${this.data.contractId}`,
      method: 'POST',
      success: (res) => {
        if (res.data.success) {
          // 更新页面数据
          this.loadContractDetail();
        }
      }
    });
  }
});
```

---

## 🔧 常见问题

### Q1: 接口返回401认证错误怎么办？

A: 检查以下几点：
1. 确认接口有 `@Public()` 装饰器
2. 确认 `@Public()` 在 `@Get()` 或 `@Post()` **之前**
3. 重启后端服务：`pm2 restart backend`
4. 检查浏览器控制台是否有CORS错误

### Q2: 如何处理图片上传字段？

A: 爱签模板目前主要支持文本类字段，如需上传图片，建议：
1. 先上传图片到自己的服务器
2. 将图片URL作为文本字段提交到合同

### Q3: 多选字段如何提交？

A: 多选字段需要转换为**分号分隔的字符串**：
```javascript
// 错误 ❌
formData['多选服务项目'] = ['做饭', '打扫卫生']

// 正确 ✅
formData['多选服务项目'] = '做饭；打扫卫生；照顾老人'
```

### Q4: 如何处理大写金额字段？

A: 后端会自动处理大写转换，前端只需提交数字即可：
```javascript
formData['阿姨工资'] = '5000'
// 后端自动生成：formData['阿姨工资大写'] = '伍仟元整'
```

### Q5: 签署链接有效期多久？

A: 签署链接默认有效期为15天，过期后需要重新创建合同。

### Q6: 如何判断合同是否签署完成？

A: 检查 `esignStatus === 2` 或 `contractStatus === 'active'`

### Q7: 获取模板字段时返回空数组怎么办？

A: 可能的原因：
1. 模板编号错误，检查 `templateIdent` 是否正确
2. 爱签API调用失败，检查后端日志
3. 模板未同步，联系爱签技术支持同步模板

---

## 🧪 接口测试

### 测试脚本

创建一个测试文件 `test-miniprogram-api.html`：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>小程序API测试</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
    .success { color: green; }
    .error { color: red; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>小程序合同API测试工具</h1>

  <div class="test-section">
    <h2>1. 测试获取模板列表</h2>
    <button onclick="testGetTemplates()">测试</button>
    <div id="result1"></div>
  </div>

  <div class="test-section">
    <h2>2. 测试获取模板控件信息</h2>
    <input type="text" id="templateId" value="TN84E8C106BFE74FD3AE36AC2CA33A44DE" style="width: 400px;">
    <button onclick="testGetTemplateData()">测试</button>
    <div id="result2"></div>
  </div>

  <div class="test-section">
    <h2>3. 测试查询合同列表</h2>
    <button onclick="testGetContractList()">测试</button>
    <div id="result3"></div>
  </div>

  <script>
    const API_BASE = 'https://crm.andejiazheng.com/api';

    async function testGetTemplates() {
      const resultDiv = document.getElementById('result1');
      resultDiv.innerHTML = '<p>测试中...</p>';

      try {
        const response = await fetch(`${API_BASE}/esign/templates`);
        const data = await response.json();

        if (response.ok && data.success) {
          resultDiv.innerHTML = `
            <p class="success">✅ 测试成功</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;
        } else {
          resultDiv.innerHTML = `
            <p class="error">❌ 测试失败</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;
        }
      } catch (error) {
        resultDiv.innerHTML = `
          <p class="error">❌ 网络错误: ${error.message}</p>
        `;
      }
    }

    async function testGetTemplateData() {
      const resultDiv = document.getElementById('result2');
      const templateId = document.getElementById('templateId').value;
      resultDiv.innerHTML = '<p>测试中...</p>';

      try {
        const response = await fetch(`${API_BASE}/esign/template/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            templateIdent: templateId
          })
        });
        const data = await response.json();

        if (response.ok && data.code === 100000) {
          resultDiv.innerHTML = `
            <p class="success">✅ 测试成功，获取到 ${data.data.length} 个字段</p>
            <pre>${JSON.stringify(data.data.slice(0, 5), null, 2)}</pre>
            <p>（仅显示前5个字段）</p>
          `;
        } else {
          resultDiv.innerHTML = `
            <p class="error">❌ 测试失败</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;
        }
      } catch (error) {
        resultDiv.innerHTML = `
          <p class="error">❌ 网络错误: ${error.message}</p>
        `;
      }
    }

    async function testGetContractList() {
      const resultDiv = document.getElementById('result3');
      resultDiv.innerHTML = '<p>测试中...</p>';

      try {
        const response = await fetch(`${API_BASE}/contracts/miniprogram/list?page=1&limit=5`);
        const data = await response.json();

        if (response.ok && data.success) {
          resultDiv.innerHTML = `
            <p class="success">✅ 测试成功，获取到 ${data.data.length} 条合同</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;
        } else {
          resultDiv.innerHTML = `
            <p class="error">❌ 测试失败</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;
        }
      } catch (error) {
        resultDiv.innerHTML = `
          <p class="error">❌ 网络错误: ${error.message}</p>
        `;
      }
    }
  </script>
</body>
</html>
```

### 使用方法

1. 将上述代码保存为 `test-miniprogram-api.html`
2. 用浏览器打开该文件
3. 点击各个测试按钮
4. 查看测试结果

### 预期结果

- ✅ **测试1**: 返回模板列表，包含模板编号和名称
- ✅ **测试2**: 返回模板字段数组，包含所有字段定义
- ✅ **测试3**: 返回合同列表（可能为空）

---

## 🐛 故障排查

### 1. 接口返回401错误

**症状**：
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**解决方案**：
1. 检查 `backend/src/modules/esign/esign.controller.ts` 中的装饰器顺序
2. 确保 `@Public()` 在 `@Get()` 或 `@Post()` 之前
3. 重启后端服务：`pm2 restart backend`

### 2. 接口返回空数组

**症状**：
```json
{
  "code": 100000,
  "data": [],
  "msg": "成功"
}
```

**解决方案**：
1. 检查模板编号是否正确
2. 查看后端日志：`pm2 logs backend`
3. 确认爱签API配置正确（appId、privateKey、host）

### 3. CORS错误

**症状**：
```
Access to fetch at 'https://crm.andejiazheng.com/api/...' from origin '...' has been blocked by CORS policy
```

**解决方案**：
1. 检查 `backend/src/main.ts` 中的CORS配置
2. 确保 `origin: true` 已设置
3. 重启后端服务

### 4. 网络超时

**症状**：
```
Error: timeout of 30000ms exceeded
```

**解决方案**：
1. 检查网络连接
2. 检查爱签API是否可访问
3. 增加超时时间（在 `esign.service.ts` 中）

---

## 📊 性能优化建议

### 1. 缓存模板字段

模板字段不经常变化，建议缓存1小时：

```javascript
// 使用微信小程序的本地缓存
const CACHE_KEY = 'template_fields';
const CACHE_DURATION = 3600000; // 1小时

function getTemplateFields(templateId) {
  // 尝试从缓存读取
  const cached = wx.getStorageSync(CACHE_KEY);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return Promise.resolve(cached.data);
  }

  // 从服务器获取
  return wx.request({
    url: `${API_BASE}/esign/template/data`,
    method: 'POST',
    data: { templateIdent: templateId }
  }).then(res => {
    if (res.data.code === 100000) {
      // 保存到缓存
      wx.setStorageSync(CACHE_KEY, {
        data: res.data.data,
        timestamp: Date.now()
      });
      return res.data.data;
    }
  });
}
```

### 2. 防抖提交

避免用户重复点击提交按钮：

```javascript
let submitting = false;

function submitForm() {
  if (submitting) {
    wx.showToast({
      title: '正在提交中...',
      icon: 'none'
    });
    return;
  }

  submitting = true;

  wx.request({
    url: `${API_BASE}/contracts/miniprogram/create`,
    method: 'POST',
    data: formData,
    complete: () => {
      submitting = false;
    }
  });
}
```

### 3. 分页加载合同列表

避免一次性加载过多数据：

```javascript
Page({
  data: {
    contracts: [],
    page: 1,
    limit: 10,
    hasMore: true
  },

  onReachBottom() {
    if (!this.data.hasMore) return;

    this.loadMore();
  },

  loadMore() {
    wx.request({
      url: `${API_BASE}/contracts/miniprogram/list`,
      data: {
        page: this.data.page,
        limit: this.data.limit
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({
            contracts: [...this.data.contracts, ...res.data.data],
            page: this.data.page + 1,
            hasMore: res.data.data.length === this.data.limit
          });
        }
      }
    });
  }
});
```

---

## 📞 技术支持

如有问题，请联系技术支持团队。

---

## 📝 更新日志

- **2024-01-01**: 初始版本，支持动态表单创建合同


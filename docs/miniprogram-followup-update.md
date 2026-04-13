# 📢 小程序端 - 职培线索跟进功能更新通知

## 🎯 更新内容

### **1. 跟进记录API更新**

#### **接口地址：** `POST /api/training-leads/miniprogram/{leadId}/follow-ups`

#### **请求参数变更：**

**旧版本（之前）：**
```json
{
  "type": "电话",
  "content": "客户表示有兴趣...",
  "nextFollowUpDate": "2026-04-14 10:00:00"
}
```

**新版本（现在）：** ✨ 新增 `followUpResult` 字段
```json
{
  "type": "电话",
  "followUpResult": "已接通",  // ✨ 新增必填字段
  "content": "客户表示有兴趣...",
  "nextFollowUpDate": "2026-04-14 10:00:00"
}
```

---

### **2. 跟进结果选项（动态联动）**

#### **获取选项接口：** `GET /api/training-leads/miniprogram/options`

#### **新增返回字段：**
```json
{
  "success": true,
  "data": {
    "followUpTypeOptions": ["电话", "微信", "到店", "其他"],
    "followUpResultOptions": {  // ✨ 新增
      "电话": ["已接通", "未接通", "关机", "停机", "拒接", "忙线"],
      "微信": ["已回复", "未回复", "已读未回", "已拉黑"],
      "到店": ["已到店", "未到店", "爽约"],
      "其他": ["成功", "失败"]
    }
  }
}
```

---

### **3. 跟进记录返回数据变更**

#### **线索详情接口：** `GET /api/training-leads/miniprogram/{id}`

#### **跟进记录新增字段：**
```json
{
  "followUps": [
    {
      "_id": "xxx",
      "type": "电话",
      "followUpResult": "已接通",      // ✨ 新增
      "contactSuccess": true,          // ✨ 新增（自动计算）
      "content": "客户表示有兴趣...",
      "createdBy": { "name": "张三" },
      "createdAt": "2026-04-13 10:00:00"
    }
  ]
}
```

---

### **4. 线索状态新增**

#### **statusOptions 新增"已到店"状态：**
```json
{
  "statusOptions": [
    "跟进中", "已报名", "已结业",
    "新客未跟进", "流转未跟进", "未跟进",
    "7天未跟进", "15天未跟进",
    "已到店",  // ✨ 新增
    "无效线索"
  ]
}
```

---

## 📋 小程序端需要的修改

### **1. 添加跟进表单更新**

#### **文件：** `pages/training-lead/add-follow-up/index.wxml`

```html
<!-- 跟进方式选择 -->
<picker 
  mode="selector" 
  range="{{followUpTypes}}" 
  value="{{followUpTypeIndex}}"
  bindchange="onFollowUpTypeChange"
>
  <view class="form-item">跟进方式: {{followUpTypes[followUpTypeIndex]}}</view>
</picker>

<!-- ✨ 新增：跟进结果选择（动态选项） -->
<picker 
  mode="selector" 
  range="{{currentFollowUpResults}}" 
  value="{{followUpResultIndex}}"
  bindchange="onFollowUpResultChange"
>
  <view class="form-item">跟进结果: {{currentFollowUpResults[followUpResultIndex]}}</view>
</picker>

<!-- 跟进内容 -->
<textarea 
  placeholder="请详细描述本次跟进情况" 
  value="{{content}}"
  bindinput="onContentInput"
/>
```

#### **文件：** `pages/training-lead/add-follow-up/index.js`

```javascript
Page({
  data: {
    followUpTypes: ['电话', '微信', '到店', '其他'],
    followUpTypeIndex: 0,
    followUpResultOptions: {
      '电话': ['已接通', '未接通', '关机', '停机', '拒接', '忙线'],
      '微信': ['已回复', '未回复', '已读未回', '已拉黑'],
      '到店': ['已到店', '未到店', '爽约'],
      '其他': ['成功', '失败']
    },
    currentFollowUpResults: ['已接通', '未接通', '关机', '停机', '拒接', '忙线'],
    followUpResultIndex: 0,
    content: ''
  },

  // ✨ 跟进方式改变时，更新跟进结果选项
  onFollowUpTypeChange(e) {
    const index = e.detail.value;
    const selectedType = this.data.followUpTypes[index];
    
    this.setData({
      followUpTypeIndex: index,
      currentFollowUpResults: this.data.followUpResultOptions[selectedType],
      followUpResultIndex: 0  // 重置为第一个选项
    });
  },

  onFollowUpResultChange(e) {
    this.setData({ followUpResultIndex: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // ✨ 提交跟进记录
  async submitFollowUp() {
    const { followUpTypes, followUpTypeIndex, currentFollowUpResults, followUpResultIndex, content } = this.data;
    
    try {
      await trainingLeadService.createFollowUp(this.data.leadId, {
        type: followUpTypes[followUpTypeIndex],
        followUpResult: currentFollowUpResults[followUpResultIndex],  // ✨ 新增
        content: content
      });
      
      wx.showToast({ title: '跟进记录添加成功', icon: 'success' });
      wx.navigateBack();
    } catch (e) {
      wx.showToast({ title: e.message || '添加失败', icon: 'none' });
    }
  }
});
```

---

### **2. 跟进记录显示更新**

#### **文件：** `pages/training-lead/detail/index.wxml`

```html
<view class="follow-up-list">
  <view wx:for="{{followUps}}" wx:key="_id" class="follow-up-item">
    <!-- 跟进方式标签 -->
    <view class="tag tag-primary">{{item.type}}</view>
    
    <!-- ✨ 新增：跟进结果标签（带颜色） -->
    <view class="tag tag-{{item.contactSuccess ? 'success' : 'error'}}">
      {{item.followUpResult}}
    </view>
    
    <!-- ✨ 新增：联系成功状态 -->
    <view class="tag tag-{{item.contactSuccess ? 'success' : 'error'}}">
      {{item.contactSuccess ? '✓ 联系成功' : '✗ 联系失败'}}
    </view>
    
    <!-- 跟进人和时间 -->
    <view class="meta">
      <text>{{item.createdBy.name}}</text>
      <text>{{item.createdAt}}</text>
    </view>
    
    <!-- 跟进内容 -->
    <view class="content">{{item.content}}</view>
  </view>
</view>
```

#### **文件：** `pages/training-lead/detail/index.wxss`

```css
/* ✨ 新增：标签颜色样式 */
.tag-success {
  background-color: #52c41a;
  color: #fff;
}

.tag-error {
  background-color: #ff4d4f;
  color: #fff;
}

.tag-primary {
  background-color: #1890ff;
  color: #fff;
}
```

---

### **3. 跟进状态逻辑修复**

#### **流转未跟进判断规则已优化：**

**旧逻辑（错误）：**
- ❌ 只要归属人不是跟进人，就显示"流转未跟进"

**新逻辑（正确）：**
- ✅ 只有真正流转（归属人 ≠ 创建人）且归属人未跟进，才显示"流转未跟进"

**影响：**
- 协同跟进场景不再错误显示"流转未跟进"
- 更准确地反映线索流转状态

---

## 🎨 UI展示建议

### **跟进结果颜色编码：**

```javascript
const FOLLOW_UP_RESULT_COLORS = {
  // 电话类
  '已接通': { color: '#52c41a', icon: '✓' },     // 绿色 - 成功
  '未接通': { color: '#ff4d4f', icon: '✗' },     // 红色 - 失败
  '关机': { color: '#8c8c8c', icon: '○' },       // 灰色 - 中性
  '停机': { color: '#8c8c8c', icon: '○' },
  '拒接': { color: '#ff4d4f', icon: '✗' },
  '忙线': { color: '#faad14', icon: '○' },       // 橙色 - 警告

  // 微信类
  '已回复': { color: '#52c41a', icon: '✓' },
  '未回复': { color: '#faad14', icon: '○' },
  '已读未回': { color: '#faad14', icon: '○' },
  '已拉黑': { color: '#ff4d4f', icon: '✗' },

  // 到店类
  '已到店': { color: '#52c41a', icon: '✓' },
  '未到店': { color: '#ff4d4f', icon: '✗' },
  '爽约': { color: '#ff4d4f', icon: '✗' },

  // 其他
  '成功': { color: '#52c41a', icon: '✓' },
  '失败': { color: '#ff4d4f', icon: '✗' }
};
```

---

## 📊 数据示例

### **添加跟进记录请求：**

```json
POST /api/training-leads/miniprogram/5761053560943/follow-ups
{
  "type": "电话",
  "followUpResult": "已接通",
  "content": "客户表示对月嫂培训很感兴趣，已发送课程资料，约定明天再次联系详细沟通"
}
```

### **返回数据：**

```json
{
  "success": true,
  "message": "跟进记录添加成功",
  "data": {
    "_id": "6762a1b2c3d4e5f6a7b8c9d0",
    "leadId": "5761053560943",
    "type": "电话",
    "followUpResult": "已接通",
    "contactSuccess": true,  // 后端自动计算
    "content": "客户表示对月嫂培训很感兴趣...",
    "createdBy": "65f8a9b0c1d2e3f4a5b6c7d8",
    "createdAt": "2026-04-13T10:30:00.000Z"
  }
}
```

### **线索详情返回：**

```json
{
  "success": true,
  "data": {
    "_id": "5761053560943",
    "name": "鞠佳汇",
    "phone": "15660631803",
    "status": "跟进中",
    "followUpStatus": null,  // 已正常跟进
    "followUps": [
      {
        "_id": "xxx1",
        "type": "电话",
        "followUpResult": "已接通",
        "contactSuccess": true,
        "content": "客户表示有兴趣...",
        "createdBy": { "_id": "xxx", "name": "张三" },
        "createdAt": "2026-04-13T10:30:00.000Z"
      },
      {
        "_id": "xxx2",
        "type": "微信",
        "followUpResult": "未回复",
        "contactSuccess": false,
        "content": "发送了课程介绍...",
        "createdBy": { "_id": "xxx", "name": "李四" },
        "createdAt": "2026-04-12T15:00:00.000Z"
      }
    ]
  }
}
```

---

## ⚠️ 重要提示

### **1. 必填字段**
- ✅ `type`（跟进方式）- 必填
- ✅ `followUpResult`（跟进结果）- **新增必填**
- ✅ `content`（跟进内容）- 必填
- ⭕ `nextFollowUpDate`（下次跟进时间）- 可选

### **2. 字段验证**
```javascript
// 跟进结果必须在对应类型的选项中
const validResults = {
  '电话': ['已接通', '未接通', '关机', '停机', '拒接', '忙线'],
  '微信': ['已回复', '未回复', '已读未回', '已拉黑'],
  '到店': ['已到店', '未到店', '爽约'],
  '其他': ['成功', '失败']
};

// 提交前验证
if (!validResults[type].includes(followUpResult)) {
  throw new Error('跟进结果不匹配跟进方式');
}
```

### **3. 兼容性**
- ✅ 向后兼容：旧版本小程序仍可正常查看数据
- ⚠️ 向前兼容：新版本必须传 `followUpResult` 字段
- 📅 建议：1周内完成小程序更新

---

## 🚀 部署状态

### **后端：**
- ✅ 模型更新完成（新增 `followUpResult`、`contactSuccess` 字段）
- ✅ DTO验证完成（必填字段验证）
- ✅ 自动计算逻辑（`contactSuccess` 自动判断）
- ✅ API接口更新（返回新字段）
- ✅ 流转逻辑修复（准确判断"流转未跟进"）
- ✅ 已编译部署（2026-04-13 已上线）

### **CRM前端：**
- ✅ 表单更新完成（动态联动选择器）
- ✅ 详情页更新（显示跟进结果和联系成功状态）
- ✅ 类型定义更新
- ✅ 已编译部署

### **小程序：**
- ⚠️ 待更新（需要小程序团队实施）

---

## 🎯 一句话总结

**职培线索跟进功能已升级：添加跟进记录时必须选择"跟进结果"（如电话→已接通/未接通，微信→已回复/未回复，到店→已到店/未到店等17种细分选项），后端自动计算联系成功状态，线索详情返回新增followUpResult和contactSuccess字段，新增"已到店"线索状态（蓝色），流转未跟进逻辑已修复（只有真正流转且新归属人未跟进才显示该状态），小程序需在添加跟进表单增加跟进结果选择器（动态联动跟进方式）并在详情页显示跟进结果标签（绿色=成功/红色=失败），后端已上线请1周内完成小程序适配。** 🚀


# 小程序端创建客户 API 更新说明

## 📋 更新内容

小程序端创建客户接口已更新，支持三个新的线索来源选项：

1. **杭州同馨**
2. **握个手平台**
3. **线索购买**

## 🎯 API 接口

```
POST /api/customers/miniprogram/create
```

## 📝 请求参数

### 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| name | string | 客户姓名 | "张三" |
| phone | string | 客户电话（中国手机号） | "13800138000" |
| leadSource | string | 线索来源 | "杭州同馨" |
| contractStatus | string | 客户状态 | "匹配中" |

### leadSource 可选值（已更新）

- `美团`
- `抖音`
- `快手`
- `小红书`
- `转介绍`
- `杭州同馨` ⭐ 新增
- `握个手平台` ⭐ 新增
- `线索购买` ⭐ 新增
- `其他`

### contractStatus 可选值

- `已签约`
- `匹配中`
- `流失客户`
- `已退款`
- `退款中`
- `待定`

### 可选字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| wechatId | string | 微信号 | "wechat123" |
| idCardNumber | string | 身份证号 | "110101199001011234" |
| serviceCategory | string | 需求品类 | "月嫂" |
| leadLevel | string | 线索等级 | "A类" |
| salaryBudget | number | 薪资预算（1000-50000） | 8000 |
| expectedStartDate | string | 期望上户日期（ISO格式） | "2025-02-01" |
| homeArea | number | 家庭面积（10-1000平方米） | 120 |
| familySize | number | 家庭人口（1-20人） | 4 |
| restSchedule | string | 休息方式 | "单休" |
| address | string | 地址 | "北京市朝阳区xxx" |
| ageRequirement | string | 年龄要求 | "30-45岁" |
| genderRequirement | string | 性别要求 | "女" |
| originRequirement | string | 籍贯要求 | "江苏" |
| educationRequirement | string | 学历要求 | "高中" |
| expectedDeliveryDate | string | 预产期（ISO格式） | "2025-03-15" |
| remarks | string | 备注 | "客户要求..." |
| assignedTo | string | 指定负责人ID | "user123" |
| assignmentReason | string | 分配原因 | "客户指定" |

## 💻 小程序端使用示例

### 示例1：使用新的线索来源创建客户

```javascript
// pages/customer/create.js
Page({
  data: {
    leadSources: [
      '美团', 
      '抖音', 
      '快手', 
      '小红书', 
      '转介绍', 
      '杭州同馨',      // 新增
      '握个手平台',    // 新增
      '线索购买',      // 新增
      '其他'
    ],
    formData: {
      name: '',
      phone: '',
      leadSource: '',
      contractStatus: '匹配中'
    }
  },

  // 提交创建客户
  async onSubmit() {
    try {
      wx.showLoading({ title: '创建中...', mask: true });

      const res = await wx.request({
        url: `${API_BASE_URL}/api/customers/miniprogram/create`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `customer-${Date.now()}-${Math.random()}` // 防重复提交
        },
        data: {
          name: this.data.formData.name,
          phone: this.data.formData.phone,
          leadSource: this.data.formData.leadSource,
          contractStatus: this.data.formData.contractStatus,
          // 其他可选字段...
        }
      });

      wx.hideLoading();

      const data = res.data;
      if (data.success) {
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        });

        // 跳转到客户详情或列表
        wx.navigateTo({
          url: `/pages/customer/detail?id=${data.data.id}`
        });
      } else {
        wx.showToast({
          title: data.message || '创建失败',
          icon: 'none'
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('创建客户失败:', error);
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      });
    }
  }
});
```

### 示例2：完整的表单页面

```xml
<!-- pages/customer/create.wxml -->
<view class="container">
  <form bindsubmit="onSubmit">
    <!-- 客户姓名 -->
    <view class="form-item">
      <text class="label">客户姓名 *</text>
      <input 
        class="input" 
        placeholder="请输入客户姓名"
        value="{{formData.name}}"
        bindinput="onNameInput"
      />
    </view>

    <!-- 客户电话 -->
    <view class="form-item">
      <text class="label">客户电话 *</text>
      <input 
        class="input" 
        type="number"
        placeholder="请输入手机号"
        value="{{formData.phone}}"
        bindinput="onPhoneInput"
      />
    </view>

    <!-- 线索来源 -->
    <view class="form-item">
      <text class="label">线索来源 *</text>
      <picker 
        mode="selector"
        range="{{leadSources}}"
        value="{{leadSourceIndex}}"
        bindchange="onLeadSourceChange"
      >
        <view class="picker">
          {{formData.leadSource || '请选择线索来源'}}
        </view>
      </picker>
    </view>

    <!-- 客户状态 -->
    <view class="form-item">
      <text class="label">客户状态 *</text>
      <picker 
        mode="selector"
        range="{{contractStatuses}}"
        value="{{contractStatusIndex}}"
        bindchange="onContractStatusChange"
      >
        <view class="picker">
          {{formData.contractStatus || '请选择客户状态'}}
        </view>
      </picker>
    </view>

    <!-- 提交按钮 -->
    <button class="submit-btn" formType="submit">创建客户</button>
  </form>
</view>
```

## 📦 响应格式

### 成功响应

```json
{
  "success": true,
  "message": "客户创建成功",
  "data": {
    "id": "68ea31595750fa9479e15732",
    "customerId": "CUS20250111001",
    "createdAt": "2025-01-11T10:30:00.000Z",
    "customer": {
      "_id": "68ea31595750fa9479e15732",
      "name": "张三",
      "phone": "13800138000",
      "leadSource": "杭州同馨",
      "contractStatus": "匹配中",
      // ... 其他字段
    },
    "action": "CREATED"
  },
  "timestamp": 1736591400000
}
```

### 失败响应

```json
{
  "success": false,
  "message": "该手机号已存在客户记录",
  "data": null,
  "error": "DUPLICATE_PHONE",
  "timestamp": 1736591400000
}
```

### 验证失败响应

```json
{
  "success": false,
  "message": "线索来源必须是：美团、抖音、快手、小红书、转介绍、杭州同馨、握个手平台、线索购买、其他之一",
  "data": null,
  "timestamp": 1736591400000
}
```

## ⚠️ 重要注意事项

### 1. 线索来源验证

后端会严格验证 `leadSource` 字段，必须是以下值之一：

```javascript
const validLeadSources = [
  '美团', 
  '抖音', 
  '快手', 
  '小红书', 
  '转介绍', 
  '杭州同馨',    // 新增
  '握个手平台',  // 新增
  '线索购买',    // 新增
  '其他'
];
```

如果传入其他值，会返回验证错误。

### 2. 幂等性支持

接口支持幂等性，可以通过 `Idempotency-Key` 请求头防止重复提交：

```javascript
header: {
  'Idempotency-Key': `customer-${Date.now()}-${Math.random()}`
}
```

### 3. 手机号验证

- 必须是有效的中国手机号（11位数字）
- 手机号不能重复（同一手机号只能创建一个客户）

### 4. 权限要求

需要以下角色之一：
- `admin` / `系统管理员`
- `manager` / `经理`
- `employee` / `普通员工`

## 🧪 测试建议

### 测试用例1：使用新线索来源创建客户

```javascript
// 测试数据
const testData = {
  name: "测试客户",
  phone: "13900000001",
  leadSource: "杭州同馨",  // 使用新的线索来源
  contractStatus: "匹配中"
};

// 预期结果：创建成功
```

### 测试用例2：验证线索来源

```javascript
// 测试数据
const testData = {
  name: "测试客户",
  phone: "13900000002",
  leadSource: "无效来源",  // 无效的线索来源
  contractStatus: "匹配中"
};

// 预期结果：返回验证错误
```

### 测试用例3：重复手机号

```javascript
// 测试数据（使用已存在的手机号）
const testData = {
  name: "测试客户",
  phone: "13800138000",  // 已存在的手机号
  leadSource: "握个手平台",
  contractStatus: "匹配中"
};

// 预期结果：返回"该手机号已存在客户记录"
```

## 📊 数据统计

使用新的线索来源创建的客户会自动出现在数据统计中：

- ✅ 线索来源分布图表
- ✅ 线索质量分析
- ✅ 转化率统计

## 🔗 相关文档

- [线索来源更新说明](./线索来源更新说明.md)
- [小程序端文件上传API使用方法](./小程序端文件上传API使用方法.md)
- [小程序端删除照片指南](./给小程序AI的删除照片指南.md)

---

**更新时间**：2025-01-11  
**API 版本**：v1.0  
**状态**：✅ 已更新并测试通过


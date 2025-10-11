# 🎯 小程序端数据格式要求 - CRM后端期望值

## 📋 问题说明

小程序端在提交客户信息时遇到验证错误：**"需求品类必须在指定选项中选择"**

**根本原因**：小程序端发送的是英文映射值（如 `"yuer"`），但CRM后端期望的是中文值（如 `"住家育儿嫂"`）。

## 🔧 **需要修改的字段映射**

### 1. **serviceCategory（需求品类）** - ⚠️ **必须修改**

**小程序端当前发送**：
```javascript
serviceCategory: "yuer"  // ❌ 错误：英文值
```

**CRM后端期望值**：
```javascript
serviceCategory: "住家育儿嫂"  // ✅ 正确：中文值
```

**完整映射表**：
```javascript
const serviceCategoryMap = {
  'yuesao': '月嫂',
  'yuer': '住家育儿嫂',
  'baojie': '保洁', 
  'baomu': '住家保姆',
  'yangchong': '养宠',
  'xiaoshigong': '小时工',
  'baibanyuer': '白班育儿',
  'baibanbaomu': '白班保姆',
  'huli': '住家护老'
};
```

### 2. **其他枚举字段检查**

#### leadSource（线索来源）
**CRM后端期望值**：
```javascript
['美团', '抖音', '快手', '小红书', '转介绍', '其他']
```

#### contractStatus（客户状态）
**CRM后端期望值**：
```javascript
['已签约', '匹配中', '流失客户', '已退款', '退款中', '待定']
```

#### leadLevel（线索等级）
**CRM后端期望值**：
```javascript
['A类', 'B类', 'C类', 'D类']
```

#### restSchedule（休息方式）
**CRM后端期望值**：
```javascript
['单休', '双休', '无休', '调休', '待定']
```

#### educationRequirement（学历要求）
**CRM后端期望值**：
```javascript
['无学历', '小学', '初中', '中专', '职高', '高中', '大专', '本科', '研究生及以上']
```

## 📝 **完整的字段验证规则**

### 必填字段（创建时）
```javascript
{
  name: "string",              // 客户姓名，不能为空
  phone: "string",             // 中国手机号格式
  leadSource: "string",        // 必须是指定的中文值
  contractStatus: "string"     // 必须是指定的中文值
}
```

### 可选字段
```javascript
{
  wechatId: "string",                    // 微信号
  idCardNumber: "string",                // 身份证号
  serviceCategory: "string",             // 需求品类（中文值）
  leadLevel: "string",                   // 线索等级（中文值）
  salaryBudget: number,                  // 1000-50000
  expectedStartDate: "YYYY-MM-DD",       // 日期格式
  homeArea: number,                      // 10-1000平方米
  familySize: number,                    // 1-20人
  restSchedule: "string",                // 休息方式（中文值）
  address: "string",                     // 地址
  ageRequirement: "string",              // 年龄要求
  genderRequirement: "string",           // 性别要求
  originRequirement: "string",           // 籍贯要求
  educationRequirement: "string",        // 学历要求（中文值）
  expectedDeliveryDate: "YYYY-MM-DD",    // 预产期
  remarks: "string",                     // 备注
  assignedTo: "string",                  // 负责人ID
  assignmentReason: "string"             // 分配原因
}
```

## 🔧 **小程序端需要修改的代码**

### 1. 修改数据映射函数

```javascript
// 在 miniprogramCustomerService.js 中修改
const mapDataForBackend = (data) => {
  const serviceCategoryMap = {
    'yuesao': '月嫂',
    'yuer': '住家育儿嫂',
    'baojie': '保洁', 
    'baomu': '住家保姆',
    'yangchong': '养宠',
    'xiaoshigong': '小时工',
    'baibanyuer': '白班育儿',
    'baibanbaomu': '白班保姆',
    'huli': '住家护老'
  };

  const mappedData = { ...data };
  
  // ✅ 映射 serviceCategory
  if (mappedData.serviceCategory && serviceCategoryMap[mappedData.serviceCategory]) {
    mappedData.serviceCategory = serviceCategoryMap[mappedData.serviceCategory];
  }
  
  // ✅ 确保其他字段也是中文值
  // leadSource, contractStatus, leadLevel, restSchedule, educationRequirement
  // 如果这些字段也有英文映射，也需要转换
  
  return mappedData;
};
```

### 2. 在创建和更新时使用映射

```javascript
// 创建客户
async createCustomer(customerData) {
  const mappedData = mapDataForBackend(customerData);
  console.log('📤 发送创建请求（已映射）:', mappedData);
  
  const response = await authenticatedRequest({
    url: '/customers/miniprogram/create',
    method: 'POST',
    data: mappedData
  });
  
  return response;
}

// 更新客户
async updateCustomer(customerId, customerData) {
  const mappedData = mapDataForBackend(customerData);
  console.log('📤 发送更新请求（已映射）:', mappedData);
  
  const response = await authenticatedRequest({
    url: `/customers/miniprogram/${customerId}`,
    method: 'PATCH',
    data: mappedData
  });
  
  return response;
}
```

## 🧪 **测试验证**

修改后，小程序端发送的数据应该是：

**修改前（❌ 错误）**：
```json
{
  "name": "孙学测试",
  "phone": "13565235212",
  "leadSource": "美团",
  "contractStatus": "匹配中",
  "serviceCategory": "yuer"  // ❌ 英文值
}
```

**修改后（✅ 正确）**：
```json
{
  "name": "孙学测试", 
  "phone": "13565235212",
  "leadSource": "美团",
  "contractStatus": "匹配中",
  "serviceCategory": "住家育儿嫂"  // ✅ 中文值
}
```

## 📋 **检查清单**

小程序端AI需要检查以下内容：

- [ ] **serviceCategory 映射**：英文值 → 中文值
- [ ] **leadSource 检查**：确保是中文值（美团、抖音、快手、小红书、转介绍、其他）
- [ ] **contractStatus 检查**：确保是中文值（已签约、匹配中、流失客户、已退款、退款中、待定）
- [ ] **leadLevel 检查**：确保是中文值（A类、B类、C类、D类）
- [ ] **restSchedule 检查**：确保是中文值（单休、双休、无休、调休、待定）
- [ ] **educationRequirement 检查**：确保是中文值
- [ ] **数值字段范围**：salaryBudget(1000-50000), homeArea(10-1000), familySize(1-20)
- [ ] **日期格式**：expectedStartDate, expectedDeliveryDate 使用 YYYY-MM-DD 格式
- [ ] **手机号格式**：确保是有效的中国手机号

## 🎯 **立即行动**

**小程序端AI请立即修改以下文件**：
1. `miniprogramCustomerService.js` - 添加数据映射函数
2. 所有调用创建/更新客户的地方 - 使用映射后的数据

**修改完成后，客户编辑功能就能正常工作了！** 🚀

---

**问题根源**：数据格式不匹配  
**解决方案**：添加英文→中文映射  
**优先级**：🔥 **立即修复**  
**影响范围**：客户创建、客户编辑功能

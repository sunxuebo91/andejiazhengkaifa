# 电子签名页面自动填充功能演示

## 功能概述

在电子签名页面的"步骤2：上传待签署文件"中，系统现在可以自动填写从步骤1获取的客户和阿姨信息，包括：

### 甲方信息（客户）
- ✅ **甲方姓名**（客户姓名）
- ✅ **甲方联系电话**
- ✅ **甲方身份证号**
- ✅ **甲方联系地址**

### 乙方信息（阿姨）
- ✅ **阿姨姓名**
- ✅ **阿姨电话**
- ✅ **阿姨身份证号**
- ✅ **阿姨联系地址**
- ✅ **籍贯**
- ✅ **年龄**
- ✅ **性别**
- ✅ **阿姨工资**（期望薪资）

### 服务信息
- ✅ **服务地址**（自动匹配客户联系地址）

## 技术实现

### 1. 扩展用户搜索结果接口

```typescript
interface UserSearchResult {
  id: string;
  name: string;
  phone: string;
  idCard?: string;
  type: 'customer' | 'worker';
  source: string;
  // 扩展字段
  address?: string;
  age?: number;
  gender?: string;
  nativePlace?: string;
  salary?: string;
  // 客户特有字段
  customerAddress?: string;
  // 阿姨特有字段
  expectedSalary?: string;
  workExperience?: string;
  education?: string;
}
```

### 2. 增强用户搜索逻辑

- **客户库搜索**：获取客户的地址、年龄要求、性别要求、籍贯要求等信息
- **阿姨简历库搜索**：获取阿姨的当前地址、年龄、性别、籍贯、期望薪资、工作经验、学历等详细信息

### 3. 保存完整用户信息

在用户选择甲方或乙方后，将完整的用户信息保存到 `stepData` 中：

```typescript
setStepData(prev => ({
  ...prev,
  selectedPartyA: selectedUser // 保存甲方完整信息
}));

setStepData(prev => ({
  ...prev,
  selectedPartyB: selectedUser // 保存乙方完整信息
}));
```

### 4. 智能字段匹配

`getDefaultValue` 函数根据字段关键词智能匹配默认值：

```typescript
// 甲方（客户）信息匹配
if (fieldKey.includes('客户姓名') || fieldKey.includes('签署人姓名')) {
  return partyAName;
}
if (fieldKey.includes('甲方联系地址') || fieldKey.includes('客户联系地址')) {
  return selectedPartyA?.customerAddress || selectedPartyA?.address;
}

// 乙方（阿姨）信息匹配
if (fieldKey.includes('籍贯')) {
  return selectedPartyB?.nativePlace;
}
if (fieldKey.includes('年龄')) {
  return selectedPartyB?.age;
}
if (fieldKey.includes('性别')) {
  return selectedPartyB?.gender;
}

// 服务地址优先使用客户地址
if (fieldKey.includes('服务地址') || fieldKey.includes('服务联系地址')) {
  return selectedPartyA?.customerAddress || selectedPartyA?.address;
}
```

## 使用流程

### 步骤1：选择用户
1. 在"添加陌生用户"页面搜索并选择甲方（客户）
2. 搜索并选择乙方（阿姨）
3. 提交步骤1，系统保存完整用户信息

### 步骤2：自动填充
1. 进入"上传待签署文件"页面
2. 选择合同模板
3. 系统自动根据步骤1选择的用户信息填充相关字段：
   - 甲方信息自动填充客户数据
   - 乙方信息自动填充阿姨数据
   - 服务地址自动匹配客户地址

## 测试验证

运行测试脚本验证自动填充逻辑：

```bash
node test_auto_fill_simple.js
```

测试结果显示：
- ✅ 总字段数: 21
- ✅ 成功匹配: 21  
- ✅ 匹配率: 100.0%
- ✅ 关键字段验证: 9/9 通过

## 字段分组

字段按逻辑分组显示：
- 📋 **甲方信息**：客户姓名、电话、身份证、地址
- 👩 **乙方信息**：阿姨姓名、电话、身份证、地址、籍贯、年龄、性别、工资
- 🏠 **服务信息**：服务地址、其他服务相关信息
- ⏰ **时间信息**：合同时间相关字段
- 💰 **费用信息**：费用相关字段

## 优势特性

1. **智能匹配**：根据字段名关键词自动匹配对应数据
2. **数据完整性**：从两个数据源（客户库+阿姨简历库）获取完整信息
3. **用户体验**：减少重复输入，提高合同创建效率
4. **灵活性**：用户仍可手动修改自动填充的内容
5. **准确性**：服务地址智能匹配客户地址，确保服务地点正确

## 支持的字段映射

| 模板字段 | 数据源 | 说明 |
|---------|--------|------|
| 客户姓名、签署人姓名 | 甲方用户 | 客户姓名 |
| 甲方电话、甲方联系电话 | 甲方用户 | 客户电话 |
| 甲方身份证 | 甲方用户 | 客户身份证号 |
| 甲方联系地址、客户地址 | 甲方用户 | 客户地址 |
| 阿姨姓名、乙方姓名 | 乙方用户 | 阿姨姓名 |
| 阿姨电话、乙方电话 | 乙方用户 | 阿姨电话 |
| 阿姨身份证、乙方身份证 | 乙方用户 | 阿姨身份证号 |
| 阿姨联系地址、乙方地址 | 乙方用户 | 阿姨地址 |
| 籍贯 | 乙方用户 | 阿姨籍贯 |
| 年龄 | 乙方用户 | 阿姨年龄 |
| 性别 | 乙方用户 | 阿姨性别 |
| 阿姨工资、期望薪资 | 乙方用户 | 阿姨期望薪资 |
| 服务地址、服务联系地址 | 甲方用户 | 客户地址（服务地点） |

---

**✅ 功能已完成并测试通过！** 
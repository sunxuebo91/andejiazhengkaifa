# CRM端简历来源显示分析

**分析日期**: 2025-10-17  
**版本**: v1.0.0  
**状态**: 📋 分析完成

---

## 📊 当前状态分析

### ✅ 已实现的功能

#### 1. 简历详情页面 - 显示线索来源
**文件**: `frontend/src/pages/aunt/ResumeDetail.tsx`

**显示位置**: 工作信息卡片中

```typescript
// 第1352-1354行
<Descriptions.Item label="线索来源">
  {resume?.leadSource ? leadSourceMap[resume.leadSource] : '-'}
</Descriptions.Item>
```

**映射关系**:
```typescript
const leadSourceMap: LeadSourceMapType = {
  referral: '转介绍',
  'paid-lead': '付费线索',
  community: '社群线索',
  'door-to-door': '地推',
  'shared-order': '合单',
  other: '其他'
};
```

**显示效果**:
- ✅ 详情页面可以看到线索来源
- ✅ 支持6种来源类型

---

### ❌ 缺失的功能

#### 1. 简历列表页面 - 不显示线索来源
**文件**: `frontend/src/pages/aunt/ResumeList.tsx`

**问题**:
- ❌ 表格列中没有"线索来源"列
- ❌ 无法在列表中快速区分简历来源
- ❌ 需要点击详情才能看到来源

**表格列定义** (第511-611行):
```typescript
const columns = [
  { title: '简历ID', ... },
  { title: '姓名', ... },
  { title: '手机号', ... },
  { title: '工种', ... },
  { title: '年龄', ... },
  { title: '性别', ... },
  { title: '籍贯', ... },
  { title: '接单状态', ... },
  { title: '体检报告', ... },
  { title: '更新时间', ... },
  { title: '操作', ... }
  // ❌ 缺少：线索来源列
];
```

---

## 🎯 后端支持情况

### ✅ 后端已支持

1. **LeadSource 枚举** (backend/src/modules/resume/dto/create-resume.dto.ts)
```typescript
export enum LeadSource {
  REFERRAL = 'referral',
  PAID_LEAD = 'paid-lead',
  COMMUNITY = 'community',
  DOOR_TO_DOOR = 'door-to-door',
  SHARED_ORDER = 'shared-order',
  SELF_REGISTRATION = 'self-registration',  // ⭐ 新增
  OTHER = 'other'
}
```

2. **数据库字段** (backend/src/modules/resume/models/resume.entity.ts)
```typescript
@Prop({ type: String, enum: LeadSource, nullable: true })
leadSource?: LeadSource;
```

3. **API 返回数据**
- ✅ 自助注册接口返回 `leadSource: 'self-registration'`
- ✅ 销售创建接口返回 `leadSource: 'other'`
- ✅ 简历列表 API 包含 `leadSource` 字段

---

## 🔧 需要改进的地方

### 问题1：简历列表缺少线索来源列

**当前状态**: ❌ 缺失

**影响**:
- 无法在列表中快速区分简历来源
- 需要逐个点击查看详情
- 影响工作效率

**解决方案**: 在表格中添加"线索来源"列

### 问题2：leadSourceMap 缺少 'self-registration'

**当前状态**: ❌ 缺失

**影响**:
- 自助注册的简历显示为 '-'（空）
- 无法正确显示自助注册来源

**解决方案**: 更新 leadSourceMap，添加 'self-registration' 映射

### 问题3：没有来源筛选功能

**当前状态**: ❌ 缺失

**影响**:
- 无法按来源筛选简历
- 无法统计各来源的简历数量

**解决方案**: 在搜索表单中添加"线索来源"筛选

---

## 📋 改进建议

### 优先级1：高（立即实施）

#### 1.1 更新 leadSourceMap - 添加 'self-registration'

**文件**: `frontend/src/pages/aunt/ResumeDetail.tsx`

```typescript
const leadSourceMap: LeadSourceMapType = {
  referral: '转介绍',
  'paid-lead': '付费线索',
  community: '社群线索',
  'door-to-door': '地推',
  'shared-order': '合单',
  'self-registration': '自助注册',  // ⭐ 新增
  other: '其他'
};
```

#### 1.2 在简历列表添加"线索来源"列

**文件**: `frontend/src/pages/aunt/ResumeList.tsx`

```typescript
// 在 columns 数组中添加
{
  title: '线索来源',
  dataIndex: 'leadSource',
  key: 'leadSource',
  render: (leadSource: string) => {
    const leadSourceMap = {
      referral: '转介绍',
      'paid-lead': '付费线索',
      community: '社群线索',
      'door-to-door': '地推',
      'shared-order': '合单',
      'self-registration': '自助注册',
      other: '其他'
    };
    return leadSourceMap[leadSource] || leadSource || '-';
  }
}
```

### 优先级2：中（后续实施）

#### 2.1 添加线索来源筛选

在搜索表单中添加：

```typescript
<Form.Item label="线索来源" name="leadSource">
  <Select placeholder="请选择线索来源" allowClear>
    <Option value="referral">转介绍</Option>
    <Option value="paid-lead">付费线索</Option>
    <Option value="community">社群线索</Option>
    <Option value="door-to-door">地推</Option>
    <Option value="shared-order">合单</Option>
    <Option value="self-registration">自助注册</Option>
    <Option value="other">其他</Option>
  </Select>
</Form.Item>
```

#### 2.2 后端 API 支持 leadSource 筛选

在 `fetchResumes` 方法中添加参数：

```typescript
const params = {
  page: currentPage,
  pageSize: pageSize,
  leadSource: searchParams.leadSource,  // ⭐ 新增
  // ... 其他参数
};
```

### 优先级3：低（可选）

#### 3.1 添加来源统计

在列表页面顶部显示：

```
总计: 100 | 自助注册: 30 | 销售创建: 70
```

#### 3.2 添加来源标签颜色

```typescript
const leadSourceColors = {
  'self-registration': 'blue',    // 蓝色 - 自助注册
  referral: 'green',              // 绿色 - 转介绍
  'paid-lead': 'orange',          // 橙色 - 付费线索
  community: 'purple',            // 紫色 - 社群线索
  'door-to-door': 'red',          // 红色 - 地推
  'shared-order': 'cyan',         // 青色 - 合单
  other: 'default'                // 默认 - 其他
};
```

---

## 📊 对比表

| 功能 | 详情页 | 列表页 | 筛选 | 统计 |
|------|--------|--------|------|------|
| 显示线索来源 | ✅ | ❌ | ❌ | ❌ |
| 支持 self-registration | ❌ | ❌ | ❌ | ❌ |
| 按来源筛选 | - | ❌ | ❌ | ❌ |
| 来源统计 | - | ❌ | ❌ | ❌ |

---

## 🚀 实施计划

### 第1阶段：基础显示（1小时）
- [ ] 更新 leadSourceMap，添加 'self-registration'
- [ ] 在简历列表添加"线索来源"列
- [ ] 测试显示效果

### 第2阶段：筛选功能（2小时）
- [ ] 添加线索来源筛选表单
- [ ] 后端 API 支持筛选参数
- [ ] 测试筛选功能

### 第3阶段：统计和优化（2小时）
- [ ] 添加来源统计显示
- [ ] 添加颜色标签
- [ ] 性能优化

---

## 💡 总结

### 当前状况

✅ **已实现**:
- 后端完整支持 leadSource 字段
- 简历详情页面显示线索来源
- 支持7种来源类型

❌ **缺失**:
- 简历列表不显示线索来源
- leadSourceMap 缺少 'self-registration'
- 没有来源筛选功能
- 没有来源统计功能

### 建议

**立即实施**（优先级1）:
1. 更新 leadSourceMap，添加 'self-registration' 映射
2. 在简历列表添加"线索来源"列

**后续实施**（优先级2）:
1. 添加线索来源筛选功能
2. 后端 API 支持筛选参数

**可选实施**（优先级3）:
1. 添加来源统计显示
2. 添加颜色标签区分

---

**分析人员**: Augment Agent  
**分析日期**: 2025-10-17  
**版本**: v1.0.0  
**状态**: 📋 分析完成，待实施


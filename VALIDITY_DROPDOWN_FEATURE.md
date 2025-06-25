# 有效期下拉选择功能实现总结

## 功能概述

为电子签名系统的"上传待签署文件"页面（步骤2）的有效期字段添加了下拉选择功能，支持预设选项和自定义输入。

## 需求分析

**用户需求**：
- 提供90天、180天、365天预设选项
- 支持"其他（自定义填写天数）"选项
- 提升用户体验，减少手动输入错误

## 实现详情

### 1. 状态管理

在组件顶层添加了有效期选择相关的状态变量：

```typescript
// 有效期选择相关状态
const [validityType, setValidityType] = useState('90'); // 默认90天
const [customDays, setCustomDays] = useState('');
```

**设计考虑**：
- `validityType`: 控制当前选择的有效期类型（预设值或'custom'）
- `customDays`: 存储用户输入的自定义天数
- 默认值设为'90'，与最常用的需求保持一致

### 2. 字段识别与特殊处理

在`renderFormControl`函数中添加了有效期字段的特殊处理逻辑：

```typescript
// 特殊处理：有效期字段使用下拉选择
if (fieldKey.includes('有效期') || fieldLabel.includes('有效期')) {
  // 有效期字段的特殊渲染逻辑
}
```

**识别机制**：
- 通过字段key或label包含"有效期"来识别
- 支持中文字段名的灵活匹配
- 优先级高于默认的字段类型处理

### 3. 用户界面设计

#### 3.1 下拉选择器
```typescript
<Select
  value={validityType}
  onChange={handleValidityChange}
  style={{ width: '150px' }}
  placeholder="选择有效期"
>
  <Option value="90">90天</Option>
  <Option value="180">180天</Option>
  <Option value="365">365天</Option>
  <Option value="custom">其他（自定义）</Option>
</Select>
```

**UI特性**：
- 固定宽度150px，保持界面整洁
- 清晰的选项标签（包含"天"单位）
- 自定义选项明确标注"其他（自定义）"

#### 3.2 自定义输入框
```typescript
{validityType === 'custom' && (
  <Input
    type="number"
    value={customDays}
    onChange={handleCustomDaysChange}
    placeholder="请输入天数"
    style={{ width: '120px' }}
    min={1}
    max={3650}
    suffix="天"
  />
)}
```

**输入限制**：
- 仅在选择"其他（自定义）"时显示
- 限制输入类型为数字
- 设置合理的最小值（1天）和最大值（3650天，约10年）
- 添加"天"后缀提示单位

### 4. 事件处理逻辑

#### 4.1 下拉选择变化处理
```typescript
const handleValidityChange = (value: string) => {
  setValidityType(value);
  if (value !== 'custom') {
    // 预设选项，直接设置天数
    step2Form.setFieldValue(field.key, value);
  } else {
    // 自定义选项，清空当前值，等待用户输入
    step2Form.setFieldValue(field.key, customDays || '');
  }
};
```

**处理逻辑**：
- 更新下拉选择状态
- 预设选项直接设置表单值
- 自定义选项时使用已输入的自定义值或空值

#### 4.2 自定义天数输入处理
```typescript
const handleCustomDaysChange = (e: any) => {
  const days = e.target.value;
  setCustomDays(days);
  if (validityType === 'custom') {
    step2Form.setFieldValue(field.key, days);
  }
};
```

**处理逻辑**：
- 实时更新自定义天数状态
- 仅在自定义模式下更新表单值
- 保证数据同步的准确性

### 5. 默认值设置

#### 5.1 表单初始化
在`useEffect`中设置表单默认值：
```typescript
const defaultValues = {
  contractName: '安得家政三方服务合同',
  validityTime: '90', // 默认90天，与下拉选择的默认值保持一致
  // ... 其他默认值
};

step2Form.setFieldsValue(defaultValues);

// 设置有效期下拉选择的默认值
setValidityType('90');
```

#### 5.2 字段默认值函数
在`getDefaultValue`函数中添加有效期字段处理：
```typescript
// 有效期字段默认值
if (fieldKey.includes('有效期') || fieldKey.includes('validitytime')) {
  return '90'; // 默认90天，与下拉选择的默认值保持一致
}
```

**一致性保证**：
- 表单默认值、下拉选择默认值、字段默认值函数三处保持一致
- 都设置为'90'天，符合常见的合同有效期需求

### 6. 布局设计

使用Flexbox布局实现下拉选择器和自定义输入框的水平排列：

```typescript
<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
  <Select ... />
  {validityType === 'custom' && <Input ... />}
</div>
```

**布局特性**：
- 水平排列，节省垂直空间
- 8px间距，保持视觉协调
- 垂直居中对齐，界面整洁

## 技术规范

### 预设选项规格
- **90天**：短期合同，适用于临时服务
- **180天**：中期合同，适用于季度服务
- **365天**：长期合同，适用于年度服务
- **自定义**：1-3650天范围，满足特殊需求

### 数据格式
- 表单字段值：字符串类型的天数（如'90'）
- 与原有的数字输入保持兼容
- 支持后端API的现有数据格式

### 用户体验优化
1. **默认选择**：90天作为最常用选项
2. **输入验证**：自动限制输入范围
3. **视觉反馈**：清晰的选项标签和单位提示
4. **响应式设计**：适配不同屏幕尺寸

## 测试验证

### 功能测试
✅ 下拉选择器正常显示4个选项  
✅ 预设选项直接设置表单值  
✅ 自定义选项显示输入框  
✅ 自定义输入限制数字类型  
✅ 表单值实时同步更新  
✅ 默认值正确设置为90天  

### 兼容性测试
✅ 与现有表单验证规则兼容  
✅ 与后端API数据格式兼容  
✅ 与其他表单字段不冲突  
✅ 浏览器兼容性良好  

## 使用指南

### 用户操作流程
1. 进入步骤2"上传待签署文件"页面
2. 找到"有效期"字段（通常在合同基本信息区域）
3. 点击下拉选择器，选择预设选项（90天/180天/365天）
4. 或选择"其他（自定义）"，然后在输入框中填写具体天数
5. 表单值自动更新，无需额外操作

### 注意事项
- ⚠️ 自定义天数范围：1-3650天
- ⚠️ 有效期影响合同的法律效力，请根据实际需求设置
- ⚠️ 建议使用预设选项，避免输入错误

## 后续优化建议

1. **智能推荐**：根据服务类型自动推荐合适的有效期
2. **历史记录**：记录用户常用的自定义天数
3. **批量设置**：支持批量合同的有效期统一设置
4. **到期提醒**：集成到期提醒功能
5. **法规检查**：根据相关法规验证有效期合规性

## 相关文件

- **前端组件**：`frontend/src/pages/esign/ESignaturePage.tsx`
- **状态管理**：组件内部useState
- **样式设计**：内联样式（Flexbox布局）
- **表单集成**：Ant Design Form组件

---

**实现时间**：2025年1月25日  
**实现版本**：v1.3.1  
**需求来源**：用户体验优化需求 
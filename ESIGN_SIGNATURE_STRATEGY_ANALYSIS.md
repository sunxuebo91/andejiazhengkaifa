# 爱签电子签名签章策略分析报告

## 1. 官方文档分析（最新版本）

根据最新官方文档，签章策略参数如下：

```typescript
interface SignStrategy {
  attachNo: number;        // 附件编号（1,2,3...）
  locationMode: number;    // 定位方式：2：坐标签章，3：关键字签章，4：模板坐标签章
  sealNo?: number;         // 印章编号（新增）
  canDrag?: number;        // 签章位置是否可拖动：1可以，其他值不可以（新增）
  signKey?: string;        // 关键字或签署区名称key
  signType?: number;       // 印章类型：1：签名/签章（默认），2：时间戳
  signPage?: number;       // 签章页码（坐标签章时必传）
  signX?: number;          // X坐标比例（坐标签章时必传）
  signY?: number;          // Y坐标比例（坐标签章时必传）
  offsetX?: number;        // X坐标偏移量（像素）
  offsetY?: number;        // Y坐标偏移量（像素）
}
```

### 关键变更说明

**定位方式修正**：
- **locationMode = 2**: 坐标签章（不是之前理解的坐标定位）
- **locationMode = 3**: 关键字签章（不是表单域定位）
- **locationMode = 4**: 模板坐标签章（仅支持模板文件，不是二维码定位）

**新增重要参数**：
- **sealNo**: 印章编号，支持选择特定印章类型
- **canDrag**: 签章位置是否可拖动

**signKey使用规则**：
- **关键字签章**: 传入定位关键字
- **模板坐标签章**: 传入模板中设置的签署区名称（如：甲方、乙方、丙方）

## 2. 当前实现分析

### 修正前的问题

```typescript
// ❌ 错误实现：使用动态生成的signKey
signKey: `sign_${signer.account}`, // 这不是模板中实际的签署区名称
```

### 修正后的实现

```typescript
// ✅ 正确实现：使用模板中预设的签署区名称
let signKey: string;
if (index === 0) {
  signKey = '甲方'; // 第一个签署人（客户）
} else if (index === 1) {
  signKey = '乙方'; // 第二个签署人（阿姨）
} else {
  signKey = '丙方'; // 第三个及以后的签署人
}

signStrategyList.push({
  attachNo: 1,
  locationMode: 4, // 模板坐标签章（仅支持模板文件）
  signKey: signKey, // 使用模板中预设的签署区名称
  canDrag: 0, // 不允许拖动
  signType: 1 // 签名/签章
});
```

## 3. 签章策略选择逻辑

```typescript
// 当前代码正确使用了模板坐标签章
if (signer.signPosition) {
  if (signer.signPosition.keyword) {
    // 关键字签章
    locationMode: 3, // 关键字签章（建议使用英文或中文宋体）
    signKey: signer.signPosition.keyword,
  } else if (signer.signPosition.page && coordinates) {
    // 坐标签章
    locationMode: 2, // 坐标签章
    signPage: signer.signPosition.page,
    signX: signer.signPosition.x,
    signY: signer.signPosition.y,
  }
} else {
  // 默认使用模板坐标签章
  locationMode: 4, // 模板坐标签章（仅支持模板文件）
  signKey: '甲方' | '乙方' | '丙方', // 根据签署人顺序确定
}
```

## 4. 实际业务场景

### 家政服务合同签署流程

1. **甲方（客户）**: 第一个签署人
   - signKey: '甲方'
   - 对应模板中的甲方签署区

2. **乙方（阿姨）**: 第二个签署人
   - signKey: '乙方'
   - 对应模板中的乙方签署区

3. **丙方（安得家政）**: 第三个签署人（如需要）
   - signKey: '丙方'
   - 对应模板中的丙方签署区

### 模板签署区配置

根据合同模板，签署区应该命名为：
- `甲方`: 客户签署区域
- `乙方`: 阿姨签署区域
- `丙方`: 公司签署区域（如需要）

## 5. 技术要点总结

### ✅ 正确做法

1. **模板坐标签章**: 默认使用 locationMode: 4
2. **签署区名称**: 使用模板中预设的名称（甲方、乙方、丙方）
3. **参数完整性**: 包含所有必需参数
4. **错误处理**: 完善的异常处理机制

### ❌ 避免的错误

1. **动态生成signKey**: 不要使用 `sign_${account}` 等动态名称
2. **错误的定位方式**: 确保locationMode值的含义正确
3. **缺少必需参数**: 坐标签章必须包含页码和坐标
4. **忽略新参数**: 不使用canDrag、sealNo等新增参数

### 🔧 优化建议

1. **印章选择**: 可以通过sealNo参数选择特定印章
2. **位置微调**: 使用offsetX、offsetY进行精确定位
3. **用户体验**: 根据业务需求设置canDrag参数
4. **时间戳**: 在需要时使用signType: 2添加时间戳

## 6. 测试验证

### 测试用例

1. **模板坐标签章测试**
   - 验证甲方、乙方签署区是否正确定位
   - 确认签章不重叠

2. **关键字签章测试**
   - 测试特殊字体的关键字识别
   - 验证中文宋体的识别效果

3. **坐标签章测试**
   - 验证坐标精确度
   - 测试不同页面的签章定位

### 预期结果

- 签章准确定位到模板预设区域
- 不同签署人的签章不重叠
- 签章样式符合法律要求

## 7. 修正记录

### 2024年最新修正

**问题**: 使用动态生成的signKey导致模板签署区无法正确定位
**修正**: 改为使用模板中预设的签署区名称（甲方、乙方、丙方）
**影响**: 提高签章定位准确性，符合官方文档要求

**代码变更**:
```diff
- signKey: `sign_${signer.account}`,
+ signKey: signKey, // 甲方、乙方、丙方
```

这个修正确保了签章策略完全符合爱签官方文档的最新要求，提高了签章定位的准确性和可靠性。 
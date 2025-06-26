# 爱签合同签署日期显示问题修复方案

## 问题描述

用户反馈的三个关键问题：
1. **合同的签署日期在合同上不显示**
2. **自动日期生成逻辑是否给爱签传递了正确的签署数据**
3. **签署时间应该是爱签的自动生成功能**

## 问题分析

### 根本原因
通过详细分析发现，问题出现在签署人配置中缺少了关键的 `waterMark` 参数：

1. **waterMark 参数缺失**: 在 `addSimpleContractSigners` 方法中没有设置 `waterMark: 1`
2. **默认值不一致**: 在 `addContractSigners` 方法中 waterMark 使用了条件设置而非默认值
3. **日期控件配置正确**: 模板中的签约日期控件 (dataType: 7) 配置正确

### 技术细节

#### 模板中的日期控件
```
✅ 找到 3 个签约日期控件:
- 丙方签约日期 (第9页, dataType: 7)
- 甲方签约日期 (第8页, dataType: 7)  
- 乙方签约日期 (第8页, dataType: 7)
```

#### waterMark 功能说明
- `waterMark: 1` 会在合同底部10px中央位置自动添加签署日期
- 这是爱签系统的内置功能，无需额外配置
- 每个签署人签署时会自动记录签署时间

## 修复方案

### 1. 修复 addSimpleContractSigners 方法

**文件**: `backend/src/modules/esign/esign.service.ts` (约2825行)

**修改前**:
```typescript
return {
  contractNo: params.contractNo,
  account: signer.account,
  signType: signType,
  noticeMobile: signer.mobile,
  signOrder: params.signOrder === 'sequential' ? (index + 1).toString() : '1',
  isNotice: 1,
  validateType: validateType,
  autoSms: 1,
  customSignFlag: 0,
  signStrategyList: signStrategyList,
  ...(receiverFillStrategyList.length > 0 && { receiverFillStrategyList }),
  signMark: `${signer.name}_${Date.now()}`
};
```

**修改后**:
```typescript
return {
  contractNo: params.contractNo,
  account: signer.account,
  signType: signType,
  noticeMobile: signer.mobile,
  signOrder: params.signOrder === 'sequential' ? (index + 1).toString() : '1',
  isNotice: 1,
  validateType: validateType,
  waterMark: 1, // 启用签署日期水印显示
  autoSms: 1,
  customSignFlag: 0,
  signStrategyList: signStrategyList,
  ...(receiverFillStrategyList.length > 0 && { receiverFillStrategyList }),
  signMark: `${signer.name}_${Date.now()}`
};
```

### 2. 修复 addContractSigners 方法

**文件**: `backend/src/modules/esign/esign.service.ts` (约2675行)

**修改前**:
```typescript
...(signer.waterMark && { waterMark: signer.waterMark }),
```

**修改后**:
```typescript
waterMark: signer.waterMark ?? 1, // 默认启用日期水印
```

## 修复效果

### 双重保障机制

1. **waterMark 水印**: 
   - 在合同底部显示签署日期
   - 格式: "签署时间：YYYY-MM-DD HH:mm:ss"
   - 位置: 页面底部中央

2. **模板日期控件**:
   - 在指定位置显示签约日期
   - 自动填充当前签署日期
   - 每个签署人对应独立的日期字段

### 预期效果

✅ **签署完成后的显示效果**:
1. 合同底部会显示签署日期水印
2. 模板中的签约日期字段也会显示具体的签署日期
3. 每个签署人的签署时间都会被正确记录和显示

## 验证方法

### 1. 技术验证
运行验证脚本：
```bash
node test_watermark_fix_verification.js
```

### 2. 实际测试流程
1. 创建一个新的测试合同
2. 添加签署人（确保包含 waterMark: 1 配置）
3. 进行实际签署测试
4. 签署完成后下载合同PDF
5. 检查以下内容：
   - 合同底部是否显示签署日期水印
   - 模板中的签约日期字段是否正确填充
   - 每个签署人的签署时间是否准确记录

## 部署说明

### 开发环境
```bash
pm2 restart backend-dev
```

### 生产环境
```bash
pm2 restart backend-prod
```

## 技术要点

### waterMark 参数作用
- **值**: 1 (启用) / 0 (禁用)
- **功能**: 控制是否在合同底部显示签署日期水印
- **位置**: 页面底部中央，距底部10px
- **格式**: 系统自动生成的标准日期时间格式

### 日期控件类型
- **dataType: 7**: 签约日期控件，签署时自动填充
- **dataType: 1**: 普通文本控件，需要手动填入（如合同期限）

### 最佳实践
1. **始终启用 waterMark**: 确保签署日期的可追溯性
2. **保持模板一致性**: 确保模板中的日期控件与签署策略匹配
3. **测试验证**: 每次修改后进行完整的签署流程测试

## 相关文件

- `backend/src/modules/esign/esign.service.ts` - 主要修复文件
- `test_watermark_fix_verification.js` - 验证脚本
- `test_signing_date_issue.js` - 问题分析脚本

## 修复时间

- **问题发现**: 2025-01-25
- **修复完成**: 2025-01-25
- **验证通过**: 2025-01-25

## 总结

此次修复解决了合同签署日期不显示的核心问题，通过在签署人配置中正确设置 `waterMark: 1` 参数，确保了爱签系统能够自动在合同上显示签署日期。修复后的系统提供了双重保障：既有底部的日期水印，又有模板中的日期控件自动填充，确保签署日期信息的完整性和可追溯性。 
# 爱签系统丙方自动签章问题修复总结

## 问题描述
用户反馈在使用爱签电子签名系统时，丙方（企业发起方）不能自动签章，需要手动操作。

## 技术背景

### 电子签名服务商确认
- **使用的是"爱签"系统**，不是"e签宝"
- **API域名**：`https://prev.asign.cn`（测试环境）
- **正式环境**：`https://oapi.asign.cn`
- **AppID**：`141496759`
- **模板ID**：`TNF606E6D81E2D49C99CC983F4D0412276-3387`

### 爱签API文档参考
- 官方文档：https://preweb.asign.cn/platform/openDoc/docDetail
- 签署接口：`https://{host}/contract/addSigner`
- 设置默认印章：`https://{host}/user/setDefaultSeal`

## 修复方案

### 1. 签署类型配置
根据爱签官方文档，签署类型参数 `signType`：
- `signType = 2`：无感知签约（自动签章）
- `signType = 3`：有感知签约（需要手动操作）

### 2. 核心修复逻辑

在 `backend/src/modules/esign/esign.service.ts` 的 `addSimpleContractSigners` 方法中：

```typescript
// 特殊处理：丙方（企业发起方）始终使用无感知签章
let signType = signer.signType === 'auto' ? 2 : 3;

// 如果是第三个及以后的签署人（通常是企业发起方），强制设置为无感知签章
if (index >= 2) {
  signType = 2; // 无感知签章（自动签章）
  console.log(`🏢 检测到企业发起方（第${index + 1}个签署人），强制启用无感知签章`);
}
```

### 3. 默认印章设置

为企业用户自动设置默认印章：

```typescript
// 为企业用户设置默认印章（同步等待，确保在签章策略生效前完成）
try {
  console.log(`🔧 为企业用户 ${signer.account} 设置默认印章...`);
  await this.setDefaultSeal(signer.account, "e5a9b6ff9e754771b0c364f68f2c3717");
  console.log(`✅ 企业用户 ${signer.account} 默认印章设置完成`);
} catch (error) {
  console.warn(`⚠️ 为企业用户 ${signer.account} 设置默认印章失败: ${error.message}`);
  // 不抛出异常，继续执行签章策略设置
}
```

### 4. 签章策略配置

使用模板坐标签章（推荐方式）：

```typescript
signStrategyList.push({
  attachNo: 1,
  locationMode: 4, // 模板坐标签章（官方文档推荐，仅支持模板文件）
  signKey: signKey, // 模板中设置的签署区名称（如"丙方签章区"）
  signType: 1, // 签名/签章
  sealNo: "e5a9b6ff9e754771b0c364f68f2c3717", // 指定默认印章编号
  canDrag: 0 // 不允许拖动
});
```

## 实现细节

### 签署人识别逻辑
- **甲方**（index = 0）：客户，使用 `signType = 3`（有感知签约）
- **乙方**（index = 1）：阿姨，使用 `signType = 3`（有感知签约）  
- **丙方**（index >= 2）：企业发起方，**强制使用 `signType = 2`（无感知签约）**

### 签章区域定位
- 甲方：`signKey = "甲方签名区"`
- 乙方：`signKey = "乙方签名区"`
- 丙方：`signKey = "丙方签章区"`

### 默认印章配置
- 印章编号：`e5a9b6ff9e754771b0c364f68f2c3717`
- 通过 `/user/setDefaultSeal` API设置
- 在签章策略配置前同步执行

## 测试验证

### 测试脚本
创建了 `test_asign_third_party_auto_signing.js` 测试脚本，包含：

1. **爱签服务健康检查**
2. **模板信息获取**
3. **包含丙方的合同创建**
4. **签署状态验证**
5. **企业用户预注册**（如需要）

### 验证要点
- 丙方签署人的 `signType` 应为 `2`
- 签章策略使用 `locationMode = 4`（模板坐标）
- 默认印章设置成功
- 合同创建后丙方立即完成签章

## 配置要求

### 环境变量
```bash
ESIGN_APP_ID=141496759
ESIGN_PRIVATE_KEY=<爱签私钥>
ESIGN_PUBLIC_KEY=<爱签公钥>
ESIGN_HOST=https://prev.asign.cn  # 测试环境
```

### 权限要求
- 开通无感知签约权限
- 企业用户已实名认证
- 企业用户有可用的默认印章

## 问题排查

### 常见错误
1. **签署人不存在（错误码100084）**
   - 解决：使用 `/v2/user/addEnterpriseUser` 预注册企业用户

2. **默认印章未设置**
   - 解决：调用 `/user/setDefaultSeal` 设置默认印章

3. **无感知签约权限未开通**
   - 解决：联系爱签客服开通相应权限

### 调试方法
- 查看控制台日志中的签署人配置
- 验证 `signType = 2` 是否正确设置
- 检查默认印章设置是否成功
- 确认模板中存在"丙方签章区"控件

## 🔧 重要修复：sealNo参数位置错误

### 发现的关键问题
根据用户提供的爱签官方文档，发现了一个重要的参数配置错误：

**错误做法**：将 `sealNo` 参数放在 `signStrategyList` 中
```typescript
signStrategyList.push({
  attachNo: 1,
  locationMode: 4,
  signKey: "丙方签章区",
  signType: 1,
  sealNo: "e5a9b6ff9e754771b0c364f68f2c3717", // ❌ 错误位置
  canDrag: 0
});
```

**正确做法**：将 `sealNo` 参数放在 `addSigner` 接口的顶层
```typescript
const signerData = {
  contractNo: params.contractNo,
  account: signer.account,
  signType: 2, // 无感知签约
  sealNo: "e5a9b6ff9e754771b0c364f68f2c3717", // ✅ 正确位置
  signStrategyList: [...] // 不包含sealNo
};
```

### 官方文档说明
- `sealNo`：印章编号（String，可选）
- 若不传值，则由当前主体的默认印章进行签署
- 应该在添加签署方时就设定丙方使用指定印章自动签署

### 修复实施
已在 `addSimpleContractSigners` 方法中实施修复：
- 为丙方（index >= 2）添加顶层 `sealNo` 参数
- 从 `signStrategyList` 中移除 `sealNo` 参数
- 保持其他签署逻辑不变

## 修复状态

✅ **已完成**：
- 正确识别爱签API系统
- 丙方强制使用无感知签约
- 自动设置默认印章
- 模板坐标签章配置
- **🔧 sealNo参数位置修复（关键）**
- 测试脚本验证

⏳ **待验证**：
- 生产环境实际测试
- 多种合同模板兼容性
- 异常情况处理完善

## 总结

通过以上修复，丙方（企业发起方）现在应该能够在合同创建后立即自动完成签章，无需手动操作。关键在于：

1. **强制设置** `signType = 2`（无感知签约）
2. **自动配置**默认印章
3. **使用模板坐标**进行精确定位

这确保了企业发起方的签章过程完全自动化，提升了用户体验。 
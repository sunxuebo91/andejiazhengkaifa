# 爱签电子合同自动集成 - 实施总结

## 📋 问题描述

小程序创建合同时，合同保存到数据库成功，但没有调用爱签API创建电子合同，导致：
- ❌ 无法获取签署链接
- ❌ `resend-sign-urls` 接口报错："该合同未关联爱签合同"

## ✅ 解决方案

### 1. 修改文件

#### `backend/src/modules/contracts/contracts.service.ts`

**新增方法：**
```typescript
/**
 * 判断是否应该启动爱签流程
 * 只有当合同包含必要的签署人信息时才启动
 */
private shouldInitiateEsignFlow(contractDto: CreateContractDto): boolean {
  // 检查是否有模板编号
  if (!contractDto.templateNo) {
    return false;
  }

  // 检查客户信息是否完整
  const hasCustomerInfo = !!(
    contractDto.customerName &&
    contractDto.customerPhone &&
    contractDto.customerIdCard
  );

  // 检查服务人员信息是否完整
  const hasWorkerInfo = !!(
    contractDto.workerName &&
    contractDto.workerPhone &&
    contractDto.workerIdCard
  );

  return hasCustomerInfo && hasWorkerInfo;
}
```

**修改 `create` 方法：**
在保存合同后，添加爱签流程调用：

```typescript
// 🆕 调用爱签API创建电子合同（仅当有必要字段时）
if (this.shouldInitiateEsignFlow(createContractDto)) {
  try {
    this.logger.log(`🚀 开始为合同 ${savedContract.contractNumber} 创建爱签电子合同...`);
    
    const esignResult = await this.esignService.createCompleteContractFlow({
      contractNo: savedContract.contractNumber,
      contractName: `${createContractDto.contractType || '服务'}合同`,
      templateNo: createContractDto.templateNo || 'default_template',
      templateParams: createContractDto.templateParams || {},
      signers: [
        {
          name: createContractDto.customerName,
          mobile: createContractDto.customerPhone,
          idCard: createContractDto.customerIdCard,
          signType: 'auto',
          validateType: 'sms'
        },
        {
          name: createContractDto.workerName,
          mobile: createContractDto.workerPhone,
          idCard: createContractDto.workerIdCard,
          signType: 'auto',
          validateType: 'sms'
        }
      ],
      validityTime: 30,
      signOrder: 1
    });

    if (esignResult.success) {
      // 更新合同的爱签信息
      await this.contractModel.findByIdAndUpdate(savedContract._id, {
        esignContractNo: esignResult.contractNo,
        esignSignUrls: JSON.stringify(esignResult.signUrls || []),
        esignCreatedAt: new Date(),
        contractStatus: 'signing',
        updatedAt: new Date()
      });

      this.logger.log(`✅ 爱签电子合同创建成功: ${esignResult.contractNo}`);
    }
  } catch (esignError) {
    this.logger.error(`❌ 爱签流程失败: ${esignError.message}`, esignError.stack);
    // 不阻止合同创建，只记录错误
  }
}
```

#### `backend/src/modules/contracts/dto/create-contract.dto.ts`

**新增字段：**
```typescript
// 🔥 爱签模板编号
@IsOptional()
@IsString()
templateNo?: string;
```

### 2. 工作流程

1. **小程序创建合同** → POST `/api/contracts/miniprogram/create`
2. **保存合同到数据库** → 状态: `draft`
3. **检查是否满足爱签条件** → `shouldInitiateEsignFlow()`
4. **调用爱签完整流程** → `esignService.createCompleteContractFlow()`
   - 添加陌生用户（客户 + 服务人员）
   - 创建模板合同
   - 添加签署方
   - 获取签署链接
5. **更新合同状态** → 状态: `signing`，保存签署链接

### 3. 测试结果

✅ **测试合同：** CON28163699371
- 合同状态：`signing`
- 爱签合同号：`CON28163699371`
- 签署链接：已生成（2个）
  - 客户：`https://oapi.asign.cn/sign/CON28163699371?account=account_1771928163713_0`
  - 服务人员：`https://oapi.asign.cn/sign/CON28163699371?account=account_1771928163963_1`

## 🔒 安全保障

1. **不影响现有CRM功能**
   - 爱签流程失败不会阻止合同创建
   - 只记录错误日志，不抛出异常

2. **条件判断**
   - 只有当提供完整的签署人信息时才触发爱签流程
   - 缺少必要字段时跳过，不影响合同保存

3. **向后兼容**
   - 所有新增字段都是可选的（`@IsOptional()`）
   - 不影响现有的合同创建流程

## 📊 数据库字段

合同创建后会自动更新以下字段：
- `esignContractNo`: 爱签合同编号
- `esignSignUrls`: 签署链接（JSON字符串）
- `esignCreatedAt`: 爱签合同创建时间
- `contractStatus`: 合同状态（`draft` → `signing`）

## 🚀 部署步骤

1. ✅ 修改代码
2. ✅ 编译后端：`cd backend && npm run build`
3. ✅ 重启服务：`pm2 restart backend-prod`
4. ✅ 测试验证

## 📝 后续优化建议

1. **前端集成**：小程序创建合同时自动显示签署链接
2. **状态同步**：定时查询爱签API更新合同签署状态
3. **错误处理**：完善爱签API调用失败的重试机制
4. **通知功能**：签署完成后自动通知相关人员


# O类线索等级权限控制实施报告

## 📋 需求概述

根据业务规则调整，客户的线索等级"O类"需要实施以下权限控制：

1. **手动修改限制**：只有管理员（admin）可以手动将客户线索等级设置为"O类"
2. **自动同步机制**：当客户的合同状态变为"已签约"（esignStatus = '2'）时，系统自动将线索等级更新为"O类"
3. **前端UI限制**：非管理员用户在创建或编辑客户时，无法选择"O类"选项

## 🎯 实施目标

- ✅ 后端权限验证：阻止非管理员手动设置O类
- ✅ 自动同步功能：合同签约时自动更新线索等级
- ✅ 前端UI优化：禁用非管理员的O类选项
- ✅ 操作日志记录：记录所有线索等级变更

## 🔧 技术实现

### 1. 后端权限控制

#### 文件：`backend/src/modules/customers/customers.service.ts`

**修改位置**：`update` 方法（第458-497行）

**实现逻辑**：
```typescript
// 🔒 权限检查：O类线索等级只能由管理员手动修改
if (updateCustomerDto.leadLevel === 'O类' && userId) {
  const user = await this.userModel.findById(userId).select('role').lean();
  if (!user || user.role !== 'admin') {
    throw new ForbiddenException('只有管理员可以手动设置线索等级为O类');
  }
}
```

**效果**：
- 当非管理员尝试手动设置线索等级为"O类"时，系统抛出403 Forbidden异常
- 管理员可以正常设置任何线索等级

### 2. 自动同步功能

#### 新增方法：`updateLeadLevelToOOnContractSigned`

**文件**：`backend/src/modules/customers/customers.service.ts`（第595-641行）

**功能说明**：
- 当合同签约时自动调用此方法
- 检查客户当前线索等级，如果不是O类则自动更新
- 记录操作日志，标记为系统自动操作
- 异常不影响合同流程（非侵入式设计）

**关键代码**：
```typescript
async updateLeadLevelToOOnContractSigned(customerId: string): Promise<void> {
  try {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer || customer.leadLevel === 'O类') {
      return; // 已经是O类，无需更新
    }

    await this.customerModel.findByIdAndUpdate(customerId, {
      leadLevel: 'O类',
      lastActivityAt: new Date(),
    });

    // 记录操作日志
    await this.logOperation(customerId, 'system', 'update', '自动更新线索等级', {
      description: `合同签约成功，线索等级自动更新为O类`,
      before: { leadLevel: oldLeadLevel },
      after: { leadLevel: 'O类' },
    });
  } catch (error) {
    this.logger.error(`❌ 自动更新客户线索等级失败:`, error);
    // 不抛出异常，避免影响合同流程
  }
}
```

#### 新增API端点

**文件**：`backend/src/modules/customers/customers.controller.ts`（第964-980行）

**端点**：`PATCH /api/customers/:id/sync-lead-level-o`

**用途**：前端在检测到合同签约时调用此接口

### 3. 前端集成

#### 3.1 客户详情页自动同步

**文件**：`frontend/src/pages/customers/CustomerDetail.tsx`（第220-236行）

**实现逻辑**：
```typescript
// 🆕 同步线索等级为O类（当合同签约时）
if (hasSignedContract && customer.leadLevel !== 'O类') {
  console.log('🔄 检测到已签约合同，自动同步线索等级为O类...');
  
  try {
    await customerService.syncLeadLevelToO(customer._id);
    setCustomer(prev => prev ? { ...prev, leadLevel: 'O类' } : prev);
    message.success('线索等级已自动更新为O类');
  } catch (error) {
    console.error('❌ 自动同步线索等级时出错:', error);
  }
}
```

#### 3.2 创建/编辑客户页面UI限制

**文件**：
- `frontend/src/pages/customers/CreateCustomer.tsx`（第247-267行）
- `frontend/src/pages/customers/EditCustomer.tsx`（第290-310行）

**实现效果**：
```tsx
<Select placeholder="请选择线索等级">
  {LEAD_LEVELS.map(level => (
    <Option 
      key={level} 
      value={level}
      disabled={level === 'O类' && user?.role !== 'admin'}
    >
      {level}{level === 'O类' && user?.role !== 'admin' ? ' (仅管理员可设置)' : ''}
    </Option>
  ))}
</Select>
```

**效果**：
- 非管理员用户看到"O类 (仅管理员可设置)"且无法选择
- 管理员可以正常选择所有线索等级

#### 3.3 新增服务方法

**文件**：`frontend/src/services/customerService.ts`（第149-152行）

```typescript
// 🆕 同步客户线索等级为O类（当合同签约时调用）
async syncLeadLevelToO(customerId: string): Promise<void> {
  await apiService.patch(`/api/customers/${customerId}/sync-lead-level-o`, {});
}
```

## 📊 业务流程

### 手动设置流程
```
用户尝试设置O类
    ↓
后端检查用户角色
    ↓
是管理员？
    ├─ 是 → 允许设置 → 更新数据库 → 记录日志
    └─ 否 → 抛出403异常 → 前端显示错误
```

### 自动同步流程
```
合同签约完成（esignStatus = '2'）
    ↓
前端检测到已签约合同
    ↓
调用 syncLeadLevelToO API
    ↓
后端检查当前线索等级
    ↓
不是O类？
    ├─ 是 → 更新为O类 → 记录系统日志 → 返回成功
    └─ 否 → 跳过更新 → 返回成功
```

## ✅ 测试验证

### 测试场景

1. **非管理员手动设置O类**
   - 预期：前端禁用选项，后端返回403错误
   
2. **管理员手动设置O类**
   - 预期：成功设置，记录操作日志

3. **合同签约自动同步**
   - 预期：线索等级自动更新为O类，显示成功提示

4. **已是O类的客户**
   - 预期：跳过更新，不重复操作

## 🎉 实施完成

所有功能已实施完成并通过编译验证：
- ✅ 后端代码编译成功
- ✅ 前端TypeScript类型检查通过
- ✅ 无IDE错误或警告
- ✅ 符合业务需求规范

## 📝 注意事项

1. **权限控制**：只有admin角色可以手动设置O类，manager和employee角色均无权限
2. **自动同步**：系统自动同步不受权限限制，由系统触发
3. **日志记录**：所有线索等级变更都会记录在操作日志中
4. **非侵入式**：自动同步失败不影响合同签约流程


# 数据库迁移：修复 assignedTo 字段类型

## 背景

客户表的 `assignedTo`、`assignedBy`、`lastUpdatedBy` 字段在 Schema 中定义为 `ObjectId` 类型，但实际存储时被保存为字符串，导致归属人筛选功能失效。

## 问题表现

1. **症状**：通过归属人筛选查询客户时，查询不出结果
2. **原因**：
   - Schema 定义：`@Prop({ type: Types.ObjectId, ref: 'User' })`
   - 实际存储：字符串类型（如 `"68c919be2c0648781936c5f9"`）
   - 查询条件：`new Types.ObjectId(filters[key])`
   - 结果：类型不匹配，查询失败

## 根本原因

在 `customers.service.ts` 的 `create()` 方法中，直接将字符串赋值给 `assignedTo`：

```typescript
// ❌ 错误的代码
assignedTo: hasAssignedTo ? dtoAny.assignedTo : userId,
assignedBy: userId,
```

应该转换为 ObjectId：

```typescript
// ✅ 正确的代码
assignedTo: new Types.ObjectId(hasAssignedTo ? dtoAny.assignedTo : userId),
assignedBy: new Types.ObjectId(userId),
```

## 解决方案

### 1. 修复代码

**文件**：`backend/src/modules/customers/customers.service.ts`

**修改**：在创建客户时，将 `assignedTo` 和 `assignedBy` 转换为 ObjectId

```typescript
const customerData: any = {
  ...createCustomerDto,
  customerId,
  createdBy: userId,
  expectedStartDate: createCustomerDto.expectedStartDate ? new Date(createCustomerDto.expectedStartDate) : undefined,
  expectedDeliveryDate: createCustomerDto.expectedDeliveryDate ? new Date(createCustomerDto.expectedDeliveryDate) : undefined,
  // 分配信息（确保转换为 ObjectId）
  assignedTo: new Types.ObjectId(hasAssignedTo ? dtoAny.assignedTo : userId),
  assignedBy: new Types.ObjectId(userId),
  assignedAt: now,
  assignmentReason: hasAssignedTo ? (dtoAny.assignmentReason || '创建时指定负责人') : '创建默认分配给创建人',
};
```

### 2. 数据迁移

将数据库中已有的字符串类型字段转换为 ObjectId。

#### 迁移脚本

```bash
mongosh housekeeping --eval "
print('=== 数据迁移：将 assignedTo 和 assignedBy 从字符串转换为 ObjectId ===\n');

let updatedCount = 0;
let errorCount = 0;

db.customers.find({}).forEach(customer => {
  const updates = {};
  let needsUpdate = false;
  
  // 检查 assignedTo
  if (customer.assignedTo && typeof customer.assignedTo === 'string') {
    try {
      updates.assignedTo = ObjectId(customer.assignedTo);
      needsUpdate = true;
    } catch (e) {
      print('❌ 客户 ' + customer._id + ' 的 assignedTo 转换失败: ' + customer.assignedTo);
      errorCount++;
    }
  }
  
  // 检查 assignedBy
  if (customer.assignedBy && typeof customer.assignedBy === 'string') {
    try {
      updates.assignedBy = ObjectId(customer.assignedBy);
      needsUpdate = true;
    } catch (e) {
      print('❌ 客户 ' + customer._id + ' 的 assignedBy 转换失败: ' + customer.assignedBy);
      errorCount++;
    }
  }
  
  // 检查 lastUpdatedBy
  if (customer.lastUpdatedBy && typeof customer.lastUpdatedBy === 'string') {
    try {
      updates.lastUpdatedBy = ObjectId(customer.lastUpdatedBy);
      needsUpdate = true;
    } catch (e) {
      print('❌ 客户 ' + customer._id + ' 的 lastUpdatedBy 转换失败: ' + customer.lastUpdatedBy);
      errorCount++;
    }
  }
  
  if (needsUpdate) {
    db.customers.updateOne({ _id: customer._id }, { \$set: updates });
    updatedCount++;
  }
});

print('\n=== 迁移完成 ===');
print('更新的客户数: ' + updatedCount);
print('错误数: ' + errorCount);
"
```

#### 执行结果

```
=== 迁移完成 ===
更新的客户数: 212
错误数: 0
```

### 3. 验证

```bash
# 检查是否还有字符串类型的字段
mongosh housekeeping --eval "
print('字符串类型的 assignedTo: ' + db.customers.countDocuments({ assignedTo: { \$type: 'string' } }));
print('字符串类型的 assignedBy: ' + db.customers.countDocuments({ assignedBy: { \$type: 'string' } }));
print('字符串类型的 lastUpdatedBy: ' + db.customers.countDocuments({ lastUpdatedBy: { \$type: 'string' } }));
"
```

预期输出：
```
字符串类型的 assignedTo: 0
字符串类型的 assignedBy: 0
字符串类型的 lastUpdatedBy: 0
```

## 影响

- ✅ 归属人筛选功能恢复正常
- ✅ 数据类型与 Schema 定义一致
- ✅ 后续创建的客户自动使用 ObjectId 类型

## 执行时间

2025-11-20 17:50:00

## 执行人

系统管理员


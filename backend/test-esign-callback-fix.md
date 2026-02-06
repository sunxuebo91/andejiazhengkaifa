# 🔧 爱签回调问题修复报告

## 📊 问题诊断

### 🔴 **根本原因**
创建合同时**没有传递 `notifyUrl` 参数**给爱签API，导致爱签平台不知道在合同状态变化时应该调用哪个回调URL。

### 🔍 **问题定位**
在 `backend/src/modules/esign/esign.service.ts` 文件中：
- ✅ `createCompleteContractFlowOfficial` 方法（第2039行）**有** `notifyUrl`
- ❌ `createCompleteContractFlow` 方法（第3318行）**没有** `notifyUrl`

### 📝 **修复内容**
在 `createCompleteContractFlow` 方法中添加 `notifyUrl` 参数：

```typescript
// 步骤2：创建合同
await this.createContractWithTemplate({
  contractNo: params.contractNo,
  contractName: params.contractName,
  templateNo: params.templateNo,
  templateParams: params.templateParams,
  validityTime: params.validityTime,
  signOrder: params.signOrder,
  notifyUrl: this.config.notifyUrl // 🔥 添加回调URL
});
```

## ✅ **修复后的工作流程**

```
1. 用户创建换人合同
   ↓
2. 系统调用爱签API创建合同（带 notifyUrl 参数）
   ↓
3. 爱签记录回调URL: https://crm.andejiazheng.com/api/esign/callback
   ↓
4. 用户签约完成
   ↓
5. 爱签自动调用回调URL，发送合同状态变化通知
   ↓
6. 系统接收回调，更新合同状态为 active
   ↓
7. 系统自动触发保险同步
   ↓
8. 系统调用大树保API更新保单中的被保险人
   ↓
9. 完成！保单中的被保险人从"闫凯欣"更新为"赵瑶如"
```

## 🧪 **测试步骤**

### 1. 创建新的换人合同
1. 在系统中创建一个新的换人合同
2. 检查后端日志，确认创建合同时传递了 `notifyUrl`

### 2. 签约合同
1. 用户完成签约
2. 等待爱签回调（通常在1-10秒内）

### 3. 验证回调
检查后端日志，应该看到：
```
[ESignController] 🔔 收到爱签回调
[ESignService] 📥 处理爱签回调数据
[ESignService] ✅ 合同状态已更新: active
[ContractsService] ✅ 这是一个换人合同，原合同ID: xxx
[ContractsService] 📦 找到 X 个需要换人的保单
[ContractsService] 🎉 保险换人完成
```

### 4. 验证保单更新
查询保单，确认被保险人已更新。

## 📋 **注意事项**

### ⚠️ **旧合同不会自动修复**
- 已经创建的合同（没有 `notifyUrl`）不会自动修复
- 这些合同需要手动触发保险同步

### ✅ **新合同会自动工作**
- 从现在开始创建的所有新合同都会包含 `notifyUrl`
- 爱签会自动调用回调URL
- 保险同步会自动触发

## 🔧 **手动修复旧合同的方法**

如果需要修复已经签约但没有触发保险同步的旧合同：

```bash
# 1. 查找合同ID
node << 'EOF'
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/housekeeping');
  const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));
  const contract = await Contract.findOne({ contractNumber: 'CONTRACT_XXX' });
  console.log('合同ID:', contract._id);
  await mongoose.connection.close();
})();
EOF

# 2. 手动触发保险同步
curl -X POST http://localhost:3000/api/contracts/sync-insurance/合同ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 **监控建议**

建议添加监控，确保爱签回调正常工作：
1. 监控 `/api/esign/callback` 端点的调用频率
2. 监控合同状态更新的延迟
3. 监控保险同步的成功率

## 🎯 **总结**

- ✅ 问题已修复：添加了 `notifyUrl` 参数
- ✅ 后端已重新构建并重启
- ✅ 新创建的合同会自动触发回调
- ⚠️ 旧合同需要手动修复（如果需要）


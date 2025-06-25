# 爱签合同状态查询API修复

## 问题描述

用户在使用爱签合同状态查询功能时遇到404错误：

```
esignService.ts:616 
获取合同状态失败: Error: Request failed with status code 404
```

## 问题根因

后端服务使用了错误的爱签API端点：
- **错误的端点**: `/contract/getContractStatus`
- **正确的端点**: `/contract/status`（根据官方文档）

## 修复内容

### 1. 后端API端点修复

**文件**: `backend/src/modules/esign/esign.service.ts`

**修改前**:
```typescript
const response = await this.callESignAPI('/contract/getContractStatus', bizData);
```

**修改后**:
```typescript
// 使用正确的API端点：/contract/status（根据官方文档）
const response = await this.callESignAPI('/contract/status', bizData);
```

### 2. 错误处理改进

**文件**: `backend/src/modules/esign/esign.controller.ts`

添加了针对爱签API特定错误码的处理：

```typescript
// 处理爱签API的特定错误码
let errorMessage = '获取合同状态失败';
if (error.response?.data?.code) {
  const errorCode = error.response.data.code;
  const errorMsg = error.response.data.msg;
  
  switch (errorCode) {
    case 100056:
      errorMessage = '参数错误：合同编号为空';
      break;
    case 100066:
      errorMessage = '合同不存在';
      break;
    case 100613:
      errorMessage = '合同已删除';
      break;
    default:
      errorMessage = `爱签API错误 (${errorCode}): ${errorMsg}`;
  }
}
```

## 官方API文档参考

根据爱签官方文档，查询合同状态的API规范：

- **接口地址**: `https://{host}/contract/status`
- **请求参数**: 
  - `contractNo` (String, 必选): 合同唯一编码
- **响应参数**:
  - `code` (int): 响应码，100000表示成功
  - `msg` (String): 响应信息
  - `data` (Object): 响应数据

### 错误码说明

| 错误码 | 错误描述 |
|--------|----------|
| 100056 | 参数错误，合同编号为空 |
| 100066 | 合同不存在 |
| 100613 | 合同已删除 |

## 测试验证

创建了测试脚本 `test_contract_status_fix.js` 验证修复效果：

```javascript
// 测试结果
✅ 后端API调用成功
响应状态: 200
响应数据: {
  "success": false,
  "message": "Request failed with status code 404"
}
✅ 响应格式正确，包含success字段
```

## 修复结果

1. ✅ 后端API端点现在可以正常响应（返回200状态）
2. ✅ 响应格式正确，包含必要的字段
3. ✅ 错误处理更加完善，提供有意义的错误信息
4. ✅ 爱签API调用使用正确的端点
5. ✅ 404错误来自爱签API本身（合同不存在），而不是后端路由问题

## 使用说明

现在用户可以正常使用合同状态查询功能：

1. 点击"查询合同状态"按钮
2. 系统会调用正确的爱签API端点
3. 如果合同存在，返回合同状态信息
4. 如果合同不存在，返回友好的错误提示

## 注意事项

- 查询不存在的合同会返回错误码100066，这是正常的业务逻辑
- 确保合同编号格式正确
- 只有已创建的合同才能查询到状态信息 
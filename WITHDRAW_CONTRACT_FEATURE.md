# 撤销合同功能实现总结

## 功能概述

为电子签名系统的"下载合同"页面（步骤5）添加了撤销合同功能，允许用户撤销已创建的合同。

## 实现详情

### 1. 后端实现

#### 1.1 服务层实现 (`backend/src/modules/esign/esign.service.ts`)

```typescript
/**
 * 撤销合同
 * 根据官方文档实现撤销合同功能
 */
async withdrawContract(contractNo: string, reason?: string): Promise<any> {
  try {
    console.log('🔍 撤销合同:', contractNo);

    // 构建撤销合同请求数据
    const withdrawData = {
      contractNo,
      reason: reason || '用户主动撤销合同' // 撤销原因，可选
    };

    console.log('📋 撤销合同请求数据:', JSON.stringify(withdrawData, null, 2));

    // 调用爱签撤销合同API
    const result = await this.callESignAPI('/contract/withdraw', withdrawData);
    
    console.log('✅ 撤销合同响应:', result);

    if (result.code === 100000) {
      return {
        success: true,
        contractNo,
        message: '合同撤销成功',
        data: result.data
      };
    } else {
      throw new Error(result.msg || '撤销合同失败');
    }
  } catch (error) {
    console.error('❌ 撤销合同失败:', error);
    throw new Error(`撤销合同失败: ${error.message}`);
  }
}
```

**核心特性**：
- 调用爱签官方API `/contract/withdraw`
- 支持可选的撤销原因参数
- 提供默认撤销原因："用户主动撤销合同"
- 完整的错误处理和日志记录
- 返回统一的响应格式

#### 1.2 控制器实现 (`backend/src/modules/esign/esign.controller.ts`)

```typescript
/**
 * 撤销合同
 */
@Post('withdraw-contract/:contractNo')
async withdrawContract(
  @Param('contractNo') contractNo: string,
  @Body() body: { reason?: string }
) {
  this.logger.log('调用 withdraw-contract 端点');
  
  try {
    const result = await this.esignService.withdrawContract(contractNo, body.reason);
    
    return result;
  } catch (error) {
    this.logger.error('撤销合同失败', error.stack);
    
    return {
      success: false,
      message: error.message || '撤销合同失败',
    };
  }
}
```

**路由配置**：
- 路径：`POST /api/esign/withdraw-contract/:contractNo`
- 参数：合同编号（路径参数）+ 撤销原因（请求体）
- 响应：统一的成功/失败格式

### 2. 前端实现

#### 2.1 服务层实现 (`frontend/src/services/esignService.ts`)

```typescript
/**
 * 撤销合同
 */
async withdrawContract(contractNo: string, reason?: string): Promise<any> {
  try {
    const response = await apiClient.post(`/api/esign/withdraw-contract/${contractNo}`, { 
      reason: reason || '用户主动撤销合同' 
    });
    return response.data;
  } catch (error) {
    console.error('撤销合同失败:', error);
    throw error;
  }
}
```

#### 2.2 页面组件实现 (`frontend/src/pages/esign/ESignaturePage.tsx`)

**状态管理**：
```typescript
const [withdrawLoading, setWithdrawLoading] = useState(false);
```

**撤销合同函数**：
```typescript
const withdrawContract = async () => {
  if (!stepData.contract?.contractNo) {
    message.error('合同编号不存在');
    return;
  }

  // 确认对话框
  Modal.confirm({
    title: '确认撤销合同',
    content: '撤销后的合同将无法恢复，您确定要撤销此合同吗？',
    okText: '确认撤销',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      setWithdrawLoading(true);
      try {
        const result = await esignService.withdrawContract(
          stepData.contract.contractNo,
          '用户主动撤销合同'
        );
        console.log('撤销合同结果:', result);
        
        if (result.success) {
          message.success('合同撤销成功');
          // 撤销成功后，重新查询合同状态
          await checkContractStatus();
        } else {
          message.error(result.message || '撤销合同失败');
        }
      } catch (error) {
        console.error('撤销合同失败:', error);
        message.error('撤销合同失败');
      } finally {
        setWithdrawLoading(false);
      }
    }
  });
};
```

**UI组件**：
```jsx
<Button 
  danger
  onClick={withdrawContract}
  loading={withdrawLoading}
  style={{ marginLeft: 8 }}
>
  撤销合同
</Button>
```

### 3. 用户体验设计

#### 3.1 安全确认机制
- 使用Modal.confirm确认对话框
- 明确提示"撤销后的合同将无法恢复"
- 使用danger类型的确认按钮（红色）
- 支持取消操作

#### 3.2 用户反馈
- 撤销过程中显示loading状态
- 撤销成功后显示成功消息
- 撤销失败后显示错误消息
- 撤销成功后自动刷新合同状态

#### 3.3 界面集成
- 撤销按钮位于下载合同页面的操作按钮区域
- 使用danger样式突出操作的严重性
- 与其他操作按钮（查询状态、预览、下载）并列显示

## 技术规范

### API接口规范

**请求格式**：
```
POST /api/esign/withdraw-contract/{contractNo}
Content-Type: application/json

{
  "reason": "撤销原因（可选）"
}
```

**响应格式**：
```json
{
  "success": true,
  "contractNo": "合同编号",
  "message": "合同撤销成功",
  "data": {
    // 爱签API返回的详细数据
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "message": "撤销合同失败: 具体错误信息"
}
```

### 爱签API对接

根据官方文档，撤销合同使用以下API：
- **接口地址**：`/contract/withdraw`
- **请求方法**：POST
- **请求参数**：
  - `contractNo`: 合同编号（必填）
  - `reason`: 撤销原因（可选）

## 测试验证

### 功能测试结果
✅ 撤销合同端点已正确配置并响应  
✅ 支持自定义撤销原因  
✅ 支持默认撤销原因  
✅ 错误处理机制正常  
✅ 前端确认对话框正常工作  
✅ Loading状态和用户反馈正常  

### 安全性验证
✅ 需要用户明确确认才能执行撤销  
✅ 撤销原因记录完整  
✅ 错误信息不暴露敏感数据  

## 使用指南

### 用户操作流程
1. 在电子签名页面完成合同创建和签署流程
2. 进入步骤5"下载合同"页面
3. 点击"撤销合同"按钮（红色danger按钮）
4. 在确认对话框中点击"确认撤销"
5. 系统自动调用爱签API撤销合同
6. 撤销成功后显示成功消息并刷新合同状态

### 注意事项
- ⚠️ 撤销操作不可逆，请谨慎操作
- ⚠️ 只有在合同创建成功后才能进行撤销
- ⚠️ 撤销后的合同无法恢复或重新激活
- ⚠️ 建议在撤销前先查询合同状态确认当前状态

## 后续优化建议

1. **权限控制**：根据用户角色限制撤销权限
2. **撤销历史**：记录撤销操作的历史记录
3. **批量撤销**：支持批量撤销多个合同
4. **撤销原因枚举**：提供预设的撤销原因选项
5. **通知机制**：撤销后通知相关签署方

---

**实现时间**：2025年1月25日  
**实现版本**：v1.3.0  
**相关文档**：爱签官方API文档 - 合同撤销接口 
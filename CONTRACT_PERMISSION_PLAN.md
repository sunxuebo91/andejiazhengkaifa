# 合同管理权限系统规划方案

## 📋 需求概述

根据业务需求，需要实现以下功能：
1. **合同作废功能** - 只有管理员才有权限作废已签署完成的合同
2. **合同删除功能** - 管理员可以直接删除，员工删除需要管理员审批
3. **审批系统** - 只有孙学博（特定管理员）可以审批删除请求

## 🎯 权限角色定义

### 当前系统角色
- **系统管理员** (`role: '系统管理员'`)
  - 拥有所有权限 (`permissions: ['*']`)
  - 可以直接作废合同
  - 可以直接删除合同
  - 可以审批删除请求（如果是孙学博）

- **经理** (`role: '经理'`)
  - 拥有部分管理权限
  - 不能作废合同
  - 删除合同需要审批

- **普通员工** (`role: '普通员工'`)
  - 基础操作权限
  - 不能作废合同
  - 删除合同需要审批

### 特殊权限用户
- **孙学博** (`username: 'sunxuebo'` 或 `name: '孙学博'`)
  - 唯一可以审批删除请求的管理员
  - 需要在后端和前端都进行验证

## 🏗️ 数据库设计

### 1. 合同删除审批表 (ContractDeletionApproval)

```typescript
@Schema({ timestamps: true })
export class ContractDeletionApproval extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Contract', required: true })
  contractId: Types.ObjectId; // 合同ID

  @Prop({ required: true })
  contractNumber: string; // 合同编号（冗余字段，方便查询）

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId; // 申请人ID

  @Prop({ required: true })
  requestedByName: string; // 申请人姓名（冗余）

  @Prop({ required: true })
  reason: string; // 删除原因

  @Prop({ 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  })
  status: string; // 审批状态

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId; // 审批人ID

  @Prop()
  approvedByName?: string; // 审批人姓名（冗余）

  @Prop()
  approvalComment?: string; // 审批意见

  @Prop()
  approvedAt?: Date; // 审批时间

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}
```

## 🔧 后端实现

### 1. 创建审批模块

**文件结构：**
```
backend/src/modules/contract-approvals/
├── contract-approvals.module.ts
├── contract-approvals.controller.ts
├── contract-approvals.service.ts
├── models/
│   └── contract-deletion-approval.model.ts
└── dto/
    ├── create-deletion-approval.dto.ts
    └── approve-deletion.dto.ts
```

### 2. 核心API端点

#### 2.1 合同作废 (仅管理员)
```
POST /api/esign/invalidate-contract/:contractNo
权限: 系统管理员
```

#### 2.2 合同删除请求
```
POST /api/contracts/:id/request-deletion
权限: 所有已登录用户
功能: 
  - 管理员：直接删除
  - 员工/经理：创建审批请求
```

#### 2.3 审批删除请求
```
POST /api/contract-approvals/:id/approve
权限: 孙学博（username: 'sunxuebo'）
```

#### 2.4 拒绝删除请求
```
POST /api/contract-approvals/:id/reject
权限: 孙学博（username: 'sunxuebo'）
```

#### 2.5 获取审批列表
```
GET /api/contract-approvals
权限: 系统管理员
查询参数: status, page, limit
```

#### 2.6 获取我的删除请求
```
GET /api/contract-approvals/my-requests
权限: 所有已登录用户
```

### 3. 权限检查逻辑

```typescript
// 检查是否是孙学博
function isSunXuebo(user: any): boolean {
  return user.username === 'sunxuebo' || user.name === '孙学博';
}

// 检查是否是管理员
function isAdmin(user: any): boolean {
  return user.role === '系统管理员';
}

// 检查是否可以审批
function canApprove(user: any): boolean {
  return isAdmin(user) && isSunXuebo(user);
}
```

## 🎨 前端实现

### 1. 合同详情页按钮权限

```tsx
// ContractDetail.tsx
const { user } = useAuth();
const isAdmin = user?.role === '系统管理员';
const isSunXuebo = user?.username === 'sunxuebo' || user?.name === '孙学博';

// 作废按钮 - 仅管理员可见
{isAdmin && (
  <Button
    icon={<CloseCircleOutlined />}
    onClick={handleInvalidateContract}
    disabled={!contract.esignContractNo}
    danger
  >
    作废合同
  </Button>
)}

// 删除按钮 - 所有人可见，但行为不同
<Button
  icon={<DeleteOutlined />}
  onClick={handleDeleteContract}
  danger
>
  {isAdmin ? '删除合同' : '申请删除合同'}
</Button>
```

### 2. 合同列表页删除功能

```tsx
// ContractList.tsx
const columns = [
  // ... 其他列
  {
    title: '操作',
    key: 'action',
    render: (_, record) => (
      <Space>
        <Button onClick={() => navigate(`/contracts/${record._id}`)}>
          查看
        </Button>
        <Button 
          danger 
          onClick={() => handleDelete(record)}
        >
          {isAdmin ? '删除' : '申请删除'}
        </Button>
      </Space>
    ),
  },
];
```

### 3. 审批管理页面

**新增页面：** `frontend/src/pages/contracts/ContractDeletionApprovals.tsx`

功能：
- 显示所有待审批的删除请求
- 只有孙学博可以访问
- 可以批准或拒绝删除请求
- 显示审批历史记录

## 📱 用户交互流程

### 流程1：管理员作废合同
```
1. 管理员进入合同详情页
2. 点击"作废合同"按钮
3. 弹出确认对话框，输入作废原因
4. 确认后调用爱签API作废合同
5. 更新合同状态为"已作废"
```

### 流程2：管理员直接删除合同
```
1. 管理员在合同列表或详情页点击"删除合同"
2. 弹出确认对话框
3. 确认后直接删除合同
4. 刷新列表
```

### 流程3：员工申请删除合同
```
1. 员工在合同列表或详情页点击"申请删除合同"
2. 弹出对话框，填写删除原因
3. 提交后创建审批请求
4. 显示"删除申请已提交，等待审批"
5. 员工可以在"我的删除申请"页面查看状态
```

### 流程4：孙学博审批删除请求
```
1. 孙学博登录后，在导航栏看到"删除审批"菜单（带红点提示）
2. 进入审批页面，看到所有待审批的删除请求
3. 查看合同详情和删除原因
4. 点击"批准"或"拒绝"，填写审批意见
5. 如果批准，系统自动删除合同
6. 申请人收到通知（可选）
```

## 🔔 通知系统（可选）

可以集成现有的通知系统，在以下情况发送通知：
1. 员工提交删除申请 → 通知孙学博
2. 审批通过/拒绝 → 通知申请人

## ⚠️ 注意事项

1. **硬编码孙学博的判断**：
   - 后端和前端都需要判断 `username === 'sunxuebo'`
   - 如果未来需要支持多个审批人，需要改为配置化

2. **合同删除的级联处理**：
   - 删除合同前需要检查是否有关联数据
   - 建议使用软删除（添加 `deleted` 字段）而不是物理删除

3. **爱签合同的处理**：
   - 删除本地合同前，建议先撤销/作废爱签合同
   - 避免数据不一致

4. **审批记录保留**：
   - 即使合同被删除，审批记录也应该保留
   - 用于审计和追溯

## 📊 实现优先级

### 第一阶段（核心功能）
1. ✅ 合同撤销功能（已完成）
2. 🔲 合同作废功能（仅管理员）
3. 🔲 合同删除功能（管理员直接删除）

### 第二阶段（审批系统）
4. 🔲 创建审批数据模型
5. 🔲 实现删除申请API
6. 🔲 实现审批API（孙学博专用）
7. 🔲 前端审批管理页面

### 第三阶段（优化）
8. 🔲 通知系统集成
9. 🔲 审批历史记录
10. 🔲 批量审批功能

## 🚀 下一步行动

请确认以上规划是否符合您的需求，我将开始实现：
1. 合同作废功能（管理员专用）
2. 合同删除功能（管理员直接删除，员工需审批）
3. 审批系统（孙学博专用）


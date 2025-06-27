# A客户换多个阿姨 - 技术实现文档

## 📋 项目概述

### 业务需求
- A客户需要更换多个阿姨，但系统不能新增多个合同
- 需要在同一合同框架下实现多次换人
- 合同要显示最新的阿姨信息
- 合同预览和下载要是最新版本
- 需要完整的换人历史记录
- 换人需要重新签约，时间要接续计算

### 解决方案
**以客户手机号为关联键，每次换人创建新合同记录，通过智能识别和状态管理实现安全的合同替换流程**

## 🏗️ 技术架构

### 核心设计思路
1. **一个客户一条记录**：客户信息固定，通过 `customerPhone` 关联
2. **合同版本管理**：每次换人创建新合同，标记最新版本
3. **历史完整保留**：所有历史合同和换人记录完整保存
4. **智能时间计算**：新合同开始时间 = 换人日期，结束时间保持不变
5. **自动状态流转**：新合同签约后自动处理旧合同撤销/作废

## 📊 数据库设计

### 1. 合同表扩展 (Contract)
```typescript
export interface Contract {
  // === 原有字段保持不变 ===
  _id: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;        // 🔑 关联键
  // ... 其他原有字段

  // 🆕 换人功能新增字段
  isLatest: boolean;            // 是否为该客户最新合同
  contractStatus: ContractStatus; // 合同状态枚举
  replacedByContractId?: ObjectId; // 被哪个合同替换了
  replacesContractId?: ObjectId;   // 替换了哪个合同
  changeDate?: Date;            // 换人生效日期
  serviceDays?: number;         // 实际服务天数
  esignSignedAt?: Date;         // 爱签合同签署完成时间
}

export enum ContractStatus {
  DRAFT = 'draft',           // 草稿
  SIGNING = 'signing',       // 签约中
  ACTIVE = 'active',         // 生效中
  REPLACED = 'replaced',     // 已被替换
  CANCELLED = 'cancelled'    // 已作废
}
```

### 2. 客户合同历史表 (CustomerContractHistory)
```typescript
export interface CustomerContractHistory {
  customerPhone: string;        // 客户手机号（关联键）
  customerName: string;         // 客户姓名
  contracts: ContractHistoryRecord[]; // 合同历史记录
  latestContractId: ObjectId;   // 最新合同ID
  totalWorkers: number;         // 总共换过几个阿姨
}

export interface ContractHistoryRecord {
  contractId: ObjectId;
  contractNumber: string;
  workerName: string;
  workerPhone: string;
  workerSalary: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'replaced';
  order: number;                // 第几任阿姨
  serviceDays?: number;         // 实际服务天数
  terminationReason?: string;   // 终止原因
}
```

## 🔄 核心业务流程

### 创建合同页面智能识别流程
```
用户进入创建合同页面
    ↓
搜索并选择客户
    ↓
系统自动检查：该客户是否已有合同？
    ↓
如果有现有合同：
    ├── 🔄 自动进入"换人模式"
    ├── 📅 计算新合同时间
    ├── 🔒 锁定开始时间字段
    └── 💡 显示提示信息
如果没有现有合同：
    └── 📝 保持"新建模式"
```

### 时间计算逻辑
```typescript
// 原合同：2024-06-26 至 2025-06-25 (1年期)
// B阿姨服务了30天，在2024-07-26换人

const originalStartDate = new Date('2024-06-26');
const originalEndDate = new Date('2025-06-25');
const changeDate = new Date('2024-07-26'); // 换人日期

// 计算服务天数
const serviceDays = Math.floor(
  (changeDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24)
); // 30天

// 新合同时间
const newStartDate = changeDate;     // 2024-07-26（接续服务）
const newEndDate = originalEndDate;  // 2025-06-25（保持不变）
```

### 合同状态安全流转
```
1. 创建新合同
   ├── status: DRAFT
   ├── isLatest: true
   └── replacesContractId: 原合同ID

2. 更新原合同状态  
   ├── status: REPLACED
   ├── isLatest: false
   ├── serviceDays: 计算的服务天数
   └── replacedByContractId: 新合同ID

3. 发起新合同签约
   └── 爱签流程

4. 新合同签约成功后
   ├── 更新新合同: status = ACTIVE
   └── 智能撤销/作废原合同
```

## 🔧 爱签集成优化

### 撤销/作废 API 集成
```typescript
/**
 * 智能撤销/作废合同
 * 根据合同状态自动选择撤销或作废操作
 */
async cancelContract(contractNo: string, reason?: string): Promise<any> {
  try {
    // 首先尝试撤销（针对未签署完成的合同）
    return await this.withdrawContract(contractNo, reason);
  } catch (withdrawError) {
    // 如果返回101000错误码（已签署完成），则尝试作废
    if (withdrawError.message.includes('已签署完成')) {
      return await this.invalidateContract(contractNo, reason);
    }
    throw withdrawError;
  }
}
```

### 错误码处理
```typescript
switch (errorCode) {
  case 101000: // 合同已签署完成，请通过作废接口完成作废操作
  case 101001: // 合同已撤销，不能重复撤销  
  case 101002: // 合同已作废，不能再次撤销
  case 100613: // 合同已删除
  case 0:      // 合同不存在
}
```

## 🎨 前端实现

### 创建合同页面增强
```typescript
const CreateContractPage = () => {
  const [contractMode, setContractMode] = useState<'new' | 'change'>('new');
  const [originalContract, setOriginalContract] = useState(null);
  
  // 客户选择时的智能检测
  const handleCustomerSelect = async (customerInfo) => {
    const { hasContract, contract } = await contractService.checkCustomerContract(
      customerInfo.phone
    );
    
    if (hasContract) {
      // 进入换人模式
      setContractMode('change');
      setOriginalContract(contract);
      
      // 自动计算并填充时间
      const newStartDate = new Date();
      const newEndDate = new Date(contract.endDate);
      
      form.setFieldsValue({
        startDate: newStartDate,
        endDate: newEndDate,
        // 锁定时间字段
      });
      
      message.info('检测到客户已有合同，已自动进入换人模式');
    }
  };
}
```

### 合同列表优化
```typescript
// 使用新的 API 只显示最新合同
const { data } = await contractService.getLatestContracts({
  page,
  limit,
  search
});
```

### 合同详情页增强
```tsx
const ContractDetail = () => {
  return (
    <div>
      {/* 基本合同信息 */}
      <ContractInfo contract={contract} />
      
      {/* 🆕 换人历史卡片 */}
      {contractHistory && (
        <Card title="换人历史" style={{ marginTop: 16 }}>
          <Timeline>
            {contractHistory.contracts.map((record, index) => (
              <Timeline.Item key={record.contractId}>
                <div>
                  <strong>{record.workerName}</strong> - {record.workerPhone}
                  <br />
                  服务期：{formatDate(record.startDate)} ~ {formatDate(record.endDate)}
                  {record.serviceDays && (
                    <span>（实际服务{record.serviceDays}天）</span>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}
      
      {/* 操作按钮 */}
      <div style={{ marginTop: 16 }}>
        <Button 
          type="primary" 
          onClick={() => navigate(`/contracts/create?mode=change&phone=${contract.customerPhone}`)}
        >
          更换服务人员
        </Button>
      </div>
    </div>
  );
};
```

## 📋 API 接口清单

### 后端接口
```typescript
// 换人功能相关
GET    /api/contracts/check-customer/:customerPhone    // 检查客户现有合同
POST   /api/contracts/change-worker/:originalContractId // 创建换人合同
GET    /api/contracts/history/:customerPhone           // 获取客户合同历史
GET    /api/contracts/latest/list                      // 获取最新合同列表
POST   /api/contracts/signed-callback/:contractId      // 合同签约成功回调

// 爱签相关
POST   /api/esign/withdraw-contract/:contractNo        // 撤销合同
POST   /api/esign/invalidate-contract/:contractNo      // 作废合同  
POST   /api/esign/cancel-contract/:contractNo          // 智能撤销/作废
```

### 前端服务方法
```typescript
// contractService 新增方法
checkCustomerContract(customerPhone: string)
createChangeWorkerContract(originalContractId: string, contractData: any)
getCustomerHistory(customerPhone: string)
getLatestContracts(params)
handleContractSigned(contractId: string, esignData: any)
```

## 🚀 部署和迁移

### 数据库迁移
```javascript
// 为现有合同添加新字段的默认值
db.contracts.updateMany(
  {},
  { 
    $set: { 
      isLatest: true,
      contractStatus: 'active'
    }
  }
);

// 创建客户合同历史集合的索引
db.customercontracthistories.createIndex({ customerPhone: 1 }, { unique: true });
```

### 环境变量配置
```env
# 爱签相关配置已存在，无需额外配置
```

## ✅ 测试清单

### 功能测试
- [ ] 新客户创建合同（正常流程）
- [ ] 老客户换人创建合同（换人流程）
- [ ] 时间自动计算准确性
- [ ] 合同历史记录完整性
- [ ] 爱签撤销/作废流程
- [ ] 签约成功后状态更新

### 边界测试
- [ ] 客户手机号重复处理
- [ ] 原合同不存在的异常处理
- [ ] 爱签API异常的降级处理
- [ ] 并发换人的冲突处理

## 🔮 后续优化方向

1. **工作流引擎**：使用工作流管理复杂的状态流转
2. **消息队列**：异步处理爱签回调和状态更新
3. **审计日志**：记录所有换人操作的详细日志
4. **智能推荐**：基于历史数据推荐合适的阿姨
5. **移动端支持**：提供移动端的换人操作界面

## 📞 技术支持

如有技术问题，请联系开发团队：
- 后端：合同服务、爱签集成
- 前端：页面交互、状态管理
- 数据库：索引优化、数据迁移

---

*文档版本：v1.0*  
*最后更新：2024年12月* 
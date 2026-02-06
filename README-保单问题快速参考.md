# 保单问题快速参考指南

## 🚨 当前问题

保单显示"待支付",但实际已支付成功。

## ⚡ 快速诊断

```bash
# 1. 检查数据库中是否有保单记录
cd backend
node list-policies.js

# 2. 如果有记录,检查特定保单状态
# (修改diagnose-policy-status.js中的POLICY_REF)
node diagnose-policy-status.js
```

## 🔧 快速修复

### 情况1: 数据库中有保单,但状态是pending

```bash
# 方法1: 使用API同步状态
curl -X POST "http://localhost:3001/api/dashubao/policy/sync/保单号或流水号" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 方法2: 手动修复脚本
# (修改fix-policy-status.js中的POLICY_REF)
node fix-policy-status.js
```

### 情况2: 数据库中没有保单记录

**原因:** 投保确认接口没有成功调用

**解决方案:**
1. 联系大树保客服确认保单是否存在
2. 如果不存在,需要重新投保
3. 如果存在,手动在数据库中创建记录(见下方)

## 📝 手动创建保单记录

如果确认支付成功且大树保有记录,可以手动创建:

```javascript
// 在MongoDB中执行
use housekeeping_dev

db.insurance_policies.insertOne({
  agencyPolicyRef: "ANDE1770195082828a1n4by",
  policyNo: "PK00029001",
  planCode: "需要从前端或大树保获取",
  effectiveDate: "20260205000000",
  expireDate: "20260304000000",
  groupSize: 1,
  totalPremium: 12.00,
  status: "active",
  policyHolder: {
    policyHolderType: "C",
    policyHolderName: "北京安得家政有限公司",
    phIdType: "14",
    phIdNumber: "企业",
  },
  insuredList: [{
    insuredName: "赵瑾如",
    idType: "1",
    idNumber: "141034199605090042",
    birthDate: "19960509000000",
    gender: "F",
  }],
  createdAt: new Date(),
  updatedAt: new Date(),
})
```

## 🔍 检查前端数据来源

1. 打开浏览器开发者工具(F12)
2. 切换到Network标签
3. 刷新保单详情页面
4. 查找保单相关的API请求
5. 确认数据来源

## 📞 联系大树保客服

**客服信息:**
- 测试环境: http://fx.test.dasurebao.com.cn/remoting/ws
- 生产环境: https://api.dasurebao.com.cn/remoting/ws

**需要提供的信息:**
- 流水号: ANDE1770195082828a1n4by
- 保单号: PK00029001
- 支付凭证
- 支付时间

## 🛠️ 已实施的代码修复

✅ 改进支付回调处理逻辑
✅ 改进保单状态同步逻辑
✅ 修复XML解析器配置

**重启后端服务以应用修复:**

```bash
cd backend
npm run start:dev
```

## 📚 详细文档

- [完整解决方案](./保单状态问题-完整解决方案.md)
- [诊断和修复方案](./大树保支付状态问题诊断和修复方案.md)
- [大树保API文档](./大树保保险api接口文档.md)

## ⚠️ 注意事项

1. **不要重复支付**: 在确认保单不存在之前,不要重复支付
2. **保留支付凭证**: 保存好微信/支付宝的支付记录
3. **记录操作日志**: 记录所有操作步骤,便于后续追溯
4. **联系客服**: 如果无法解决,及时联系大树保客服

## 🔄 后续改进

1. 添加投保流程详细日志
2. 添加前端错误提示
3. 添加支付状态轮询
4. 添加手动同步按钮
5. 添加异常告警机制


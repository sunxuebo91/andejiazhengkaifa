# 小程序合同桥接模式API设计

## 🎯 核心思路

**小程序 ←→ CRM后端(桥接层) ←→ 爱签API**

小程序直接使用爱签模板的原始字段名提交数据，CRM后端不做任何字段转换，直接透传给爱签API。

## ✅ 优势

| 优势 | 说明 |
|------|------|
| 🔐 **安全** | 小程序不需要知道爱签的AppId/Secret，全部由CRM后端管理 |
| 🔄 **数据一致** | 小程序获取的字段 = 后端提交的字段 = 爱签模板的真实字段 |
| 🛡️ **权限控制** | CRM后端可以控制哪些用户可以访问哪些模板 |
| 📊 **日志审计** | 所有请求都经过CRM后端，方便记录日志和监控 |
| 🔧 **模板自适应** | 爱签模板调整后，小程序重新获取字段即可，无需改代码 |

## 📋 完整流程

### 步骤1：小程序获取模板字段

```javascript
// 小程序端
wx.request({
  url: 'https://crm.andejiazheng.com/api/esign/template/data',
  method: 'POST',
  data: {
    templateIdent: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE'
  },
  success: (res) => {
    // res.data.data 就是爱签模板的原始字段列表
    // [
    //   { dataKey: "客户姓名", type: 1, required: true },
    //   { dataKey: "客户电话", type: 1, required: true },
    //   { dataKey: "阿姨工资", type: 1, required: true }
    // ]
    this.setData({
      templateFields: res.data.data
    });
  }
});
```

**CRM后端（桥接层）**：
```typescript
// backend/src/modules/esign/esign.controller.ts
@Public()
@Post('template/data')
async getTemplateData(@Body() body: { templateIdent: string }) {
  // 转发请求到爱签API（带AppId+Secret签名）
  const result = await this.esignService.getTemplateData(body.templateIdent);
  
  return {
    code: 100000,
    data: result, // 直接返回爱签API的原始数据，不做任何修改
    msg: '成功'
  };
}
```

### 步骤2：小程序提交合同数据

```javascript
// 小程序端 - 用户填写表单后提交
wx.request({
  url: 'https://crm.andejiazheng.com/api/contracts/miniprogram/create',
  method: 'POST',
  data: {
    templateNo: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE',
    // 🎯 关键：字段名直接使用爱签模板的 dataKey
    "客户姓名": "张三",
    "客户电话": "13800138000",
    "客户身份证号": "110101199001011234",
    "阿姨姓名": "李四",
    "阿姨电话": "13900139000",
    "阿姨工资": "10000",
    "客户服务费": "2700"
  },
  success: (res) => {
    // 获取签署链接，跳转到签署页面
    const signUrl = res.data.data.esignSignUrls?.customer;
    wx.navigateTo({
      url: `/pages/sign/index?url=${encodeURIComponent(signUrl)}`
    });
  }
});
```

**CRM后端（桥接层）**：
```typescript
// backend/src/modules/esign/esign.service.ts

/**
 * 🎯 [桥接模式] 准备发送给爱签API的fillData（直接透传，不做转换）
 */
private prepareFillDataForESign(templateParams: Record<string, any>): Record<string, any> {
  const fillData: Record<string, any> = {};
  
  // 直接遍历所有字段，只做基本的类型转换（确保都是字符串）
  Object.entries(templateParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      // 数组类型（如多选字段）转换为分号分隔的字符串
      if (Array.isArray(value)) {
        fillData[key] = value.join('；');
      } else {
        fillData[key] = String(value);
      }
    }
  });
  
  return fillData; // 🎯 直接返回，不做任何字段名转换
}

/**
 * 创建模板合同（桥接模式）
 */
async createContractWithTemplate(contractData: {
  contractNo: string;
  contractName: string;
  templateNo: string;
  templateParams: Record<string, any>; // 小程序直接提交爱签模板字段名
  validityTime?: number;
  signOrder?: number;
}): Promise<any> {
  // 🎯 核心：不做任何字段转换，直接透传
  const fillData = this.prepareFillDataForESign(contractData.templateParams);
  
  const requestParams = {
    contractNo: contractData.contractNo,
    contractName: contractData.contractName,
    signOrder: contractData.signOrder || 1,
    validityTime: contractData.validityTime || 15,
    templates: [{
      templateNo: contractData.templateNo,
      fillData: fillData, // 🎯 直接透传小程序提交的字段
      componentData: this.prepareComponentDataForESign(contractData.templateParams)
    }]
  };
  
  // 调用爱签API
  return await this.callESignAPI('/contract/createContract', requestParams);
}
```

## 🔑 关键点

1. **字段名一致性**：小程序、CRM后端、爱签API使用同一套字段名（爱签模板的 `dataKey`）
2. **CRM后端只做桥接**：不做字段名转换，只做基本的类型转换（如数组转字符串）
3. **安全性**：爱签的AppId/Secret只存在CRM后端，小程序无法直接访问
4. **可维护性**：爱签模板调整后，小程序重新获取字段即可，无需修改代码

## 📝 一句话总结

**小程序通过CRM后端作为桥接层获取爱签模板字段并直接使用原始字段名提交数据，CRM后端不做任何字段名转换直接透传给爱签API，保证字段名100%一致且安全可控。**


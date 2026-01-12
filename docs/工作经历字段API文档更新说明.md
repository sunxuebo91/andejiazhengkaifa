# 工作经历字段API文档更新说明

## 📋 更新概述

本次更新为小程序API文档添加了工作经历模块的新增字段说明，包括订单编号、服务区域、客户信息、客户评价和工作照片等功能。

## 📝 更新的文档列表

### 1. `backend/docs/小程序简历创建API使用说明.md`
- ✅ 在可选字段表格中标注工作经历字段
- ✅ 添加工作经历字段详细说明章节
- ✅ 添加工作照片对象结构说明
- ✅ 添加北京市区县代码对照表
- ✅ 更新请求示例，包含完整的工作经历数据
- ✅ 更新小程序端集成示例代码

### 2. `docs/小程序API使用指南.md`
- ✅ 更新创建简历请求示例，包含新字段
- ✅ 添加工作经历字段详细说明章节
- ✅ 添加北京市区县代码列表

### 3. `backend/docs/小程序简历API-列表和详情.md`
- ✅ 更新简历详情响应示例
- ✅ 添加工作经历字段详细说明章节
- ✅ 添加工作照片对象结构说明
- ✅ 添加北京市区县代码对照表
- ✅ 添加使用示例代码

## 🎯 新增字段说明

### 工作经历对象 (workExperiences)

#### 必填字段
- `startDate` (string): 开始日期，格式：YYYY-MM-DD
- `endDate` (string): 结束日期，格式：YYYY-MM-DD
- `description` (string): 工作描述

#### 可选字段（新增）
- `orderNumber` (string): 订单编号，格式：CON{11位数字}，例如：CON12345678901
- `district` (string): 服务区域，北京市区县代码，例如：chaoyang、haidian
- `customerName` (string): 客户姓名
- `customerReview` (string): 客户评价
- `photos` (array): 工作照片数组

### 工作照片对象 (photos)

- `url` (string, 必填): 图片URL
- `name` (string, 可选): 文件名
- `size` (number, 可选): 文件大小（字节）
- `mimeType` (string, 可选): MIME类型

### 北京市区县代码

| 代码 | 区县名称 |
|------|----------|
| dongcheng | 东城区 |
| xicheng | 西城区 |
| chaoyang | 朝阳区 |
| fengtai | 丰台区 |
| shijingshan | 石景山区 |
| haidian | 海淀区 |
| mentougou | 门头沟区 |
| fangshan | 房山区 |
| tongzhou | 通州区 |
| shunyi | 顺义区 |
| changping | 昌平区 |
| daxing | 大兴区 |
| huairou | 怀柔区 |
| pinggu | 平谷区 |
| miyun | 密云区 |
| yanqing | 延庆区 |

## 📖 使用示例

### 创建包含完整工作经历的简历

```javascript
const resumeData = {
  // 必填字段
  name: "张三",
  phone: "13800138000",
  gender: "female",
  age: 35,
  jobType: "yuexin",
  education: "high",
  
  // 工作经历（包含新字段）
  workExperiences: [
    {
      startDate: "2020-01-01",
      endDate: "2020-03-31",
      description: "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",
      orderNumber: "CON12345678901",
      district: "chaoyang",
      customerName: "张女士",
      customerReview: "服务态度好，专业技能强，宝宝护理得很好",
      photos: [
        {
          url: "https://cos.example.com/work-photo-1.jpg",
          name: "工作照片1.jpg",
          size: 102400,
          mimeType: "image/jpeg"
        }
      ]
    }
  ]
};

// 调用API
const response = await wx.request({
  url: 'https://crm.andejiazheng.com/api/resumes/miniprogram/create',
  method: 'POST',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  data: resumeData
});
```

## ✅ 验证清单

- [x] 所有新增字段均为可选，不影响现有功能
- [x] 订单编号格式与合同管理模块保持一致
- [x] 提供完整的字段说明和示例
- [x] 更新所有相关API文档
- [x] 添加北京市区县代码对照表
- [x] 提供小程序端集成示例代码

## 📚 相关文档

- [工作经历增强功能实施总结](./工作经历增强功能实施总结.md)
- [小程序简历创建API使用说明](../backend/docs/小程序简历创建API使用说明.md)
- [小程序API使用指南](./小程序API使用指南.md)
- [小程序简历API-列表和详情](../backend/docs/小程序简历API-列表和详情.md)

## 🎉 总结

本次文档更新完整地记录了工作经历模块的新增字段，为小程序开发者提供了清晰的API使用指南。所有新增字段均为可选，确保向后兼容性。


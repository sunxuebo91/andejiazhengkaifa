# 小程序简历创建API使用说明

## 📍 统一端口

**只有一个创建端口，功能最完整：**

```
POST /api/resumes/miniprogram/create
```

## ✅ 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | 姓名，2-20字符 | "张三" |
| `phone` | string | 手机号码，11位数字 | "13800138000" |
| `gender` | string | 性别："female" 或 "male" | "female" |
| `age` | number | 年龄，18-65岁 | 35 |
| `jobType` | string | 工种类型 | "yuexin" |
| `education` | string | 学历 | "high" |

## 📝 可选字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `nativePlace` | string | 籍贯，最大20字符 | "河南省郑州市" |
| `experienceYears` | number | 工作经验年限 | 3 |
| `expectedSalary` | number | 期望薪资 | 8000 |
| `skills` | array | 技能列表 | ["chanhou", "yuying"] |
| `serviceArea` | array | 服务区域 | ["北京市朝阳区"] |
| `selfIntroduction` | string | 自我介绍 | "自我介绍" |
| `workExperiences` | array | 工作经历 | [{"startDate": "2020-01-01", "endDate": "2023-12-31", "description": "工作描述"}] |

## 🔧 核心功能

- ✅ **幂等性支持**：使用 `Idempotency-Key` 头部防止重复提交
- ✅ **数据清理**：自动去除多余空格，格式标准化
- ✅ **唯一性验证**：手机号自动去重
- ✅ **详细错误信息**：返回具体的验证错误
- ✅ **支持更新模式**：可选择更新已存在的记录

## 📝 请求示例

### 基本请求
```bash
curl -X POST /api/resumes/miniprogram/create \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "phone": "13800138000",
    "gender": "female",
    "age": 35,
    "jobType": "yuexin",
    "education": "high"
  }'
```

### 带幂等性的请求
```bash
curl -X POST /api/resumes/miniprogram/create \
  -H "Authorization: Bearer your-token" \
  -H "Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "phone": "13800138000",
    "gender": "female",
    "age": 35,
    "jobType": "yuexin",
    "education": "high"
  }'
```

## 📤 响应格式

### 成功响应 (201)
```json
{
  "success": true,
  "data": {
    "id": "66e2f4af8b1234567890abcd",
    "createdAt": "2025-09-12T10:19:27.671Z",
    "action": "CREATED"
  },
  "message": "创建简历成功"
}
```

### 重复手机号 (409)
```json
{
  "success": false,
  "code": "DUPLICATE",
  "data": {
    "existingId": "66e2f4af8b1234567890abcd"
  },
  "message": "该手机号已被使用"
}
```

### 验证错误 (400)
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "data": {
    "errors": ["姓名不能为空", "手机号码格式不正确"]
  },
  "message": "数据验证失败"
}
```

## 🎯 工种类型 (jobType)

| 值 | 说明 |
|---|---|
| `yuexin` | 月嫂 |
| `zhujia-yuer` | 住家育儿嫂 |
| `baiban-yuer` | 白班育儿嫂 |
| `baojie` | 保洁 |
| `baiban-baomu` | 白班保姆 |
| `zhujia-baomu` | 住家保姆 |
| `yangchong` | 养宠 |
| `xiaoshi` | 小时工 |
| `zhujia-hulao` | 住家护老 |

## 📚 学历类型 (education)

| 值 | 说明 |
|---|---|
| `no` | 无学历 |
| `primary` | 小学 |
| `middle` | 初中 |
| `secondary` | 中专 |
| `vocational` | 职高 |
| `high` | 高中 |
| `college` | 大专 |
| `bachelor` | 本科 |
| `graduate` | 研究生 |

## 💡 最佳实践

1. **使用幂等性键**：对于可能重复的请求，建议使用 `Idempotency-Key`
2. **错误处理**：根据不同的错误码进行相应的处理
3. **数据验证**：前端也应该进行基本的数据验证
4. **日志记录**：记录请求ID便于问题排查

## 🚨 注意事项

- 手机号必须是11位有效的中国大陆手机号
- 年龄范围限制在18-65岁之间
- 姓名长度限制在2-20个字符
- 所有字符串字段会自动去除首尾空格

## 🔧 问题解决

### 400错误：缺少必填字段
如果遇到400错误，请检查以下必填字段是否都已提供：
- `name`: 姓名
- `phone`: 手机号码
- `gender`: 性别
- `age`: 年龄
- `jobType`: 工种
- `education`: 学历

### 小程序端集成建议
```javascript
// 小程序端创建简历示例
const createResume = async (formData) => {
  const data = {
    name: formData.name,
    phone: formData.phone,
    gender: formData.gender,
    age: formData.age,
    jobType: formData.jobType,
    education: formData.education,
    // 可选字段
    nativePlace: formData.nativePlace || undefined,
    experienceYears: formData.experienceYears || 0,
    expectedSalary: formData.expectedSalary || undefined
  };

  try {
    const response = await wx.request({
      url: 'https://crm.andejiazheng.com/api/resumes/miniprogram/create',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: data
    });

    if (response.data.success) {
      console.log('简历创建成功:', response.data);
    } else {
      console.error('创建失败:', response.data.message);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
};
```

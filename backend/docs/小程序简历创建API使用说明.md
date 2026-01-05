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
| `maternityNurseLevel` | string | 月嫂档位（仅月嫂工种） | "gold" |
| `skills` | array | 技能列表 | ["chanhou", "yuying"] |
| `serviceArea` | array | 服务区域 | ["北京市朝阳区"] |
| `selfIntroduction` | string | 自我介绍 | "自我介绍" |
| `workExperiences` | array | 工作经历 | [{"startDate": "2020-01-01", "endDate": "2023-12-31", "description": "工作描述"}] |
| `wechat` | string | 微信号 | "wechat123" |
| `currentAddress` | string | 现居地址 | "北京市朝阳区" |
| `hukouAddress` | string | 户口地址 | "河南省郑州市" |
| `birthDate` | string | 出生日期 | "1990-01-01" |
| `idNumber` | string | 身份证号 | "410102199001011234" |
| `ethnicity` | string | 民族 | "汉族" |
| `zodiac` | string | 生肖 | "马" |
| `zodiacSign` | string | 星座 | "摩羯座" |
| `maritalStatus` | string | 婚姻状况 | "married" |
| `religion` | string | 宗教信仰 | "无" |
| `emergencyContactName` | string | 紧急联系人姓名 | "李四" |
| `emergencyContactPhone` | string | 紧急联系人电话 | "13900139000" |
| `medicalExamDate` | string | 体检日期 | "2024-01-01" |
| `orderStatus` | string | 接单状态 | "available" |
| `learningIntention` | string | 培训意向 | "yes" |
| `currentStage` | string | 当前阶段 | "training" |

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

## 🏅 月嫂档位 (maternityNurseLevel)

**仅当 jobType 为 "yuexin" (月嫂) 时使用**

| 值 | 说明 |
|---|---|
| `junior` | 初级月嫂 |
| `silver` | 银牌月嫂 |
| `gold` | 金牌月嫂 |
| `platinum` | 铂金月嫂 |
| `diamond` | 钻石月嫂 |
| `crown` | 皇冠月嫂 |

## 💍 婚姻状况 (maritalStatus)

| 值 | 说明 |
|---|---|
| `single` | 未婚 |
| `married` | 已婚 |
| `divorced` | 离异 |
| `widowed` | 丧偶 |

## 📋 接单状态 (orderStatus)

| 值 | 说明 |
|---|---|
| `available` | 可接单 |
| `busy` | 忙碌中 |
| `unavailable` | 暂不接单 |

## 📖 培训意向 (learningIntention)

| 值 | 说明 |
|---|---|
| `yes` | 有意向 |
| `no` | 无意向 |
| `considering` | 考虑中 |

## 🎓 当前阶段 (currentStage)

| 值 | 说明 |
|---|---|
| `training` | 培训中 |
| `working` | 工作中 |
| `resting` | 休息中 |
| `seeking` | 求职中 |

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
    // 必填字段
    name: formData.name,
    phone: formData.phone,
    gender: formData.gender,
    age: formData.age,
    jobType: formData.jobType,
    education: formData.education,

    // 可选字段 - 基本信息
    nativePlace: formData.nativePlace || undefined,
    experienceYears: formData.experienceYears || 0,
    expectedSalary: formData.expectedSalary || undefined,
    wechat: formData.wechat || undefined,
    currentAddress: formData.currentAddress || undefined,
    hukouAddress: formData.hukouAddress || undefined,
    birthDate: formData.birthDate || undefined,
    idNumber: formData.idNumber || undefined,

    // 可选字段 - 月嫂档位（仅月嫂工种）
    maternityNurseLevel: formData.jobType === 'yuexin' ? formData.maternityNurseLevel : undefined,

    // 可选字段 - 其他信息
    ethnicity: formData.ethnicity || undefined,
    zodiac: formData.zodiac || undefined,
    zodiacSign: formData.zodiacSign || undefined,
    maritalStatus: formData.maritalStatus || undefined,
    religion: formData.religion || undefined,

    // 可选字段 - 联系人
    emergencyContactName: formData.emergencyContactName || undefined,
    emergencyContactPhone: formData.emergencyContactPhone || undefined,

    // 可选字段 - 工作相关
    skills: formData.skills || [],
    serviceArea: formData.serviceArea || [],
    selfIntroduction: formData.selfIntroduction || undefined,
    workExperiences: formData.workExperiences || [],
    orderStatus: formData.orderStatus || undefined,

    // 可选字段 - 培训相关
    learningIntention: formData.learningIntention || undefined,
    currentStage: formData.currentStage || undefined,

    // 可选字段 - 体检
    medicalExamDate: formData.medicalExamDate || undefined
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
      // 返回的数据包含完整的简历信息
      console.log('简历ID:', response.data.data.id);
      console.log('简历详情:', response.data.data.resume);
    } else {
      console.error('创建失败:', response.data.message);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
};
```

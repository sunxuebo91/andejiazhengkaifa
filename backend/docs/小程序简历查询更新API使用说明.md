# 小程序简历查询和更新API使用说明

## 📍 API端点

### 1. 获取简历详情
```
GET /api/resumes/miniprogram/:id
```

### 2. 更新简历
```
PUT /api/resumes/miniprogram/:id
```

## 🔍 获取简历详情

### 请求示例
```bash
curl -X GET /api/resumes/miniprogram/66e2f4af8b1234567890abcd \
  -H "Authorization: Bearer your-token"
```

### 成功响应 (200)
```json
{
  "success": true,
  "data": {
    "id": "66e2f4af8b1234567890abcd",
    "name": "张三",
    "phone": "13800138000",
    "age": 35,
    "gender": "female",
    "jobType": "yuexin",
    "education": "high",
    "experienceYears": 3,
    "nativePlace": "河南省郑州市",
    "selfIntroduction": "自我介绍内容",
    "wechat": "wechat123",
    "currentAddress": "北京市朝阳区",
    "hukouAddress": "河南省郑州市",
    "birthDate": "1990-01-01",
    "skills": ["chanhou", "yuying"],
    "serviceArea": ["北京市朝阳区"],
    "expectedSalary": 8000,
    "maternityNurseLevel": "gold",
    "workExperiences": [
      {
        "startDate": "2020-01-01",
        "endDate": "2023-12-31",
        "description": "工作描述",
        "company": "某家政公司",
        "position": "月嫂"
      }
    ],
    "idCardFront": {
      "url": "https://example.com/idcard-front.jpg",
      "key": "uploads/idcard/front.jpg"
    },
    "idCardBack": {
      "url": "https://example.com/idcard-back.jpg",
      "key": "uploads/idcard/back.jpg"
    },
    "personalPhoto": [
      {
        "url": "https://example.com/photo1.jpg",
        "key": "uploads/photo/photo1.jpg"
      }
    ],
    "certificates": [
      {
        "url": "https://example.com/cert1.jpg",
        "key": "uploads/cert/cert1.jpg"
      }
    ],
    "reports": [
      {
        "url": "https://example.com/report1.jpg",
        "key": "uploads/report/report1.jpg"
      }
    ],
    "selfIntroductionVideo": {
      "url": "https://example.com/video.mp4",
      "key": "uploads/video/video.mp4"
    },
    "createdAt": "2025-09-12T10:19:27.671Z",
    "updatedAt": "2025-09-12T10:19:27.671Z"
  },
  "message": "获取简历成功"
}
```

### 错误响应 (404)
```json
{
  "success": false,
  "data": null,
  "message": "简历不存在"
}
```

## ✏️ 更新简历

### 请求示例
```bash
curl -X PUT /api/resumes/miniprogram/66e2f4af8b1234567890abcd \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "expectedSalary": 9000,
    "maternityNurseLevel": "platinum",
    "selfIntroduction": "更新后的自我介绍"
  }'
```

### 成功响应 (200)
```json
{
  "success": true,
  "data": {
    "id": "66e2f4af8b1234567890abcd",
    "name": "张三",
    "phone": "13800138000",
    "age": 35,
    "gender": "female",
    "jobType": "yuexin",
    "education": "high",
    "experienceYears": 3,
    "expectedSalary": 9000,
    "maternityNurseLevel": "platinum",
    "nativePlace": "河南省郑州市",
    "skills": ["chanhou", "yuying"],
    "serviceArea": ["北京市朝阳区"],
    "selfIntroduction": "更新后的自我介绍",
    "workExperiences": [],
    "idCardFrontUrl": "https://example.com/idcard-front.jpg",
    "idCardBackUrl": "https://example.com/idcard-back.jpg",
    "photoUrls": ["https://example.com/photo1.jpg"],
    "certificateUrls": ["https://example.com/cert1.jpg"],
    "medicalReportUrls": ["https://example.com/report1.jpg"],
    "selfIntroductionVideoUrl": "https://example.com/video.mp4"
  },
  "message": "更新简历成功"
}
```

## 📝 可更新字段

所有在创建API中的可选字段都可以更新，包括：

### 基本信息
- `name` - 姓名
- `age` - 年龄
- `gender` - 性别
- `nativePlace` - 籍贯
- `wechat` - 微信号
- `currentAddress` - 现居地址
- `hukouAddress` - 户口地址
- `birthDate` - 出生日期
- `idNumber` - 身份证号
- `ethnicity` - 民族
- `zodiac` - 生肖
- `zodiacSign` - 星座
- `maritalStatus` - 婚姻状况
- `religion` - 宗教信仰

### 工作信息
- `jobType` - 工种
- `education` - 学历
- `experienceYears` - 工作经验年限
- `expectedSalary` - 期望薪资
- `maternityNurseLevel` - 月嫂档位（仅月嫂工种）
- `skills` - 技能列表
- `serviceArea` - 服务区域
- `orderStatus` - 接单状态
- `selfIntroduction` - 自我介绍
- `workExperiences` - 工作经历

### 联系人信息
- `emergencyContactName` - 紧急联系人姓名
- `emergencyContactPhone` - 紧急联系人电话

### 培训信息
- `learningIntention` - 培训意向
- `currentStage` - 当前阶段

### 体检信息
- `medicalExamDate` - 体检日期

## 💡 小程序端集成示例

### 获取简历详情
```javascript
const getResumeDetail = async (resumeId) => {
  try {
    const response = await wx.request({
      url: `https://crm.andejiazheng.com/api/resumes/miniprogram/${resumeId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('简历详情:', response.data.data);
      return response.data.data;
    } else {
      console.error('获取失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('请求失败:', error);
    return null;
  }
};
```

### 更新简历
```javascript
const updateResume = async (resumeId, updateData) => {
  try {
    const response = await wx.request({
      url: `https://crm.andejiazheng.com/api/resumes/miniprogram/${resumeId}`,
      method: 'PUT',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: updateData
    });

    if (response.data.success) {
      console.log('更新成功:', response.data.data);
      return response.data.data;
    } else {
      console.error('更新失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('请求失败:', error);
    return null;
  }
};

// 使用示例
const handleUpdate = async () => {
  const updateData = {
    expectedSalary: 9000,
    maternityNurseLevel: 'platinum',
    selfIntroduction: '更新后的自我介绍',
    orderStatus: 'available'
  };

  const result = await updateResume('66e2f4af8b1234567890abcd', updateData);
  if (result) {
    wx.showToast({
      title: '更新成功',
      icon: 'success'
    });
  }
};
```

## 🚨 注意事项

1. **手机号不可更新**：手机号是唯一标识，创建后不能修改
2. **部分更新**：只需要传递需要更新的字段，不需要传递所有字段
3. **月嫂档位**：只有当 `jobType` 为 "yuexin" 时，`maternityNurseLevel` 才有意义
4. **数据验证**：更新时会进行数据验证，确保数据格式正确
5. **自我介绍**：更新时会保留自我介绍内容，不会被清空

## 🔧 常见问题

### Q: 如何只更新部分字段？
A: 只需要在请求体中包含需要更新的字段即可，其他字段保持不变。

### Q: 更新后如何获取最新数据？
A: 更新接口会返回更新后的完整简历数据，可以直接使用。

### Q: 如何清空某个字段？
A: 将该字段设置为 `null` 或空字符串（根据字段类型）。

### Q: 月嫂档位可以随时修改吗？
A: 可以，只要工种是月嫂，就可以随时更新档位。



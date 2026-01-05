# 小程序简历API - 列表和详情

## 📋 目录

- [认证授权](#认证授权)
- [获取简历详情](#获取简历详情)
- [数据字典](#数据字典)

---

## 🔐 认证授权

### 基础信息

- **生产环境**: `https://crm.andejiazheng.com/api`
- **认证方式**: Bearer Token
- **请求头**: `Authorization: Bearer {token}`

### 获取Token

```http
POST /api/auth/miniprogram/login
Content-Type: application/json

{
  "code": "微信登录code"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "openid": "openid"
    }
  }
}
```

---

## 🔍 获取简历详情

获取指定ID的简历详细信息。

### 请求

```http
GET /api/resumes/miniprogram/{id}
Authorization: Bearer {token}
```

### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 简历ID |

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
    "orderStatus": "available",
    "learningIntention": "yes",
    "currentStage": "working",
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

### 错误响应

**简历不存在 (404)**:
```json
{
  "success": false,
  "data": null,
  "message": "简历不存在"
}
```

**未授权 (401)**:
```json
{
  "success": false,
  "message": "未授权，请先登录"
}
```

---

## 📖 数据字典

### 工种类型 (jobType)

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

### 学历类型 (education)

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

### 月嫂档位 (maternityNurseLevel)

**仅当 jobType 为 "yuexin" (月嫂) 时使用**

| 值 | 说明 |
|---|---|
| `junior` | 初级月嫂 |
| `silver` | 银牌月嫂 |
| `gold` | 金牌月嫂 |
| `platinum` | 铂金月嫂 |
| `diamond` | 钻石月嫂 |
| `crown` | 皇冠月嫂 |

### 性别 (gender)

| 值 | 说明 |
|---|---|
| `female` | 女 |
| `male` | 男 |

### 婚姻状况 (maritalStatus)

| 值 | 说明 |
|---|---|
| `single` | 未婚 |
| `married` | 已婚 |
| `divorced` | 离异 |
| `widowed` | 丧偶 |

### 接单状态 (orderStatus)

| 值 | 说明 |
|---|---|
| `available` | 可接单 |
| `busy` | 忙碌中 |
| `unavailable` | 暂不接单 |

### 培训意向 (learningIntention)

| 值 | 说明 |
|---|---|
| `yes` | 有意向 |
| `no` | 无意向 |
| `considering` | 考虑中 |

### 当前阶段 (currentStage)

| 值 | 说明 |
|---|---|
| `training` | 培训中 |
| `working` | 工作中 |
| `resting` | 休息中 |
| `seeking` | 求职中 |

### 技能列表 (skills)

| 值 | 说明 |
|---|---|
| `chanhou` | 产后护理 |
| `yuying` | 婴儿护理 |
| `cuiru` | 催乳 |
| `zaojiao` | 早教 |
| `yingyang` | 营养配餐 |
| `jiating` | 家庭保洁 |
| `laoren` | 老人护理 |
| `chongwu` | 宠物护理 |

---

## 💻 小程序端使用示例

### API封装

```javascript
// utils/api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

class API {
  getToken() {
    return wx.getStorageSync('token');
  }

  async request(url, options = {}) {
    const token = this.getToken();
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await wx.request({
        url: `${BASE_URL}${url}`,
        method: options.method || 'GET',
        header,
        data: options.data
      });

      if (response.statusCode === 401) {
        // token过期，重新登录
        await this.login();
        return this.request(url, options);
      }

      return response.data;
    } catch (error) {
      console.error('请求失败:', error);
      throw error;
    }
  }

  async login() {
    const { code } = await wx.login();
    const response = await wx.request({
      url: `${BASE_URL}/auth/miniprogram/login`,
      method: 'POST',
      data: { code }
    });

    if (response.data.success) {
      wx.setStorageSync('token', response.data.data.token);
      return response.data.data;
    }
    throw new Error('登录失败');
  }

  // 获取简历详情
  async getResume(id) {
    return this.request(`/resumes/miniprogram/${id}`);
  }
}

export default new API();
```

### 简历详情页面

```javascript
// pages/resume/detail.js
import api from '../../utils/api';

Page({
  data: {
    resumeId: '',
    resume: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ resumeId: options.id });
      this.loadResume();
    }
  },

  async loadResume() {
    try {
      this.setData({ loading: true });

      const response = await api.getResume(this.data.resumeId);

      if (response.success) {
        this.setData({
          resume: response.data,
          loading: false
        });
      } else {
        wx.showToast({
          title: response.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
      console.error('加载简历失败:', error);
    }
  }
});
```

---

## ⚠️ 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 401 | 未授权，token无效或过期 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

**文档版本**: v1.0.0
**最后更新**: 2024-12-30


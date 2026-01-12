# 小程序简历API - 列表和详情

## 📋 目录

- [公开接口（推荐）](#公开接口推荐)
  - [获取简历列表（公开）](#获取简历列表公开)
  - [获取简历详情（公开）](#获取简历详情公开)
- [认证接口](#认证接口)
  - [获取简历详情（需认证）](#获取简历详情需认证)
- [数据字典](#数据字典)

---

## 🌟 公开接口（推荐）

### ⚠️ 重要说明

**新增公开接口，无需认证，返回完整数据（不脱敏）**

这些接口专为小程序端设计，无需登录即可访问，返回完整的简历数据。

---

### 📋 获取简历列表（公开）

获取分页的简历列表，支持多种筛选条件。

#### 请求

```http
GET /api/resumes/public/list
```

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | number | 否 | 1 | 页码 |
| `pageSize` | number | 否 | 10 | 每页数量（最大100） |
| `keyword` | string | 否 | - | 搜索关键词（姓名、手机号、期望职位） |
| `jobType` | string | 否 | - | 工种筛选 |
| `orderStatus` | string | 否 | - | 接单状态筛选 |
| `maxAge` | number | 否 | - | 最大年龄筛选 |
| `nativePlace` | string | 否 | - | 籍贯筛选 |
| `ethnicity` | string | 否 | - | 民族筛选 |

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "66e2f4af8b1234567890abcd",
        "name": "张三",
        "phone": "13800138000",
        "age": 35,
        "gender": "female",
        "jobType": "yuexin",
        "education": "high",
        "experienceYears": 3,
        "nativePlace": "河南省郑州市",
        "skills": ["chanhou", "yuying"],
        "expectedSalary": 8000,
        "serviceArea": ["北京市朝阳区"],
        "photoUrls": ["https://example.com/photo1.jpg"],
        "selfIntroduction": "自我介绍内容"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  },
  "message": "获取简历列表成功"
}
```

#### 小程序调用示例

```javascript
// 获取简历列表
async function getResumeList(params = {}) {
  const query = new URLSearchParams({
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    ...(params.keyword && { keyword: params.keyword }),
    ...(params.jobType && { jobType: params.jobType }),
    ...(params.maxAge && { maxAge: params.maxAge })
  }).toString();

  const response = await wx.request({
    url: `https://crm.andejiazheng.com/api/resumes/public/list?${query}`,
    method: 'GET'
  });

  return response.data;
}

// 使用示例
const result = await getResumeList({
  page: 1,
  pageSize: 20,
  jobType: 'yuexin',
  maxAge: 45
});
```

---

### 🔍 获取简历详情（公开）

获取指定ID的简历完整信息，无需认证。

#### 请求

```http
GET /api/resumes/public/:id
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 简历ID |

#### 成功响应 (200)

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
        "description": "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",
        "orderNumber": "CON12345678901",
        "district": "chaoyang",
        "customerName": "张女士",
        "customerReview": "服务态度好，专业技能强，宝宝护理得很好",
        "photos": [
          {
            "url": "https://cos.example.com/work-photo-1.jpg",
            "name": "工作照片1.jpg",
            "size": 102400,
            "mimeType": "image/jpeg"
          },
          {
            "url": "https://cos.example.com/work-photo-2.jpg",
            "name": "工作照片2.jpg",
            "size": 98304,
            "mimeType": "image/jpeg"
          }
        ]
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
  "message": "获取简历详情成功"
}
```

#### 小程序调用示例

```javascript
// 获取简历详情
async function getResumeDetail(id) {
  const response = await wx.request({
    url: `https://crm.andejiazheng.com/api/resumes/public/${id}`,
    method: 'GET'
  });

  return response.data;
}

// 使用示例
const detail = await getResumeDetail('66e2f4af8b1234567890abcd');
if (detail.success) {
  console.log('简历详情:', detail.data);
}
```

---

## 🔐 认证接口

### 获取简历详情（需认证）

如果需要通过认证方式访问，可以使用以下接口。

#### 请求

```http
GET /api/resumes/miniprogram/{id}
Authorization: Bearer {token}
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 简历ID |

#### 成功响应 (200)

响应格式与公开接口相同。

---

## 📊 数据字典

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

## 📝 工作经历字段详细说明

### 工作经历对象结构

每个工作经历对象包含以下字段：

#### 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `startDate` | string | 开始日期 | "2020-01-01" |
| `endDate` | string | 结束日期 | "2023-12-31" |
| `description` | string | 工作描述 | "在北京朝阳区某家庭担任月嫂" |

#### 可选字段（新增）

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `orderNumber` | string | 订单编号（格式：CON{11位数字}） | "CON12345678901" |
| `district` | string | 服务区域（北京市区县代码） | "chaoyang" |
| `customerName` | string | 客户姓名 | "张女士" |
| `customerReview` | string | 客户评价 | "服务态度好，专业技能强" |
| `photos` | array | 工作照片数组 | 见下方照片对象说明 |

### 工作照片对象结构

每个照片对象包含以下字段：

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `url` | string | 是 | 图片URL | "https://cos.example.com/photo.jpg" |
| `name` | string | 否 | 文件名 | "工作照片1.jpg" |
| `size` | number | 否 | 文件大小（字节） | 102400 |
| `mimeType` | string | 否 | MIME类型 | "image/jpeg" |

### 北京市区县代码对照表

| 代码 | 区县名称 | 代码 | 区县名称 |
|------|----------|------|----------|
| `dongcheng` | 东城区 | `xicheng` | 西城区 |
| `chaoyang` | 朝阳区 | `fengtai` | 丰台区 |
| `shijingshan` | 石景山区 | `haidian` | 海淀区 |
| `mentougou` | 门头沟区 | `fangshan` | 房山区 |
| `tongzhou` | 通州区 | `shunyi` | 顺义区 |
| `changping` | 昌平区 | `daxing` | 大兴区 |
| `huairou` | 怀柔区 | `pinggu` | 平谷区 |
| `miyun` | 密云区 | `yanqing` | 延庆区 |

### 使用示例

```javascript
// 创建包含完整工作经历的简历
const workExperiences = [
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
  },
  {
    startDate: "2020-05-01",
    endDate: "2020-07-31",
    description: "在北京海淀区某家庭担任月嫂",
    orderNumber: "CON12345678902",
    district: "haidian",
    customerName: "李女士"
    // 其他字段可选，不填写也可以
  }
];

// 在创建简历时使用
const resumeData = {
  name: "张三",
  phone: "13800138000",
  // ... 其他必填字段
  workExperiences: workExperiences
};
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


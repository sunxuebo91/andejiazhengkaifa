# 小程序API完整文档

## 📋 目录

- [认证授权](#认证授权)
- [Banner轮播图](#banner轮播图)
- [文章内容](#文章内容)
  - [获取文章列表](#获取文章列表)
  - [获取文章详情](#获取文章详情)
- [简历管理](#简历管理)
  - [创建简历](#创建简历)
  - [获取简历详情](#获取简历详情)
  - [更新简历](#更新简历)
- [员工评价](#员工评价)
  - [创建员工评价](#创建员工评价)
  - [获取评价列表](#获取评价列表)
  - [获取评价统计](#获取评价统计)
- [文件上传](#文件上传)
- [数据字典](#数据字典)
- [错误码说明](#错误码说明)

---

## 🔐 认证授权

### 基础信息

- **生产环境**: `https://crm.andejiazheng.com/api`
- **开发环境**: `http://localhost:3000/api`
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

## 🖼️ Banner轮播图

获取小程序首页展示的Banner轮播图列表。

### 获取活跃Banner列表

获取所有启用状态的Banner，按排序字段升序排列。

#### 请求

```http
GET /api/banners/miniprogram/active
```

**认证**: ❌ 无需登录

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "_id": "696224b526da74c3b9e0c565",
      "title": "首页Banner",
      "imageUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/personalPhoto/xxx.jpg",
      "linkType": "none",
      "order": 0
    },
    {
      "_id": "696224b526da74c3b9e0c566",
      "title": "活动Banner",
      "imageUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/personalPhoto/yyy.jpg",
      "linkType": "none",
      "order": 1
    }
  ],
  "message": "获取成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | Banner唯一ID |
| `title` | string | Banner标题 |
| `imageUrl` | string | 图片URL（腾讯云COS） |
| `linkType` | string | 链接类型：none（无跳转） |
| `order` | number | 排序值，数字越小越靠前 |

#### 小程序调用示例

```javascript
// utils/api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

/**
 * 获取首页Banner列表
 * @returns {Promise<Array>} Banner列表
 */
export function getBannerList() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/banners/miniprogram/active`,
      method: 'GET',
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '获取Banner失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
```

```javascript
// pages/index/index.js
import { getBannerList } from '../../utils/api';

Page({
  data: {
    bannerList: []
  },

  onLoad() {
    this.loadBanners();
  },

  async loadBanners() {
    try {
      const banners = await getBannerList();
      this.setData({ bannerList: banners });
    } catch (err) {
      console.error('加载Banner失败:', err);
    }
  }
});
```

```html
<!-- pages/index/index.wxml -->
<swiper class="banner-swiper" indicator-dots autoplay circular>
  <swiper-item wx:for="{{bannerList}}" wx:key="_id">
    <image src="{{item.imageUrl}}" mode="aspectFill" class="banner-image" />
  </swiper-item>
</swiper>
```

```css
/* pages/index/index.wxss */
.banner-swiper {
  width: 100%;
  height: 300rpx;
}
.banner-image {
  width: 100%;
  height: 100%;
}
```

---

## 📰 文章内容

小程序可以获取和展示褓贝后台发布的文章内容，用于育儿知识、家政技巧等内容展示。

### 📱 一句话总结

**小程序调用文章接口非常简单：使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/list?page=1&pageSize=10` 获取文章列表，使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/:id` 获取文章详情。两个接口都是公开接口（无需传 token），自动只返回已发布文章。列表返回文章数组和分页信息，详情返回完整内容（包括 contentHtml 富文本和 imageUrls 图片数组）。使用 `<rich-text nodes="{{article.contentHtml}}">` 渲染富文本，使用 `<image wx:for="{{article.imageUrls}}">` 展示图片。支持搜索、分页、上拉加载更多等功能。**

### 获取文章列表

获取已发布的文章列表，支持分页和搜索。

#### 请求

```http
GET /api/articles/miniprogram/list?page=1&pageSize=10&keyword=育儿
```

**认证**: ❌ 无需登录（公开接口，自动只返回已发布文章）

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 否 | 搜索关键词（标题/正文/作者/来源） |
| `page` | number | 否 | 页码，默认 1 |
| `pageSize` | number | 否 | 每页数量，默认 10 |

**注意**：小程序接口自动只返回 `status='published'` 的文章，无需传 status 参数。

#### 响应

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "6967700ebaf1a7bfe723665c",
        "title": "新生儿护理要点",
        "author": "新华社",
        "source": "人民日报",
        "status": "published",
        "createdAt": "2026-01-15T10:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z",
        "createdBy": {
          "_id": "user123",
          "name": "管理员",
          "username": "admin"
        }
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  },
  "message": "获取成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文章唯一ID |
| `title` | string | 文章标题 |
| `author` | string | 作者 |
| `source` | string | 来源/出处 |
| `status` | string | 状态：`draft`（草稿）、`published`（已发布） |
| `createdAt` | string | 创建时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |
| `createdBy` | object | 创建人信息 |
| `total` | number | 总记录数 |
| `page` | number | 当前页码 |
| `pageSize` | number | 每页数量 |
| `totalPages` | number | 总页数 |

---

### 获取文章详情

获取单篇文章的完整内容，包括正文和图片。

#### 请求

```http
GET /api/articles/miniprogram/:id
```

**认证**: ❌ 无需登录（公开接口，自动只返回已发布文章）

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 文章ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "_id": "6967700ebaf1a7bfe723665c",
    "title": "新生儿护理要点",
    "author": "新华社",
    "source": "人民日报",
    "contentRaw": "新生儿护理是每个新手父母都需要掌握的技能...\n\n## 一、温度控制\n\n新生儿体温调节能力较弱...",
    "contentHtml": "<p>新生儿护理是每个新手父母都需要掌握的技能...</p><h2>一、温度控制</h2><p>新生儿体温调节能力较弱...</p>",
    "imageUrls": [
      "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/article/image1.jpg",
      "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/article/image2.jpg"
    ],
    "status": "published",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z",
    "createdBy": {
      "_id": "user123",
      "name": "管理员",
      "username": "admin"
    },
    "updatedBy": {
      "_id": "user123",
      "name": "管理员",
      "username": "admin"
    }
  },
  "message": "获取成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文章唯一ID |
| `title` | string | 文章标题 |
| `author` | string | 作者 |
| `source` | string | 来源/出处 |
| `contentRaw` | string | 原始正文内容（支持简易Markdown格式） |
| `contentHtml` | string | HTML格式的正文内容（已处理格式） |
| `imageUrls` | array | 图片URL列表（腾讯云COS） |
| `status` | string | 状态：`draft`（草稿）、`published`（已发布） |
| `createdAt` | string | 创建时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |
| `createdBy` | object | 创建人信息 |
| `updatedBy` | object | 最后更新人信息 |

#### 小程序调用示例

```javascript
// utils/api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

/**
 * 获取文章列表（小程序专用公开接口）
 * @param {Object} params - 查询参数
 * @param {string} params.keyword - 搜索关键词
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise<Object>} 文章列表数据
 */
export function getArticleList(params = {}) {
  const { keyword = '', page = 1, pageSize = 10 } = params;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/list`,
      method: 'GET',
      data: {
        keyword,
        page,
        pageSize
      },
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '获取文章列表失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

/**
 * 获取文章详情（小程序专用公开接口）
 * @param {string} id - 文章ID
 * @returns {Promise<Object>} 文章详情数据
 */
export function getArticleDetail(id) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/${id}`,
      method: 'GET',
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '获取文章详情失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
```

```javascript
// pages/article/list/list.js
import { getArticleList } from '../../../utils/api';

Page({
  data: {
    articleList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadArticles();
  },

  async loadArticles() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const result = await getArticleList({
        page: this.data.page,
        pageSize: this.data.pageSize
      });

      this.setData({
        articleList: [...this.data.articleList, ...result.list],
        total: result.total,
        page: this.data.page + 1,
        hasMore: this.data.articleList.length + result.list.length < result.total,
        loading: false
      });
    } catch (err) {
      console.error('加载文章失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      articleList: [],
      page: 1,
      hasMore: true
    });
    this.loadArticles().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadArticles();
  },

  // 跳转到文章详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/article/detail/detail?id=${id}`
    });
  }
});
```

```javascript
// pages/article/detail/detail.js
import { getArticleDetail } from '../../../utils/api';

Page({
  data: {
    article: null,
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadArticle(id);
    }
  },

  async loadArticle(id) {
    try {
      const article = await getArticleDetail(id);
      this.setData({
        article,
        loading: false
      });
    } catch (err) {
      console.error('加载文章详情失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  }
});
```

```html
<!-- pages/article/list/list.wxml -->
<view class="article-list">
  <view class="article-item" wx:for="{{articleList}}" wx:key="_id"
        bindtap="goToDetail" data-id="{{item._id}}">
    <view class="article-title">{{item.title}}</view>
    <view class="article-meta">
      <text class="author">{{item.author}}</text>
      <text class="date">{{item.createdAt}}</text>
    </view>
  </view>

  <view class="loading" wx:if="{{loading}}">加载中...</view>
  <view class="no-more" wx:if="{{!hasMore && articleList.length > 0}}">没有更多了</view>
</view>
```

```html
<!-- pages/article/detail/detail.wxml -->
<view class="article-detail" wx:if="{{article}}">
  <view class="article-header">
    <view class="article-title">{{article.title}}</view>
    <view class="article-meta">
      <text class="author">作者：{{article.author}}</text>
      <text class="source" wx:if="{{article.source}}">来源：{{article.source}}</text>
      <text class="date">{{article.createdAt}}</text>
    </view>
  </view>

  <view class="article-content">
    <rich-text nodes="{{article.contentHtml}}"></rich-text>
  </view>

  <view class="article-images" wx:if="{{article.imageUrls.length > 0}}">
    <image wx:for="{{article.imageUrls}}" wx:key="index"
           src="{{item}}" mode="widthFix" class="article-image" />
  </view>
</view>
```

---

## 📝 简历管理

### 创建简历

创建一个新的简历记录。

#### 请求

```http
POST /api/resumes/miniprogram/create
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: {unique-key}  # 可选，用于防止重复提交

{
  "name": "张三",
  "phone": "13800138000",
  "gender": "female",
  "age": 35,
  "jobType": "yuexin",
  "education": "high",
  "maternityNurseLevel": "gold",
  "expectedSalary": 8000,
  "nativePlace": "河南省郑州市",
  "experienceYears": 3,
  "skills": ["chanhou", "yuying"],
  "serviceArea": ["北京市朝阳区"],
  "selfIntroduction": "自我介绍内容",
  "wechat": "wechat123",
  "currentAddress": "北京市朝阳区",
  "hukouAddress": "河南省郑州市",
  "birthDate": "1990-01-01",
  "idNumber": "410102199001011234",
  "ethnicity": "汉族",
  "zodiac": "马",
  "zodiacSign": "摩羯座",
  "maritalStatus": "married",
  "religion": "无",
  "emergencyContactName": "李四",
  "emergencyContactPhone": "13900139000",
  "medicalExamDate": "2024-01-01",
  "orderStatus": "available",
  "learningIntention": "yes",
  "currentStage": "working",
  "workExperiences": [
    {
      "startDate": "2020-01-01",
      "endDate": "2020-03-31",
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
        }
      ]
    },
    {
      "startDate": "2020-05-01",
      "endDate": "2020-07-31",
      "description": "在北京海淀区某家庭担任月嫂",
      "orderNumber": "CON12345678902",
      "district": "haidian",
      "customerName": "李女士"
    }
  ]
}
```

#### 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | 姓名，2-20字符 | "张三" |
| `phone` | string | 手机号码，11位数字 | "13800138000" |
| `gender` | string | 性别："female" 或 "male" | "female" |
| `age` | number | 年龄，18-65岁 | 35 |
| `jobType` | string | 工种类型，见[工种类型](#工种类型) | "yuexin" |
| `education` | string | 学历，见[学历类型](#学历类型) | "high" |

#### 可选字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `maternityNurseLevel` | string | 月嫂档位（仅月嫂），见[月嫂档位](#月嫂档位) | "gold" |
| `expectedSalary` | number | 期望薪资 | 8000 |
| `nativePlace` | string | 籍贯，最大20字符 | "河南省郑州市" |
| `experienceYears` | number | 工作经验年限 | 3 |
| `skills` | array | 技能列表 | ["chanhou", "yuying"] |
| `serviceArea` | array | 服务区域 | ["北京市朝阳区"] |
| `selfIntroduction` | string | 自我介绍 | "自我介绍内容" |
| `wechat` | string | 微信号 | "wechat123" |
| `currentAddress` | string | 现居地址 | "北京市朝阳区" |
| `hukouAddress` | string | 户口地址 | "河南省郑州市" |
| `birthDate` | string | 出生日期，格式：YYYY-MM-DD | "1990-01-01" |
| `idNumber` | string | 身份证号 | "410102199001011234" |
| `ethnicity` | string | 民族 | "汉族" |
| `zodiac` | string | 生肖 | "马" |
| `zodiacSign` | string | 星座 | "摩羯座" |
| `maritalStatus` | string | 婚姻状况，见[婚姻状况](#婚姻状况) | "married" |
| `religion` | string | 宗教信仰 | "无" |
| `emergencyContactName` | string | 紧急联系人姓名 | "李四" |
| `emergencyContactPhone` | string | 紧急联系人电话 | "13900139000" |
| `medicalExamDate` | string | 体检日期，格式：YYYY-MM-DD | "2024-01-01" |
| `orderStatus` | string | 接单状态，见[接单状态](#接单状态) | "available" |
| `learningIntention` | string | 培训意向，见[培训意向](#培训意向) | "yes" |
| `currentStage` | string | 当前阶段，见[当前阶段](#当前阶段) | "working" |
| `workExperiences` | array | 工作经历数组（详见下方说明） | 见下方说明 |

#### 工作经历对象结构

```json
{
  // 必填字段
  "startDate": "2020-01-01",      // 必填：开始日期（YYYY-MM-DD）
  "endDate": "2023-12-31",        // 必填：结束日期（YYYY-MM-DD）
  "description": "在北京朝阳区某家庭担任月嫂，负责新生儿护理和产妇月子餐",  // 必填：工作描述

  // 可选字段（新增）
  "orderNumber": "CON12345678901",  // 可选：订单编号（格式：CON{11位数字}）
  "district": "chaoyang",           // 可选：服务区域（北京市区县代码）
  "customerName": "张女士",         // 可选：客户姓名
  "customerReview": "服务态度好，专业技能强，宝宝护理得很好",  // 可选：客户评价
  "photos": [                       // 可选：工作照片数组
    {
      "url": "https://cos.example.com/work-photo-1.jpg",  // 必填：图片URL
      "name": "工作照片1.jpg",      // 可选：文件名
      "size": 102400,               // 可选：文件大小（字节）
      "mimeType": "image/jpeg"      // 可选：MIME类型
    }
  ]
}
```

**北京市区县代码**：
```
dongcheng: 东城区      xicheng: 西城区       chaoyang: 朝阳区
fengtai: 丰台区        shijingshan: 石景山区  haidian: 海淀区
mentougou: 门头沟区    fangshan: 房山区      tongzhou: 通州区
shunyi: 顺义区         changping: 昌平区     daxing: 大兴区
huairou: 怀柔区        pinggu: 平谷区        miyun: 密云区
yanqing: 延庆区
```

#### 成功响应 (201)

```json
{
  "success": true,
  "data": {
    "id": "66e2f4af8b1234567890abcd",
    "createdAt": "2025-09-12T10:19:27.671Z",
    "action": "CREATED",
    "resume": {
      "id": "66e2f4af8b1234567890abcd",
      "name": "张三",
      "phone": "13800138000",
      "age": 35,
      "gender": "female",
      "jobType": "yuexin",
      "education": "high",
      "maternityNurseLevel": "gold",
      "expectedSalary": 8000,
      // ... 其他字段
    }
  },
  "message": "创建简历成功"
}
```

#### 错误响应

**重复手机号 (409)**:
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

**验证错误 (400)**:
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

---

### 获取简历详情

获取指定ID的简历详细信息。

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
        "endDate": "2020-03-31",
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
      },
      {
        "startDate": "2020-05-01",
        "endDate": "2020-07-31",
        "description": "在北京海淀区某家庭担任月嫂",
        "orderNumber": "CON12345678902",
        "district": "haidian",
        "customerName": "李女士"
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

#### 错误响应

**简历不存在 (404)**:
```json
{
  "success": false,
  "data": null,
  "message": "简历不存在"
}
```

---

### 更新简历

更新指定ID的简历信息。支持部分更新，只需传递需要更新的字段。

#### 请求

```http
PUT /api/resumes/miniprogram/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "expectedSalary": 9000,
  "maternityNurseLevel": "platinum",
  "selfIntroduction": "更新后的自我介绍",
  "orderStatus": "available"
}
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 简历ID |

#### 可更新字段

除了 `phone`（手机号）外，所有创建时的可选字段都可以更新。

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
    "expectedSalary": 9000,
    "maternityNurseLevel": "platinum",
    "nativePlace": "河南省郑州市",
    "skills": ["chanhou", "yuying"],
    "serviceArea": ["北京市朝阳区"],
    "selfIntroduction": "更新后的自我介绍",
    "orderStatus": "available",
    // ... 其他字段
  },
  "message": "更新简历成功"
}
```

#### 错误响应

**简历不存在 (404)**:
```json
{
  "success": false,
  "message": "简历不存在"
}
```

**验证错误 (400)**:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "data": {
    "errors": ["年龄必须在18-65之间"]
  },
  "message": "数据验证失败"
}
```

---

## 📁 文件上传

### 上传文件

上传各类文件（照片、证书、视频等）。

#### 请求

```http
POST /api/upload/miniprogram
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [文件二进制数据]
type: "idcard-front" | "idcard-back" | "photo" | "certificate" | "report" | "video"
```

#### 文件类型说明

| type值 | 说明 | 支持格式 | 大小限制 |
|--------|------|----------|----------|
| `idcard-front` | 身份证正面 | jpg, jpeg, png | 5MB |
| `idcard-back` | 身份证反面 | jpg, jpeg, png | 5MB |
| `photo` | 个人照片 | jpg, jpeg, png | 5MB |
| `certificate` | 证书照片 | jpg, jpeg, png | 5MB |
| `report` | 体检报告 | jpg, jpeg, png, pdf | 10MB |
| `video` | 自我介绍视频 | mp4, mov | 50MB |

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "url": "https://example.com/uploads/photo/123456.jpg",
    "key": "uploads/photo/123456.jpg",
    "size": 102400,
    "mimeType": "image/jpeg"
  },
  "message": "上传成功"
}
```

#### 错误响应

**文件过大 (413)**:
```json
{
  "success": false,
  "message": "文件大小超过限制"
}
```

**文件格式不支持 (400)**:
```json
{
  "success": false,
  "message": "不支持的文件格式"
}
```

### 删除文件

删除已上传的文件。

#### 请求

```http
DELETE /api/upload/miniprogram
Authorization: Bearer {token}
Content-Type: application/json

{
  "key": "uploads/photo/123456.jpg"
}
```

#### 成功响应 (200)

```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 简历文件上传（推荐）

上传简历相关文件，直接关联到简历记录。

#### 上传单个文件

```http
POST /api/resumes/miniprogram/:id/upload-file
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [文件二进制数据]
type: "idCardFront" | "idCardBack" | "personalPhoto" | "certificate" | "medicalReport" | "selfIntroductionVideo" | "confinementMealPhoto" | "cookingPhoto" | "complementaryFoodPhoto" | "positiveReviewPhoto"
```

#### 文件类型说明

| type值 | 说明 | 对应字段 |
|--------|------|---------|
| `idCardFront` | 身份证正面 | `idCardFront` |
| `idCardBack` | 身份证背面 | `idCardBack` |
| `personalPhoto` | 个人照片 | `photoUrls` / `personalPhoto` |
| `certificate` | 技能证书 | `certificateUrls` / `certificates` |
| `medicalReport` | 体检报告 | `medicalReportUrls` / `reports` |
| `selfIntroductionVideo` | 自我介绍视频 | `selfIntroductionVideo` |
| `confinementMealPhoto` | 月子餐照片 | `confinementMealPhotos` |
| `cookingPhoto` | 烹饪照片 | `cookingPhotos` |
| `complementaryFoodPhoto` | 辅食添加照片 | `complementaryFoodPhotos` |
| `positiveReviewPhoto` | 好评展示照片 | `positiveReviewPhotos` |

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "fileUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/xxx.jpg",
    "fileType": "certificate",
    "fileName": "photo.jpg",
    "fileSize": 123456,
    "resumeId": "68ea31595750fa9479e15732"
  },
  "message": "文件上传成功"
}
```

#### 删除简历文件

```http
DELETE /api/resumes/miniprogram/:id/delete-file
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/xxx.jpg",
  "fileType": "certificate"
}
```

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "resumeId": "68ea31595750fa9479e15732",
    "deletedFileUrl": "https://...",
    "fileType": "certificate"
  },
  "message": "文件删除成功"
}
```

---

## 📖 数据字典

### 工种类型

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

### 学历类型

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

### 月嫂档位

**仅当 jobType 为 "yuexin" (月嫂) 时使用**

| 值 | 说明 |
|---|---|
| `junior` | 初级月嫂 |
| `silver` | 银牌月嫂 |
| `gold` | 金牌月嫂 |
| `platinum` | 铂金月嫂 |
| `diamond` | 钻石月嫂 |
| `crown` | 皇冠月嫂 |

### 婚姻状况

| 值 | 说明 |
|---|---|
| `single` | 未婚 |
| `married` | 已婚 |
| `divorced` | 离异 |
| `widowed` | 丧偶 |

### 接单状态

| 值 | 说明 |
|---|---|
| `available` | 可接单 |
| `busy` | 忙碌中 |
| `unavailable` | 暂不接单 |

### 培训意向

| 值 | 说明 |
|---|---|
| `yes` | 有意向 |
| `no` | 无意向 |
| `considering` | 考虑中 |

### 当前阶段

| 值 | 说明 |
|---|---|
| `training` | 培训中 |
| `working` | 工作中 |
| `resting` | 休息中 |
| `seeking` | 求职中 |

### 技能列表

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

## ⚠️ 错误码说明

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，token无效或过期 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如手机号重复） |
| 413 | 请求体过大 |
| 500 | 服务器内部错误 |

### 业务错误码

| 错误码 | 说明 |
|--------|------|
| `VALIDATION_ERROR` | 数据验证失败 |
| `DUPLICATE` | 资源重复（如手机号已存在） |
| `NOT_FOUND` | 资源不存在 |
| `UNAUTHORIZED` | 未授权 |
| `FORBIDDEN` | 禁止访问 |
| `FILE_TOO_LARGE` | 文件过大 |
| `INVALID_FILE_TYPE` | 文件类型不支持 |

---

## 💻 小程序端集成示例

### 完整的API封装

```javascript
// utils/api.js
const BASE_URL = 'https://crm.andejiazheng.com/api';

class API {
  // 获取token
  getToken() {
    return wx.getStorageSync('token');
  }

  // 通用请求方法
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

  // 登录
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

  // 创建简历
  async createResume(data) {
    return this.request('/resumes/miniprogram/create', {
      method: 'POST',
      data
    });
  }

  // 获取简历详情
  async getResume(id) {
    return this.request(`/resumes/miniprogram/${id}`);
  }

  // 更新简历
  async updateResume(id, data) {
    return this.request(`/resumes/miniprogram/${id}`, {
      method: 'PUT',
      data
    });
  }

  // 上传文件
  async uploadFile(filePath, type) {
    const token = this.getToken();

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${BASE_URL}/upload/miniprogram`,
        filePath,
        name: 'file',
        formData: { type },
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.success) {
            resolve(data.data);
          } else {
            reject(new Error(data.message));
          }
        },
        fail: reject
      });
    });
  }

  // 删除文件
  async deleteFile(key) {
    return this.request('/upload/miniprogram', {
      method: 'DELETE',
      data: { key }
    });
  }
}

export default new API();
```

### 创建简历页面示例

```javascript
// pages/resume/create.js
import api from '../../utils/api';

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      gender: 'female',
      age: 30,
      jobType: 'yuexin',
      education: 'high',
      maternityNurseLevel: 'gold',
      expectedSalary: 8000,
      nativePlace: '',
      experienceYears: 0,
      skills: [],
      serviceArea: [],
      selfIntroduction: '',
      wechat: '',
      currentAddress: '',
      orderStatus: 'available'
    },

    // 选项列表
    jobTypes: [
      { value: 'yuexin', label: '月嫂' },
      { value: 'zhujia-yuer', label: '住家育儿嫂' },
      { value: 'baiban-yuer', label: '白班育儿嫂' }
    ],

    maternityNurseLevels: [
      { value: 'junior', label: '初级月嫂' },
      { value: 'silver', label: '银牌月嫂' },
      { value: 'gold', label: '金牌月嫂' },
      { value: 'platinum', label: '铂金月嫂' },
      { value: 'diamond', label: '钻石月嫂' },
      { value: 'crown', label: '皇冠月嫂' }
    ],

    showMaternityLevel: true
  },

  onLoad() {
    // 页面加载
  },

  // 工种变化
  onJobTypeChange(e) {
    const jobType = e.detail.value;
    this.setData({
      'formData.jobType': jobType,
      showMaternityLevel: jobType === 'yuexin'
    });
  },

  // 表单输入
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 提交表单
  async onSubmit() {
    const { formData } = this.data;

    // 验证必填字段
    if (!formData.name || !formData.phone) {
      wx.showToast({
        title: '请填写必填信息',
        icon: 'none'
      });
      return;
    }

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });

      // 如果不是月嫂，移除档位字段
      const submitData = { ...formData };
      if (submitData.jobType !== 'yuexin') {
        delete submitData.maternityNurseLevel;
      }

      const response = await api.createResume(submitData);

      wx.hideLoading();

      if (response.success) {
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        });

        // 跳转到详情页
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/resume/detail?id=${response.data.id}`
          });
        }, 1500);
      } else {
        wx.showToast({
          title: response.message || '创建失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
      console.error('创建简历失败:', error);
    }
  }
});
```

### 简历详情页面示例

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

  // 加载简历
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
  },

  // 编辑简历
  onEdit() {
    wx.navigateTo({
      url: `/pages/resume/edit?id=${this.data.resumeId}`
    });
  },

  // 更新接单状态
  async updateOrderStatus(status) {
    try {
      wx.showLoading({ title: '更新中...' });

      const response = await api.updateResume(this.data.resumeId, {
        orderStatus: status
      });

      wx.hideLoading();

      if (response.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        this.loadResume();
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  }
});
```

### 文件上传示例

```javascript
// pages/resume/upload.js
import api from '../../utils/api';

Page({
  data: {
    resumeId: '',
    photos: []
  },

  // 选择照片
  async choosePhoto() {
    try {
      const { tempFilePaths } = await wx.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      // 上传所有照片
      for (const filePath of tempFilePaths) {
        await this.uploadPhoto(filePath);
      }
    } catch (error) {
      console.error('选择照片失败:', error);
    }
  },

  // 上传照片
  async uploadPhoto(filePath) {
    try {
      wx.showLoading({ title: '上传中...' });

      const result = await api.uploadFile(filePath, 'photo');

      wx.hideLoading();

      // 添加到照片列表
      this.setData({
        photos: [...this.data.photos, result]
      });

      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
      console.error('上传照片失败:', error);
    }
  },

  // 删除照片
  async deletePhoto(index) {
    const photo = this.data.photos[index];

    try {
      const result = await wx.showModal({
        title: '确认删除',
        content: '确定要删除这张照片吗？'
      });

      if (result.confirm) {
        wx.showLoading({ title: '删除中...' });

        await api.deleteFile(photo.key);

        wx.hideLoading();

        // 从列表中移除
        const photos = [...this.data.photos];
        photos.splice(index, 1);
        this.setData({ photos });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
      console.error('删除照片失败:', error);
    }
  }
});
```

---

## 📋 最佳实践

### 1. 错误处理

```javascript
async function handleRequest() {
  try {
    const response = await api.createResume(data);

    if (response.success) {
      // 处理成功
    } else {
      // 处理业务错误
      if (response.code === 'DUPLICATE') {
        wx.showModal({
          title: '提示',
          content: '该手机号已被使用，是否查看已有简历？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: `/pages/resume/detail?id=${response.data.existingId}`
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: response.message,
          icon: 'none'
        });
      }
    }
  } catch (error) {
    // 处理网络错误
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    });
  }
}
```

### 2. 幂等性处理

```javascript
// 使用幂等性键防止重复提交
async function createResumeWithIdempotency(data) {
  const idempotencyKey = `resume_${Date.now()}_${Math.random()}`;

  const response = await wx.request({
    url: `${BASE_URL}/resumes/miniprogram/create`,
    method: 'POST',
    header: {
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey
    },
    data
  });

  return response.data;
}
```

### 3. 数据验证

```javascript
// 前端验证
function validateResumeData(data) {
  const errors = [];

  if (!data.name || data.name.length < 2 || data.name.length > 20) {
    errors.push('姓名长度应在2-20个字符之间');
  }

  if (!/^1[3-9]\d{9}$/.test(data.phone)) {
    errors.push('手机号格式不正确');
  }

  if (data.age < 18 || data.age > 65) {
    errors.push('年龄应在18-65岁之间');
  }

  if (data.jobType === 'yuexin' && !data.maternityNurseLevel) {
    errors.push('月嫂工种需要选择档位');
  }

  return errors;
}
```

### 4. 缓存策略

```javascript
// 缓存简历数据
class ResumeCache {
  static KEY = 'resume_cache';
  static EXPIRE_TIME = 5 * 60 * 1000; // 5分钟

  static set(id, data) {
    const cache = {
      data,
      timestamp: Date.now()
    };
    wx.setStorageSync(`${this.KEY}_${id}`, cache);
  }

  static get(id) {
    const cache = wx.getStorageSync(`${this.KEY}_${id}`);
    if (!cache) return null;

    // 检查是否过期
    if (Date.now() - cache.timestamp > this.EXPIRE_TIME) {
      this.remove(id);
      return null;
    }

    return cache.data;
  }

  static remove(id) {
    wx.removeStorageSync(`${this.KEY}_${id}`);
  }
}

// 使用缓存
async function getResumeWithCache(id) {
  // 先从缓存获取
  const cached = ResumeCache.get(id);
  if (cached) {
    return cached;
  }

  // 缓存不存在，从API获取
  const response = await api.getResume(id);
  if (response.success) {
    ResumeCache.set(id, response.data);
    return response.data;
  }

  return null;
}
```

### 5. 文件上传优化

```javascript
// 批量上传文件
async function uploadMultipleFiles(filePaths, type) {
  const results = [];
  const errors = [];

  // 限制并发数
  const concurrency = 3;

  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency);
    const promises = batch.map(async (filePath) => {
      try {
        const result = await api.uploadFile(filePath, type);
        results.push(result);
      } catch (error) {
        errors.push({ filePath, error });
      }
    });

    await Promise.all(promises);
  }

  return { results, errors };
}
```

---

## 🔍 常见问题

### Q1: Token过期怎么办？

A: API会自动处理token过期的情况。当收到401响应时，会自动重新登录并重试请求。

### Q2: 如何防止重复提交？

A: 使用`Idempotency-Key`请求头，传入唯一的键值。相同的键值在一定时间内只会处理一次。

### Q3: 月嫂档位什么时候必填？

A: 只有当`jobType`为`yuexin`（月嫂）时，才需要填写`maternityNurseLevel`字段。

### Q4: 如何更新部分字段？

A: 使用PUT请求，只传递需要更新的字段即可，其他字段保持不变。

### Q5: 文件上传失败怎么办？

A: 检查文件大小和格式是否符合要求，确保网络连接正常，可以实现重试机制。

### Q6: 如何处理手机号重复？

A: 创建时如果手机号重复，会返回409状态码和已存在的简历ID，可以引导用户查看或更新已有简历。

---

## 💡 最佳实践

### 1. 文件上传最佳实践

#### 图片预压缩
```javascript
// 在上传前压缩图片
async function compressAndUpload(filePath, type) {
  try {
    // 压缩图片
    const compressRes = await wx.compressImage({
      src: filePath,
      quality: 80
    });

    // 上传压缩后的图片
    const uploadRes = await wx.uploadFile({
      url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/upload-file`,
      filePath: compressRes.tempFilePath,
      name: 'file',
      formData: { type: type },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      }
    });

    return JSON.parse(uploadRes.data);
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
}
```

#### 批量上传优化
```javascript
// 限制并发数的批量上传
async function uploadBatch(files, concurrency = 3) {
  const results = [];
  const errors = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const batchPromises = batch.map(async (file) => {
      try {
        const result = await uploadFile(file.path, file.type);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((result, index) => {
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({
          file: batch[index],
          error: result.error
        });
      }
    });
  }

  return { results, errors };
}
```

#### 上传进度显示
```javascript
// 显示上传进度
function uploadWithProgress(filePath, type) {
  return new Promise((resolve, reject) => {
    const uploadTask = wx.uploadFile({
      url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/upload-file`,
      filePath: filePath,
      name: 'file',
      formData: { type: type },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        const data = JSON.parse(res.data);
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.message));
        }
      },
      fail: reject
    });

    // 监听上传进度
    uploadTask.onProgressUpdate((res) => {
      console.log('上传进度', res.progress);
      console.log('已上传数据长度', res.totalBytesSent);
      console.log('预期需要上传的数据总长度', res.totalBytesExpectedToSend);

      // 更新UI显示进度
      this.setData({
        uploadProgress: res.progress
      });
    });
  });
}
```

### 2. 错误处理最佳实践

#### 统一错误处理
```javascript
// 封装统一的错误处理
class APIError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

async function handleAPICall(apiFunction) {
  try {
    const result = await apiFunction();

    if (!result.success) {
      throw new APIError(
        result.code || 'UNKNOWN_ERROR',
        result.message || '操作失败',
        result.data
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof APIError) {
      // 根据错误码显示不同的提示
      switch (error.code) {
        case 'DUPLICATE':
          wx.showModal({
            title: '提示',
            content: '该手机号已被使用，是否查看已有简历？',
            success: (res) => {
              if (res.confirm) {
                // 跳转到已有简历
                wx.navigateTo({
                  url: `/pages/resume/detail?id=${error.data.existingId}`
                });
              }
            }
          });
          break;

        case 'VALIDATION_ERROR':
          wx.showToast({
            title: error.message,
            icon: 'none',
            duration: 2000
          });
          break;

        case 'FILE_TOO_LARGE':
          wx.showModal({
            title: '文件过大',
            content: '请选择小于10MB的文件',
            showCancel: false
          });
          break;

        default:
          wx.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          });
      }
    } else {
      // 网络错误等
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }

    throw error;
  }
}
```

#### 重试机制
```javascript
// 带指数退避的重试机制
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }

      // 指数退避
      const delay = baseDelay * Math.pow(2, i);
      console.log(`重试 ${i + 1}/${maxRetries}，等待 ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 使用示例
try {
  const result = await retryWithBackoff(async () => {
    return await uploadFile(filePath, 'cookingPhoto');
  });
  console.log('上传成功', result);
} catch (error) {
  console.error('上传失败，已重试3次', error);
}
```

### 3. 数据验证最佳实践

#### 前端验证
```javascript
// 表单验证工具
const validators = {
  // 手机号验证
  phone: (value) => {
    const pattern = /^1[3-9]\d{9}$/;
    if (!pattern.test(value)) {
      return '请输入正确的手机号码';
    }
    return null;
  },

  // 身份证号验证
  idNumber: (value) => {
    const pattern = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    if (!pattern.test(value)) {
      return '请输入正确的身份证号码';
    }
    return null;
  },

  // 年龄验证
  age: (value) => {
    const age = parseInt(value);
    if (isNaN(age) || age < 18 || age > 65) {
      return '年龄必须在18-65岁之间';
    }
    return null;
  },

  // 必填验证
  required: (value, fieldName) => {
    if (!value || value.trim() === '') {
      return `${fieldName}不能为空`;
    }
    return null;
  }
};

// 验证表单
function validateForm(formData) {
  const errors = [];

  // 验证必填字段
  const requiredFields = [
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'age', label: '年龄' },
    { key: 'gender', label: '性别' },
    { key: 'jobType', label: '工种' },
    { key: 'education', label: '学历' }
  ];

  requiredFields.forEach(field => {
    const error = validators.required(formData[field.key], field.label);
    if (error) errors.push(error);
  });

  // 验证手机号
  if (formData.phone) {
    const error = validators.phone(formData.phone);
    if (error) errors.push(error);
  }

  // 验证身份证号
  if (formData.idNumber) {
    const error = validators.idNumber(formData.idNumber);
    if (error) errors.push(error);
  }

  // 验证年龄
  if (formData.age) {
    const error = validators.age(formData.age);
    if (error) errors.push(error);
  }

  return errors;
}

// 使用示例
const errors = validateForm(formData);
if (errors.length > 0) {
  wx.showModal({
    title: '验证失败',
    content: errors.join('\n'),
    showCancel: false
  });
  return;
}
```

### 4. 性能优化建议

#### 数据缓存
```javascript
// 缓存简历数据
const ResumeCache = {
  cache: {},

  set(id, data, ttl = 5 * 60 * 1000) { // 默认5分钟过期
    this.cache[id] = {
      data: data,
      expireAt: Date.now() + ttl
    };
  },

  get(id) {
    const item = this.cache[id];
    if (!item) return null;

    if (Date.now() > item.expireAt) {
      delete this.cache[id];
      return null;
    }

    return item.data;
  },

  clear(id) {
    if (id) {
      delete this.cache[id];
    } else {
      this.cache = {};
    }
  }
};

// 使用缓存
async function getResume(id, forceRefresh = false) {
  // 如果不强制刷新，先尝试从缓存获取
  if (!forceRefresh) {
    const cached = ResumeCache.get(id);
    if (cached) {
      console.log('从缓存获取简历');
      return cached;
    }
  }

  // 从服务器获取
  const res = await wx.request({
    url: `${API_BASE_URL}/api/resumes/miniprogram/${id}`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${wx.getStorageSync('token')}`
    }
  });

  if (res.data.success) {
    // 存入缓存
    ResumeCache.set(id, res.data.data);
    return res.data.data;
  }

  throw new Error(res.data.message);
}
```

#### 图片懒加载
```javascript
// 图片懒加载组件
Component({
  properties: {
    src: String,
    mode: {
      type: String,
      value: 'aspectFill'
    }
  },

  data: {
    loaded: false,
    showImage: false
  },

  lifetimes: {
    attached() {
      this.observer = wx.createIntersectionObserver(this);

      this.observer
        .relativeToViewport({ bottom: 100 })
        .observe('.lazy-image', (res) => {
          if (res.intersectionRatio > 0 && !this.data.loaded) {
            this.setData({
              showImage: true,
              loaded: true
            });
            this.observer.disconnect();
          }
        });
    },

    detached() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }
});
```

### 5. 安全建议

#### Token管理
```javascript
// Token管理工具
const TokenManager = {
  // 保存Token
  saveToken(token) {
    wx.setStorageSync('token', token);
    wx.setStorageSync('tokenTime', Date.now());
  },

  // 获取Token
  getToken() {
    return wx.getStorageSync('token');
  },

  // 检查Token是否过期（假设Token有效期为7天）
  isTokenExpired() {
    const tokenTime = wx.getStorageSync('tokenTime');
    if (!tokenTime) return true;

    const expireTime = 7 * 24 * 60 * 60 * 1000; // 7天
    return Date.now() - tokenTime > expireTime;
  },

  // 清除Token
  clearToken() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('tokenTime');
  },

  // 刷新Token
  async refreshToken() {
    try {
      const res = await wx.request({
        url: `${API_BASE_URL}/api/auth/refresh`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (res.data.success) {
        this.saveToken(res.data.data.token);
        return res.data.data.token;
      }

      throw new Error('刷新Token失败');
    } catch (error) {
      this.clearToken();
      throw error;
    }
  }
};
```

#### 请求拦截器
```javascript
// 封装请求，自动处理Token
async function request(options) {
  // 检查Token是否过期
  if (TokenManager.isTokenExpired()) {
    try {
      await TokenManager.refreshToken();
    } catch (error) {
      // Token刷新失败，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
      throw new Error('登录已过期，请重新登录');
    }
  }

  // 添加Token到请求头
  const token = TokenManager.getToken();
  if (token) {
    options.header = options.header || {};
    options.header['Authorization'] = `Bearer ${token}`;
  }

  // 发送请求
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      success: (res) => {
        // 处理401未授权
        if (res.statusCode === 401) {
          TokenManager.clearToken();
          wx.redirectTo({
            url: '/pages/login/login'
          });
          reject(new Error('未授权，请重新登录'));
          return;
        }

        resolve(res);
      },
      fail: reject
    });
  });
}
```

---

## 📝 工作经历字段详细说明

### 工作经历对象完整结构

每个工作经历对象包含以下字段：

#### 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `startDate` | string | 开始日期（YYYY-MM-DD） | "2020-01-01" |
| `endDate` | string | 结束日期（YYYY-MM-DD） | "2023-12-31" |
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

#### 创建包含完整工作经历的简历

```javascript
// 小程序端示例
const createResumeWithWorkExperience = async () => {
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
    ]
  };

  try {
    const response = await wx.request({
      url: 'https://crm.andejiazheng.com/api/resumes/miniprogram/create',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: resumeData
    });

    if (response.data.success) {
      console.log('简历创建成功:', response.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('创建失败:', error);
  }
};
```

#### 更新工作经历

```javascript
// 更新现有简历的工作经历
const updateWorkExperience = async (resumeId) => {
  const updateData = {
    workExperiences: [
      {
        startDate: "2020-01-01",
        endDate: "2020-03-31",
        description: "工作描述",
        orderNumber: "CON12345678901",
        district: "chaoyang",
        customerName: "张女士",
        customerReview: "服务很好",
        photos: [
          {
            url: "https://cos.example.com/photo.jpg",
            name: "照片.jpg"
          }
        ]
      }
    ]
  };

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
      console.log('更新成功');
    }
  } catch (error) {
    console.error('更新失败:', error);
  }
};
```

### 注意事项

1. **订单编号格式**：必须是 `CON` 开头 + 11位数字，例如：`CON12345678901`
2. **服务区域代码**：必须使用北京市区县代码，不能使用中文名称
3. **日期格式**：必须使用 `YYYY-MM-DD` 格式，例如：`2020-01-01`
4. **照片URL**：必须是有效的HTTPS URL
5. **向后兼容**：所有新增字段都是可选的，不影响现有功能

---

---

## 📊 员工评价

内部员工评价管理，支持创建评价、查询评价列表和统计分析。

### 创建员工评价

创建对员工的内部评价记录。

#### 请求

```http
POST /api/employee-evaluations/miniprogram/create
Authorization: Bearer {token}
Content-Type: application/json
```

**认证**: ✅ 需要登录

#### 请求体

```json
{
  "employeeId": "507f1f77bcf86cd799439011",
  "employeeName": "张三",
  "contractId": "507f1f77bcf86cd799439012",
  "contractNo": "CON20240101001",
  "evaluationType": "daily",
  "overallRating": 4.5,
  "serviceAttitudeRating": 5,
  "professionalSkillRating": 4,
  "workEfficiencyRating": 4.5,
  "communicationRating": 5,
  "comment": "工作认真负责，专业技能强，服务态度好",
  "strengths": "服务态度好，技能熟练，沟通能力强",
  "improvements": "工作效率可以进一步提升",
  "tags": ["认真负责", "技能熟练", "沟通良好"],
  "isPublic": false,
  "status": "published"
}
```

#### 请求字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `employeeId` | string | ✅ | 被评价员工ID（简历ID） |
| `employeeName` | string | ✅ | 被评价员工姓名 |
| `contractId` | string | ❌ | 关联合同ID |
| `contractNo` | string | ❌ | 订单编号 |
| `evaluationType` | string | ✅ | 评价类型：daily/monthly/contract_end/special |
| `overallRating` | number | ✅ | 综合评分（1-5分） |
| `serviceAttitudeRating` | number | ❌ | 服务态度评分（1-5分） |
| `professionalSkillRating` | number | ❌ | 专业技能评分（1-5分） |
| `workEfficiencyRating` | number | ❌ | 工作效率评分（1-5分） |
| `communicationRating` | number | ❌ | 沟通能力评分（1-5分） |
| `comment` | string | ✅ | 评价内容 |
| `strengths` | string | ❌ | 优点 |
| `improvements` | string | ❌ | 待改进项 |
| `tags` | array | ❌ | 评价标签 |
| `isPublic` | boolean | ❌ | 是否公开（默认false） |
| `status` | string | ❌ | 状态：draft/published/archived（默认published） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "_id": "678a1b2c3d4e5f6789012345",
    "employeeId": "507f1f77bcf86cd799439011",
    "employeeName": "张三",
    "evaluatorId": "507f1f77bcf86cd799439013",
    "evaluatorName": "李经理",
    "contractId": "507f1f77bcf86cd799439012",
    "contractNo": "CON20240101001",
    "evaluationType": "daily",
    "overallRating": 4.5,
    "serviceAttitudeRating": 5,
    "professionalSkillRating": 4,
    "workEfficiencyRating": 4.5,
    "communicationRating": 5,
    "comment": "工作认真负责，专业技能强，服务态度好",
    "strengths": "服务态度好，技能熟练，沟通能力强",
    "improvements": "工作效率可以进一步提升",
    "tags": ["认真负责", "技能熟练", "沟通良好"],
    "isPublic": false,
    "status": "published",
    "evaluationDate": "2026-01-18T10:30:00.000Z",
    "createdAt": "2026-01-18T10:30:00.000Z",
    "updatedAt": "2026-01-18T10:30:00.000Z"
  },
  "message": "员工评价创建成功"
}
```

#### 小程序调用示例

```javascript
// 创建员工评价
wx.request({
  url: 'https://crm.andejiazheng.com/api/employee-evaluations/miniprogram/create',
  method: 'POST',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  data: {
    employeeId: '507f1f77bcf86cd799439011',
    employeeName: '张三',
    evaluationType: 'daily',
    overallRating: 4.5,
    serviceAttitudeRating: 5,
    professionalSkillRating: 4,
    comment: '工作认真负责，专业技能强',
    tags: ['认真负责', '技能熟练']
  },
  success(res) {
    if (res.data.success) {
      wx.showToast({ title: '评价成功', icon: 'success' });
    }
  }
});
```

---

### 获取评价列表

获取员工评价列表，支持筛选和分页。

#### 请求

```http
GET /api/employee-evaluations/miniprogram/list?employeeId={employeeId}&page=1&pageSize=10
```

**认证**: ❌ 无需登录（公开接口）

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `employeeId` | string | ❌ | 员工ID筛选 |
| `evaluatorId` | string | ❌ | 评价人ID筛选 |
| `evaluationType` | string | ❌ | 评价类型筛选 |
| `status` | string | ❌ | 状态筛选 |
| `page` | number | ❌ | 页码（默认1） |
| `pageSize` | number | ❌ | 每页数量（默认10） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "678a1b2c3d4e5f6789012345",
        "employeeId": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "张三",
          "phone": "13800138000",
          "jobType": "yuexin"
        },
        "employeeName": "张三",
        "evaluatorId": {
          "_id": "507f1f77bcf86cd799439013",
          "username": "manager01",
          "name": "李经理"
        },
        "evaluatorName": "李经理",
        "overallRating": 4.5,
        "comment": "工作认真负责，专业技能强",
        "evaluationType": "daily",
        "status": "published",
        "evaluationDate": "2026-01-18T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  },
  "message": "获取员工评价列表成功"
}
```

#### 小程序调用示例

```javascript
// 获取某个员工的评价列表
wx.request({
  url: 'https://crm.andejiazheng.com/api/employee-evaluations/miniprogram/list',
  method: 'GET',
  data: {
    employeeId: '507f1f77bcf86cd799439011',
    page: 1,
    pageSize: 20
  },
  success(res) {
    if (res.data.success) {
      const evaluations = res.data.data.items;
      console.log('评价列表:', evaluations);
    }
  }
});
```

---

### 获取评价统计

获取员工的评价统计数据，包括平均分、评分分布等。

#### 请求

```http
GET /api/employee-evaluations/miniprogram/statistics/{employeeId}
```

**认证**: ❌ 无需登录（公开接口）

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `employeeId` | string | ✅ | 员工ID（简历ID） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "employeeId": "507f1f77bcf86cd799439011",
    "totalEvaluations": 25,
    "averageRating": 4.52,
    "averageServiceAttitude": 4.8,
    "averageProfessionalSkill": 4.5,
    "averageWorkEfficiency": 4.3,
    "averageCommunication": 4.7,
    "ratingDistribution": {
      "5": 12,
      "4": 10,
      "3": 3,
      "2": 0,
      "1": 0
    },
    "recentEvaluations": [
      {
        "_id": "678a1b2c3d4e5f6789012345",
        "evaluatorName": "李经理",
        "overallRating": 4.5,
        "comment": "工作认真负责，专业技能强",
        "evaluationDate": "2026-01-18T10:30:00.000Z"
      }
    ]
  },
  "message": "获取员工评价统计成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalEvaluations` | number | 总评价数 |
| `averageRating` | number | 综合平均分 |
| `averageServiceAttitude` | number | 服务态度平均分 |
| `averageProfessionalSkill` | number | 专业技能平均分 |
| `averageWorkEfficiency` | number | 工作效率平均分 |
| `averageCommunication` | number | 沟通能力平均分 |
| `ratingDistribution` | object | 评分分布（5分制） |
| `recentEvaluations` | array | 最近5条评价 |

#### 小程序调用示例

```javascript
// 获取员工评价统计
wx.request({
  url: `https://crm.andejiazheng.com/api/employee-evaluations/miniprogram/statistics/507f1f77bcf86cd799439011`,
  method: 'GET',
  success(res) {
    if (res.data.success) {
      const stats = res.data.data;
      console.log('平均评分:', stats.averageRating);
      console.log('总评价数:', stats.totalEvaluations);
      console.log('评分分布:', stats.ratingDistribution);
    }
  }
});
```

---

## 📞 技术支持

如有问题或建议，请联系技术团队。

**文档版本**: v1.6.0
**最后更新**: 2026-01-18
**维护团队**: 安得家政技术团队

**v1.6.0 更新内容**:
- ✅ 新增员工评价管理API（创建评价、获取评价列表、获取评价统计）
- ✅ 支持多维度评分（服务态度、专业技能、工作效率、沟通能力）
- ✅ 支持评价标签和详细评语
- ✅ 提供评价统计和分析功能
- ✅ 查询接口为公开接口，无需认证
- ✅ 已上线生产环境，可直接使用

**v1.5.0 更新内容**:
- ✅ 新增文章内容管理API（获取文章列表、获取文章详情）
- ✅ 公开接口，无需认证，自动只返回已发布文章
- ✅ 提供完整的小程序调用示例和页面代码
- ✅ 支持文章搜索、分页和状态筛选
- ✅ 支持富文本渲染和图片展示
- ✅ 已上线生产环境，可直接使用


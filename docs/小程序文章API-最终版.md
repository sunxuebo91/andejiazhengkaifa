# 小程序文章API - 最终版（已上线）

## ✅ 状态：已上线可用

文章模块API已成功部署到生产环境，小程序可以直接调用。

---

## 📱 一句话总结（详细版）

**小程序调用文章模块非常简单：使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/list?page=1&pageSize=10` 获取文章列表，使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/:id` 获取文章详情。两个接口都是公开接口（无需传 Authorization token），自动只返回已发布的文章（status='published'）。列表接口返回文章数组和分页信息（list、total、page、pageSize、totalPages），详情接口返回完整内容（title、author、source、contentHtml、imageUrls等）。使用 `<rich-text nodes="{{article.contentHtml}}">` 渲染富文本内容，使用 `<image wx:for="{{article.imageUrls}}">` 展示图片。支持搜索关键词、分页加载、上拉刷新等功能，适用于育儿知识、家政技巧等内容展示。**

---

## 🔗 核心接口

### 1. 获取文章列表（公开接口）

```
GET https://crm.andejiazheng.com/api/articles/miniprogram/list
```

**参数**：
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 10）
- `keyword`: 搜索关键词（可选）

**返回示例**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "6967700ebaf1a7bfe723665c",
        "title": "恶露与月经的区别",
        "author": "妈妈网",
        "imageUrls": ["https://..."],
        "status": "published",
        "createdAt": "2026-01-14T10:29:34.910Z"
      }
    ],
    "total": 4,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  },
  "message": "获取成功"
}
```

---

### 2. 获取文章详情（公开接口）

```
GET https://crm.andejiazheng.com/api/articles/miniprogram/:id
```

**返回示例**：
```json
{
  "success": true,
  "data": {
    "_id": "6967700ebaf1a7bfe723665c",
    "title": "恶露与月经的区别",
    "author": "妈妈网",
    "source": null,
    "contentHtml": "<p>产妇在分娩后都会有一段时间是排恶露的...</p>",
    "contentRaw": "产妇在分娩后都会有一段时间是排恶露的...",
    "imageUrls": ["https://..."],
    "status": "published",
    "createdAt": "2026-01-14T10:29:34.910Z"
  },
  "message": "获取成功"
}
```

---

## 💻 小程序代码示例

### API 封装（utils/api.js）

```javascript
const BASE_URL = 'https://crm.andejiazheng.com/api';

// 获取文章列表
export function getArticleList(params = {}) {
  const { keyword = '', page = 1, pageSize = 10 } = params;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/list`,
      method: 'GET',
      data: { keyword, page, pageSize },
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message));
        }
      },
      fail: reject
    });
  });
}

// 获取文章详情
export function getArticleDetail(id) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/${id}`,
      method: 'GET',
      success(res) {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message));
        }
      },
      fail: reject
    });
  });
}
```

### 列表页（pages/article/list.js）

```javascript
import { getArticleList } from '../../utils/api';

Page({
  data: {
    articles: [],
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadArticles();
  },

  async loadArticles() {
    try {
      const result = await getArticleList({
        page: this.data.page,
        pageSize: 10
      });
      this.setData({
        articles: [...this.data.articles, ...result.list],
        page: this.data.page + 1,
        hasMore: result.page < result.totalPages
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadArticles();
  }
});
```

---

## ✨ 关键要点

1. ✅ **公开接口**：无需 token，直接调用
2. ✅ **自动筛选**：只返回已发布文章
3. ✅ **富文本支持**：使用 `<rich-text>` 渲染
4. ✅ **图片展示**：循环 `imageUrls` 数组
5. ✅ **分页加载**：支持上拉加载更多
6. ✅ **搜索功能**：通过 keyword 参数搜索

---

## 📚 完整文档

- **详细API文档**：`backend/docs/小程序API完整文档.md`（第 184-547 行）
- **快速指南**：`docs/小程序调用文章API指南.md`
- **总结文档**：`docs/文章模块API总结.md`

---

**最后更新**：2026-01-15
**状态**：✅ 已上线可用
**维护团队**：安得家政技术团队


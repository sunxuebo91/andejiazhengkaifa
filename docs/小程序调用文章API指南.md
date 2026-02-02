# 小程序调用文章API指南

## 📱 快速开始（一段话总结）

小程序调用文章模块API非常简单：首先在 `utils/api.js` 中封装两个接口函数，**获取文章列表**使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/list?page=1&pageSize=10`，**获取文章详情**使用 `GET https://crm.andejiazheng.com/api/articles/miniprogram/:id`，两个接口都是**公开接口**，无需认证（不需要传 token），自动只返回已发布的文章。在页面中调用这些函数即可获取数据，列表接口返回文章数组和分页信息，详情接口返回完整的文章内容（包括标题、作者、来源、HTML格式的正文、图片URL数组等）。使用 `<rich-text>` 组件渲染 `contentHtml` 字段可以完美展示富文本格式（加粗、斜体、字号、颜色等），使用 `<image>` 组件循环展示 `imageUrls` 数组中的图片。支持搜索关键词、分页加载、上拉刷新等功能，适用于育儿知识、家政技巧等内容展示场景。

---

## 🔧 详细步骤

### 第一步：封装API函数

在 `utils/api.js` 中添加以下代码：

```javascript
const BASE_URL = 'https://crm.andejiazheng.com/api';

/**
 * 获取文章列表（小程序专用公开接口）
 * @param {Object} params - 查询参数
 * @param {string} params.keyword - 搜索关键词（可选）
 * @param {number} params.page - 页码，默认 1
 * @param {number} params.pageSize - 每页数量，默认 10
 */
export function getArticleList(params = {}) {
  const { keyword = '', page = 1, pageSize = 10 } = params;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/list`,
      method: 'GET',
      data: { keyword, page, pageSize },
      success(res) {
        if (res.data.success) {
          resolve(res.data.data); // 返回 { list, total, page, pageSize, totalPages }
        } else {
          reject(new Error(res.data.message || '获取失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * 获取文章详情（小程序专用公开接口）
 * @param {string} id - 文章ID
 */
export function getArticleDetail(id) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/articles/miniprogram/${id}`,
      method: 'GET',
      success(res) {
        if (res.data.success) {
          resolve(res.data.data); // 返回文章对象
        } else {
          reject(new Error(res.data.message || '获取失败'));
        }
      },
      fail: reject
    });
  });
}
```

### 第二步：在列表页调用

```javascript
// pages/article/list.js
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

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadArticles();
    }
  }
});
```

### 第三步：在详情页调用

```javascript
// pages/article/detail.js
import { getArticleDetail } from '../../utils/api';

Page({
  data: {
    article: null
  },

  onLoad(options) {
    this.loadArticle(options.id);
  },

  async loadArticle(id) {
    try {
      const article = await getArticleDetail(id);
      this.setData({ article });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  }
});
```

### 第四步：渲染页面

```html
<!-- 列表页 pages/article/list.wxml -->
<view class="article-list">
  <view class="item" wx:for="{{articles}}" wx:key="_id" 
        bindtap="goToDetail" data-id="{{item._id}}">
    <text class="title">{{item.title}}</text>
    <text class="author">{{item.author}}</text>
  </view>
</view>

<!-- 详情页 pages/article/detail.wxml -->
<view class="article-detail" wx:if="{{article}}">
  <text class="title">{{article.title}}</text>
  <text class="meta">作者：{{article.author}} | 来源：{{article.source}}</text>
  
  <!-- 使用 rich-text 渲染富文本内容 -->
  <rich-text nodes="{{article.contentHtml}}" class="content"></rich-text>
  
  <!-- 展示图片 -->
  <image wx:for="{{article.imageUrls}}" wx:key="index" 
         src="{{item}}" mode="widthFix" class="image" />
</view>
```

---

## 📊 返回数据格式

### 列表接口返回
```json
{
  "list": [{ "_id": "xxx", "title": "标题", "author": "作者", ... }],
  "total": 50,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

### 详情接口返回
```json
{
  "_id": "xxx",
  "title": "标题",
  "author": "作者",
  "source": "来源",
  "contentHtml": "<p>HTML格式的正文</p>",
  "contentRaw": "原始正文",
  "imageUrls": ["图片1", "图片2"],
  "status": "published",
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```

---

## ✨ 关键要点

1. **公开接口**：两个接口都不需要传 Authorization token，自动只返回已发布文章
2. **接口路径**：使用 `/api/articles/miniprogram/list` 和 `/api/articles/miniprogram/:id`
3. **富文本渲染**：使用 `<rich-text nodes="{{article.contentHtml}}">` 渲染
4. **图片展示**：循环 `imageUrls` 数组展示图片
5. **分页加载**：通过 `page` 参数实现上拉加载更多
6. **搜索功能**：通过 `keyword` 参数实现搜索

---

## 📚 完整文档

详细的API文档请查看：`backend/docs/小程序API完整文档.md` 第 184-547 行


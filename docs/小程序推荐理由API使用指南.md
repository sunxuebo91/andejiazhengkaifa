# 小程序推荐理由API使用指南

## 📌 功能概述

推荐理由标签（`recommendationTags`）是系统自动从**客户评价**和**内部员工评价**中提取的关键词标签，用于快速展示员工的优势特点。

## 🎯 API接口

### 获取简历详情（包含推荐理由）

```http
GET /api/resumes/miniprogram/{id}
```

**认证**: ❌ 无需登录

**生产环境**: `https://crm.andejiazheng.com/api/resumes/miniprogram/{id}`

## 📊 响应数据结构

```json
{
  "success": true,
  "data": {
    "id": "694e0a9a8878020d398b7f60",
    "name": "吴文静",
    "phone": "13800138000",
    "age": 35,
    "gender": "female",
    "jobType": "yuexin",
    "selfIntroduction": "自我介绍内容...",
    
    // ... 其他简历字段 ...
    
    "employeeEvaluations": [
      {
        "_id": "694e0a9a8878020d398b7f61",
        "comment": "工作认真负责，技能熟练",
        "tags": ["认真负责", "技能熟练"],
        "overallRating": 4.5,
        "status": "published"
      }
    ],
    
    "recommendationTags": [
      {
        "tag": "形象气质好",
        "count": 3
      },
      {
        "tag": "好沟通",
        "count": 3
      },
      {
        "tag": "相处愉快",
        "count": 3
      },
      {
        "tag": "认真负责",
        "count": 2
      },
      {
        "tag": "技能熟练",
        "count": 1
      }
    ]
  },
  "message": "获取简历详情成功"
}
```

## 💡 小程序端调用示例

### 1. 基础调用

```javascript
// pages/resume/detail.js
Page({
  data: {
    resume: null,
    recommendationTags: []
  },
  
  onLoad(options) {
    const resumeId = options.id;
    this.loadResumeDetail(resumeId);
  },
  
  loadResumeDetail(id) {
    wx.request({
      url: `https://crm.andejiazheng.com/api/resumes/miniprogram/${id}`,
      method: 'GET',
      success: (res) => {
        if (res.data.success) {
          this.setData({
            resume: res.data.data,
            recommendationTags: res.data.data.recommendationTags || []
          });
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    });
  }
});
```

### 2. WXML模板

```html
<!-- pages/resume/detail.wxml -->
<view class="resume-detail">
  <!-- 基本信息 -->
  <view class="section">
    <text class="name">{{resume.name}}</text>
    <text class="age">{{resume.age}}岁</text>
  </view>
  
  <!-- 推荐理由 -->
  <view class="section recommendation-section">
    <view class="section-title">推荐理由</view>
    <view class="tag-list">
      <view 
        class="tag-item" 
        wx:for="{{recommendationTags}}" 
        wx:key="tag"
      >
        {{item.tag}}({{item.count}})
      </view>
    </view>
    <view wx:if="{{recommendationTags.length === 0}}" class="empty-tip">
      暂无推荐理由标签
    </view>
  </view>
  
  <!-- 自我介绍 -->
  <view class="section">
    <view class="section-title">自我介绍</view>
    <text class="content">{{resume.selfIntroduction}}</text>
  </view>
</view>
```

### 3. WXSS样式

```css
/* pages/resume/detail.wxss */
.recommendation-section {
  padding: 30rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  margin: 20rpx 0;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
}

.empty-tip {
  color: #999;
  font-size: 28rpx;
  text-align: center;
  padding: 40rpx 0;
}
```

## 🔍 数据来源说明

推荐理由标签从以下3个渠道自动提取：

1. **内部员工评价的tags字段** - 直接统计
2. **内部员工评价的comment内容** - 智能提取关键词
3. **工作经历中的客户评价** - 智能提取关键词

## ⚠️ 注意事项

1. ✅ **无需认证**：该接口无需登录即可访问
2. ✅ **自动生成**：标签由系统自动提取，无需手动维护
3. ✅ **实时更新**：每次添加新评价后，标签会自动更新
4. ⚠️ **可能为空**：如果没有评价数据，返回空数组 `[]`
5. ⚠️ **按热度排序**：标签按出现次数从高到低排序

## 🎨 UI设计建议

- 使用醒目的颜色（如蓝色、紫色渐变）
- 显示标签出现次数，增加可信度
- 支持横向滚动或自动换行
- 空状态时显示友好提示

## 📞 技术支持

如有问题，请查看完整文档：`backend/docs/小程序API完整文档.md`


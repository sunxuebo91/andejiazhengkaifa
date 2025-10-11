# 给小程序 AI 的删除照片指南

## 🎯 问题解决方案

小程序端删除照片的问题已经解决！**不需要通过提交空数组的方式删除照片**，CRM 后端已经提供了专门的删除 API。

## ✅ 正确的删除方式

### API 接口

```
DELETE /api/resumes/miniprogram/:id/delete-file
```

### 请求示例

```javascript
wx.request({
  url: `https://crm.andejiazheng.com/api/resumes/miniprogram/${resumeId}/delete-file`,
  method: 'DELETE',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  data: {
    fileUrl: '要删除的文件完整URL',
    fileType: 'certificate'  // 文件类型
  },
  success: (res) => {
    if (res.data.success) {
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      // 刷新页面数据
    }
  }
})
```

## 📋 支持的文件类型

| fileType 值 | 说明 |
|------------|------|
| `certificate` | 技能证书照片 |
| `personalPhoto` | 个人照片 |
| `medicalReport` | 体检报告 |
| `idCardFront` | 身份证正面 |
| `idCardBack` | 身份证背面 |

## 💻 完整实现示例

### 1. 在页面 JS 中添加删除方法

```javascript
Page({
  data: {
    resumeId: '',
    certificateUrls: []
  },

  // 删除证书照片
  async onDeleteCertificate(e) {
    const { url } = e.currentTarget.dataset;
    
    // 确认删除
    const confirmRes = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这张证书照片吗？'
    });

    if (!confirmRes.confirm) {
      return;
    }

    wx.showLoading({ title: '删除中...', mask: true });

    try {
      const res = await wx.request({
        url: `https://crm.andejiazheng.com/api/resumes/miniprogram/${this.data.resumeId}/delete-file`,
        method: 'DELETE',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`,
          'Content-Type': 'application/json'
        },
        data: {
          fileUrl: url,
          fileType: 'certificate'
        }
      });

      wx.hideLoading();

      if (res.data.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });

        // 从本地数据中移除
        const newUrls = this.data.certificateUrls.filter(u => u !== url);
        this.setData({
          certificateUrls: newUrls
        });
      } else {
        wx.showToast({
          title: res.data.message || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});
```

### 2. 在 WXML 中添加删除按钮

```xml
<view class="certificate-list">
  <block wx:for="{{certificateUrls}}" wx:key="index">
    <view class="image-item">
      <image src="{{item}}" mode="aspectFill" />
      <view 
        class="delete-btn" 
        bindtap="onDeleteCertificate"
        data-url="{{item}}"
      >
        <text>删除</text>
      </view>
    </view>
  </block>
</view>
```

### 3. 在 WXSS 中添加样式

```css
.certificate-list {
  padding: 20rpx;
}

.image-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  margin: 10rpx;
  display: inline-block;
}

.image-item image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.delete-btn {
  position: absolute;
  top: 5rpx;
  right: 5rpx;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 5rpx 10rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
}
```

## 🔧 API 工作原理

当你调用删除 API 时，后端会：

1. ✅ 从 `certificateUrls` 数组中移除该 URL
2. ✅ 从 `certificates` 数组中移除对应的文件对象
3. ✅ 尝试从腾讯云 COS 删除物理文件
4. ✅ 保存更新后的简历数据

**所有字段会自动同步**，你不需要担心数据不一致的问题。

## ⚠️ 重要提示

### ❌ 不要使用的方式

```javascript
// ❌ 错误：不要通过提交空数组来删除照片
wx.request({
  url: `/api/resumes/miniprogram/${resumeId}`,
  method: 'PATCH',
  data: {
    certificateUrls: []  // ❌ 这种方式不可靠
  }
});
```

### ✅ 正确的方式

```javascript
// ✅ 正确：使用专门的删除接口
wx.request({
  url: `/api/resumes/miniprogram/${resumeId}/delete-file`,
  method: 'DELETE',
  data: {
    fileUrl: url,
    fileType: 'certificate'
  }
});
```

## 📝 API 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "resumeId": "68e8a42c5750fa9479e1445e",
    "deletedFileUrl": "https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test.jpg",
    "fileType": "certificate"
  },
  "message": "文件删除成功"
}
```

### 失败响应

```json
{
  "success": false,
  "data": null,
  "message": "文件删除失败: 未找到要删除的文件"
}
```

## 🧪 测试验证

删除 API 已经通过完整测试：

```
✅ 登录成功
✅ 找到简历
✅ 添加测试证书
✅ 验证证书存在
✅ 删除请求成功
✅ 验证证书已删除
```

## 🎨 用户体验建议

1. **删除前确认**
   ```javascript
   const confirmRes = await wx.showModal({
     title: '确认删除',
     content: '确定要删除这张照片吗？'
   });
   ```

2. **显示加载状态**
   ```javascript
   wx.showLoading({ title: '删除中...', mask: true });
   ```

3. **删除后刷新数据**
   ```javascript
   // 方式1：从本地数据中移除
   const newUrls = this.data.certificateUrls.filter(u => u !== url);
   this.setData({ certificateUrls: newUrls });
   
   // 方式2：重新加载简历数据
   await this.loadResumeDetail();
   ```

4. **友好的错误提示**
   ```javascript
   wx.showToast({
     title: res.data.message || '删除失败',
     icon: 'none',
     duration: 2000
   });
   ```

## 📞 常见问题

### Q1: 删除后照片还在？
**A:** 确保调用删除 API 后刷新了页面数据。可以重新调用获取简历详情的接口。

### Q2: 删除失败提示"未找到文件"？
**A:** 检查 `fileUrl` 是否完整，必须是完整的 URL（包含 `https://`）。

### Q3: 需要删除所有照片怎么办？
**A:** 循环调用删除 API，每次删除一张照片。

```javascript
for (const url of this.data.certificateUrls) {
  await this.deleteCertificate(url);
}
```

### Q4: 删除后能恢复吗？
**A:** 不能。删除操作会同时删除数据库记录和物理文件，无法恢复。

## 🚀 快速开始

1. 复制上面的 `onDeleteCertificate` 方法到你的页面 JS 中
2. 在 WXML 中添加删除按钮，绑定 `bindtap="onDeleteCertificate"`
3. 传递 `data-url="{{item}}"` 参数
4. 测试删除功能

## 📚 相关文档

- 完整 API 文档：`docs/小程序端删除照片API使用指南.md`
- 后端实现：`backend/src/modules/resume/resume.service.ts` (第 679-795 行)
- 测试脚本：`backend/test-delete-api.js`

---

**最后更新**：2025-01-11  
**测试状态**：✅ 已通过  
**可用性**：✅ 生产环境可用


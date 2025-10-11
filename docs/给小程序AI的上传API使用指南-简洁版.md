# 给小程序 AI 的上传 API 使用指南

## ✅ 确认：后端逻辑已验证

**小程序端和 CRM 端使用相同的上传逻辑，已经过完整测试，不会产生重复。**

## 🎯 API 接口

```
POST /api/resumes/miniprogram/:id/upload-file
```

**参数**：
- `id`（URL路径）：简历ID
- `file`（FormData）：文件
- `type`（FormData）：文件类型（`certificate`、`personalPhoto`、`medicalReport` 等）

## 💻 正确的使用方法

### 完整代码示例

```javascript
Page({
  data: {
    resumeId: '',
    certificateUrls: [],
    uploading: false  // 防止重复上传
  },

  // 选择并上传证书
  async onUploadCertificate() {
    // 1. 防止重复上传
    if (this.data.uploading) {
      wx.showToast({ title: '正在上传中...', icon: 'none' });
      return;
    }

    try {
      // 2. 选择图片
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      // 3. 立即上传
      await this.uploadFile(res.tempFilePaths[0], 'certificate');

    } catch (error) {
      console.error('选择图片失败:', error);
    }
  },

  // 上传文件
  async uploadFile(filePath, fileType) {
    this.setData({ uploading: true });
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      const uploadRes = await wx.uploadFile({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}/upload-file`,
        filePath: filePath,
        name: 'file',
        formData: { type: fileType },
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        }
      });

      const data = JSON.parse(uploadRes.data);
      wx.hideLoading();

      if (data.success) {
        wx.showToast({ title: '上传成功', icon: 'success' });
        
        // ✅ 关键：只添加一次到本地状态
        this.setData({
          certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
        });
      } else {
        wx.showToast({ title: data.message, icon: 'none' });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('上传失败:', error);
      wx.showToast({ title: '上传失败', icon: 'none' });
    } finally {
      this.setData({ uploading: false });
    }
  }
});
```

## ⚠️ 常见错误（必须避免）

### ❌ 错误1：重复调用上传接口

```javascript
// ❌ 错误
async onUploadCertificate() {
  const res = await wx.chooseImage({...});
  
  // 第一次上传
  await this.uploadFile(res.tempFilePaths[0], 'certificate');
  
  // 第二次上传（错误！）
  await this.uploadFile(res.tempFilePaths[0], 'certificate');
}
```

### ❌ 错误2：上传后又调用更新接口

```javascript
// ❌ 错误
async uploadFile(filePath, fileType) {
  // 1. 调用上传接口
  const uploadRes = await wx.uploadFile({...});
  
  // 2. 又调用更新接口（错误！会导致重复）
  await wx.request({
    url: `/api/resumes/miniprogram/${this.data.resumeId}`,
    method: 'PATCH',
    data: {
      certificateUrls: [uploadRes.data.fileUrl]  // ❌ 不要这样做
    }
  });
}
```

### ❌ 错误3：本地状态重复添加

```javascript
// ❌ 错误
async uploadFile(filePath, fileType) {
  const uploadRes = await wx.uploadFile({...});
  const data = JSON.parse(uploadRes.data);
  
  // 第一次添加
  this.setData({
    certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
  });
  
  // 第二次添加（错误！）
  this.setData({
    certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
  });
}
```

## ✅ 正确的做法

### 1. 只调用一次上传接口

```javascript
// ✅ 正确
async onUploadCertificate() {
  const res = await wx.chooseImage({...});
  await this.uploadFile(res.tempFilePaths[0], 'certificate');  // 只调用一次
}
```

### 2. 不要在上传后调用更新接口

```javascript
// ✅ 正确：上传接口已经保存到数据库了
async uploadFile(filePath, fileType) {
  const uploadRes = await wx.uploadFile({...});
  const data = JSON.parse(uploadRes.data);
  
  if (data.success) {
    // 只更新本地状态，不需要再调用更新接口
    this.setData({
      certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
    });
  }
}
```

### 3. 只更新一次本地状态

```javascript
// ✅ 正确
async uploadFile(filePath, fileType) {
  const uploadRes = await wx.uploadFile({...});
  const data = JSON.parse(uploadRes.data);
  
  if (data.success) {
    // 只更新一次
    this.setData({
      certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
    });
  }
}
```

## 🔍 排查问题的方法

### 添加日志

```javascript
async uploadFile(filePath, fileType) {
  console.log('🚀 开始上传，时间:', new Date().toISOString());
  console.log('   当前证书数量:', this.data.certificateUrls.length);
  
  const uploadRes = await wx.uploadFile({...});
  const data = JSON.parse(uploadRes.data);
  
  console.log('📦 服务器响应:', data);
  
  if (data.success) {
    const newUrls = [...this.data.certificateUrls, data.data.fileUrl];
    this.setData({ certificateUrls: newUrls });
    
    console.log('✅ 上传成功');
    console.log('   更新后数量:', newUrls.length);
  }
}
```

**检查日志**：
- `开始上传` 应该只出现一次
- `更新后数量` 应该比 `当前证书数量` 多 1，不是多 2

## 📝 快速检查清单

- [ ] 只调用一次上传接口
- [ ] 不在上传后调用更新接口
- [ ] 只更新一次本地状态
- [ ] 使用 `uploading` 标志位防止重复上传
- [ ] 添加详细日志方便排查
- [ ] 测试：上传一张照片，界面只显示一张

## 🎯 总结

| 项目 | 说明 |
|------|------|
| API 接口 | `POST /api/resumes/miniprogram/:id/upload-file` |
| 后端逻辑 | ✅ 已验证，与 CRM 端一致，不会产生重复 |
| 问题根源 | 小程序端的调用逻辑有问题 |
| 解决方案 | 参考上面的正确代码示例 |

---

**详细文档**：`docs/小程序端文件上传API使用方法.md`  
**测试脚本**：`backend/test-upload-duplicate.js`  
**测试结果**：✅ 后端正常，不会产生重复


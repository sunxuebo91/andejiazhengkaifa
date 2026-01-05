# 小程序端文件上传 API 使用方法

## 📋 API 接口说明

### 上传单个文件

```
POST /api/resumes/miniprogram/:id/upload-file
```

**说明**：此接口与 CRM 端使用相同的底层逻辑，已经过完整测试，不会产生重复。

## 🔧 接口参数

### 请求参数

| 参数 | 类型 | 位置 | 必填 | 说明 |
|------|------|------|------|------|
| id | string | URL路径 | ✅ | 简历ID |
| file | File | FormData | ✅ | 要上传的文件 |
| type | string | FormData | ✅ | 文件类型 |

### 文件类型（type）

| 值 | 说明 | 对应字段 |
|----|------|---------|
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

### 响应格式

**成功响应**：
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

**失败响应**：
```json
{
  "success": false,
  "data": null,
  "message": "文件上传失败: 错误信息"
}
```

## 💻 完整实现示例

### 方案1：推荐方案（立即上传 + 本地状态管理）

```javascript
// pages/resume/edit.js
Page({
  data: {
    resumeId: '',
    certificateUrls: [],  // 证书URL列表
    uploading: false
  },

  onLoad(options) {
    this.setData({
      resumeId: options.id || ''
    });
    // 加载简历数据
    this.loadResume();
  },

  /**
   * 加载简历数据
   */
  async loadResume() {
    try {
      const res = await wx.request({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        }
      });

      if (res.data.success) {
        const resume = res.data.data;
        this.setData({
          certificateUrls: resume.certificateUrls || []
        });
      }
    } catch (error) {
      console.error('加载简历失败:', error);
    }
  },

  /**
   * 选择并上传证书照片
   */
  async onUploadCertificate() {
    // 防止重复上传
    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中...',
        icon: 'none'
      });
      return;
    }

    try {
      // 1. 选择图片
      const chooseRes = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      const tempFilePath = chooseRes.tempFilePaths[0];
      console.log('📸 选择图片:', tempFilePath);

      // 2. 立即上传
      await this.uploadFile(tempFilePath, 'certificate');

    } catch (error) {
      if (error.errMsg && error.errMsg.includes('cancel')) {
        console.log('用户取消选择图片');
      } else {
        console.error('选择图片失败:', error);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 上传文件到服务器
   * @param {string} filePath - 本地文件路径
   * @param {string} fileType - 文件类型
   */
  async uploadFile(filePath, fileType) {
    // 设置上传状态
    this.setData({ uploading: true });

    wx.showLoading({
      title: '上传中...',
      mask: true
    });

    console.log('🚀 开始上传文件');
    console.log('   文件路径:', filePath);
    console.log('   文件类型:', fileType);
    console.log('   简历ID:', this.data.resumeId);

    try {
      const uploadRes = await wx.uploadFile({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}/upload-file`,
        filePath: filePath,
        name: 'file',
        formData: {
          type: fileType
        },
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        }
      });

      console.log('📦 服务器响应:', uploadRes.data);

      // 解析响应
      const data = JSON.parse(uploadRes.data);

      wx.hideLoading();

      if (data.success) {
        console.log('✅ 上传成功');
        console.log('   文件URL:', data.data.fileUrl);

        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });

        // ✅ 关键：只添加一次到本地状态
        const newUrls = [...this.data.certificateUrls, data.data.fileUrl];
        this.setData({
          certificateUrls: newUrls
        });

        console.log('📊 更新后的证书列表:', newUrls);
        console.log('📊 证书数量:', newUrls.length);

      } else {
        console.error('❌ 上传失败:', data.message);
        wx.showToast({
          title: data.message || '上传失败',
          icon: 'none'
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('❌ 上传出错:', error);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    } finally {
      // 重置上传状态
      this.setData({ uploading: false });
    }
  },

  /**
   * 删除证书照片
   */
  async onDeleteCertificate(e) {
    const { url } = e.currentTarget.dataset;

    try {
      const confirmRes = await wx.showModal({
        title: '确认删除',
        content: '确定要删除这张证书照片吗？'
      });

      if (!confirmRes.confirm) {
        return;
      }

      wx.showLoading({ title: '删除中...', mask: true });

      const res = await wx.request({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}/delete-file`,
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

        // 从本地状态中移除
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

### 方案2：上传后重新加载（更安全，避免状态不一致）

```javascript
// pages/resume/edit.js
Page({
  data: {
    resumeId: '',
    certificateUrls: []
  },

  /**
   * 上传文件到服务器
   */
  async uploadFile(filePath, fileType) {
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      const uploadRes = await wx.uploadFile({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}/upload-file`,
        filePath: filePath,
        name: 'file',
        formData: {
          type: fileType
        },
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        }
      });

      const data = JSON.parse(uploadRes.data);

      if (data.success) {
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });

        // ✅ 上传成功后，重新加载简历数据
        // 这样可以确保本地状态与服务器完全一致
        await this.loadResume();

      } else {
        wx.hideLoading();
        wx.showToast({
          title: data.message || '上传失败',
          icon: 'none'
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('上传失败:', error);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载简历数据
   */
  async loadResume() {
    try {
      const res = await wx.request({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        }
      });

      wx.hideLoading();

      if (res.data.success) {
        const resume = res.data.data;
        this.setData({
          certificateUrls: resume.certificateUrls || []
        });
        console.log('📊 加载的证书数量:', resume.certificateUrls?.length || 0);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载简历失败:', error);
    }
  }
});
```

## 🎨 WXML 模板

```xml
<!-- pages/resume/edit.wxml -->
<view class="container">
  <!-- 证件资料 -->
  <view class="section">
    <view class="section-title">证件资料</view>
    
    <!-- 技能证书 -->
    <view class="upload-section">
      <view class="label">技能证书</view>
      
      <view class="image-list">
        <!-- 已上传的证书 -->
        <block wx:for="{{certificateUrls}}" wx:key="index">
          <view class="image-item">
            <image 
              src="{{item}}" 
              mode="aspectFill"
              bindtap="onPreviewImage"
              data-url="{{item}}"
            />
            <view 
              class="delete-btn" 
              bindtap="onDeleteCertificate"
              data-url="{{item}}"
            >
              <text class="icon-delete">×</text>
            </view>
          </view>
        </block>
        
        <!-- 上传按钮 -->
        <view 
          class="upload-btn" 
          bindtap="onUploadCertificate"
          wx:if="{{!uploading}}"
        >
          <text class="icon-add">+</text>
          <text class="upload-text">添加证书</text>
        </view>
        
        <!-- 上传中状态 -->
        <view class="upload-btn uploading" wx:if="{{uploading}}">
          <text class="upload-text">上传中...</text>
        </view>
      </view>
    </view>
  </view>
</view>
```

## 🎨 WXSS 样式

```css
/* pages/resume/edit.wxss */
.container {
  padding: 20rpx;
  background: #f5f5f5;
}

.section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.upload-section {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.image-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.image-item image {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 50rpx;
  height: 50rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-delete {
  color: white;
  font-size: 40rpx;
  line-height: 1;
}

.upload-btn {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.upload-btn.uploading {
  background: #f0f0f0;
  border-color: #bbb;
}

.icon-add {
  font-size: 60rpx;
  color: #999;
  line-height: 1;
}

.upload-text {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
```

## ⚠️ 重要注意事项

### 1. 防止重复上传

```javascript
// ❌ 错误：没有防止重复上传
async onUploadCertificate() {
  const res = await wx.chooseImage({...});
  await this.uploadFile(res.tempFilePaths[0], 'certificate');
}

// ✅ 正确：使用标志位防止重复上传
async onUploadCertificate() {
  if (this.data.uploading) {
    wx.showToast({ title: '正在上传中...', icon: 'none' });
    return;
  }
  
  this.setData({ uploading: true });
  try {
    const res = await wx.chooseImage({...});
    await this.uploadFile(res.tempFilePaths[0], 'certificate');
  } finally {
    this.setData({ uploading: false });
  }
}
```

### 2. 只更新一次本地状态

```javascript
// ❌ 错误：可能在多个地方更新状态
async uploadFile(filePath, fileType) {
  const res = await wx.uploadFile({...});
  const data = JSON.parse(res.data);
  
  // 第一次更新
  this.setData({
    certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
  });
  
  // 第二次更新（错误！）
  this.setData({
    certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
  });
}

// ✅ 正确：只更新一次
async uploadFile(filePath, fileType) {
  const res = await wx.uploadFile({...});
  const data = JSON.parse(res.data);
  
  if (data.success) {
    // 只更新一次
    this.setData({
      certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
    });
  }
}
```

### 3. 不要在上传后再调用更新接口

```javascript
// ❌ 错误：上传后又调用更新接口
async uploadFile(filePath, fileType) {
  // 1. 调用上传接口
  const uploadRes = await wx.uploadFile({...});
  const data = JSON.parse(uploadRes.data);
  
  // 2. 又调用更新接口（错误！会导致重复）
  await wx.request({
    url: `/api/resumes/miniprogram/${this.data.resumeId}`,
    method: 'PATCH',
    data: {
      certificateUrls: [data.data.fileUrl]  // ❌ 这会导致重复
    }
  });
}

// ✅ 正确：只调用上传接口
async uploadFile(filePath, fileType) {
  const uploadRes = await wx.uploadFile({...});
  const data = JSON.parse(uploadRes.data);
  
  if (data.success) {
    // 上传接口已经保存到数据库了，不需要再调用更新接口
    this.setData({
      certificateUrls: [...this.data.certificateUrls, data.data.fileUrl]
    });
  }
}
```

## 🧪 调试建议

### 添加详细日志

```javascript
async uploadFile(filePath, fileType) {
  console.log('='.repeat(50));
  console.log('🚀 开始上传');
  console.log('   时间:', new Date().toISOString());
  console.log('   文件路径:', filePath);
  console.log('   文件类型:', fileType);
  console.log('   简历ID:', this.data.resumeId);
  console.log('   当前证书数量:', this.data.certificateUrls.length);
  
  const uploadRes = await wx.uploadFile({...});
  const data = JSON.parse(uploadRes.data);
  
  console.log('📦 服务器响应:', data);
  
  if (data.success) {
    const newUrls = [...this.data.certificateUrls, data.data.fileUrl];
    this.setData({ certificateUrls: newUrls });
    
    console.log('✅ 上传成功');
    console.log('   新增URL:', data.data.fileUrl);
    console.log('   更新后数量:', newUrls.length);
  }
  
  console.log('='.repeat(50));
}
```

## 📝 总结

| 要点 | 说明 |
|------|------|
| ✅ 使用正确的接口 | `POST /api/resumes/miniprogram/:id/upload-file` |
| ✅ 防止重复上传 | 使用 `uploading` 标志位 |
| ✅ 只更新一次状态 | 上传成功后只调用一次 `setData` |
| ✅ 不要重复调用接口 | 上传后不要再调用更新接口 |
| ✅ 添加详细日志 | 方便排查问题 |
| ✅ 参考 CRM 端逻辑 | CRM 端的实现是正确的 |

---

**API 版本**：v1.0  
**测试状态**：✅ 已通过  
**最后更新**：2025-01-11


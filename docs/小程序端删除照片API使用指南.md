# 小程序端删除照片 API 使用指南

## 📋 概述

CRM 后端已经提供了完整的小程序删除照片 API，**不需要通过提交空数组的方式删除照片**。

## ✅ 正确的删除方式

### API 接口

```
DELETE /api/resumes/miniprogram/:id/delete-file
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 简历ID（URL路径参数） |
| fileUrl | string | ✅ | 要删除的文件完整URL |
| fileType | string | ✅ | 文件类型 |

### 支持的文件类型

| fileType 值 | 说明 | 对应字段 |
|------------|------|---------|
| `idCardFront` | 身份证正面 | `idCardFront` |
| `idCardBack` | 身份证背面 | `idCardBack` |
| `personalPhoto` | 个人照片 | `photoUrls` / `personalPhoto` |
| `certificate` | 技能证书 | `certificateUrls` / `certificates` |
| `medicalReport` | 体检报告 | `medicalReportUrls` / `reports` |

## 💻 小程序端实现示例

### 1. 删除单张技能证书照片

```javascript
/**
 * 删除技能证书照片
 * @param {string} resumeId - 简历ID
 * @param {string} fileUrl - 要删除的照片URL
 */
async function deleteCertificate(resumeId, fileUrl) {
  try {
    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    const res = await wx.request({
      url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/delete-file`,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      data: {
        fileUrl: fileUrl,
        fileType: 'certificate'
      }
    });

    wx.hideLoading();

    if (res.data.success) {
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      // 刷新简历数据
      await loadResumeDetail(resumeId);
      
      return true;
    } else {
      wx.showToast({
        title: res.data.message || '删除失败',
        icon: 'none'
      });
      return false;
    }
  } catch (error) {
    wx.hideLoading();
    console.error('删除证书失败:', error);
    wx.showToast({
      title: '删除失败',
      icon: 'none'
    });
    return false;
  }
}
```

### 2. 删除个人照片

```javascript
/**
 * 删除个人照片
 * @param {string} resumeId - 简历ID
 * @param {string} fileUrl - 要删除的照片URL
 */
async function deletePersonalPhoto(resumeId, fileUrl) {
  try {
    const res = await wx.request({
      url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/delete-file`,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      data: {
        fileUrl: fileUrl,
        fileType: 'personalPhoto'  // 注意这里是 personalPhoto
      }
    });

    if (res.data.success) {
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('删除个人照片失败:', error);
    return false;
  }
}
```

### 3. 删除体检报告

```javascript
/**
 * 删除体检报告
 * @param {string} resumeId - 简历ID
 * @param {string} fileUrl - 要删除的报告URL
 */
async function deleteMedicalReport(resumeId, fileUrl) {
  try {
    const res = await wx.request({
      url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/delete-file`,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      data: {
        fileUrl: fileUrl,
        fileType: 'medicalReport'  // 注意这里是 medicalReport
      }
    });

    if (res.data.success) {
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('删除体检报告失败:', error);
    return false;
  }
}
```

### 4. 在页面中使用（完整示例）

```javascript
// pages/resume/edit.js
Page({
  data: {
    resumeId: '',
    certificateUrls: [],
    certificates: []
  },

  onLoad(options) {
    this.setData({
      resumeId: options.id
    });
    this.loadResume();
  },

  // 加载简历数据
  async loadResume() {
    try {
      const res = await wx.request({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (res.data.success) {
        const resume = res.data.data;
        this.setData({
          certificateUrls: resume.certificateUrls || [],
          certificates: resume.certificates || []
        });
      }
    } catch (error) {
      console.error('加载简历失败:', error);
    }
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

    // 调用删除接口
    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    try {
      const res = await wx.request({
        url: `${API_BASE_URL}/api/resumes/miniprogram/${this.data.resumeId}/delete-file`,
        method: 'DELETE',
        header: {
          'Authorization': `Bearer ${getToken()}`,
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
        const newCertificateUrls = this.data.certificateUrls.filter(u => u !== url);
        const newCertificates = this.data.certificates.filter(c => c.url !== url);
        
        this.setData({
          certificateUrls: newCertificateUrls,
          certificates: newCertificates
        });

        // 或者重新加载简历数据
        // await this.loadResume();
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

## 🎨 WXML 模板示例

```xml
<!-- 技能证书照片列表 -->
<view class="certificate-list">
  <view class="section-title">技能证书</view>
  
  <view class="image-grid">
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
          <text class="iconfont icon-delete"></text>
        </view>
      </view>
    </block>
    
    <!-- 上传按钮 -->
    <view class="upload-btn" bindtap="onUploadCertificate">
      <text class="iconfont icon-add"></text>
      <text>添加证书</text>
    </view>
  </view>
</view>
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

## ⚠️ 重要说明

### 1. 自动同步字段

删除接口会自动同步新旧两套字段：

- 删除 `certificate` 类型时，会同时从 `certificates` 和 `certificateUrls` 中移除
- 删除 `medicalReport` 类型时，会同时从 `reports` 和 `medicalReportUrls` 中移除
- 删除 `personalPhoto` 类型时，会同时从 `personalPhoto` 和 `photoUrls` 中移除

### 2. 物理文件删除

- API 会尝试从 COS（腾讯云对象存储）中删除物理文件
- 即使物理文件删除失败，数据库记录也会被清理
- 不会因为物理文件删除失败而导致整个操作失败

### 3. 错误处理

```javascript
// 推荐的错误处理方式
try {
  const res = await wx.request({...});
  
  if (res.data.success) {
    // 删除成功
  } else {
    // 删除失败，显示错误信息
    wx.showToast({
      title: res.data.message,
      icon: 'none'
    });
  }
} catch (error) {
  // 网络错误或其他异常
  console.error('删除失败:', error);
  wx.showToast({
    title: '网络错误，请重试',
    icon: 'none'
  });
}
```

## ❌ 错误的做法（不要使用）

```javascript
// ❌ 错误：不要通过提交空数组来删除照片
async function wrongWayToDelete(resumeId) {
  // 这种方式不可靠，不推荐使用
  await wx.request({
    url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}`,
    method: 'PATCH',
    data: {
      certificateUrls: [],  // ❌ 不推荐
      certificates: []      // ❌ 不推荐
    }
  });
}
```

## ✅ 正确的做法

```javascript
// ✅ 正确：使用专门的删除接口
async function correctWayToDelete(resumeId, fileUrl) {
  await wx.request({
    url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/delete-file`,
    method: 'DELETE',
    data: {
      fileUrl: fileUrl,
      fileType: 'certificate'
    }
  });
}
```

## 🧪 测试建议

1. **测试删除单张照片**
   - 上传多张证书照片
   - 删除其中一张
   - 验证其他照片仍然存在

2. **测试删除所有照片**
   - 逐个删除所有照片
   - 验证列表为空

3. **测试错误处理**
   - 尝试删除不存在的照片
   - 验证错误提示正确显示

4. **测试网络异常**
   - 断网情况下尝试删除
   - 验证错误提示友好

## 📞 技术支持

如果遇到问题，请检查：

1. ✅ Token 是否有效
2. ✅ 简历ID 是否正确
3. ✅ 文件URL 是否完整
4. ✅ fileType 是否正确（区分大小写）
5. ✅ 网络连接是否正常

---

**最后更新**：2025-01-11  
**API 版本**：v1.0  
**状态**：✅ 已测试通过


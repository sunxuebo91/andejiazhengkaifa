# 小程序API - 技能证书字段传输说明

**更新日期**: 2025-12-30  
**状态**: ✅ 已优化并添加注释

## 📋 字段说明

### 1️⃣ **技能类型字段** - `skills`
这是技能**类型**的枚举数组，不是图片！

**数据类型**: `string[]`  
**示例值**: 
```json
{
  "skills": ["育婴师", "月嫂", "早教师", "催乳师"]
}
```

**用途**: 显示阿姨具备哪些技能类型（标签）

---

### 2️⃣ **技能证书图片字段** - `certificates` 和 `certificateUrls`

这是技能证书的**图片文件**，有两种格式：

#### 格式A：`certificates` - FileInfo对象数组（推荐）

**数据类型**: `FileInfo[]`  
**包含信息**: 完整的文件元数据

```typescript
interface FileInfo {
  url: string;        // 图片URL
  filename: string;   // 文件名
  size: number;       // 文件大小（字节）
  mimetype: string;   // MIME类型（如 image/jpeg）
}
```

**示例值**:
```json
{
  "certificates": [
    {
      "url": "https://xxx.com/cert1.jpg",
      "filename": "育婴师证书.jpg",
      "size": 102400,
      "mimetype": "image/jpeg"
    },
    {
      "url": "https://xxx.com/cert2.jpg",
      "filename": "月嫂证书.jpg",
      "size": 98304,
      "mimetype": "image/jpeg"
    }
  ]
}
```

#### 格式B：`certificateUrls` - URL字符串数组（兼容旧版）

**数据类型**: `string[]`  
**包含信息**: 仅图片URL

**示例值**:
```json
{
  "certificateUrls": [
    "https://xxx.com/cert1.jpg",
    "https://xxx.com/cert2.jpg"
  ]
}
```

---

## 🔄 API返回的字段

### 小程序获取简历详情 API
**接口**: `GET /api/resumes/miniprogram/:id`

**返回数据结构**:
```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "张三",
    "skills": ["育婴师", "月嫂"],  // ✅ 技能类型（枚举）
    
    // 🎓 技能证书图片 - 完整格式（推荐使用）
    "certificates": [
      {
        "url": "https://xxx.com/cert1.jpg",
        "filename": "育婴师证书.jpg",
        "size": 102400,
        "mimetype": "image/jpeg"
      }
    ],
    
    // 🎓 技能证书图片 - 兼容格式（仅URL）
    "certificateUrls": [
      "https://xxx.com/cert1.jpg"
    ],
    
    // 📋 体检报告 - 完整格式
    "reports": [
      {
        "url": "https://xxx.com/report1.jpg",
        "filename": "体检报告.jpg",
        "size": 204800,
        "mimetype": "image/jpeg"
      }
    ],
    
    // 📋 体检报告 - 兼容格式（仅URL）
    "medicalReportUrls": [
      "https://xxx.com/report1.jpg"
    ]
  }
}
```

---

## 💡 小程序端使用建议

### 推荐方案：使用 `certificates` 字段

```javascript
// 获取简历数据
const resume = res.data.data;

// 使用完整的 certificates 对象数组
const certificates = resume.certificates || [];

// 显示证书图片
certificates.forEach(cert => {
  console.log('证书URL:', cert.url);
  console.log('文件名:', cert.filename);
  console.log('文件大小:', cert.size);
});

// 提取URL用于图片展示
const certificateUrls = certificates.map(cert => cert.url);
this.setData({
  certificateUrls: certificateUrls
});
```

### 兼容方案：使用 `certificateUrls` 字段

```javascript
// 直接使用URL数组（当前小程序使用的方式）
const certificateUrls = resume.certificateUrls || [];
this.setData({
  certificateUrls: certificateUrls
});
```

---

## 📤 上传证书图片

**接口**: `POST /api/resumes/miniprogram/:id/upload-file`

**请求参数**:
```javascript
wx.uploadFile({
  url: `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}/upload-file`,
  filePath: filePath,
  name: 'file',
  formData: {
    type: 'certificate'  // 🎓 指定为技能证书类型
  }
});
```

**响应数据**:
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://xxx.com/cert1.jpg"
  }
}
```

---

## ✅ 更新内容

### 代码优化
1. ✅ 在 `resume.controller.ts` 中为所有证书相关字段添加了清晰的注释
2. ✅ 明确区分了完整格式（FileInfo对象）和兼容格式（URL字符串）
3. ✅ 统一了三个API接口的返回格式：
   - 创建简历 API
   - 获取简历详情 API  
   - 更新简历 API

### 字段对应关系

| 字段名 | 数据类型 | 用途 | 推荐使用 |
|--------|---------|------|---------|
| `skills` | `string[]` | 技能类型枚举 | ✅ 是 |
| `certificates` | `FileInfo[]` | 证书图片完整信息 | ✅ 是（推荐） |
| `certificateUrls` | `string[]` | 证书图片URL | ⚠️ 兼容旧版 |
| `reports` | `FileInfo[]` | 体检报告完整信息 | ✅ 是（推荐） |
| `medicalReportUrls` | `string[]` | 体检报告URL | ⚠️ 兼容旧版 |

---

## 🎯 总结

1. **`skills`** = 技能类型（如"育婴师"、"月嫂"）
2. **`certificates`** = 技能证书图片（完整文件信息）
3. **`certificateUrls`** = 技能证书图片URL（兼容旧版）

**建议小程序端**：
- 优先使用 `certificates` 字段获取完整文件信息
- 如果只需要显示图片，可以继续使用 `certificateUrls` 字段
- 两个字段会自动同步，选择其中一个使用即可


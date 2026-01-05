# 个人照片和技能证书上传数量限制调整 - 更新说明

**日期**: 2025-12-29  
**更新内容**: 将个人照片和技能证书的上传数量限制从10张调整为30张  
**状态**: ✅ 完成

## 📝 更新内容

### 前端修改

#### 1. 上传配置常量 (`frontend/src/constants/upload.ts`)
- **修改内容**:
  - `maxPhotoCount`: 10 → 30
  - `maxCertificateCount`: 10 → 30

**修改前**:
```typescript
export const FILE_UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png'] as const,
  allowedPdfTypes: ['application/pdf'] as const,
  maxPhotoCount: 10,
  maxCertificateCount: 10,
  maxMedicalReportCount: 10,
  maxMedicalPdfCount: 5
} as const;
```

**修改后**:
```typescript
export const FILE_UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png'] as const,
  allowedPdfTypes: ['application/pdf'] as const,
  maxPhotoCount: 30,
  maxCertificateCount: 30,
  maxMedicalReportCount: 10,
  maxMedicalPdfCount: 5
} as const;
```

#### 2. 简历创建页面配置 (`frontend/src/pages/aunt/CreateResume.tsx`)
- **位置**: 第214-215行
- **修改内容**: 同步更新页面内的配置常量

### 后端修改

#### 3. 简历创建接口 (`backend/src/modules/resume/resume.controller.ts`)
- **位置**: 第35-42行
- **修改内容**: 更新FileFieldsInterceptor中的maxCount限制

**修改前**:
```typescript
@Post()
@UseInterceptors(FileFieldsInterceptor([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'photoFiles', maxCount: 10 },
  { name: 'certificateFiles', maxCount: 10 },
  { name: 'medicalReportFiles', maxCount: 10 }
], multerConfig))
```

**修改后**:
```typescript
@Post()
@UseInterceptors(FileFieldsInterceptor([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'photoFiles', maxCount: 30 },
  { name: 'certificateFiles', maxCount: 30 },
  { name: 'medicalReportFiles', maxCount: 10 }
], multerConfig))
```

#### 4. 简历更新接口 (`backend/src/modules/resume/resume.controller.ts`)
- **位置**: 第1467-1474行
- **修改内容**: 更新PATCH接口的文件上传限制

**修改前**:
```typescript
@Patch(':id')
@UseInterceptors(FileFieldsInterceptor([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'photoFiles', maxCount: 10 },
  { name: 'certificateFiles', maxCount: 10 },
  { name: 'medicalReportFiles', maxCount: 10 }
], multerConfig))
```

**修改后**:
```typescript
@Patch(':id')
@UseInterceptors(FileFieldsInterceptor([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'photoFiles', maxCount: 30 },
  { name: 'certificateFiles', maxCount: 30 },
  { name: 'medicalReportFiles', maxCount: 10 }
], multerConfig))
```

#### 5. 小程序批量上传接口 (`backend/src/modules/resume/resume.controller.ts`)
- **位置**: 第1128-1130行
- **修改内容**: 更新小程序批量上传的文件数量限制

**修改前**:
```typescript
@Post('miniprogram/:id/upload-files')
@UseInterceptors(FilesInterceptor('files', 10, multerConfig))
@ApiOperation({ summary: '小程序批量上传文件' })
```

**修改后**:
```typescript
@Post('miniprogram/:id/upload-files')
@UseInterceptors(FilesInterceptor('files', 30, multerConfig))
@ApiOperation({ summary: '小程序批量上传文件' })
```

## 🚀 部署状态

### 构建结果
- ✅ 后端构建成功 (21.8秒)
- ✅ 前端构建成功 (37.9秒)

### 服务状态
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 3  │ backend-prod       │ fork     │ 4    │ online    │ 0%       │ 187.8mb  │
│ 5  │ frontend-prod      │ fork     │ 2    │ online    │ 0%       │ 90.9mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### 重启记录
- ✅ backend-prod 已重启
- ✅ frontend-prod 已重启
- ✅ PM2配置已保存

## 📊 影响范围

### 用户界面
1. **简历创建页面**: 个人照片和技能证书上传组件现在最多支持30张
2. **简历编辑页面**: 同样支持最多30张图片上传

### API接口
1. **POST /api/resumes**: 创建简历接口支持最多30张个人照片和30张技能证书
2. **PATCH /api/resumes/:id**: 更新简历接口支持最多30张个人照片和30张技能证书
3. **POST /api/resumes/miniprogram/:id/upload-files**: 小程序批量上传接口支持最多30个文件

### 数据库
- ⚠️ **无需修改**: 数据库结构无需变更
- ⚠️ **无需迁移**: 现有数据完全兼容

## ✅ 验证清单

- [x] 前端配置文件修改完成
- [x] 前端页面配置修改完成
- [x] 后端创建接口修改完成
- [x] 后端更新接口修改完成
- [x] 后端小程序接口修改完成
- [x] 前端构建成功
- [x] 后端构建成功
- [x] 服务重启成功
- [x] 服务运行正常

## 🔍 测试建议

建议测试以下功能确保更新正常：

1. **简历创建 - 个人照片上传**
   - 访问简历创建页面
   - 尝试上传超过10张个人照片（测试11-30张）
   - 验证是否可以成功上传
   - 验证上传后的图片显示和排序功能

2. **简历创建 - 技能证书上传**
   - 在同一页面上传技能证书
   - 尝试上传超过10张证书（测试11-30张）
   - 验证是否可以成功上传
   - 验证上传后的证书显示

3. **简历编辑**
   - 编辑已有简历
   - 添加更多个人照片和技能证书
   - 验证总数可以达到30张

4. **小程序上传**
   - 使用小程序批量上传功能
   - 验证可以一次上传多个文件

## 📱 访问地址

- **生产环境**: https://crm.andejiazheng.com
- **简历创建**: https://crm.andejiazheng.com/resume/create
- **简历列表**: https://crm.andejiazheng.com/resume

## 📝 注意事项

1. **上传限制**: 虽然数量限制提高到30张，但单个文件大小限制仍为5MB
2. **性能考虑**: 上传30张图片可能需要较长时间，建议用户分批上传
3. **存储空间**: 需要确保服务器有足够的存储空间
4. **带宽考虑**: 大量图片上传可能占用较多带宽

## 🔗 相关文件

- `frontend/src/constants/upload.ts` - 前端上传配置常量
- `frontend/src/pages/aunt/CreateResume.tsx` - 简历创建页面
- `backend/src/modules/resume/resume.controller.ts` - 简历控制器

## 📞 回滚方案

如需回滚，执行以下步骤：

```bash
# 1. 切换到上一个版本
git checkout <previous-commit>

# 2. 重新构建
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# 3. 重启服务
pm2 reload backend-prod
pm2 reload frontend-prod
pm2 save
```

---

**更新完成时间**: 2025-12-29 11:15  
**更新人员**: AI Assistant  
**验证状态**: ✅ 已验证


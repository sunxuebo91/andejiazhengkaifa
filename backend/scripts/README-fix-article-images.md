# 修复文章图片URL脚本

## 问题描述
文章正文中有图片，但列表显示图片数量为0。

## 原因分析
1. 旧版本的代码在保存文章时，没有从 `contentRaw` 中提取图片URL
2. 如果用户使用富文本编辑器粘贴图片，图片可能以HTML格式（`<img src="...">`）存在于 `contentRaw` 中
3. 前端只提取Markdown格式的图片（`![](url)`），导致HTML格式的图片URL没有被保存到 `imageUrls` 字段

## 解决方案
1. **代码修复**（已完成）：
   - 前端：修改 `ArticleForm.tsx`，同时支持提取Markdown和HTML格式的图片
   - 后端：修改 `article.service.ts`，在创建和更新文章时自动提取图片URL

2. **数据修复**（需要在正式环境执行）：
   - 运行本脚本修复已有的文章数据

## 使用方法

### 在正式环境执行
```bash
cd /path/to/backend
npm run ts-node scripts/fix-article-image-urls.ts
```

或者使用 ts-node 直接运行：
```bash
cd /path/to/backend
npx ts-node scripts/fix-article-image-urls.ts
```

## 脚本功能
- 遍历所有文章
- 从 `contentRaw` 中提取图片URL（支持Markdown和HTML格式）
- 将提取的URL合并到 `imageUrls` 字段
- 输出修复统计信息

## 注意事项
- 脚本会自动跳过无需修复的文章
- 不会删除现有的图片URL，只会添加新发现的URL
- 建议先在测试环境验证后再在正式环境执行


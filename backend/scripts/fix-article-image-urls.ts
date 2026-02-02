/**
 * 修复文章图片URL的脚本
 * 从 contentRaw 中提取图片URL并更新到 imageUrls 字段
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 从内容中提取图片URL（支持Markdown和HTML格式）
 */
function extractImageUrls(contentRaw: string): string[] {
  const imageUrls: string[] = [];
  
  // 提取Markdown格式的图片: ![](url)
  const markdownImageRe = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = markdownImageRe.exec(contentRaw)) !== null) {
    const url = (match[1] || '').trim();
    if (url && url.startsWith('http')) {
      imageUrls.push(url);
    }
  }
  
  // 提取HTML格式的图片: <img src="url">
  const htmlImageRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImageRe.exec(contentRaw)) !== null) {
    const url = (match[1] || '').trim();
    if (url && url.startsWith('http')) {
      imageUrls.push(url);
    }
  }
  
  // 去重
  return Array.from(new Set(imageUrls));
}

async function bootstrap() {
  console.log('🚀 开始修复文章图片URL...\n');

  // 连接数据库
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/housekeeping';
  console.log(`📡 连接数据库: ${mongoUri}\n`);

  await mongoose.connect(mongoUri);
  console.log('✅ 数据库连接成功\n');

  // 定义Article Schema（简化版）
  const articleSchema = new mongoose.Schema({
    title: String,
    contentRaw: String,
    imageUrls: [String],
  }, { collection: 'articles' });

  const ArticleModel = mongoose.model('Article', articleSchema);

  // 查找所有文章
  const articles = await ArticleModel.find().exec();
  console.log(`📊 找到 ${articles.length} 篇文章\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const article of articles) {
    const extractedUrls = extractImageUrls(article.contentRaw || '');

    // 合并现有的imageUrls和提取的URL
    const existingUrls = Array.isArray(article.imageUrls) ? article.imageUrls : [];
    const allUrls = Array.from(new Set([...existingUrls, ...extractedUrls]));

    // 如果图片URL有变化，则更新
    if (allUrls.length !== existingUrls.length ||
        !allUrls.every((url, idx) => url === existingUrls[idx])) {
      await ArticleModel.updateOne(
        { _id: article._id },
        { $set: { imageUrls: allUrls } }
      );

      console.log(`✅ 修复文章: ${article.title || article._id}`);
      console.log(`   原图片数: ${existingUrls.length}, 新图片数: ${allUrls.length}`);
      if (extractedUrls.length > 0) {
        console.log(`   提取的图片: ${extractedUrls.slice(0, 2).join(', ')}${extractedUrls.length > 2 ? '...' : ''}`);
      }
      fixedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\n📈 修复统计:');
  console.log(`   ✅ 已修复: ${fixedCount} 篇`);
  console.log(`   ⏭️  跳过: ${skippedCount} 篇（无需修复）`);
  console.log(`   📊 总计: ${articles.length} 篇\n`);

  await mongoose.disconnect();
  console.log('✨ 修复完成！');
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});


/**
 * 清理文章中的无关图片
 * 过滤掉二维码、广告、logo等
 */

import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

// 过滤无关图片的规则
function isIrrelevantImage(src: string): boolean {
  const srcLower = src.toLowerCase();

  // 1. 过滤二维码
  if (
    srcLower.includes('qrcode') ||
    srcLower.includes('qr_code') ||
    srcLower.includes('qr-code') ||
    srcLower.includes('weixin') ||
    srcLower.includes('wechat')
  ) {
    return true;
  }

  // 2. 过滤广告图片
  if (
    srcLower.includes('ad') ||
    srcLower.includes('banner') ||
    srcLower.includes('advert')
  ) {
    return true;
  }

  // 3. 过滤logo、图标、认证标识
  if (
    srcLower.includes('logo') ||
    srcLower.includes('icon') ||
    srcLower.includes('favicon') ||
    srcLower.includes('cert') ||
    srcLower.includes('certificate') ||
    srcLower.includes('gongshang') ||
    srcLower.includes('beian')
  ) {
    return true;
  }

  // 4. 过滤默认占位图
  if (
    srcLower.includes('default') ||
    srcLower.includes('placeholder') ||
    srcLower.includes('no-image') ||
    srcLower.includes('noimage')
  ) {
    return true;
  }

  // 5. 过滤常见的静态资源路径（非内容图片）
  if (
    srcLower.includes('/std/images/') || // 妈妈网的标准图片目录
    srcLower.includes('/static/images/') ||
    srcLower.includes('/common/images/')
  ) {
    return true;
  }

  return false;
}

async function cleanArticleImages() {
  try {
    console.log('连接数据库...');
    await connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const articlesCollection = connection.db.collection('articles');

    // 获取所有文章
    const articles = await articlesCollection.find({}).toArray();
    console.log(`找到 ${articles.length} 篇文章\n`);

    let updatedCount = 0;
    let totalFilteredImages = 0;

    for (const article of articles) {
      const originalImages = article.imageUrls || [];
      if (originalImages.length === 0) continue;

      // 过滤图片
      const filteredImages = originalImages.filter((url: string) => !isIrrelevantImage(url));
      const removedCount = originalImages.length - filteredImages.length;

      if (removedCount > 0) {
        // 更新文章
        await articlesCollection.updateOne(
          { _id: article._id },
          { $set: { imageUrls: filteredImages } }
        );

        console.log(`📝 ${article.title?.substring(0, 40)}`);
        console.log(`   原图片数: ${originalImages.length}, 过滤后: ${filteredImages.length}, 移除: ${removedCount}`);
        
        // 显示被移除的图片
        const removedImages = originalImages.filter((url: string) => isIrrelevantImage(url));
        removedImages.forEach((url: string) => {
          console.log(`   🚫 ${url}`);
        });
        console.log('');

        updatedCount++;
        totalFilteredImages += removedCount;
      }
    }

    console.log('\n=== 清理完成 ===');
    console.log(`更新文章数: ${updatedCount}`);
    console.log(`过滤图片数: ${totalFilteredImages}`);

    await connection.close();
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

cleanArticleImages();


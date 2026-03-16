/**
 * 测试图片提取功能
 * 验证是否正确过滤了二维码、广告、logo等无关图片
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// 测试URL列表
const testUrls = [
  'https://www.mama.cn/z/wiki/491/',  // 妈妈网文章
  'https://www.babycenter.com/baby/baby-development/baby-milestones-month-by-month_10357636', // BabyCenter文章
];

async function extractImages(url: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`测试URL: ${url}`);
  console.log('='.repeat(80));

  try {
    const resp = await axios.get(url, {
      headers: HTTP_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(resp.data as string);
    const baseUrl = new URL(url);

    // 查找内容容器
    const $contentEl = $('article').length
      ? $('article')
      : $('main').length
      ? $('main')
      : $('.content, .article-content, .post-content').first();

    console.log(`\n内容容器: ${$contentEl.length > 0 ? '找到' : '未找到'}`);

    const images: string[] = [];
    const seen = new Set<string>();
    const filteredImages: Array<{ src: string; reason: string }> = [];

    // 过滤无关图片的规则
    const isIrrelevantImage = (src: string, imgEl: any): { relevant: boolean; reason?: string } => {
      const $img = $(imgEl);
      const srcLower = src.toLowerCase();
      const alt = ($img.attr('alt') || '').toLowerCase();
      const className = ($img.attr('class') || '').toLowerCase();
      const id = ($img.attr('id') || '').toLowerCase();
      const width = parseInt($img.attr('width') || '0');
      const height = parseInt($img.attr('height') || '0');

      // 1. 过滤二维码
      if (
        srcLower.includes('qrcode') ||
        srcLower.includes('qr_code') ||
        srcLower.includes('qr-code') ||
        alt.includes('二维码') ||
        alt.includes('qrcode') ||
        className.includes('qrcode') ||
        className.includes('qr-code')
      ) {
        return { relevant: false, reason: '二维码' };
      }

      // 2. 过滤广告图片
      if (
        srcLower.includes('ad') ||
        srcLower.includes('banner') ||
        srcLower.includes('advert') ||
        className.includes('ad') ||
        className.includes('banner') ||
        className.includes('advert') ||
        id.includes('ad') ||
        id.includes('banner')
      ) {
        return { relevant: false, reason: '广告' };
      }

      // 3. 过滤logo和图标
      if (
        srcLower.includes('logo') ||
        srcLower.includes('icon') ||
        srcLower.includes('favicon') ||
        className.includes('logo') ||
        className.includes('icon') ||
        id.includes('logo') ||
        id.includes('icon')
      ) {
        return { relevant: false, reason: 'Logo/图标' };
      }

      // 4. 过滤尺寸太小的图片
      if ((width > 0 && width < 200) || (height > 0 && height < 200)) {
        return { relevant: false, reason: `尺寸太小 (${width}x${height})` };
      }

      return { relevant: true };
    };

    const addImage = (src: string, imgEl: any) => {
      if (!src) return;

      // 补全相对路径
      let fullUrl = src;
      if (src.startsWith('//')) {
        fullUrl = `${baseUrl.protocol}${src}`;
      } else if (src.startsWith('/')) {
        fullUrl = `${baseUrl.protocol}//${baseUrl.host}${src}`;
      } else if (!src.startsWith('http')) {
        const base = baseUrl.href.substring(0, baseUrl.href.lastIndexOf('/') + 1);
        fullUrl = `${base}${src}`;
      }

      // 过滤掉Base64图片
      if (fullUrl.includes('data:') || fullUrl.includes('base64')) {
        filteredImages.push({ src: fullUrl.substring(0, 50) + '...', reason: 'Base64图片' });
        return;
      }

      // 过滤无关图片
      const check = isIrrelevantImage(fullUrl, imgEl);
      if (!check.relevant) {
        filteredImages.push({ src: fullUrl, reason: check.reason || '未知原因' });
        return;
      }

      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      images.push(fullUrl);
    };

    // 提取封面图
    console.log('\n--- 封面图提取 ---');
    const coverSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      '.article-cover img',
      '.post-cover img',
      '.featured-image img',
    ];

    for (const selector of coverSelectors) {
      const el = $(selector).first();
      if (el.length) {
        const src = el.attr('content') || el.attr('src');
        if (src && el[0]) {
          console.log(`找到封面图 (${selector}): ${src}`);
          addImage(src, el[0]);
          break;
        }
      }
    }

    // 提取正文图片
    console.log('\n--- 正文图片提取 ---');
    if ($contentEl.length) {
      $contentEl.find('img').each((_i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (src) addImage(src, el);
      });
    }

    // 输出结果
    console.log(`\n✅ 保留的图片 (${images.length}张):`);
    images.forEach((img, idx) => {
      console.log(`  ${idx + 1}. ${img}`);
    });

    console.log(`\n🚫 过滤的图片 (${filteredImages.length}张):`);
    filteredImages.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.reason}] ${item.src}`);
    });
  } catch (error: any) {
    console.error(`❌ 测试失败: ${error.message}`);
  }
}

async function main() {
  console.log('开始测试图片提取功能...\n');

  for (const url of testUrls) {
    await extractImages(url);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 延迟1秒
  }

  console.log('\n测试完成！');
}

main();


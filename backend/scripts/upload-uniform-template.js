#!/usr/bin/env node
/**
 * 上传工装模板图片到 COS，并自动写入 .env 文件
 * 用法: node scripts/upload-uniform-template.js <图片路径> [female]
 *   第一个参数: 图片文件路径（必填）
 *   第二个参数: 填 "female" 则设置女性模板，否则设置通用模板
 *
 * 示例:
 *   node scripts/upload-uniform-template.js /tmp/template.jpg
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ 请提供图片路径，例如: node scripts/upload-uniform-template.js /tmp/template.jpg');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ 文件不存在: ${filePath}`);
  process.exit(1);
}

const {
  COS_SECRET_ID,
  COS_SECRET_KEY,
  COS_BUCKET = 'housekeeping-1254058915',
  COS_REGION = 'ap-guangzhou',
} = process.env;

if (!COS_SECRET_ID || !COS_SECRET_KEY) {
  console.error('❌ 缺少 COS_SECRET_ID 或 COS_SECRET_KEY 环境变量，请检查 .env 文件');
  process.exit(1);
}

const cos = new COS({ SecretId: COS_SECRET_ID, SecretKey: COS_SECRET_KEY });

const ext = path.extname(filePath) || '.jpg';
const key = `templates/uniform-template-${Date.now()}${ext}`;
const fileBuffer = fs.readFileSync(filePath);
const domain = `${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com`;

console.log(`📤 正在上传模板图片到 COS...`);
console.log(`   文件: ${filePath} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);

cos.putObject({
  Bucket: COS_BUCKET,
  Region: COS_REGION,
  Key: key,
  Body: fileBuffer,
  ContentType: `image/${ext.replace('.', '') || 'jpeg'}`,
  ACL: 'public-read',
}, (err, data) => {
  if (err) {
    console.error('❌ 上传失败:', err.message);
    process.exit(1);
  }

  const url = `https://${domain}/${key}`;
  console.log(`\n✅ 上传成功！`);
  console.log(`   COS URL: ${url}`);

  // 更新 .env 文件
  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  if (envContent.includes('UNIFORM_TEMPLATE_URL=')) {
    envContent = envContent.replace(/UNIFORM_TEMPLATE_URL=.*/g, `UNIFORM_TEMPLATE_URL=${url}`);
  } else {
    envContent += `\n# AI换装模板图片（穿安得褓贝工装的人）\nUNIFORM_TEMPLATE_URL=${url}\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`\n✅ 已自动写入 .env 文件: UNIFORM_TEMPLATE_URL=${url}`);
  console.log(`\n📌 接下来运行以下命令让配置生效:`);
  console.log(`   pm2 restart backend-prod --update-env`);
});


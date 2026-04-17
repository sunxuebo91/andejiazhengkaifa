/**
 * 数据修复脚本：修正草稿简历的错误生肖
 *
 * 问题：大量草稿简历的 zodiac 字段被错误地设为 'tiger'（属虎）
 * 修复：根据 birthDate 或 age 字段重新计算正确的生肖并更新
 *
 * 计算规则：(出生年份 - 4) % 12 → 对应生肖索引
 * 运行方式：node backend/scripts/fix-zodiac-draft-resumes.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';
const CURRENT_YEAR = new Date().getFullYear(); // 2026

// 生肖枚举（索引 0-11）
const ZODIAC_LIST = [
  'rat',     // 0 鼠
  'ox',      // 1 牛
  'tiger',   // 2 虎
  'rabbit',  // 3 兔
  'dragon',  // 4 龙
  'snake',   // 5 蛇
  'horse',   // 6 马
  'goat',    // 7 羊
  'monkey',  // 8 猴
  'rooster', // 9 鸡
  'dog',     // 10 狗
  'pig',     // 11 猪
];

const ZODIAC_CN = {
  rat: '鼠', ox: '牛', tiger: '虎', rabbit: '兔',
  dragon: '龙', snake: '蛇', horse: '马', goat: '羊',
  monkey: '猴', rooster: '鸡', dog: '狗', pig: '猪',
};

/**
 * 根据出生年份计算生肖
 */
function calcZodiac(birthYear) {
  const idx = ((birthYear - 4) % 12 + 12) % 12; // +12 防止负数
  return ZODIAC_LIST[idx];
}

/**
 * 从 birthDate 字符串中提取年份（支持 "1990-05-15"、"1990/05/15"、"19900515" 等格式）
 */
function extractYear(birthDate) {
  if (!birthDate) return null;
  const str = String(birthDate).trim();
  // 匹配 4 位年份
  const match = str.match(/(\d{4})/);
  if (match) {
    const y = parseInt(match[1], 10);
    if (y >= 1950 && y <= 2010) return y; // 合理范围
  }
  return null;
}

async function fixZodiac() {
  try {
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const col = mongoose.connection.db.collection('resumes');

    // 查询所有草稿简历（有 birthDate 或 age 字段）
    const drafts = await col.find(
      { isDraft: true },
      { projection: { _id: 1, name: 1, age: 1, birthDate: 1, zodiac: 1 } }
    ).toArray();

    console.log(`📋 共找到草稿简历：${drafts.length} 条\n`);

    let updated = 0;
    let skipped = 0;
    let noData = 0;

    for (const resume of drafts) {
      // 1. 优先用 birthDate 算出生年份
      let birthYear = extractYear(resume.birthDate);

      // 2. 退而用 age 估算
      if (!birthYear && resume.age && resume.age >= 18 && resume.age <= 70) {
        birthYear = CURRENT_YEAR - resume.age;
      }

      if (!birthYear) {
        noData++;
        continue;
      }

      const correctZodiac = calcZodiac(birthYear);

      if (resume.zodiac === correctZodiac) {
        skipped++;
        continue; // 已经正确，跳过
      }

      // 更新
      await col.updateOne(
        { _id: resume._id },
        { $set: { zodiac: correctZodiac } }
      );

      console.log(
        `✏️  ${resume.name || '未知'} | 出生年：${birthYear} | ` +
        `原生肖：${ZODIAC_CN[resume.zodiac] || resume.zodiac || '空'} → ` +
        `新生肖：${ZODIAC_CN[correctZodiac]}（${correctZodiac}）`
      );
      updated++;
    }

    console.log('\n========== 修复完成 ==========');
    console.log(`✅ 已更新：${updated} 条`);
    console.log(`⏭️  无需修改：${skipped} 条`);
    console.log(`⚠️  无年龄/生日数据，跳过：${noData} 条`);
    console.log('================================\n');
  } catch (err) {
    console.error('❌ 脚本执行失败：', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

fixZodiac();

/**
 * 修复已有AI自动生成评价中的阿姨全名 → 只保留姓氏
 * 
 * 逻辑：
 * 1. 查找所有 comment 包含"【推荐理由】"的评价（AI自动生成的）
 * 2. 用评价的 employeeName（全名）在 comment 中替换为姓氏 + "阿姨"
 * 3. 同时清除 resumes 表中已缓存的 recommendationReason（下次会重新生成）
 *
 * 使用方法：
 *   cd backend
 *   node scripts/maintenance/fix-evaluation-fullname.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazhengcrm';

async function fixEvaluationFullName() {
  console.log('🔧 开始修复AI评价中的阿姨全名...\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const db = mongoose.connection.db;

    // 1. 查找所有包含【推荐理由】的评价（这些是AI自动生成的）
    const evaluations = await db.collection('employee_evaluations').find({
      comment: { $regex: '【推荐理由】' }
    }).toArray();

    console.log(`📊 找到 ${evaluations.length} 条AI自动生成的评价\n`);

    let updatedCount = 0;

    for (const evaluation of evaluations) {
      const fullName = evaluation.employeeName;
      if (!fullName || fullName.length <= 1) {
        // 名字只有一个字或为空，无需处理
        continue;
      }

      const surname = fullName.charAt(0);
      let newComment = evaluation.comment;

      // 替换 "全名阿姨" → "姓阿姨"（如 "张三阿姨" → "张阿姨"）
      if (newComment.includes(fullName + '阿姨')) {
        newComment = newComment.replace(new RegExp(fullName + '阿姨', 'g'), surname + '阿姨');
      }
      // 也替换单独出现的全名（如 "张三是..." → "张阿姨是..."）
      else if (newComment.includes(fullName)) {
        newComment = newComment.replace(new RegExp(fullName, 'g'), surname + '阿姨');
      }

      if (newComment !== evaluation.comment) {
        await db.collection('employee_evaluations').updateOne(
          { _id: evaluation._id },
          { $set: { comment: newComment } }
        );
        console.log(`  ✅ 评价 ${evaluation._id}: "${fullName}" → "${surname}阿姨"`);
        updatedCount++;
      }
    }

    console.log(`\n📝 更新了 ${updatedCount} 条评价\n`);

    // 2. 清除 resumes 表中已缓存的 recommendationReason（下次访问会重新生成）
    console.log('🧹 清除简历中已缓存的AI推荐理由（下次会重新生成只用姓氏的版本）...');
    const resumeResult = await db.collection('resumes').updateMany(
      { recommendationReason: { $exists: true, $ne: null } },
      { $set: { recommendationReason: null } }
    );
    console.log(`✅ 清除了 ${resumeResult.modifiedCount} 条简历的缓存推荐理由\n`);

    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
    console.log('🎉 修复完成！');
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  }
}

fixEvaluationFullName();


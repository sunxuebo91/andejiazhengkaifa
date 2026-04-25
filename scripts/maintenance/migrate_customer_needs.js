/**
 * 客户需求字段一次性迁移脚本
 * 把 7 个旧 need* 字段（仅 need 有值、结构化字段为空）迁移到对应的结构化字段；
 * 不可结构化的值 append 到 remarks。4 个独有字段不动。
 *
 * 用法：
 *   node scripts/maintenance/migrate_customer_needs.js --dry-run   # 仅打印决策，不写库
 *   node scripts/maintenance/migrate_customer_needs.js             # 实际执行
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';
const DRY_RUN = process.argv.includes('--dry-run');

const VALID_CATEGORIES = ['月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老', '家教', '陪伴师'];
const VALID_REST = ['单休', '双休', '无休', '调休', '待定'];
const CN_NUM = { '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

const isEmpty = (v) => v === undefined || v === null || v === '';

function planMigration(c) {
  const set = {};
  const remarksAppend = [];

  // needOrderType -> serviceCategory
  if (!isEmpty(c.needOrderType) && isEmpty(c.serviceCategory)) {
    const v = String(c.needOrderType).trim();
    if (VALID_CATEGORIES.includes(v)) set.serviceCategory = v;
    else remarksAppend.push(`订单类型:${v}`);
  }

  // needSalary -> salaryBudget（取首个数字）
  if (!isEmpty(c.needSalary) && isEmpty(c.salaryBudget)) {
    const m = String(c.needSalary).match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (n >= 1000 && n <= 50000) set.salaryBudget = n;
      else remarksAppend.push(`薪资:${c.needSalary}`);
    } else {
      remarksAppend.push(`薪资:${c.needSalary}`);
    }
  }

  // needRestTime -> restSchedule
  if (!isEmpty(c.needRestTime) && isEmpty(c.restSchedule)) {
    const v = String(c.needRestTime).trim();
    if (VALID_REST.includes(v)) set.restSchedule = v;
    else remarksAppend.push(`休息时间:${v}`);
  }

  // needOnboardingTime -> expectedStartDate
  if (!isEmpty(c.needOnboardingTime) && isEmpty(c.expectedStartDate)) {
    const t = String(c.needOnboardingTime).trim();
    const d = new Date(t);
    if (!isNaN(d.getTime()) && /\d{4}/.test(t)) set.expectedStartDate = d;
    else remarksAppend.push(`上户时间:${t}`);
  }

  // needHouseArea -> homeArea
  if (!isEmpty(c.needHouseArea) && isEmpty(c.homeArea)) {
    const m = String(c.needHouseArea).match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (n >= 10 && n <= 1000) set.homeArea = n;
      else remarksAppend.push(`房屋面积:${c.needHouseArea}`);
    } else {
      remarksAppend.push(`房屋面积:${c.needHouseArea}`);
    }
  }

  // needFamilyMembers -> familySize（数字 or 中文数字）
  if (!isEmpty(c.needFamilyMembers) && isEmpty(c.familySize)) {
    const raw = String(c.needFamilyMembers).trim();
    const m = raw.match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (n >= 1 && n <= 20) set.familySize = n;
      else remarksAppend.push(`家庭成员:${raw}`);
    } else {
      const cn = raw.match(/[一二两三四五六七八九十]/);
      if (cn && CN_NUM[cn[0]]) set.familySize = CN_NUM[cn[0]];
      else remarksAppend.push(`家庭成员:${raw}`);
    }
  }

  // needServiceAddress -> address
  if (!isEmpty(c.needServiceAddress) && isEmpty(c.address)) {
    set.address = String(c.needServiceAddress).trim();
  }

  return { set, remarksAppend };
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log(`✅ 已连接 ${MONGODB_URI}${DRY_RUN ? '（DRY-RUN 模式，不写库）' : ''}\n`);
    const customers = client.db().collection('customers');

    const orFilter = ['needOrderType','needSalary','needRestTime','needOnboardingTime','needHouseArea','needFamilyMembers','needServiceAddress']
      .map(k => ({ [k]: { $exists: true, $nin: [null, ''] } }));
    const cursor = customers.find({ $or: orFilter });

    let scanned = 0, planned = 0, fieldsTouched = 0, remarksTouched = 0;
    while (await cursor.hasNext()) {
      const c = await cursor.next();
      scanned++;
      const { set, remarksAppend } = planMigration(c);
      const setKeys = Object.keys(set);
      if (setKeys.length === 0 && remarksAppend.length === 0) continue;

      planned++;
      fieldsTouched += setKeys.length;
      console.log(`[${planned}] ${c.customerId || c._id} ${c.name || ''}`);
      for (const k of setKeys) console.log(`     SET ${k} = ${JSON.stringify(set[k])}`);
      if (remarksAppend.length > 0) {
        const newRemarksLine = remarksAppend.join('；');
        console.log(`     APPEND remarks += "${newRemarksLine}"`);
        remarksTouched++;
        if (!DRY_RUN) {
          const cur = c.remarks ? String(c.remarks) : '';
          set.remarks = cur ? `${cur}\n[历史需求]${newRemarksLine}` : `[历史需求]${newRemarksLine}`;
        }
      }
      if (!DRY_RUN && Object.keys(set).length > 0) {
        await customers.updateOne({ _id: c._id }, { $set: set });
      }
    }

    console.log(`\n📊 扫描 ${scanned} 条 / 计划迁移 ${planned} 条 / 写入字段 ${fieldsTouched} 个 / 追加 remarks ${remarksTouched} 条`);
    console.log(DRY_RUN ? '✋ DRY-RUN 完成（未写库）' : '✅ 迁移完成');
  } finally {
    await client.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });

/* eslint-disable */
// 一次性清空客户线索流转积压脚本：
//   循环调用 POST /api/lead-transfer/execute-now，直到单轮流转数为 0（或达最大轮次保护）
//   与 cron 走同一套 LeadAutoTransferService.executeRuleById 逻辑，ignoreTimeWindow=true
// 用法:
//   node backend/scripts/drain-lead-transfer-backlog.js            # 默认跑『客户线索流转』规则
//   node backend/scripts/drain-lead-transfer-backlog.js <ruleId>   # 指定规则 _id
//
// 环境变量依赖: MONGODB_URI, JWT_SECRET (从 backend/.env 读取)

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';
const JWT_SECRET = process.env.JWT_SECRET;
const API_HOST = process.env.API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.PORT || 3000);
const DEFAULT_RULE_NAME = '客户线索流转';

const MAX_ROUNDS = 5;                 // 不限批量后，首轮应能清干净；保留 5 轮兜底
const SLEEP_MS_BETWEEN_ROUNDS = 3000; // 两轮之间留 3s 让锁释放、流水落库
const BATCH_SIZE = 0;                 // 0 = 不限制单次处理条数（需后端 batchSize 参数支持）

if (!JWT_SECRET) {
  console.error('❌ 缺少 JWT_SECRET，无法签发 token');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function post(pathname, payload, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        host: API_HOST,
        port: API_PORT,
        path: pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${token}`,
        },
        timeout: 10 * 60 * 1000, // 10 min
      },
      res => {
        let chunks = '';
        res.on('data', c => (chunks += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch (e) {
            resolve({ status: res.statusCode, body: chunks });
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('请求超时（10分钟）'));
    });
    req.write(body);
    req.end();
  });
}

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`✅ 已连接 Mongo`);

  const db = mongoose.connection.db;

  // 1. 定位要跑的规则
  const ruleIdArg = process.argv[2];
  const rulesCol = db.collection('lead_transfer_rules');
  let rule;
  if (ruleIdArg) {
    rule = await rulesCol.findOne({ _id: new mongoose.Types.ObjectId(ruleIdArg) });
  } else {
    rule = await rulesCol.findOne({ ruleName: DEFAULT_RULE_NAME, enabled: true });
  }
  if (!rule) {
    console.error('❌ 找不到要执行的规则');
    process.exit(1);
  }
  console.log(`🎯 目标规则: ${rule.ruleName} (${rule._id}) enabled=${rule.enabled} targetModule=${rule.targetModule}`);

  // 2. 找一个 admin 用户用来签 JWT
  const usersCol = db.collection('users');
  const adminUser = await usersCol.findOne({
    role: 'admin',
    active: { $ne: false },
    suspended: { $ne: true },
  });
  if (!adminUser) {
    console.error('❌ 找不到可用的 admin 用户');
    process.exit(1);
  }
  console.log(`👤 使用 admin 账号签 token: ${adminUser.username} (${adminUser._id})`);

  const token = jwt.sign(
    {
      username: adminUser.username,
      sub: adminUser._id.toString(),
      role: adminUser.role,
      permissions: adminUser.permissions || [],
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  // 3. 统计积压：扫一眼 lastActivityAt 老于 inactiveHours 的客户数量（只作提示，不作为终止条件）
  const customersCol = db.collection('customers');
  const cutoff = new Date(Date.now() - (rule.triggerConditions?.inactiveHours || 48) * 3600 * 1000);
  const backlog = await customersCol.countDocuments({
    currentOwnerId: { $ne: null },
    autoTransferEnabled: { $ne: false },
    lastActivityAt: { $lt: cutoff },
  });
  console.log(`📦 粗略积压估算（lastActivityAt < ${cutoff.toISOString()}，未细过滤）: ${backlog} 条\n`);

  // 4. 循环调用 execute-now
  let round = 0;
  let totalTransferred = 0;
  while (round < MAX_ROUNDS) {
    round++;
    console.log(`\n—— 第 ${round}/${MAX_ROUNDS} 轮 —— ${new Date().toLocaleTimeString('zh-CN')}`);
    const t0 = Date.now();
    const { status, body } = await post(
      '/api/lead-transfer/execute-now',
      { ruleId: rule._id.toString(), batchSize: BATCH_SIZE },
      token,
    );
    const cost = ((Date.now() - t0) / 1000).toFixed(1);

    if (status !== 200 && status !== 201) {
      console.error(`❌ HTTP ${status}:`, body);
      break;
    }
    const data = body?.data || {};
    const transferred = Number(data.transferredCount || 0);
    totalTransferred += transferred;
    console.log(`   耗时 ${cost}s, 本轮流转 ${transferred} 条, 累计 ${totalTransferred} 条`);
    if (Array.isArray(data.userStats)) {
      for (const u of data.userStats) {
        if (u.transferredOut || u.transferredIn) {
          console.log(`     · ${u.userName}: 流出 ${u.transferredOut}, 流入 ${u.transferredIn}`);
        }
      }
    }

    if (transferred === 0) {
      console.log('\n✅ 本轮已无符合条件线索，结束');
      break;
    }
    await sleep(SLEEP_MS_BETWEEN_ROUNDS);
  }

  if (round >= MAX_ROUNDS) {
    console.warn(`\n⚠️ 已达最大轮次保护 (${MAX_ROUNDS})，请检查是否仍有剩余积压`);
  }

  console.log(`\n==== 汇总 ====`);
  console.log(`规则: ${rule.ruleName}`);
  console.log(`总轮次: ${round}`);
  console.log(`总流转: ${totalTransferred} 条`);

  await mongoose.disconnect();
})().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});

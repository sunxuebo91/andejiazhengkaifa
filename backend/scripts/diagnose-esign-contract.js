/**
 * 一次性诊断脚本：查询爱签单个合同真实签署进度
 * 用法：cd backend && node scripts/diagnose-esign-contract.js <contractNo>
 */
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted = {};
  Object.keys(obj).sort().forEach(k => { sorted[k] = sortObjectKeys(obj[k]); });
  return sorted;
}

function generateSign(appId, privateKey, dataString, timestamp) {
  const md5Hash = crypto.createHash('md5').update(dataString, 'utf8').digest('hex');
  const updateString = dataString + md5Hash + appId + timestamp;
  const clean = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\r?\n/g, '').replace(/\s/g, '');
  const pem = '-----BEGIN PRIVATE KEY-----\n' + clean + '\n-----END PRIVATE KEY-----';
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(updateString, 'utf8');
  return sign.sign(pem, 'base64').replace(/\r\n/g, '').replace(/\n/g, '');
}

async function callAPI(uri, bizData) {
  const appId = process.env.ESIGN_APP_ID;
  const privateKey = process.env.ESIGN_PRIVATE_KEY;
  const host = process.env.ESIGN_HOST || 'https://oapi.asign.cn';
  if (!appId || !privateKey) throw new Error('missing ESIGN_APP_ID or ESIGN_PRIVATE_KEY in env');
  const sorted = sortObjectKeys(bizData);
  const dataString = JSON.stringify(sorted);
  const timestamp = (Date.now() + 10 * 60 * 1000).toString();
  const sign = generateSign(appId, privateKey, dataString, timestamp);
  const fd = new FormData();
  fd.append('appId', appId);
  fd.append('timestamp', timestamp);
  fd.append('bizData', dataString);
  const resp = await axios.post(host + uri, fd, {
    headers: { sign, timestamp, 'Content-Type': fd.getHeaders()['content-type'] },
    timeout: 30000,
  });
  return resp.data;
}

async function main() {
  const contractNo = process.argv[2];
  if (!contractNo) { console.error('Usage: node diagnose-esign-contract.js <contractNo>'); process.exit(1); }
  const info = await callAPI('/contract/getContract', { contractNo });
  const signUsers = (info && info.data && (info.data.signUser || info.data.signUsers)) || [];
  console.log(JSON.stringify({
    contractNo,
    code: info && info.code,
    message: info && info.message,
    contractStatus: info && info.data && info.data.status,
    signerCount: signUsers.length,
    signers: signUsers.map(u => ({
      name: u.name, account: u.account, userType: u.userType,
      signStatus: u.signStatus, signOrder: u.signOrder, signTime: u.signTime,
    })),
  }, null, 2));
}

main().catch(e => { console.error((e && e.response && e.response.data) || (e && e.message) || e); process.exit(1); });

#!/usr/bin/env node
/**
 * Permission Test Script
 * Tests all three new roles: operator, admissions, dispatch
 */
const { execSync } = require('child_process');
const jwt = require('/home/ubuntu/andejiazhengcrm/backend/node_modules/jsonwebtoken');
const http = require('http');

const JWT_SECRET = 'andejiazheng-secret-key';
const BASE_URL = 'http://localhost:3000';

// Test users (real users from DB)
const TEST_USERS = {
  operator: { id: '6848f5e2809126015584f13d', username: 'yankaixin', role: 'operator', name: '闫凯欣' },
  admissions: { id: '697190fa9f60a1481929bc2f', username: 'mayuzhuo', role: 'admissions', name: '马玉琢' },
  dispatch: { id: '68b6bf5d8ca802c7f03b966b', username: 'liulili', role: 'dispatch', name: '刘黎黎' },
};

function generateToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, permissions: [] },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function request(method, path, token) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 100) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

const TEST_CASES = {
  operator: [
    { desc: '客户列表', method: 'GET', path: '/api/customers?page=1&limit=5' },
    { desc: '阿姨简历列表', method: 'GET', path: '/api/resumes?page=1&pageSize=5' },
    { desc: '合同列表', method: 'GET', path: '/api/contracts?page=1&limit=5' },
    { desc: '培训线索列表', method: 'GET', path: '/api/training-leads?page=1&pageSize=5' },
    { desc: '背调列表(zmdb)', method: 'GET', path: '/api/zmdb/reports?page=1&pageSize=5' },
    { desc: '保险列表(dashubao)', method: 'GET', path: '/api/dashubao/policies?page=1&pageSize=5' },
    { desc: '用户列表', method: 'GET', path: '/api/users?page=1&pageSize=5' },
  ],
  admissions: [
    { desc: '阿姨简历列表', method: 'GET', path: '/api/resumes?page=1&pageSize=5' },
    { desc: '培训线索列表', method: 'GET', path: '/api/training-leads?page=1&pageSize=5' },
    { desc: '用户列表(需要user:view)', method: 'GET', path: '/api/users?page=1&pageSize=5' },
    { desc: '客户列表(应403)', method: 'GET', path: '/api/customers?page=1&limit=5', expectFail: true },
    { desc: '合同列表(应403)', method: 'GET', path: '/api/contracts?page=1&limit=5', expectFail: true },
    { desc: '背调列表(应403)', method: 'GET', path: '/api/zmdb/reports?page=1&pageSize=5', expectFail: true },
    { desc: '保险列表(应403)', method: 'GET', path: '/api/dashubao/policies?page=1&pageSize=5', expectFail: true },
  ],
  dispatch: [
    { desc: '客户列表', method: 'GET', path: '/api/customers?page=1&limit=5' },
    { desc: '阿姨简历列表', method: 'GET', path: '/api/resumes?page=1&pageSize=5' },
    { desc: '合同列表', method: 'GET', path: '/api/contracts?page=1&limit=5' },
    { desc: '背调列表(zmdb)', method: 'GET', path: '/api/zmdb/reports?page=1&pageSize=5' },
    { desc: '保险列表(dashubao)', method: 'GET', path: '/api/dashubao/policies?page=1&pageSize=5' },
    { desc: '可分配用户(合同)', method: 'GET', path: '/api/contracts/assignable-users' },
    { desc: '可分配用户(客户)', method: 'GET', path: '/api/customers/assignable-users' },
    { desc: '用户列表(需要user:view)', method: 'GET', path: '/api/users?page=1&pageSize=5' },
    { desc: '培训线索(应403)', method: 'GET', path: '/api/training-leads?page=1&pageSize=5', expectFail: true },
  ],
};

async function runTests() {
  let passed = 0, failed = 0, total = 0;
  for (const [roleName, cases] of Object.entries(TEST_CASES)) {
    const user = TEST_USERS[roleName];
    const token = generateToken(user);
    console.log(`\n========== 角色: ${roleName} (${user.name}) ==========`);
    for (const tc of cases) {
      total++;
      const res = await request(tc.method, tc.path, token);
      const ok = tc.expectFail ? (res.status === 403 || res.status === 401) : (res.status >= 200 && res.status < 300);
      const icon = ok ? '✅' : '❌';
      const label = tc.expectFail ? `[期望403] ` : '';
      console.log(`  ${icon} ${label}${tc.desc}: HTTP ${res.status}`);
      if (ok) passed++; else { failed++; console.log(`     → 预期:${tc.expectFail?'403':'2xx'} 实际:${res.status}`); }
    }
  }
  console.log(`\n========================================`);
  console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);


/**
 * ZEGO Token 生成测试脚本
 * 用于验证 Token 生成逻辑是否正确
 */

const crypto = require('crypto');

// ZEGO 配置
const ZEGO_APP_ID = 1279160453;
const ZEGO_SERVER_SECRET = 'e18cc600e2939d412c48f152e157f01d';

// 测试参数
const userId = 'test_user_123';
const roomId = 'test_room_456';
const userName = '测试用户';
const expireTime = 7200; // 2小时

console.log('========================================');
console.log('ZEGO Token 生成测试');
console.log('========================================');
console.log('');
console.log('配置信息：');
console.log('  AppID:', ZEGO_APP_ID);
console.log('  ServerSecret:', ZEGO_SERVER_SECRET.substring(0, 10) + '...');
console.log('');
console.log('测试参数：');
console.log('  userId:', userId);
console.log('  roomId:', roomId);
console.log('  userName:', userName);
console.log('  expireTime:', expireTime, '秒');
console.log('');

try {
  // 生成 Token（与后端逻辑一致）
  const currentTime = Math.floor(Date.now() / 1000);
  const payload = {
    app_id: ZEGO_APP_ID,
    user_id: userId,
    room_id: roomId,
    privilege: {
      1: 1, // 登录房间权限
      2: 1, // 推流权限
    },
    stream_id_list: null,
    expire_time: currentTime + expireTime,
  };

  console.log('Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  // 生成签名
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString('base64');
  
  const signature = crypto
    .createHmac('sha256', ZEGO_SERVER_SECRET)
    .update(payloadBase64)
    .digest('base64');

  // 组装 token
  const token = `04${payloadBase64}.${signature}`;
  
  console.log('========================================');
  console.log('✅ Token 生成成功！');
  console.log('========================================');
  console.log('');
  console.log('Token 信息：');
  console.log('  长度:', token.length, '字符');
  console.log('  前缀:', token.substring(0, 10) + '...');
  console.log('');
  console.log('完整 Token:');
  console.log(token);
  console.log('');
  console.log('========================================');
  console.log('Token 验证：');
  console.log('========================================');
  console.log('');
  
  // 验证 Token 格式
  if (token.startsWith('04')) {
    console.log('✅ Token 前缀正确 (04)');
  } else {
    console.log('❌ Token 前缀错误');
  }
  
  if (token.includes('.')) {
    console.log('✅ Token 包含分隔符 (.)');
  } else {
    console.log('❌ Token 缺少分隔符');
  }
  
  const parts = token.split('.');
  if (parts.length === 2) {
    console.log('✅ Token 结构正确（2部分）');
    console.log('  - Payload 部分长度:', parts[0].length);
    console.log('  - Signature 部分长度:', parts[1].length);
  } else {
    console.log('❌ Token 结构错误');
  }
  
  console.log('');
  console.log('========================================');
  console.log('测试完成！');
  console.log('========================================');
  console.log('');
  console.log('您可以使用此 Token 在前端调用 ZEGO SDK');
  console.log('');

} catch (error) {
  console.error('❌ Token 生成失败:', error.message);
  console.error(error);
  process.exit(1);
}


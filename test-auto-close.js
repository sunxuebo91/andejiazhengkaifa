#!/usr/bin/env node

/**
 * 测试面试间3分钟自动关闭功能
 * 
 * 测试流程：
 * 1. 创建一个面试间
 * 2. 不调用 leaveRoom（模拟浏览器直接关闭）
 * 3. 等待3分钟
 * 4. 检查面试间是否自动关闭
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER_ID = 'test_user_' + Date.now();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(seconds) {
  log(`⏰ 等待 ${seconds} 秒...`, 'yellow');
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function createInterviewRoom() {
  try {
    log('\n📝 步骤1: 创建面试间', 'cyan');
    const response = await axios.post(`${BASE_URL}/interview/rooms`, {
      hostUserId: TEST_USER_ID,
      hostName: '测试主持人',
      title: '自动关闭测试面试间',
    });
    
    const roomId = response.data.data.roomId;
    log(`✅ 面试间创建成功: ${roomId}`, 'green');
    return roomId;
  } catch (error) {
    log(`❌ 创建面试间失败: ${error.message}`, 'red');
    if (error.response) {
      log(`   响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    throw error;
  }
}

async function checkRoomStatus(roomId) {
  try {
    const response = await axios.get(`${BASE_URL}/interview/rooms/${roomId}`);
    const status = response.data.data.status;
    log(`   房间状态: ${status}`, status === 'active' ? 'yellow' : 'green');
    return status;
  } catch (error) {
    log(`❌ 查询面试间状态失败: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  log('🚀 开始测试面试间3分钟自动关闭功能', 'blue');
  log('=' .repeat(60), 'blue');
  
  let roomId;
  
  try {
    // 步骤1: 创建面试间
    roomId = await createInterviewRoom();
    
    // 步骤2: 检查初始状态
    log('\n📝 步骤2: 检查初始状态', 'cyan');
    await checkRoomStatus(roomId);
    
    // 步骤3: 模拟浏览器关闭（不调用 leaveRoom）
    log('\n📝 步骤3: 模拟浏览器关闭（不调用 leaveRoom）', 'cyan');
    log('   ⚠️  注意：我们故意不调用 leaveRoom API', 'yellow');
    log('   这模拟了用户直接关闭浏览器标签页的情况', 'yellow');
    
    // 步骤4: 等待3分钟 + 30秒（确保定时任务运行）
    log('\n📝 步骤4: 等待3分钟30秒（确保定时任务运行）', 'cyan');
    const waitTime = 3 * 60 + 30; // 3分钟30秒
    
    // 每30秒检查一次状态
    const checkInterval = 30;
    for (let i = checkInterval; i <= waitTime; i += checkInterval) {
      await sleep(checkInterval);
      log(`\n🔍 已等待 ${i} 秒，检查房间状态...`, 'cyan');
      const status = await checkRoomStatus(roomId);
      
      if (status === 'ended') {
        log(`\n🎉 测试成功！面试间在 ${i} 秒后自动关闭`, 'green');
        log('=' .repeat(60), 'green');
        return;
      }
    }
    
    // 如果3分钟30秒后还没关闭，测试失败
    log('\n❌ 测试失败！面试间在3分钟30秒后仍未自动关闭', 'red');
    log('=' .repeat(60), 'red');
    process.exit(1);
    
  } catch (error) {
    log(`\n❌ 测试过程中发生错误: ${error.message}`, 'red');
    log('=' .repeat(60), 'red');
    process.exit(1);
  }
}

// 运行测试
main();


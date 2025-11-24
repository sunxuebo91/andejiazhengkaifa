// 测试通知系统 WebSocket 实时推送
const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001/notifications';

let token = '';
let userId = '';
let socket = null;

async function login() {
  console.log('1. 登录获取token...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  token = response.data.data.access_token;
  userId = response.data.data.user.id;
  console.log(`✅ 登录成功，用户ID: ${userId}`);
  return token;
}

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    console.log('\n2. 连接WebSocket...');
    
    socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });
    
    socket.on('connect', () => {
      console.log(`✅ WebSocket连接成功，Socket ID: ${socket.id}`);
      resolve();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket连接失败:', error.message);
      reject(error);
    });
    
    socket.on('notification', (data) => {
      console.log('\n📬 收到实时通知:');
      console.log(`   类型: ${data.type}`);
      console.log(`   标题: ${data.title}`);
      console.log(`   内容: ${data.content}`);
      console.log(`   优先级: ${data.priority}`);
    });
    
    socket.on('unreadCount', (data) => {
      console.log(`\n🔔 未读数量更新: ${data.count}`);
    });
    
    socket.on('disconnect', () => {
      console.log('\n⚠️  WebSocket断开连接');
    });
  });
}

async function requestUnreadCount() {
  return new Promise((resolve) => {
    console.log('\n3. 请求未读数量...');
    socket.emit('getUnreadCount');
    
    // 等待响应
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}

async function createTestNotification() {
  console.log('\n4. 创建测试通知（应该触发WebSocket推送）...');
  const { MongoClient } = require('mongodb');
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  
  try {
    await client.connect();
    const db = client.db('housekeeping');
    
    const result = await db.collection('notifications').insertOne({
      userId: require('mongodb').ObjectId.createFromHexString(userId),
      type: 'SYSTEM_ANNOUNCEMENT',
      title: '🚀 WebSocket实时推送测试',
      content: '这是一条通过WebSocket实时推送的测试通知！',
      priority: 'HIGH',
      status: 'SENT',
      data: {
        testType: 'websocket'
      },
      icon: 'bell',
      color: '#52c41a',
      sentAt: new Date(),
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ 测试通知创建成功，ID: ${result.insertedId}`);
    
    // 模拟通过NotificationGateway发送
    // 在实际场景中，这会由NotificationService自动触发
    console.log('⏳ 等待WebSocket推送...');
    
    return result.insertedId;
  } finally {
    await client.close();
  }
}

async function testCustomerAssignment() {
  console.log('\n5. 测试客户分配通知场景...');

  // 获取用户列表
  const usersResponse = await axios.get(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const users = Array.isArray(usersResponse.data.data) ? usersResponse.data.data : [];
  if (users.length < 2) {
    console.log('⚠️  用户数量不足，跳过客户分配测试');
    return;
  }

  const targetUser = users.find(u => u.id !== userId) || users[1];
  console.log(`   目标用户: ${targetUser.name} (${targetUser.id})`);
  
  // 模拟客户分配通知
  const { MongoClient } = require('mongodb');
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  
  try {
    await client.connect();
    const db = client.db('housekeeping');
    
    const result = await db.collection('notifications').insertOne({
      userId: require('mongodb').ObjectId.createFromHexString(targetUser.id),
      type: 'CUSTOMER_ASSIGNED',
      title: '您有新的客户',
      content: '您有新的客户【张三】，电话：138****1234，来源：线上推广，请及时跟进！',
      priority: 'HIGH',
      status: 'SENT',
      data: {
        customerId: '123456',
        customerName: '张三',
        phone: '138****1234',
        leadSource: '线上推广'
      },
      icon: 'user-add',
      color: '#1890ff',
      actionUrl: '/customers/123456',
      actionText: '查看详情',
      sentAt: new Date(),
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ 客户分配通知创建成功，ID: ${result.insertedId}`);
    console.log(`   通知已发送给: ${targetUser.name}`);
  } finally {
    await client.close();
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log('========================================');
    console.log('🚀 通知系统 WebSocket 闭环测试');
    console.log('========================================\n');
    
    // 1. 登录
    await login();
    
    // 2. 连接WebSocket
    await connectWebSocket();
    
    // 3. 请求未读数量
    await requestUnreadCount();
    
    // 4. 创建测试通知
    await createTestNotification();
    await wait(2000); // 等待WebSocket推送
    
    // 5. 测试客户分配场景
    await testCustomerAssignment();
    await wait(2000);
    
    console.log('\n========================================');
    console.log('✅ WebSocket测试完成！');
    console.log('========================================');
    console.log('\n💡 提示: 如果看到实时通知推送，说明WebSocket工作正常');
    console.log('💡 注意: 由于我们直接插入数据库，没有触发NotificationGateway');
    console.log('💡 在实际使用中，通过NotificationService发送会自动触发WebSocket推送');
    
    // 保持连接一段时间
    console.log('\n⏳ 保持连接5秒...');
    await wait(5000);
    
    // 断开连接
    if (socket) {
      socket.disconnect();
      console.log('\n✅ WebSocket已断开');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

main();


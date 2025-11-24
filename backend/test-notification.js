// 测试通知系统
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let token = '';
let userId = '';

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

async function getUnreadCount() {
  console.log('\n2. 获取未读数量...');
  const response = await axios.get(`${API_BASE}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`✅ 未读数量: ${response.data.data.count}`);
  return response.data.data.count;
}

async function getNotifications() {
  console.log('\n3. 获取通知列表...');
  const response = await axios.get(`${API_BASE}/notifications?page=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`✅ 通知总数: ${response.data.data.total}`);
  if (response.data.data.items.length > 0) {
    console.log('最新通知:');
    response.data.data.items.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.type}] ${item.title}`);
      console.log(`     ${item.content}`);
      console.log(`     状态: ${item.status}, 优先级: ${item.priority}`);
    });
  }
  return response.data.data;
}

async function createTestNotification() {
  console.log('\n4. 创建测试通知（通过MongoDB）...');
  const { MongoClient } = require('mongodb');
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  
  try {
    await client.connect();
    const db = client.db('housekeeping');
    
    // 创建测试通知
    const result = await db.collection('notifications').insertOne({
      userId: require('mongodb').ObjectId.createFromHexString(userId),
      type: 'SYSTEM_ANNOUNCEMENT',
      title: '🎉 通知系统测试',
      content: '这是一条测试通知，用于验证通知系统是否正常工作。',
      priority: 'HIGH',
      status: 'SENT',
      data: {
        testData: '测试数据'
      },
      icon: 'bell',
      color: '#1890ff',
      sentAt: new Date(),
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ 测试通知创建成功，ID: ${result.insertedId}`);
    return result.insertedId;
  } finally {
    await client.close();
  }
}

async function markAsRead(notificationIds) {
  console.log('\n5. 标记通知为已读...');
  const response = await axios.put(`${API_BASE}/notifications/mark-read`, {
    notificationIds
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`✅ 标记成功: ${response.data.message}`);
}

async function markAllAsRead() {
  console.log('\n6. 标记所有通知为已读...');
  const response = await axios.put(`${API_BASE}/notifications/mark-all-read`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`✅ 标记成功: ${response.data.message}`);
}

async function main() {
  try {
    console.log('========================================');
    console.log('🚀 通知系统闭环测试');
    console.log('========================================\n');
    
    // 1. 登录
    await login();
    
    // 2. 获取初始未读数量
    const initialCount = await getUnreadCount();
    
    // 3. 创建测试通知
    const notificationId = await createTestNotification();
    
    // 4. 再次获取未读数量（应该+1）
    const newCount = await getUnreadCount();
    console.log(`\n📊 未读数量变化: ${initialCount} -> ${newCount}`);
    
    // 5. 获取通知列表
    const notifications = await getNotifications();
    
    // 6. 标记为已读
    if (notifications.items.length > 0) {
      await markAsRead([notifications.items[0]._id]);
      
      // 7. 验证未读数量减少
      const afterReadCount = await getUnreadCount();
      console.log(`\n📊 标记已读后未读数量: ${afterReadCount}`);
    }
    
    // 8. 标记所有为已读
    await markAllAsRead();
    
    // 9. 最终验证
    const finalCount = await getUnreadCount();
    console.log(`\n📊 最终未读数量: ${finalCount}`);
    
    console.log('\n========================================');
    console.log('✅ 通知系统闭环测试完成！');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

main();


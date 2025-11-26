const mongoose = require('mongoose');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/housekeeping');

const customerId = process.argv[2];
if (!customerId) {
  console.error('请提供客户ID');
  process.exit(1);
}

// 计算48小时前的时间
const pastDate = new Date();
pastDate.setHours(pastDate.getHours() - 50);

console.log(`更新客户 ${customerId} 的 lastActivityAt 为: ${pastDate.toISOString()}`);

mongoose.connection.once('open', async () => {
  try {
    const result = await mongoose.connection.db.collection('customers').updateOne(
      { _id: new mongoose.Types.ObjectId(customerId) },
      { $set: { lastActivityAt: pastDate } }
    );
    
    console.log('更新结果:', result);
    
    // 验证更新
    const customer = await mongoose.connection.db.collection('customers').findOne(
      { _id: new mongoose.Types.ObjectId(customerId) },
      { projection: { name: 1, lastActivityAt: 1 } }
    );
    
    console.log('更新后的客户:', customer);
    
    process.exit(0);
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  }
});


/**
 * 检查脚本：验证业务驾驶舱数据的准确性
 */

const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

async function checkDashboardData() {
  try {
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const db = mongoose.connection.db;
    const customersCollection = db.collection('customers');
    const contractsCollection = db.collection('contracts');
    const resumesCollection = db.collection('resumes');

    // 获取本月的开始和结束时间
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log('📅 统计时间范围：');
    console.log(`   本月开始: ${monthStart.toISOString()}`);
    console.log(`   本月结束: ${monthEnd.toISOString()}\n`);

    // ========== 客户业务指标 ==========
    console.log('🎯 客户业务指标：');
    
    const totalCustomers = await customersCollection.countDocuments({});
    console.log(`   客户总量: ${totalCustomers}`);

    const newThisMonthCustomers = await customersCollection.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    console.log(`   本月新增客户: ${newThisMonthCustomers}`);

    const pendingMatchCustomers = await customersCollection.countDocuments({
      contractStatus: '匹配中'
    });
    console.log(`   待匹配客户（匹配中）: ${pendingMatchCustomers}`);

    const signedCustomers = await customersCollection.countDocuments({
      contractStatus: '已签约'
    });
    console.log(`   已签约客户: ${signedCustomers}`);

    const lostCustomers = await customersCollection.countDocuments({
      contractStatus: '流失客户'
    });
    console.log(`   流失客户: ${lostCustomers}\n`);

    // ========== 线索质量指标 ==========
    console.log('📊 线索质量指标：');
    
    const aLevelCustomers = await customersCollection.countDocuments({
      leadLevel: 'A类'
    });
    console.log(`   A类线索数量: ${aLevelCustomers}`);

    const totalLeads = await customersCollection.countDocuments({
      leadLevel: { $in: ['A类', 'B类', 'C类', 'D类'] }
    });
    console.log(`   总线索数量（A/B/C/D类）: ${totalLeads}`);

    const aLevelRatio = totalLeads > 0 ? ((aLevelCustomers / totalLeads) * 100).toFixed(2) : 0;
    console.log(`   A类线索占比: ${aLevelRatio}%\n`);

    // ========== 合同签约指标 ==========
    console.log('📋 合同签约指标：');
    
    const totalContracts = await contractsCollection.countDocuments({});
    console.log(`   合同总量: ${totalContracts}`);

    const newThisMonthContracts = await contractsCollection.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    console.log(`   本月新签合同: ${newThisMonthContracts}`);

    const signingContracts = await contractsCollection.countDocuments({
      esignStatus: '1' // 签约中状态
    });
    console.log(`   签约中合同: ${signingContracts}`);

    const changeWorkerContracts = await contractsCollection.countDocuments({
      replacesContractId: { $exists: true, $ne: null }
    });
    console.log(`   换人合同数: ${changeWorkerContracts}`);

    const signConversionRate = totalCustomers > 0 ? 
      ((signedCustomers / totalCustomers) * 100).toFixed(2) : 0;
    console.log(`   签约转化率: ${signConversionRate}%\n`);

    // ========== 简历资源指标 ==========
    console.log('👥 简历资源指标：');
    
    const totalResumes = await resumesCollection.countDocuments({});
    console.log(`   简历总量: ${totalResumes}`);

    const newThisMonthResumes = await resumesCollection.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    console.log(`   本月新增简历: ${newThisMonthResumes}`);

    const acceptingResumes = await resumesCollection.countDocuments({
      orderStatus: 'accepting'
    });
    console.log(`   想接单阿姨: ${acceptingResumes}`);

    const notAcceptingResumes = await resumesCollection.countDocuments({
      orderStatus: 'not-accepting'
    });
    console.log(`   不接单阿姨: ${notAcceptingResumes}`);

    const onServiceResumes = await resumesCollection.countDocuments({
      orderStatus: 'on-service'
    });
    console.log(`   已上户阿姨: ${onServiceResumes}\n`);

    await mongoose.disconnect();
    console.log('✅ 检查完成');
  } catch (error) {
    console.error('❌ 检查失败:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// 执行检查
checkDashboardData();


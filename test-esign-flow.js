/**
 * 测试小程序创建合同时是否自动调用爱签API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testCreateContract() {
  console.log('🧪 测试小程序创建合同并自动调用爱签API\n');

  const testContract = {
    // 客户信息
    customerName: '测试客户',
    customerPhone: '13800138000',
    customerIdCard: '110101199001011234',
    customerId: 'temp', // 临时ID，后端会自动生成

    // 服务人员信息
    workerName: '测试阿姨',
    workerPhone: '13900139000',
    workerIdCard: '110101199002021234',
    workerId: 'temp', // 临时ID，后端会自动生成

    // 合同信息
    contractType: '月嫂',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    workerSalary: 8000,
    customerServiceFee: 1000,
    createdBy: 'temp', // 临时ID，后端会自动生成

    // 🔥 爱签相关字段
    templateNo: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE',
    templateParams: {
      '甲方': '测试客户',
      '乙方': '测试阿姨',
      '丙方': '安得家政服务有限公司',
      '甲方电话': '13800138000',
      '乙方电话': '13900139000',
      '服务费用': '8000元/月',
      '服务期限': '2026-03-01至2026-05-31'
    }
  };

  try {
    console.log('📤 发送创建合同请求...');
    const response = await axios.post(
      `${API_BASE}/api/contracts/miniprogram/create`,
      testContract,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ 合同创建响应:');
    console.log('  成功:', response.data.success);
    console.log('  消息:', response.data.message);
    
    if (response.data.data) {
      const contract = response.data.data;
      console.log('\n📋 合同信息:');
      console.log('  合同编号:', contract.contractNumber);
      console.log('  合同状态:', contract.contractStatus);
      console.log('  爱签合同号:', contract.esignContractNo || '❌ 未创建');
      console.log('  爱签签署链接:', contract.esignSignUrls ? '✅ 已生成' : '❌ 未生成');
      
      if (contract.esignContractNo) {
        console.log('\n🎉 成功！爱签流程已自动触发！');
      } else {
        console.log('\n⚠️  警告：合同已创建，但爱签流程未触发');
      }
      
      return contract._id;
    }
  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    throw error;
  }
}

async function checkLogs() {
  console.log('\n📋 检查后端日志...');
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('pm2 logs backend-prod --lines 50 --nostream | grep -E "(爱签|esign|createCompleteContractFlow)" | tail -20', 
      (error, stdout, stderr) => {
        if (stdout) {
          console.log(stdout);
        } else {
          console.log('  未找到相关日志');
        }
        resolve();
      }
    );
  });
}

async function main() {
  try {
    const contractId = await testCreateContract();
    
    // 等待3秒让日志写入
    console.log('\n⏳ 等待3秒后检查日志...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await checkLogs();
    
    console.log('\n✅ 测试完成！');
    console.log('\n💡 提示：');
    console.log('  1. 如果看到"开始为合同 XXX 创建爱签电子合同"，说明流程已触发');
    console.log('  2. 如果看到"缺少必要字段，跳过爱签流程"，说明条件判断生效');
    console.log('  3. 如果看到"爱签电子合同创建成功"，说明整个流程成功');
    
  } catch (error) {
    console.error('\n❌ 测试失败');
    process.exit(1);
  }
}

main();


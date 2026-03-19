/**
 * 诊断保单状态问题
 * 用于检查数据库中的保单状态和大树保API返回的状态
 */

const mongoose = require('mongoose');
const axios = require('axios');
const xml2js = require('xml2js');

// 从环境变量读取配置
require('dotenv').config({ path: '.env.dev' });

const DASHUBAO_CONFIG = {
  user: process.env.DASHUBAO_USER || 'ande',
  password: process.env.DASHUBAO_PASSWORD || 'dsakfiejn;lASudf',
  apiUrl: 'http://fx.test.dasurebao.com.cn/remoting/ws',
};

// 保单流水号（从截图中获取）
const POLICY_REF = 'ANDE1770195082828a1n4by';

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andejiazheng';
  await mongoose.connect(mongoUri);
  console.log('✅ 已连接到数据库');
}

async function checkLocalPolicy() {
  console.log('\n📋 检查本地数据库中的保单状态...');
  console.log('='.repeat(80));
  
  const InsurancePolicy = mongoose.model('InsurancePolicy', new mongoose.Schema({}, { strict: false }), 'insurance_policies');
  
  const policy = await InsurancePolicy.findOne({ agencyPolicyRef: POLICY_REF });
  
  if (!policy) {
    console.log('❌ 本地数据库中未找到该保单');
    return null;
  }
  
  console.log('✅ 找到保单:');
  console.log('  流水号:', policy.agencyPolicyRef);
  console.log('  保单号:', policy.policyNo || '未生成');
  console.log('  状态:', policy.status);
  console.log('  总保费:', policy.totalPremium);
  console.log('  生效日期:', policy.effectiveDate);
  console.log('  结束日期:', policy.expireDate);
  console.log('  PDF链接:', policy.policyPdfUrl || '无');
  console.log('  微信支付信息:', policy.wechatPayInfo ? '有' : '无');
  
  return policy;
}

async function queryDashubaoPolicy() {
  console.log('\n🔍 查询大树保API中的保单状态...');
  console.log('='.repeat(80));
  
  const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<Packet type="REQUEST" version="1.0">
  <Head>
    <RequestType>0005</RequestType>
    <User>${DASHUBAO_CONFIG.user}</User>
    <Password>${DASHUBAO_CONFIG.password}</Password>
  </Head>
  <Body>
    <Policy>
      <AgencyPolicyRef>${POLICY_REF}</AgencyPolicyRef>
    </Policy>
  </Body>
</Packet>`;

  try {
    const response = await axios.post(DASHUBAO_CONFIG.apiUrl, xmlRequest, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
      },
      timeout: 30000,
    });
    
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(response.data);
    
    console.log('✅ 大树保API响应:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    return null;
  }
}

async function diagnose() {
  try {
    await connectDB();
    
    const localPolicy = await checkLocalPolicy();
    const apiResponse = await queryDashubaoPolicy();
    
    console.log('\n📊 诊断结果:');
    console.log('='.repeat(80));
    
    if (!localPolicy) {
      console.log('❌ 问题: 本地数据库中没有该保单记录');
      console.log('💡 建议: 检查投保确认接口是否成功调用');
    } else if (localPolicy.status === 'pending') {
      console.log('⚠️  问题: 保单状态为待支付(pending)');
      
      if (apiResponse?.ResultInfo?.Policy?.Status === '1') {
        console.log('💡 发现: 大树保API显示保单已生效(Status=1)');
        console.log('💡 建议: 调用同步接口更新本地状态');
        console.log(`   curl -X POST http://localhost:3001/api/dashubao/policy/sync/${POLICY_REF}`);
      } else {
        console.log('💡 发现: 大树保API也显示保单未生效');
        console.log('💡 建议: 检查支付是否真的成功，或者支付回调是否被正确接收');
      }
    } else if (localPolicy.status === 'active') {
      console.log('✅ 保单状态正常: 已生效');
    }
    
  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

diagnose();


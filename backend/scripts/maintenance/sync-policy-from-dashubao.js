/**
 * 从大树保同步保单到本地数据库
 * 用于将大树保系统中的保单同步到本地数据库
 */

const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/housekeeping';

// 大树保配置（从 .env 文件读取）
require('dotenv').config();

const DASHUBAO_CONFIG = {
  apiUrl: process.env.DASHUBAO_API_URL || 'https://openapi.dashubao.com',
  agencyCode: process.env.DASHUBAO_AGENCY_CODE,
  agencyKey: process.env.DASHUBAO_AGENCY_KEY,
};

// 生成签名
function generateSignature(bodyContent) {
  const signString = `${DASHUBAO_CONFIG.agencyCode}${bodyContent}${DASHUBAO_CONFIG.agencyKey}`;
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex').toUpperCase();
}

// 构建XML请求
function buildXmlRequest(interfaceCode, bodyContent) {
  const signature = generateSignature(bodyContent);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Head>
    <InterfaceCode>${interfaceCode}</InterfaceCode>
    <AgencyCode>${DASHUBAO_CONFIG.agencyCode}</AgencyCode>
    <Signature>${signature}</Signature>
  </Head>
  <Body>
    ${bodyContent}
  </Body>
</Request>`;
}

// 发送请求到大树保
async function sendRequest(xmlRequest) {
  try {
    const response = await axios.post(DASHUBAO_CONFIG.apiUrl, xmlRequest, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
      },
      timeout: 30000,
    });

    // 解析XML响应（简单解析）
    const xmlResponse = response.data;
    console.log('📥 大树保响应:', xmlResponse);
    
    return xmlResponse;
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    throw error;
  }
}

// 查询保单
async function queryPolicy(policyNo) {
  const bodyContent = `
    <Policy>
      <PolicyNo>${policyNo}</PolicyNo>
    </Policy>`;
  
  const xmlRequest = buildXmlRequest('0003', bodyContent);
  return await sendRequest(xmlRequest);
}

// 主函数
async function syncPolicy(policyNo) {
  console.log('\n🔄 从大树保同步保单到本地数据库');
  console.log('='.repeat(80));
  console.log(`保单号: ${policyNo}\n`);
  
  try {
    // 1. 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 2. 查询大树保
    console.log('📤 查询大树保保单信息...');
    const response = await queryPolicy(policyNo);
    
    // 3. 解析响应并保存到数据库
    // 注意：这里需要根据实际的XML响应格式进行解析
    console.log('\n💡 请根据上面的响应手动创建保单记录');
    console.log('或者联系开发人员完善XML解析逻辑\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    process.exit(1);
  }
}

// 从命令行参数获取保单号
const policyNo = process.argv[2] || '14527006800216949489';
syncPolicy(policyNo);


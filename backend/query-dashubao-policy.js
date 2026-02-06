/**
 * 查询大树保保单真实状态
 */

const axios = require('axios');
const xml2js = require('xml2js');

// 从环境变量读取配置（生产环境）
require('dotenv').config({ path: '.env' });

// 大树保配置
const DASHUBAO_USER = process.env.DASHUBAO_USER || 'ande';
const DASHUBAO_PASSWORD = process.env.DASHUBAO_PASSWORD || 'dsaoifccknferd893#';
const DASHUBAO_URL = 'https://api.dasurebao.com.cn/remoting/ws'; // 生产环境

// 从日志中获取的信息
const POLICY_NO = '14527006800216447774';
const AGENCY_POLICY_REF = 'ANDE1770202541599mvvhqc';

function buildXmlRequest(requestType, bodyContent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Packet type="REQUEST" version="1.0">
  <Head>
    <RequestType>${requestType}</RequestType>
    <User>${DASHUBAO_USER}</User>
    <Password>${DASHUBAO_PASSWORD}</Password>
  </Head>
  <Body>
    ${bodyContent}
  </Body>
</Packet>`;
}

async function queryPolicy() {
  console.log('\n🔍 查询大树保保单状态...');
  console.log('='.repeat(80));
  console.log('保单号:', POLICY_NO);
  console.log('流水号:', AGENCY_POLICY_REF);
  console.log('');

  // 构建查询请求（使用流水号查询）
  const bodyContent = `
    <Policy>
      <AgencyPolicyRef>${AGENCY_POLICY_REF}</AgencyPolicyRef>
    </Policy>`;

  const xmlRequest = buildXmlRequest('0005', bodyContent);
  
  console.log('📤 发送查询请求到大树保...');
  
  try {
    const response = await axios.post(DASHUBAO_URL, xmlRequest, {
      headers: {
        'Content-Type': 'application/xml',
      },
      timeout: 30000,
    });
    
    console.log('✅ 收到响应');
    console.log('');
    console.log('📥 原始XML响应:');
    console.log(response.data);
    console.log('');
    
    // 解析XML
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(response.data);
    const resultInfo = result.ResultInfo;
    
    console.log('📋 解析后的响应:');
    console.log(JSON.stringify(resultInfo, null, 2));
    console.log('');
    
    console.log('='.repeat(80));
    console.log('📊 保单状态分析:');
    console.log('  Success:', resultInfo.Success);
    console.log('  保单号:', resultInfo.PolicyNo || '无');
    console.log('  订单ID:', resultInfo.OrderId || '无');
    console.log('  流水号:', resultInfo.AgencyPolicyRef || '无');
    console.log('  总保费:', resultInfo.TotalPremium || '无');
    console.log('  状态码:', resultInfo.Status || '无');
    console.log('  PDF链接:', resultInfo.PolicyPdfUrl || '无');
    console.log('  消息:', resultInfo.Message || '无');
    console.log('');
    
    if (resultInfo.Success === 'true') {
      console.log('✅ 保单查询成功!');
      
      if (resultInfo.Status === '1' || resultInfo.PolicyPdfUrl) {
        console.log('✅ 保单已生效!');
        console.log('');
        console.log('💡 建议操作:');
        console.log('1. 更新本地数据库中的保单状态为 active');
        console.log('2. 保存保单号:', resultInfo.PolicyNo);
        console.log('3. 保存PDF链接:', resultInfo.PolicyPdfUrl);
      } else {
        console.log('⏳ 保单还在处理中');
      }
    } else {
      console.log('❌ 查询失败:', resultInfo.Message);
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

async function main() {
  try {
    await queryPolicy();
  } catch (error) {
    console.error('❌ 操作失败:', error);
  }
}

main();


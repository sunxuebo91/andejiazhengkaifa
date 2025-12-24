/**
 * 测试所有大树保产品代码
 * 直接调用大树保API测试
 */

const axios = require('axios');
const xml2js = require('xml2js');

// 大树保配置
const DASHUBAO_CONFIG = {
  user: 'ande',
  password: 'dsakfiejn;lASudf',
  apiUrl: 'https://api.dasurebao.com.cn/remoting/ws' // 生产环境
};

// 所有产品配置
const products = [
  // 1. 家政无忧雇主责任险 - 年计划
  { name: '方案A（年）', productCode: 'MP10450101', planCode: 'PK00029001', price: 110 },
  { name: '方案B（年）', productCode: 'MP10450101', planCode: 'PK00029011', price: 160 },
  { name: '方案C（年）', productCode: 'MP10450102', planCode: 'PK00029001', price: 280 },
  { name: '方案D（年）', productCode: 'MP10450102', planCode: 'PK00029011', price: 360 },

  // 2. 家政无忧雇主责任险 - 月计划
  { name: '方案B（月）', productCode: 'MP10450133', planCode: 'PK00029011', price: 20 },
  { name: '方案C（月）', productCode: 'MP10450133', planCode: 'PK00056658', price: 40 },
  { name: '方案D（月）', productCode: 'MP10450133', planCode: 'PK00056659', price: 50 },

  // 3. 大树保服务无忧保障计划 - 年计划
  { name: '计划一（年）', productCode: 'MP10450164', planCode: 'PK00038868年', price: 100 },
  { name: '计划二（年）', productCode: 'MP10450132', planCode: 'PK00029001年', price: 120 },

  // 4. 大树保服务无忧保障计划 - 月计划
  { name: '计划一（月）', productCode: 'MP10450164', planCode: 'PK00038868', price: 10 },
  { name: '计划二（月）', productCode: 'MP10450132', planCode: 'PK00029001', price: 12 },
];

// 生成流水号
function generateAgencyPolicyRef() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `TEST_${timestamp}_${random}`;
}

// 格式化日期
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}000000`;
}

// 构建XML请求
function buildXmlRequest(product) {
  const agencyPolicyRef = generateAgencyPolicyRef();
  const issueDate = formatDate(new Date());
  const effectiveDate = formatDate(new Date());
  const expireDate = formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

  return `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Head>
    <User>${DASHUBAO_CONFIG.user}</User>
    <Password>${DASHUBAO_CONFIG.password}</Password>
    <TransType>0002</TransType>
  </Head>
  <Body>
    <ProductCode>${product.productCode}</ProductCode>
    <PlanCode>${product.planCode}</PlanCode>
    <AgencyPolicyRef>${agencyPolicyRef}</AgencyPolicyRef>
    <IssueDate>${issueDate}</IssueDate>
    <EffectiveDate>${effectiveDate}</EffectiveDate>
    <ExpireDate>${expireDate}</ExpireDate>
    <GroupSize>1</GroupSize>
    <TotalPremium>${product.price}</TotalPremium>
    <ServiceAddress>北京市朝阳区测试地址123号</ServiceAddress>
    <PolicyHolderType>1</PolicyHolderType>
    <PolicyHolderName>测试投保人</PolicyHolderName>
    <PHIdType>01</PHIdType>
    <PHIdNumber>110101198001011234</PHIdNumber>
    <PHTelephone>13800138000</PHTelephone>
    <InsuredList>
      <Insured>
        <InsuredId>1</InsuredId>
        <InsuredName>测试被保人</InsuredName>
        <InsuredType>1</InsuredType>
        <IdType>01</IdType>
        <IdNumber>130132199309100041</IdNumber>
        <BirthDate>19930910000000</BirthDate>
        <Gender>F</Gender>
      </Insured>
    </InsuredList>
  </Body>
</Request>`;
}

// 解析XML响应
async function parseXmlResponse(xmlString) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlString);
  return result.Response.Body.ResultInfo;
}

// 测试单个产品
async function testProduct(product) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 测试产品: ${product.name}`);
  console.log(`   产品代码: ${product.productCode}`);
  console.log(`   计划代码: ${product.planCode}`);
  console.log(`   价格: ${product.price}元`);
  console.log('='.repeat(80));

  try {
    const xmlRequest = buildXmlRequest(product);

    const response = await axios.post(DASHUBAO_CONFIG.apiUrl, xmlRequest, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
      },
      timeout: 30000
    });

    console.log(`   原始响应: ${response.data.substring(0, 300)}`);

    const result = await parseXmlResponse(response.data);

    if (result.Success === 'true') {
      console.log(`✅ 成功: ${product.name}`);
      console.log(`   保单号: ${result.PolicyNo}`);
      console.log(`   订单ID: ${result.OrderId}`);
      return { success: true, product: product.name };
    } else {
      console.log(`❌ 失败: ${product.name}`);
      console.log(`   错误信息: ${result.Message}`);
      return { success: false, product: product.name, error: result.Message };
    }
  } catch (error) {
    console.log(`❌ 请求失败: ${product.name}`);
    if (error.response) {
      console.log(`   HTTP状态: ${error.response.status}`);
      console.log(`   响应数据: ${typeof error.response.data === 'string' ? error.response.data.substring(0, 300) : JSON.stringify(error.response.data).substring(0, 300)}`);
    } else {
      console.log(`   错误: ${error.message}`);
    }
    return { success: false, product: product.name, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试所有大树保产品代码...\n');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`API地址: ${DASHUBAO_CONFIG.apiUrl}`);
  console.log(`共 ${products.length} 个产品需要测试\n`);

  const results = {
    success: [],
    failed: []
  };

  // 只测试第一个产品
  const product = products[0];
  const result = await testProduct(product);
  if (result.success) {
    results.success.push(result);
  } else {
    results.failed.push(result);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.success.length} 个`);
  results.success.forEach(r => console.log(`   - ${r.product}`));
  console.log(`\n❌ 失败: ${results.failed.length} 个`);
  results.failed.forEach(r => console.log(`   - ${r.product}: ${r.error}`));
  console.log('='.repeat(80));
}

// 运行测试
main().catch(console.error);


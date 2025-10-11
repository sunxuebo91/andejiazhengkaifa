/**
 * 测试小程序删除照片 API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
let authToken = '';
let testResumeId = '';
let testFileUrl = '';

// 登录
async function login() {
  console.log('🔐 登录中...');
  const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  
  if (response.data.success) {
    authToken = response.data.data.access_token;
    console.log('✅ 登录成功\n');
    return true;
  }
  return false;
}

// 获取测试简历
async function getTestResume() {
  console.log('📋 获取测试简历...');
  const response = await axios.get(
    `${API_BASE_URL}/api/resumes?page=1&limit=1`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  if (response.data.success && response.data.data.items.length > 0) {
    testResumeId = response.data.data.items[0]._id;
    console.log(`✅ 找到简历: ${testResumeId}\n`);
    return true;
  }
  return false;
}

// 添加测试证书
async function addTestCertificate() {
  console.log('📸 添加测试证书...');
  const response = await axios.patch(
    `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
    {
      certificateUrls: [
        'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test-delete-api.jpg'
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (response.data.success) {
    testFileUrl = 'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test-delete-api.jpg';
    console.log(`✅ 证书添加成功`);
    console.log(`   URL: ${testFileUrl}\n`);
    return true;
  }
  return false;
}

// 验证证书存在
async function verifyCertificateExists() {
  console.log('🔍 验证证书存在...');
  const response = await axios.get(
    `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  if (response.data.success) {
    const resume = response.data.data;
    const hasInUrls = resume.certificateUrls && resume.certificateUrls.includes(testFileUrl);
    const hasInCerts = resume.certificates && resume.certificates.some(c => c.url === testFileUrl);
    
    console.log(`   certificateUrls 包含: ${hasInUrls ? '✅' : '❌'}`);
    console.log(`   certificates 包含: ${hasInCerts ? '✅' : '❌'}\n`);
    
    return hasInUrls || hasInCerts;
  }
  return false;
}

// 使用删除 API 删除证书
async function deleteCertificateUsingAPI() {
  console.log('🗑️  使用删除 API 删除证书...');
  console.log(`   接口: DELETE /api/resumes/miniprogram/${testResumeId}/delete-file`);
  console.log(`   参数: { fileUrl: "${testFileUrl}", fileType: "certificate" }\n`);
  
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}/delete-file`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          fileUrl: testFileUrl,
          fileType: 'certificate'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ 删除请求成功');
      console.log(`   响应: ${JSON.stringify(response.data, null, 2)}\n`);
      return true;
    } else {
      console.log('❌ 删除请求失败');
      console.log(`   响应: ${JSON.stringify(response.data, null, 2)}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ 删除请求出错');
    console.log(`   错误: ${error.response?.data || error.message}\n`);
    return false;
  }
}

// 验证证书已删除
async function verifyCertificateDeleted() {
  console.log('🔍 验证证书已删除...');
  const response = await axios.get(
    `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  if (response.data.success) {
    const resume = response.data.data;
    const hasInUrls = resume.certificateUrls && resume.certificateUrls.includes(testFileUrl);
    const hasInCerts = resume.certificates && resume.certificates.some(c => c.url === testFileUrl);
    
    console.log(`   certificateUrls 包含: ${hasInUrls ? '❌ 仍存在' : '✅ 已删除'}`);
    console.log(`   certificates 包含: ${hasInCerts ? '❌ 仍存在' : '✅ 已删除'}\n`);
    
    return !hasInUrls && !hasInCerts;
  }
  return false;
}

// 主流程
async function main() {
  console.log('='.repeat(70));
  console.log('🧪 测试：小程序删除照片 API');
  console.log('='.repeat(70));
  console.log();
  
  try {
    // 1. 登录
    if (!await login()) {
      console.error('❌ 测试失败：登录失败');
      return;
    }
    
    // 2. 获取测试简历
    if (!await getTestResume()) {
      console.error('❌ 测试失败：获取简历失败');
      return;
    }
    
    // 3. 添加测试证书
    if (!await addTestCertificate()) {
      console.error('❌ 测试失败：添加证书失败');
      return;
    }
    
    // 4. 验证证书存在
    if (!await verifyCertificateExists()) {
      console.error('❌ 测试失败：证书不存在');
      return;
    }
    
    // 5. 使用删除 API 删除证书
    if (!await deleteCertificateUsingAPI()) {
      console.error('❌ 测试失败：删除 API 调用失败');
      return;
    }
    
    // 6. 验证证书已删除
    if (!await verifyCertificateDeleted()) {
      console.error('❌ 测试失败：证书未被删除');
      return;
    }
    
    console.log('='.repeat(70));
    console.log('✅ 测试通过！删除 API 工作正常');
    console.log('='.repeat(70));
    console.log();
    console.log('📝 小程序端使用方法：');
    console.log();
    console.log('wx.request({');
    console.log(`  url: '\${API_BASE_URL}/api/resumes/miniprogram/\${resumeId}/delete-file',`);
    console.log('  method: \'DELETE\',');
    console.log('  header: {');
    console.log('    \'Authorization\': `Bearer \${token}`,');
    console.log('    \'Content-Type\': \'application/json\'');
    console.log('  },');
    console.log('  data: {');
    console.log('    fileUrl: \'要删除的文件URL\',');
    console.log('    fileType: \'certificate\'  // 或 personalPhoto, medicalReport 等');
    console.log('  }');
    console.log('})');
    console.log();
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

main();


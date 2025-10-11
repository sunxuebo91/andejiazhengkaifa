/**
 * 测试上传照片是否会出现重复
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3000';
let authToken = '';
let testResumeId = '';

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

// 清空证书
async function clearCertificates() {
  console.log('🧹 清空现有证书...');
  const response = await axios.patch(
    `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
    {
      certificateUrls: [],
      certificates: []
    },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (response.data.success) {
    console.log('✅ 证书已清空\n');
    return true;
  }
  return false;
}

// 创建测试图片文件
function createTestImage() {
  // 创建一个简单的 1x1 像素的 PNG 图片
  const buffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
  
  const tempPath = path.join(__dirname, 'test-image.png');
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

// 上传一张证书照片（小程序接口）
async function uploadCertificate() {
  console.log('📸 上传证书照片（小程序接口）...');
  
  const imagePath = createTestImage();
  const formData = new FormData();
  formData.append('file', fs.createReadStream(imagePath));
  formData.append('type', 'certificate');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}/upload-file`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      }
    );
    
    // 清理临时文件
    fs.unlinkSync(imagePath);
    
    if (response.data.success) {
      console.log('✅ 上传成功');
      console.log(`   文件URL: ${response.data.data.fileUrl}\n`);
      return response.data.data.fileUrl;
    } else {
      console.log('❌ 上传失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 上传出错:', error.message);
    fs.unlinkSync(imagePath);
    return null;
  }
}

// 检查证书数量
async function checkCertificateCount() {
  console.log('🔍 检查证书数量...');
  const response = await axios.get(
    `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  if (response.data.success) {
    const resume = response.data.data;
    const urlsCount = resume.certificateUrls?.length || 0;
    const certsCount = resume.certificates?.length || 0;
    
    console.log(`   certificateUrls: ${urlsCount} 项`);
    console.log(`   certificates: ${certsCount} 项`);
    
    if (resume.certificateUrls && resume.certificateUrls.length > 0) {
      console.log(`   URLs: ${JSON.stringify(resume.certificateUrls, null, 2)}`);
    }
    if (resume.certificates && resume.certificates.length > 0) {
      console.log(`   Certificates: ${JSON.stringify(resume.certificates.map(c => c.url), null, 2)}`);
    }
    console.log();
    
    return { urlsCount, certsCount };
  }
  return { urlsCount: 0, certsCount: 0 };
}

// 主流程
async function main() {
  console.log('='.repeat(70));
  console.log('🧪 测试：上传照片是否会出现重复');
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
    
    // 3. 清空现有证书
    if (!await clearCertificates()) {
      console.error('❌ 测试失败：清空证书失败');
      return;
    }
    
    // 4. 检查初始状态
    console.log('📊 初始状态：');
    const initial = await checkCertificateCount();
    if (initial.urlsCount !== 0 || initial.certsCount !== 0) {
      console.error('❌ 测试失败：初始状态不为空');
      return;
    }
    
    // 5. 上传第一张照片
    console.log('📤 测试1：上传第一张照片');
    const fileUrl1 = await uploadCertificate();
    if (!fileUrl1) {
      console.error('❌ 测试失败：第一张照片上传失败');
      return;
    }
    
    // 6. 检查第一次上传后的状态
    console.log('📊 第一次上传后：');
    const after1 = await checkCertificateCount();
    
    if (after1.urlsCount !== 1) {
      console.error(`❌ 测试失败：certificateUrls 应该是 1 项，实际是 ${after1.urlsCount} 项`);
      return;
    }
    
    if (after1.certsCount !== 1) {
      console.error(`❌ 测试失败：certificates 应该是 1 项，实际是 ${after1.certsCount} 项`);
      return;
    }
    
    console.log('✅ 第一次上传正常\n');
    
    // 7. 上传第二张照片
    console.log('📤 测试2：上传第二张照片');
    const fileUrl2 = await uploadCertificate();
    if (!fileUrl2) {
      console.error('❌ 测试失败：第二张照片上传失败');
      return;
    }
    
    // 8. 检查第二次上传后的状态
    console.log('📊 第二次上传后：');
    const after2 = await checkCertificateCount();
    
    if (after2.urlsCount !== 2) {
      console.error(`❌ 测试失败：certificateUrls 应该是 2 项，实际是 ${after2.urlsCount} 项`);
      return;
    }
    
    if (after2.certsCount !== 2) {
      console.error(`❌ 测试失败：certificates 应该是 2 项，实际是 ${after2.certsCount} 项`);
      return;
    }
    
    console.log('✅ 第二次上传正常\n');
    
    console.log('='.repeat(70));
    console.log('✅ 测试通过！后端上传逻辑正常，不会产生重复');
    console.log('='.repeat(70));
    console.log();
    console.log('📝 结论：');
    console.log('   - 后端 addFileWithType 方法工作正常');
    console.log('   - certificateUrls 和 certificates 字段同步正确');
    console.log('   - 问题可能出在小程序端的调用逻辑');
    console.log();
    console.log('🔍 建议检查小程序端：');
    console.log('   1. 是否重复调用了上传接口');
    console.log('   2. 是否在上传后又调用了更新接口');
    console.log('   3. 是否在本地状态中重复添加了文件');
    console.log();
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('   响应数据:', error.response.data);
    }
  }
}

main();


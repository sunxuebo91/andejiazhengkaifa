/**
 * 简单测试：验证删除技能证书照片的功能
 * 使用已存在的简历进行测试
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
let authToken = '';

// 登录
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success && response.data.data.access_token) {
      authToken = response.data.data.access_token;
      console.log('✅ 登录成功\n');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return false;
  }
}

// 获取第一个简历
async function getFirstResume() {
  try {
    console.log('📋 获取简历列表...');
    const response = await axios.get(
      `${API_BASE_URL}/api/resumes?page=1&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success && response.data.data.items.length > 0) {
      const resume = response.data.data.items[0];
      console.log('✅ 找到简历:', resume._id);
      console.log('   姓名:', resume.name);
      console.log('   手机:', resume.phone);
      return resume._id;
    }
    return null;
  } catch (error) {
    console.error('❌ 获取简历失败:', error.message);
    return null;
  }
}

// 添加测试证书
async function addTestCertificates(resumeId) {
  try {
    console.log('\n📸 添加测试证书照片...');
    
    const updateData = {
      certificateUrls: [
        'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test1.jpg',
        'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test2.jpg'
      ]
    };
    
    const response = await axios.patch(
      `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ 证书添加成功');
      console.log('   certificateUrls:', response.data.data.certificateUrls?.length || 0, '项');
      console.log('   certificates:', response.data.data.certificates?.length || 0, '项');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 添加证书失败:', error.response?.data || error.message);
    return false;
  }
}

// 验证证书存在
async function verifyCertificatesExist(resumeId) {
  try {
    console.log('\n🔍 验证证书是否存在...');
    
    const response = await axios.get(
      `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      const resume = response.data.data;
      const hasUrls = resume.certificateUrls && resume.certificateUrls.length > 0;
      const hasCerts = resume.certificates && resume.certificates.length > 0;
      
      console.log('   certificateUrls:', resume.certificateUrls?.length || 0, '项');
      console.log('   certificates:', resume.certificates?.length || 0, '项');
      
      if (hasUrls || hasCerts) {
        console.log('✅ 证书存在');
        return true;
      } else {
        console.log('❌ 证书不存在');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  }
}

// 删除证书
async function deleteCertificates(resumeId) {
  try {
    console.log('\n🗑️  删除证书照片（提交空数组）...');
    
    const updateData = {
      certificateUrls: []
    };
    
    console.log('提交数据:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.patch(
      `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      const resume = response.data.data;
      console.log('✅ 更新请求成功');
      console.log('   返回的 certificateUrls:', resume.certificateUrls?.length || 0, '项');
      console.log('   返回的 certificates:', resume.certificates?.length || 0, '项');
      
      const urlsEmpty = !resume.certificateUrls || resume.certificateUrls.length === 0;
      const certsEmpty = !resume.certificates || resume.certificates.length === 0;
      
      if (urlsEmpty && certsEmpty) {
        console.log('✅ 验证通过：证书已删除');
        return true;
      } else {
        console.log('❌ 验证失败：证书未删除');
        if (!urlsEmpty) console.log('   certificateUrls 仍有数据:', resume.certificateUrls);
        if (!certsEmpty) console.log('   certificates 仍有数据:', resume.certificates);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ 删除失败:', error.response?.data || error.message);
    return false;
  }
}

// 最终验证
async function finalVerify(resumeId) {
  try {
    console.log('\n🔍 最终验证（重新获取简历）...');
    
    const response = await axios.get(
      `${API_BASE_URL}/api/resumes/miniprogram/${resumeId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      const resume = response.data.data;
      console.log('   certificateUrls:', resume.certificateUrls?.length || 0, '项');
      console.log('   certificates:', resume.certificates?.length || 0, '项');
      
      const urlsEmpty = !resume.certificateUrls || resume.certificateUrls.length === 0;
      const certsEmpty = !resume.certificates || resume.certificates.length === 0;
      
      if (urlsEmpty && certsEmpty) {
        console.log('✅ 最终验证通过：证书确实已删除');
        return true;
      } else {
        console.log('❌ 最终验证失败：证书仍然存在');
        if (!urlsEmpty) {
          console.log('\n   certificateUrls 内容:');
          resume.certificateUrls.forEach((url, i) => {
            console.log(`   [${i}] ${url}`);
          });
        }
        if (!certsEmpty) {
          console.log('\n   certificates 内容:');
          resume.certificates.forEach((cert, i) => {
            console.log(`   [${i}] ${cert.url}`);
          });
        }
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ 最终验证失败:', error.message);
    return false;
  }
}

// 主流程
async function main() {
  console.log('='.repeat(70));
  console.log('🧪 测试：小程序删除技能证书照片功能');
  console.log('='.repeat(70));
  console.log();
  
  // 1. 登录
  if (!await login()) {
    console.error('\n❌ 测试终止：登录失败');
    return;
  }
  
  // 2. 获取简历
  const resumeId = await getFirstResume();
  if (!resumeId) {
    console.error('\n❌ 测试终止：没有找到简历');
    return;
  }
  
  // 3. 添加测试证书
  if (!await addTestCertificates(resumeId)) {
    console.error('\n❌ 测试终止：添加证书失败');
    return;
  }
  
  // 4. 验证证书存在
  if (!await verifyCertificatesExist(resumeId)) {
    console.error('\n❌ 测试终止：证书验证失败');
    return;
  }
  
  // 5. 删除证书
  if (!await deleteCertificates(resumeId)) {
    console.error('\n❌ 测试失败：删除操作失败');
    return;
  }
  
  // 6. 最终验证
  if (!await finalVerify(resumeId)) {
    console.error('\n❌ 测试失败：最终验证失败');
    return;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ 测试通过！证书删除功能正常工作');
  console.log('='.repeat(70));
}

main();


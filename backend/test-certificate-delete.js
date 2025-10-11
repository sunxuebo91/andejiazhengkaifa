/**
 * 测试脚本：验证删除技能证书照片的功能
 * 
 * 测试场景：
 * 1. 创建一个简历，包含技能证书照片
 * 2. 更新简历，将技能证书照片清空（提交空数组）
 * 3. 验证返回的数据中 certificates 和 certificateUrls 都为空数组
 */

const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:3000';
let authToken = '';
let testResumeId = '';

// 测试数据
const testResume = {
  name: '测试用户-证书删除',
  phone: `1380013${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  gender: '女',
  age: 28,
  expectedPosition: '月嫂',
  jobType: '住家',
  expectedSalary: 8000,
  workExperience: 3,
  education: '高中',
  school: '测试高中',
  major: '无',
  nativePlace: '河南',
  experienceYears: 3,
  skills: ['月嫂'],
  workExperiences: [],
  // 初始包含证书照片
  certificateUrls: [
    'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test1.jpg',
    'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test2.jpg'
  ],
  certificates: [
    {
      url: 'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test1.jpg',
      filename: 'test1.jpg',
      mimetype: 'image/jpeg',
      size: 10000
    },
    {
      url: 'https://housekeeping-1254058915.cos.ap-guangzhou.myqcloud.com/certificate/test2.jpg',
      filename: 'test2.jpg',
      mimetype: 'image/jpeg',
      size: 10000
    }
  ]
};

// 辅助函数：登录获取token
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success && response.data.data.access_token) {
      authToken = response.data.data.access_token;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录出错:', error.message);
    return false;
  }
}

// 步骤1：创建测试简历
async function createTestResume() {
  try {
    console.log('\n📝 步骤1：创建测试简历（包含证书照片）');
    console.log('提交的数据:', JSON.stringify({
      ...testResume,
      certificateUrls: testResume.certificateUrls
    }, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/api/resumes/miniprogram/create`,
      testResume,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      testResumeId = response.data.data.id;
      console.log('✅ 简历创建成功');
      console.log('   简历ID:', testResumeId);
      console.log('   certificateUrls:', response.data.data.resume?.certificateUrls || []);
      console.log('   certificates:', response.data.data.resume?.certificates || []);
      return true;
    } else {
      console.error('❌ 创建失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 创建出错:', error.response?.data || error.message);
    return false;
  }
}

// 步骤2：获取简历详情（验证创建）
async function getResumeDetail() {
  try {
    console.log('\n🔍 步骤2：获取简历详情（验证创建）');
    
    const response = await axios.get(
      `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      const resume = response.data.data;
      console.log('✅ 获取成功');
      console.log('   certificateUrls:', resume.certificateUrls || []);
      console.log('   certificateUrls 数量:', resume.certificateUrls?.length || 0);
      console.log('   certificates:', resume.certificates || []);
      console.log('   certificates 数量:', resume.certificates?.length || 0);
      
      // 验证是否有证书
      if (resume.certificateUrls?.length > 0 || resume.certificates?.length > 0) {
        console.log('✅ 验证通过：简历包含证书照片');
        return true;
      } else {
        console.error('❌ 验证失败：简历应该包含证书照片');
        return false;
      }
    } else {
      console.error('❌ 获取失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 获取出错:', error.response?.data || error.message);
    return false;
  }
}

// 步骤3：删除证书照片（提交空数组）
async function deleteCertificates() {
  try {
    console.log('\n🗑️  步骤3：删除证书照片（提交空数组）');
    
    const updateData = {
      certificateUrls: [],
      certificates: []
    };
    
    console.log('提交的数据:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.patch(
      `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
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
      console.log('✅ 更新成功');
      console.log('   返回的 certificateUrls:', resume.certificateUrls || []);
      console.log('   返回的 certificates:', resume.certificates || []);
      
      // 验证是否已清空
      const certificateUrlsEmpty = !resume.certificateUrls || resume.certificateUrls.length === 0;
      const certificatesEmpty = !resume.certificates || resume.certificates.length === 0;
      
      if (certificateUrlsEmpty && certificatesEmpty) {
        console.log('✅ 验证通过：证书照片已成功删除');
        return true;
      } else {
        console.error('❌ 验证失败：证书照片未被删除');
        console.error('   certificateUrls 应为空，实际:', resume.certificateUrls);
        console.error('   certificates 应为空，实际:', resume.certificates);
        return false;
      }
    } else {
      console.error('❌ 更新失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 更新出错:', error.response?.data || error.message);
    return false;
  }
}

// 步骤4：再次获取简历详情（验证删除）
async function verifyDeletion() {
  try {
    console.log('\n🔍 步骤4：再次获取简历详情（验证删除）');
    
    const response = await axios.get(
      `${API_BASE_URL}/api/resumes/miniprogram/${testResumeId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      const resume = response.data.data;
      console.log('✅ 获取成功');
      console.log('   certificateUrls:', resume.certificateUrls || []);
      console.log('   certificates:', resume.certificates || []);
      
      // 验证是否已清空
      const certificateUrlsEmpty = !resume.certificateUrls || resume.certificateUrls.length === 0;
      const certificatesEmpty = !resume.certificates || resume.certificates.length === 0;
      
      if (certificateUrlsEmpty && certificatesEmpty) {
        console.log('✅ 最终验证通过：证书照片确实已被删除');
        return true;
      } else {
        console.error('❌ 最终验证失败：证书照片仍然存在');
        console.error('   certificateUrls:', resume.certificateUrls);
        console.error('   certificates:', resume.certificates);
        return false;
      }
    } else {
      console.error('❌ 获取失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 获取出错:', error.response?.data || error.message);
    return false;
  }
}

// 清理：删除测试简历
async function cleanup() {
  if (!testResumeId) return;
  
  try {
    console.log('\n🧹 清理：删除测试简历');
    await axios.delete(
      `${API_BASE_URL}/api/resumes/${testResumeId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    console.log('✅ 测试简历已删除');
  } catch (error) {
    console.log('⚠️  清理失败（可能需要手动删除）:', error.message);
  }
}

// 主测试流程
async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 开始测试：删除技能证书照片功能');
  console.log('='.repeat(60));
  
  try {
    // 登录
    if (!await login()) {
      console.error('\n❌ 测试失败：无法登录');
      return;
    }
    
    // 创建测试简历
    if (!await createTestResume()) {
      console.error('\n❌ 测试失败：无法创建测试简历');
      return;
    }
    
    // 验证创建
    if (!await getResumeDetail()) {
      console.error('\n❌ 测试失败：创建验证失败');
      await cleanup();
      return;
    }
    
    // 删除证书
    if (!await deleteCertificates()) {
      console.error('\n❌ 测试失败：删除操作失败');
      await cleanup();
      return;
    }
    
    // 验证删除
    if (!await verifyDeletion()) {
      console.error('\n❌ 测试失败：删除验证失败');
      await cleanup();
      return;
    }
    
    // 清理
    await cleanup();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试通过！证书删除功能正常工作');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    await cleanup();
  }
}

// 运行测试
runTest();


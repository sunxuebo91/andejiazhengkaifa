/**
 * 单独测试身份证号重复检测
 */

const axios = require('axios');

const baseURL = 'http://localhost:3001/api';

// 生成随机手机号
function generateRandomPhone() {
  const prefix = '138';
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
}

async function testIdNumberDuplicate() {
  console.log('🧪 测试身份证号重复检测\n');

  const idNumber = '110101198901011234';
  const phone1 = generateRandomPhone();
  const phone2 = generateRandomPhone();

  try {
    // 第一次提交
    console.log('第一次提交（身份证号: ' + idNumber + '）...');
    const response1 = await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测试阿姨A',
      phone: phone1,
      age: 28,
      gender: 'female',
      jobType: 'yuexin',
      idNumber: idNumber
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ 第一次提交成功');
    console.log('响应:', JSON.stringify(response1.data, null, 2));
    console.log('');

    // 等待2秒避免限流
    console.log('等待2秒...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 第二次提交（相同身份证号，不同手机号）
    console.log('第二次提交（相同身份证号: ' + idNumber + '，不同手机号: ' + phone2 + '）...');
    const response2 = await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测试阿姨B',
      phone: phone2,
      age: 30,
      gender: 'female',
      jobType: 'yuexin',
      idNumber: idNumber
    }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
    
    console.log('响应:', JSON.stringify(response2.data, null, 2));
    console.log('');

    if (response2.data.success === false && response2.data.error === 'DUPLICATE_ID_NUMBER') {
      console.log('✅ 测试通过 - 正确拒绝重复身份证号');
    } else if (response2.data.success === false && response2.data.message === '该身份证号已注册') {
      console.log('✅ 测试通过 - 正确拒绝重复身份证号（错误码不同但消息正确）');
    } else {
      console.log('❌ 测试失败 - 未正确处理重复身份证号');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testIdNumberDuplicate().catch(console.error);


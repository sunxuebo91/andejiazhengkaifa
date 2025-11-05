/**
 * 测试阿姨自助注册接口
 * 文件: test-self-register-api.js
 * 
 * 运行方式: node test-self-register-api.js
 */

const axios = require('axios');

// 配置
const baseURL = process.env.API_URL || 'http://localhost:3001/api';

// 生成随机手机号
function generateRandomPhone() {
  const prefix = '138';
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
}

// 生成随机身份证号
function generateRandomIdNumber() {
  const prefix = '110101';
  const year = '1989';
  const month = '01';
  const day = '01';
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return prefix + year + month + day + suffix;
}

// 测试用例
async function testSelfRegisterAPI() {
  console.log('🧪 开始测试阿姨自助注册接口\n');
  console.log(`📍 API地址: ${baseURL}\n`);

  // 测试1：正常提交
  console.log('='.repeat(60));
  console.log('测试1：正常提交');
  console.log('='.repeat(60));
  try {
    const phone1 = generateRandomPhone();
    const response1 = await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测试阿姨',
      phone: phone1,
      age: 35,
      gender: 'female',
      jobType: 'yuexin'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'miniprogram',
        'X-Platform': 'wechat'
      }
    });
    
    console.log('✅ 测试1通过 - 正常提交成功');
    console.log('响应数据:', JSON.stringify(response1.data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ 测试1失败:', error.response?.data || error.message);
    console.log('');
  }

  // 测试2：重复手机号
  console.log('='.repeat(60));
  console.log('测试2：重复手机号');
  console.log('='.repeat(60));
  try {
    const phone2 = generateRandomPhone();
    
    // 第一次提交
    await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测试阿姨2',
      phone: phone2,
      age: 30,
      gender: 'female',
      jobType: 'yuexin'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('第一次提交成功');
    
    // 第二次提交（相同手机号）
    const response2 = await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测试阿姨2-重复',
      phone: phone2,
      age: 32,
      gender: 'female',
      jobType: 'yuexin'
    }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true // 接受所有状态码
    });
    
    if (response2.data.success === false && response2.data.error === 'DUPLICATE_ERROR') {
      console.log('✅ 测试2通过 - 正确拒绝重复手机号');
      console.log('响应数据:', JSON.stringify(response2.data, null, 2));
    } else {
      console.log('❌ 测试2失败 - 未正确处理重复手机号');
      console.log('响应数据:', JSON.stringify(response2.data, null, 2));
    }
    console.log('');
  } catch (error) {
    console.error('❌ 测试2失败:', error.response?.data || error.message);
    console.log('');
  }

  // 测试3：重复身份证号
  console.log('='.repeat(60));
  console.log('测试3：重复身份证号');
  console.log('='.repeat(60));
  try {
    const idNumber = generateRandomIdNumber();
    const phone3a = generateRandomPhone();
    const phone3b = generateRandomPhone();
    
    // 第一次提交
    await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测试阿姨3',
      phone: phone3a,
      age: 28,
      gender: 'female',
      jobType: 'yuexin',
      idNumber: idNumber
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('第一次提交成功');
    
    // 第二次提交（相同身份证号，不同手机号）
    const response3 = await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测试阿姨3-重复',
      phone: phone3b,
      age: 28,
      gender: 'female',
      jobType: 'yuexin',
      idNumber: idNumber
    }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
    
    if (response3.data.success === false && response3.data.error === 'DUPLICATE_ID_NUMBER') {
      console.log('✅ 测试3通过 - 正确拒绝重复身份证号');
      console.log('响应数据:', JSON.stringify(response3.data, null, 2));
    } else {
      console.log('❌ 测试3失败 - 未正确处理重复身份证号');
      console.log('响应数据:', JSON.stringify(response3.data, null, 2));
    }
    console.log('');
  } catch (error) {
    console.error('❌ 测试3失败:', error.response?.data || error.message);
    console.log('');
  }

  // 测试4：数据验证失败
  console.log('='.repeat(60));
  console.log('测试4：数据验证失败');
  console.log('='.repeat(60));
  try {
    const response4 = await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '测',  // 姓名太短
      phone: '123',  // 错误的手机号
      age: 100,  // 年龄超出范围
      gender: 'unknown',  // 错误的性别
      jobType: 'yuexin'
    }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
    
    if (response4.data.success === false && response4.data.error === 'VALIDATION_ERROR') {
      console.log('✅ 测试4通过 - 正确验证数据格式');
      console.log('响应数据:', JSON.stringify(response4.data, null, 2));
    } else {
      console.log('❌ 测试4失败 - 未正确验证数据');
      console.log('响应数据:', JSON.stringify(response4.data, null, 2));
    }
    console.log('');
  } catch (error) {
    console.error('❌ 测试4失败:', error.response?.data || error.message);
    console.log('');
  }

  // 测试5：限流保护
  console.log('='.repeat(60));
  console.log('测试5：限流保护（快速连续请求）');
  console.log('='.repeat(60));
  try {
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
          name: `测试阿姨${i}`,
          phone: generateRandomPhone(),
          age: 30,
          gender: 'female',
          jobType: 'yuexin'
        }, {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.data.error === 'RATE_LIMIT_EXCEEDED');
    
    if (rateLimited) {
      console.log('✅ 测试5通过 - 限流保护生效');
      console.log('成功请求数:', responses.filter(r => r.data.success).length);
      console.log('被限流请求数:', responses.filter(r => r.data.error === 'RATE_LIMIT_EXCEEDED').length);
    } else {
      console.log('⚠️ 测试5警告 - 限流保护未触发（可能是请求间隔太长）');
      console.log('所有请求状态:', responses.map(r => ({ success: r.data.success, error: r.data.error })));
    }
    console.log('');
  } catch (error) {
    console.error('❌ 测试5失败:', error.response?.data || error.message);
    console.log('');
  }

  // 测试6：完整数据提交
  console.log('='.repeat(60));
  console.log('测试6：完整数据提交（包含所有可选字段）');
  console.log('='.repeat(60));
  try {
    const phone6 = generateRandomPhone();
    const idNumber6 = generateRandomIdNumber();
    const response6 = await axios.post(`${baseURL}/resumes/miniprogram/self-register`, {
      name: '张三',
      phone: phone6,
      age: 35,
      gender: 'female',
      jobType: 'yuexin',
      idNumber: idNumber6,
      birthDate: '1989-01-01',
      ethnicity: '汉族',
      nativePlace: '北京市',
      hukouAddress: '北京市朝阳区xxx',
      education: 'middle',
      expectedSalary: '0',
      experienceYears: '0',
      workExperience: '',
      skills: [],
      referrer: 'employee123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'miniprogram',
        'X-Platform': 'wechat'
      }
    });
    
    console.log('✅ 测试6通过 - 完整数据提交成功');
    console.log('响应数据:', JSON.stringify(response6.data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ 测试6失败:', error.response?.data || error.message);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('🎉 测试完成！');
  console.log('='.repeat(60));
}

// 运行测试
testSelfRegisterAPI().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});


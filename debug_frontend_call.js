const axios = require('axios');

console.log('🎯 模拟前端的确切调用方式...');

// 模拟前端的api配置
const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 模拟前端的响应拦截器
api.interceptors.response.use(
  (response) => {
    // 检查业务逻辑是否成功
    if (response.data && response.data.success === false) {
      // 如果业务逻辑失败，抛出错误
      const error = new Error(response.data.message || '请求失败');
      // 附加响应数据到错误对象上
      error.response = {
        status: response.status,
        data: response.data
      };
      throw error;
    }
    // 直接返回数据部分
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 模拟前端的request函数
const request = async (config) => {
  try {
    return await api.request(config);
  } catch (error) {
    throw error;
  }
};

// 模拟前端的apiService.post
const apiServicePost = async (url, data) => {
  return request({ method: 'POST', url, data });
};

// 模拟前端的调用
const testData = {
  partyAName: '孙学博',
  partyAMobile: '18604592681',
  partyAIdCard: '230623199105111630',
  partyBName: '朱小双',
  partyBMobile: '18600455241',
  partyBIdCard: '231023199205201234',
  isNotice: false,
  isSignPwdNotice: false
};

async function testFrontendCall() {
  try {
    console.log('📤 模拟前端调用:', testData);
    const response = await apiServicePost('http://localhost:3000/api/esign/add-users-batch', testData);
    console.log('✅ 前端调用成功:', response);
  } catch (error) {
    console.error('❌ 前端调用失败:', error.message);
    console.error('错误详情:', error.response?.data || error);
  }
}

testFrontendCall(); 
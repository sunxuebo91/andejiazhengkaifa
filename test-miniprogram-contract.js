const axios = require('axios');

// 测试小程序合同创建API
async function testMiniprogramContractCreate() {
  console.log('🧪 开始测试小程序合同创建API...\n');

  const testData = {
    templateNo: 'TN84E8C106BFE74FD3AE36AC2CA33A44DE',
    客户姓名: '测试客户',
    customerName: '测试客户',
    客户电话: '13800138000',
    customerPhone: '13800138000',
    客户身份证: '110101199001011234',
    customerIdCard: '110101199001011234',
    客户服务地址: '北京市朝阳区测试地址',
    customerServiceAddress: '北京市朝阳区测试地址',
    服务地址: '北京市朝阳区测试地址',
    serviceAddress: '北京市朝阳区测试地址',
    阿姨姓名: '测试阿姨',
    workerName: '测试阿姨',
    阿姨身份证: '110101199001011235',
    workerIdCard: '110101199001011235',
    联系地址: '北京市朝阳区测试地址2',
    workerAddress: '北京市朝阳区测试地址2',
    籍贯: '北京',
    workerNativePlace: '北京',
    性别: '女',
    workerGender: '女',
    年龄: 35,
    workerAge: 35,
    阿姨电话: '13800138001',
    workerPhone: '13800138001',
    阿姨工资: '8000',
    workerSalary: '8000',
    阿姨工资大写: '捌仟元整',
    workerSalaryUpper: '捌仟元整',
    服务费: '7000',
    customerServiceFee: '7000',
    服务费大写: '柒仟元',
    customerServiceFeeUpper: '柒仟元',
    首次匹配费: '1000',
    首次匹配费_index: 1,
    首次匹配费大写: '壹仟元整',
    服务时间: '8-18',
    serviceTime: '8-18',
    合同开始时间: '2026-02-25',
    startDate: '2026-02-25',
    合同结束时间: '2027-02-24',
    endDate: '2027-02-24',
    服务类型: '住家育儿嫂',
    contractType: '住家育儿嫂',
    服务类型_index: 4,
    休息方式: '单休',
    restType: '单休',
    多选6: '婴幼儿洗澡、洗头、清洗五官',
    多选7: '接送孩子上学、课外辅导',
    合同备注: '测试合同',
    remarks: '测试合同',
    customerId: 'temp',
    workerId: 'temp',
    createdBy: 'temp'
  };

  try {
    console.log('📤 发送请求到: https://crm.andejiazheng.com/api/contracts/miniprogram/create');
    console.log('📦 请求数据字段数量:', Object.keys(testData).length);
    
    const response = await axios.post(
      'https://crm.andejiazheng.com/api/contracts/miniprogram/create',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    console.log('\n✅ 请求成功！');
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 合同创建成功！');
      console.log('📋 合同编号:', response.data.data.contractNumber);
      console.log('📋 合同ID:', response.data.data._id);
      
      if (response.data.data.esignSignUrls) {
        console.log('🔗 签署链接:', response.data.data.esignSignUrls);
      }
    } else {
      console.log('\n❌ 合同创建失败:', response.data.message);
    }

  } catch (error) {
    console.error('\n❌ 请求失败！');
    if (error.response) {
      console.error('📥 响应状态:', error.response.status);
      console.error('📥 响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('📡 请求已发送但未收到响应');
      console.error('错误信息:', error.message);
    } else {
      console.error('错误信息:', error.message);
    }
  }
}

// 运行测试
testMiniprogramContractCreate();


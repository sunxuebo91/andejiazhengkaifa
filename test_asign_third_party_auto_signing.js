const axios = require('axios');

// 爱签API测试配置
const API_BASE_URL = 'http://localhost:3001/api';
const ASIGN_TEMPLATE_ID = 'TNF606E6D81E2D49C99CC983F4D0412276-3387'; // 爱签模板ID

// 模拟登录获取token
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

async function testAsignThirdPartyAutoSigning() {
  console.log('🔍 开始测试爱签系统丙方自动签章功能...\n');

  try {
    // 1. 登录获取token
    console.log('1. 尝试登录获取token...');
    let token = '';
    
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, LOGIN_CREDENTIALS);
      token = loginResponse.data.data?.token || loginResponse.data.token;
      console.log('✅ 登录成功，获取到token');
    } catch (loginError) {
      console.log('⚠️ 登录失败，将使用无token测试');
      console.log('   错误:', loginError.response?.data?.message || loginError.message);
    }

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    // 2. 测试爱签服务健康检查
    console.log('\n2. 测试爱签服务健康检查...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/esign/health`, { headers });
      console.log('✅ 爱签服务健康检查成功');
      console.log('   配置信息:', JSON.stringify(healthResponse.data.data?.config, null, 2));
    } catch (healthError) {
      console.log('❌ 爱签服务健康检查失败');
      console.log('   错误:', healthError.response?.data?.message || healthError.message);
    }

    // 3. 获取模板信息
    console.log('\n3. 获取爱签模板信息...');
    try {
      const templateResponse = await axios.get(`${API_BASE_URL}/esign/template/${ASIGN_TEMPLATE_ID}`, { headers });
      console.log('✅ 获取模板信息成功');
      
      // 检查模板中的签章控件
      const templateData = templateResponse.data.data;
      if (templateData && templateData.fillData) {
        console.log('📋 模板控件信息:');
        templateData.fillData.forEach((component, index) => {
          if (component.dataType === 6) { // 签章控件
            console.log(`   控件${index + 1}: ${component.keyword} (签章控件, signUserType: ${component.signUserType})`);
          }
        });
      }
    } catch (templateError) {
      console.log('❌ 获取模板信息失败');
      console.log('   错误:', templateError.response?.data?.message || templateError.message);
    }

    // 4. 创建测试合同（包含丙方企业签署人）
    console.log('\n4. 创建包含丙方的测试合同...');
    
    const testContractData = {
      contractName: `爱签丙方自动签章测试_${Date.now()}`,
      templateNo: ASIGN_TEMPLATE_ID,
      templateParams: {
        '甲方姓名': '张三',
        '甲方身份证号': '110101199001011234',
        '甲方电话': '13800138001',
        '乙方姓名': '李四',
        '乙方身份证号': '110101199002022345',
        '乙方电话': '13800138002',
        '服务备注': '家庭保洁服务；厨房清洁；卫生间清洁；客厅整理',
        '服务费用': '300',
        '服务时间': '2024年1月15日',
        '服务地址': '北京市朝阳区测试小区1号楼101室'
      },
      signers: [
        {
          name: '张三',
          mobile: '13800138001',
          idCard: '110101199001011234',
          signType: 'manual' // 甲方：有感知签约
        },
        {
          name: '李四', 
          mobile: '13800138002',
          idCard: '110101199002022345',
          signType: 'manual' // 乙方：有感知签约
        },
        {
          name: '安得家政企业',
          mobile: '13800138003',
          idCard: '91110108MA01234567', // 企业统一社会信用代码
          signType: 'auto' // 丙方（企业发起方）：无感知签约（自动签章）
        }
      ]
    };

    try {
      const contractResponse = await axios.post(`${API_BASE_URL}/esign/create-complete-flow`, testContractData, { headers });
      console.log('✅ 合同创建成功');
      console.log('   合同编号:', contractResponse.data.contractNo);
      
      // 检查签署URL
      if (contractResponse.data.signUrls) {
        console.log('📝 签署链接:');
        contractResponse.data.signUrls.forEach((signUrl, index) => {
          console.log(`   签署人${index + 1} (${signUrl.name}): ${signUrl.signUrl ? '✅ 有签署链接' : '❌ 无签署链接'}`);
          
          // 特别检查丙方（企业）的签署状态
          if (index >= 2) {
            console.log(`   🏢 企业签署人 (${signUrl.name}): ${signUrl.signUrl ? '需要手动签署' : '✅ 自动签章完成'}`);
          }
        });
      }

      // 5. 查询合同状态，验证丙方是否自动签章
      console.log('\n5. 查询合同签署状态...');
      const contractNo = contractResponse.data.contractNo;
      
      try {
        const statusResponse = await axios.get(`${API_BASE_URL}/esign/contract-status/${contractNo}`, { headers });
        console.log('✅ 合同状态查询成功');
        
        const contractStatus = statusResponse.data.data;
        if (contractStatus && contractStatus.signers) {
          console.log('📊 签署人状态:');
          contractStatus.signers.forEach((signer, index) => {
            const statusText = signer.status === 2 ? '✅ 已签署' : signer.status === 1 ? '⏳ 待签署' : '❓ 未知状态';
            console.log(`   签署人${index + 1} (${signer.name}): ${statusText}`);
            
            // 重点检查丙方（企业）的签署状态
            if (index >= 2) {
              if (signer.status === 2) {
                console.log(`   🎉 丙方企业自动签章成功！`);
              } else {
                console.log(`   ⚠️ 丙方企业未自动签章，状态: ${signer.status}`);
              }
            }
          });
        }
      } catch (statusError) {
        console.log('❌ 查询合同状态失败');
        console.log('   错误:', statusError.response?.data?.message || statusError.message);
      }

    } catch (contractError) {
      console.log('❌ 合同创建失败');
      console.log('   错误:', contractError.response?.data?.message || contractError.message);
      
      // 如果是签署人不存在的错误，尝试预注册用户
      if (contractError.response?.data?.message?.includes('不存在') || contractError.response?.data?.code === 100084) {
        console.log('\n6. 尝试预注册企业用户...');
        
        try {
          const enterpriseUserData = {
            account: 'enterprise_andejiazheng_' + Date.now(),
            name: '安得家政企业',
            idType: 'CRED_ORG_USCC', // 统一社会信用代码
            idNumber: '91110108MA01234567',
            orgLegalIdNumber: '110101199003033456', // 法人身份证
            orgLegalName: '王五' // 法人姓名
          };
          
          const addUserResponse = await axios.post(`${API_BASE_URL}/esign/add-enterprise-user`, enterpriseUserData, { headers });
          console.log('✅ 企业用户预注册成功');
          console.log('   企业账号:', addUserResponse.data.account);
          
          // 重新尝试创建合同
          console.log('\n7. 使用预注册用户重新创建合同...');
          testContractData.signers[2].account = addUserResponse.data.account;
          
          const retryContractResponse = await axios.post(`${API_BASE_URL}/esign/create-complete-flow`, testContractData, { headers });
          console.log('✅ 重新创建合同成功');
          console.log('   合同编号:', retryContractResponse.data.contractNo);
          
        } catch (userError) {
          console.log('❌ 预注册企业用户失败');
          console.log('   错误:', userError.response?.data?.message || userError.message);
        }
      }
    }

    // 总结测试结果
    console.log('\n📋 测试总结:');
    console.log('1. 爱签API配置: 使用 https://prev.asign.cn (测试环境)');
    console.log('2. 模板ID: TNF606E6D81E2D49C99CC983F4D0412276-3387');
    console.log('3. 丙方签署策略: signType=2 (无感知签约，自动签章)');
    console.log('4. 签章定位: locationMode=4 (模板坐标签章)');
    console.log('5. 默认印章: e5a9b6ff9e754771b0c364f68f2c3717');

  } catch (error) {
    console.error('🚨 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testAsignThirdPartyAutoSigning().catch(console.error); 
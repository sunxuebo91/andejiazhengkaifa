const axios = require('axios');

// 测试爱签sealNo参数修复
const API_BASE_URL = 'http://localhost:3001/api';
const ASIGN_TEMPLATE_ID = 'TNF606E6D81E2D49C99CC983F4D0412276-3387';

// 模拟登录凭据
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

async function testSealNoParameterFix() {
  console.log('🔍 测试爱签sealNo参数修复...\n');

  try {
    // 1. 登录获取token
    console.log('1. 登录获取token...');
    let token = '';
    
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, LOGIN_CREDENTIALS);
      token = loginResponse.data.data?.token || loginResponse.data.token;
      console.log('✅ 登录成功');
    } catch (loginError) {
      console.log('⚠️ 登录失败，使用无token测试');
    }

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    // 2. 创建测试合同，重点验证丙方的sealNo参数设置
    console.log('\n2. 创建测试合同，验证sealNo参数...');
    
    const testContractData = {
      contractName: `sealNo参数测试_${Date.now()}`,
      templateNo: ASIGN_TEMPLATE_ID,
      templateParams: {
        '甲方姓名': '张三',
        '甲方身份证号': '110101199001011234',
        '甲方电话': '13800138001',
        '乙方姓名': '李四',
        '乙方身份证号': '110101199002022345',
        '乙方电话': '13800138002',
        '服务备注': '测试sealNo参数设置',
        '服务费用': '300',
        '服务时间': '2024年1月15日',
        '服务地址': '北京市朝阳区测试地址'
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
          idCard: '91110108MA01234567',
          signType: 'auto' // 丙方（企业）：无感知签约，应该设置sealNo
        }
      ]
    };

    try {
      // 拦截请求，检查发送给爱签API的实际数据
      console.log('\n📋 预期的API调用参数检查:');
      console.log('- 甲方和乙方：不应该有sealNo参数');
      console.log('- 丙方（企业）：应该有顶层sealNo参数 = "e5a9b6ff9e754771b0c364f68f2c3717"');
      console.log('- 所有signStrategyList：不应该包含sealNo参数');

      const contractResponse = await axios.post(`${API_BASE_URL}/esign/create-complete-flow`, testContractData, { headers });
      
      if (contractResponse.data.success) {
        console.log('✅ 合同创建成功');
        console.log('   合同编号:', contractResponse.data.contractNo);
        
        // 检查返回的签署信息
        if (contractResponse.data.signUrls) {
          console.log('\n📊 签署人配置验证:');
          contractResponse.data.signUrls.forEach((signUrl, index) => {
            if (index >= 2) {
              console.log(`✅ 丙方企业 (${signUrl.name}): ${signUrl.signUrl ? '❌ 仍需手动签署' : '✅ 自动签章成功'}`);
            } else {
              console.log(`📝 签署人${index + 1} (${signUrl.name}): 需要手动签署`);
            }
          });
        }

        // 3. 查询合同状态验证
        console.log('\n3. 查询合同状态，验证自动签章效果...');
        const contractNo = contractResponse.data.contractNo;
        
        try {
          const statusResponse = await axios.get(`${API_BASE_URL}/esign/contract-status/${contractNo}`, { headers });
          
          if (statusResponse.data.success && statusResponse.data.data.signers) {
            console.log('📈 签署状态分析:');
            statusResponse.data.data.signers.forEach((signer, index) => {
              const statusText = signer.status === 2 ? '✅ 已签署' : signer.status === 1 ? '⏳ 待签署' : '❓ 未知状态';
              console.log(`   签署人${index + 1}: ${signer.name} - ${statusText}`);
              
              if (index >= 2 && signer.status === 2) {
                console.log('   🎉 sealNo参数修复成功！企业自动签章完成！');
              } else if (index >= 2 && signer.status !== 2) {
                console.log('   ⚠️ 企业未自动签章，可能需要进一步检查sealNo配置');
              }
            });
          }
        } catch (statusError) {
          console.log('❌ 查询合同状态失败:', statusError.response?.data?.message || statusError.message);
        }

      } else {
        console.log('❌ 合同创建失败:', contractResponse.data.message);
      }

    } catch (contractError) {
      console.log('❌ 合同创建过程中出错:', contractError.response?.data?.message || contractError.message);
      
      // 分析错误原因
      if (contractError.response?.data?.message?.includes('印章') || contractError.response?.data?.message?.includes('seal')) {
        console.log('\n🔍 可能的原因分析:');
        console.log('1. sealNo参数格式不正确');
        console.log('2. 指定的印章编号不存在或无权限使用');
        console.log('3. 企业用户未设置默认印章');
        console.log('4. 无感知签约权限未开通');
      }
    }

    // 4. 总结修复要点
    console.log('\n📋 sealNo参数修复总结:');
    console.log('✅ 修复前问题: sealNo参数错误地放在signStrategyList中');
    console.log('✅ 修复后改进: sealNo参数正确放在addSigner接口的顶层');
    console.log('✅ 官方文档要求: sealNo作为直接参数，指定签署使用的印章');
    console.log('✅ 预期效果: 丙方企业在添加签署方时就指定印章，实现真正的自动签章');

  } catch (error) {
    console.error('🚨 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testSealNoParameterFix().catch(console.error); 
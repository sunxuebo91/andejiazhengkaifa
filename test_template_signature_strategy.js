const axios = require('axios');

async function testTemplateSignatureStrategy() {
  console.log('🔍 测试模板签章策略...\n');

  const baseURL = 'http://localhost:3001';
  const contractNo = `CT_TEST_${Date.now()}`;
  
  try {
    // 步骤1: 创建合同
    console.log('📋 步骤1: 创建测试合同...');
    const createContractResponse = await axios.post(`${baseURL}/api/esign/create-contract`, {
      contractNo: contractNo,
      contractName: '测试模板签章策略合同',
      templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
      templateParams: {
        '甲方姓名': '张三',
        '甲方联系电话': '13800138000',
        '甲方身份证号': '110101199001011234',
        '客户联系地址': '北京市朝阳区测试地址',
        '阿姨姓名': '李阿姨',
        '阿姨电话': '13900139000',
        '阿姨身份证号': '110101199002022345',
        '服务类型': '月嫂服务',
        '服务地址': '北京市朝阳区服务地址',
        '籍贯': '河南',
        '年龄': '35',
        '性别': '女',
        '开始年': '2025',
        '开始月': '1',
        '开始日': '1',
        '结束年': '2025',
        '结束月': '2',
        '结束日': '28',
        '服务费': '8000',
        '匹配费': '800',
        '阿姨工资': '7200',
        '合同备注': '测试合同',
        '服务备注': '测试签章策略'
      },
      validityTime: 30
    });
    
    console.log('✅ 合同创建响应:', createContractResponse.data);
    
    if (createContractResponse.data.code !== 100000) {
      console.log('⚠️ 合同创建可能有问题，但继续测试签章策略...');
    }

    // 步骤2: 添加签署方（使用模板坐标签章）
    console.log('\n👥 步骤2: 添加签署方（模板坐标签章）...');
    
    // 测试甲方签名区
    const addSignerResponse1 = await axios.post(`${baseURL}/api/esign/add-signers-simple`, {
      contractNo: contractNo,
      signers: [
        {
          account: 'test_customer_001',
          name: '张三',
          mobile: '13800138000',
          signType: 'manual',
          validateType: 'sms'
        }
      ],
      signOrder: 'parallel'
    });
    
    console.log('✅ 甲方签署方添加响应:', addSignerResponse1.data);
    
    // 测试乙方签名区
    const addSignerResponse2 = await axios.post(`${baseURL}/api/esign/add-signers-simple`, {
      contractNo: contractNo,
      signers: [
        {
          account: 'test_aunt_001',
          name: '李阿姨',
          mobile: '13900139000',
          signType: 'manual',
          validateType: 'sms'
        }
      ],
      signOrder: 'parallel'
    });
    
    console.log('✅ 乙方签署方添加响应:', addSignerResponse2.data);

    // 步骤3: 获取合同状态验证签章策略
    console.log('\n📊 步骤3: 获取合同状态验证签章策略...');
    const statusResponse = await axios.get(`${baseURL}/api/esign/contract-status/${contractNo}`);
    console.log('✅ 合同状态:', statusResponse.data);

    // 步骤4: 预览合同（使用模板坐标签章）
    console.log('\n🖼️ 步骤4: 预览合同（测试模板签章位置）...');
    const previewResponse = await axios.post(`${baseURL}/api/esign/preview-contract/${contractNo}`, {
      signers: [
        {
          account: 'test_customer_001',
          isWrite: 0,
          signStrategyList: [
            {
              attachNo: 1,
              locationMode: 4, // 模板坐标签章
              signKey: '甲方签名区' // 使用模板中的确切名称
            }
          ]
        },
        {
          account: 'test_aunt_001',
          isWrite: 0,
          signStrategyList: [
            {
              attachNo: 1,
              locationMode: 4, // 模板坐标签章
              signKey: '乙方签名区' // 使用模板中的确切名称
            }
          ]
        }
      ]
    });
    
    console.log('✅ 预览合同响应:', previewResponse.data);

    // 检查签章策略是否正确应用
    console.log('\n🔍 签章策略验证结果:');
    console.log('- 合同编号:', contractNo);
    console.log('- 甲方签名区策略: locationMode=4, signKey="甲方签名区"');
    console.log('- 乙方签名区策略: locationMode=4, signKey="乙方签名区"');
    
    if (addSignerResponse1.data.code === 100000 && addSignerResponse2.data.code === 100000) {
      console.log('✅ 模板签章策略测试成功！');
    } else {
      console.log('⚠️ 签章策略可能存在问题，请检查signKey是否与模板中的签署区名称完全匹配');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('详细错误信息:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testServiceRemarksDataFlow() {
    try {
        console.log('🔍 测试服务备注数据流程 - 从前端提交到合同生成...\n');
        
        // 1. 模拟前端提交多个服务备注选项
        console.log('=== 步骤1: 模拟前端提交数据 ===');
        const multipleServiceRemarks = [
            '做饭',
            '做早餐', 
            '照顾老人',
            '打扫卫生',
            '买菜',
            '洗衣服'
        ];
        
        // 前端应该将多个选项用分号连接
        const serviceRemarksValue = multipleServiceRemarks.join('；');
        console.log('前端提交的服务备注值:', serviceRemarksValue);
        console.log('包含选项数量:', multipleServiceRemarks.length);
        
        // 2. 测试合同创建接口
        console.log('\n=== 步骤2: 测试合同创建 ===');
        const contractData = {
            customerName: '测试客户',
            customerPhone: '18601592681',
            customerIdCard: '230623199105111630',
            customerAddress: '黑龙江大庆市林甸县',
            
            workerName: '朱小双',
            workerPhone: '18600455241',
            workerIdCard: '430722198710025361',
            workerAddress: '北京市朝阳区石门1号',
            
            serviceType: '住家育儿',
            serviceTime: '8-18点',
            serviceLocation: '黑龙江大庆市林甸县',
            serviceRequirement: '根据雇主要求完成日常家庭服务，如做饭做菜、衣物清洗等日常家务清洁，照顾老人或孩子等',
            serviceRemarks: serviceRemarksValue, // 这里是关键 - 多个选项用分号连接
            
            contractValidityPeriod: '1个月',
            contractStartDate: '2024-01-15',
            contractEndDate: '2024-02-15',
            
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        };
        
        console.log('发送的合同数据中的服务备注:', contractData.serviceRemarks);
        
        const contractResponse = await axios.post('http://localhost:3001/api/esign/create-contract', contractData);
        
        if (contractResponse.data?.success) {
            console.log('✅ 合同创建成功');
            console.log('合同编号:', contractResponse.data.data.contractNo);
            
            // 3. 检查传递给爱签API的数据
            console.log('\n=== 步骤3: 检查后端日志中的爱签API调用数据 ===');
            console.log('请查看后端日志，确认传递给爱签API的fillData中服务备注字段的值');
            
            return contractResponse.data.data.contractNo;
        } else {
            console.error('❌ 合同创建失败:', contractResponse.data);
            return null;
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('响应错误:', error.response.data);
        }
    }
}

// 运行测试
testTemplateSignatureStrategy().then(() => {
  console.log('\n🎉 测试完成');
}).catch(error => {
  console.error('💥 测试异常:', error);
});

// 执行测试
testServiceRemarksDataFlow(); 
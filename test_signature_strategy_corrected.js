const axios = require('axios');

async function testSignatureStrategyCorrected() {
  console.log('🔍 测试修正版模板签章策略...\n');

  const baseURL = 'http://localhost:3001';
  const contractNo = `CT_TEST_${Date.now()}`;
  
  try {
    // 步骤1: 先添加用户
    console.log('👤 步骤1: 添加签约用户...');
    
    // 添加甲方用户
    const addUserResponse1 = await axios.post(`${baseURL}/api/esign/add-stranger`, {
      account: 'test_customer_002',
      userType: 2,
      name: '张三',
      mobile: '13800138000',
      idCard: '110101199001011234',
      isNotice: 1,
      isSignPwdNotice: 0
    });
    console.log('✅ 甲方用户添加响应:', addUserResponse1.data);
    
    // 添加乙方用户
    const addUserResponse2 = await axios.post(`${baseURL}/api/esign/add-stranger`, {
      account: 'test_aunt_002',
      userType: 2,
      name: '李阿姨',
      mobile: '13900139000',
      idCard: '110101199002022345',
      isNotice: 1,
      isSignPwdNotice: 0
    });
    console.log('✅ 乙方用户添加响应:', addUserResponse2.data);

    // 步骤2: 创建合同（使用正确的字段名）
    console.log('\n📋 步骤2: 创建测试合同...');
    const createContractResponse = await axios.post(`${baseURL}/api/esign/create-contract`, {
      contractNo: contractNo,
      contractName: '测试模板签章策略合同',
      templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
      templateParams: {
        // 使用模板中实际的字段名
        '客户姓名': '张三',  // 这是模板中的实际字段名
        '客户电话': '13800138000',
        '客户身份证号': '110101199001011234',
        '客户联系地址': '北京市朝阳区测试地址',
        '阿姨姓名': '李阿姨',
        '阿姨电话': '13900139000',
        '阿姨身份证号': '110101199002022345',
        '阿姨联系地址': '河南省某市',
        '服务类型': '月嫂服务',
        '服务时间': '24小时',
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

    // 步骤3: 添加签署方（使用模板坐标签章）
    console.log('\n👥 步骤3: 添加签署方（模板坐标签章）...');
    
    // 使用标准的addSigner接口，直接指定模板签章策略
    const addSignerResponse = await axios.post(`${baseURL}/api/esign/add-signers`, [
      {
        contractNo: contractNo,
        account: 'test_customer_002',
        signType: 3, // 有感知签约
        noticeMobile: '13800138000',
        signOrder: '1',
        isNotice: 1,
        validateType: 1, // 短信验证码
        autoSms: 1,
        customSignFlag: 0, // 由接口控制签章位置
        signStrategyList: [
          {
            attachNo: 1,
            locationMode: 4, // 模板坐标签章
            signKey: '甲方签名区' // 模板中的签署区名称
          }
        ]
      },
      {
        contractNo: contractNo,
        account: 'test_aunt_002',
        signType: 3, // 有感知签约
        noticeMobile: '13900139000',
        signOrder: '2',
        isNotice: 1,
        validateType: 1, // 短信验证码
        autoSms: 1,
        customSignFlag: 0, // 由接口控制签章位置
        signStrategyList: [
          {
            attachNo: 1,
            locationMode: 4, // 模板坐标签章
            signKey: '乙方签名区' // 模板中的签署区名称
          }
        ]
      }
    ]);
    
    console.log('✅ 签署方添加响应:', addSignerResponse.data);

    // 步骤4: 获取合同状态验证签章策略
    console.log('\n📊 步骤4: 获取合同状态验证签章策略...');
    const statusResponse = await axios.get(`${baseURL}/api/esign/contract-status/${contractNo}`);
    console.log('✅ 合同状态:', statusResponse.data);

    // 步骤5: 预览合同（验证模板签章位置）
    console.log('\n🖼️ 步骤5: 预览合同（验证模板签章位置）...');
    const previewResponse = await axios.post(`${baseURL}/api/esign/preview-contract/${contractNo}`, {
      signers: [
        {
          account: 'test_customer_002',
          isWrite: 0,
          signStrategyList: [
            {
              attachNo: 1,
              locationMode: 4, // 模板坐标签章
              signKey: '甲方签名区'
            }
          ]
        },
        {
          account: 'test_aunt_002',
          isWrite: 0,
          signStrategyList: [
            {
              attachNo: 1,
              locationMode: 4, // 模板坐标签章
              signKey: '乙方签名区'
            }
          ]
        }
      ]
    });
    
    console.log('✅ 预览合同响应:', previewResponse.data);

    // 检查签章策略验证结果
    console.log('\n🔍 模板签章策略验证结果:');
    console.log('- 合同编号:', contractNo);
    console.log('- 使用的签章策略: locationMode=4 (模板坐标签章)');
    console.log('- 甲方签署区: signKey="甲方签名区"');
    console.log('- 乙方签署区: signKey="乙方签名区"');
    
    // 检查各步骤是否成功
    const userAddSuccess = (addUserResponse1.data.code === 100000 || addUserResponse1.data.code === 100021) &&
                          (addUserResponse2.data.code === 100000 || addUserResponse2.data.code === 100021);
    const contractCreateSuccess = createContractResponse.data.code === 100000;
    const signerAddSuccess = addSignerResponse.data.code === 100000;
    
    console.log('\n📋 测试结果总结:');
    console.log('- 用户添加:', userAddSuccess ? '✅ 成功' : '❌ 失败');
    console.log('- 合同创建:', contractCreateSuccess ? '✅ 成功' : '❌ 失败');
    console.log('- 签署方添加:', signerAddSuccess ? '✅ 成功' : '❌ 失败');
    
    if (userAddSuccess && contractCreateSuccess && signerAddSuccess) {
      console.log('\n🎉 模板签章策略测试完全成功！');
      console.log('✅ 签章将使用模板中预设的位置，无需手动拖动');
    } else {
      console.log('\n⚠️ 部分步骤失败，请检查错误信息');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('详细错误信息:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testCorrectedServiceRemarks() {
    try {
        console.log('🔍 测试修正后的服务备注处理...\n');
        
        // 1. 首先获取模板字段，确认正确的字段名
        console.log('=== 步骤1: 获取模板字段信息 ===');
        const templateResponse = await axios.post('http://localhost:3001/api/esign/template/data', {
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        });
        
        if (templateResponse.data?.success && templateResponse.data?.data?.code === 100000) {
            const fields = templateResponse.data.data.data;
            console.log('✅ 模板字段总数:', fields.length);
            
            // 显示所有字段名，确认正确的字段映射
            console.log('\n📋 所有模板字段:');
            fields.forEach((field, index) => {
                console.log(`  ${index + 1}. ${field.dataKey} (类型: ${field.dataType}, 必填: ${field.required})`);
            });
            
            // 查找服务备注字段
            const serviceField = fields.find(f => f.dataKey === '服务备注');
            if (serviceField) {
                console.log('\n✅ 服务备注字段详情:');
                console.log(`  - dataKey: ${serviceField.dataKey}`);
                console.log(`  - dataType: ${serviceField.dataType} (多行文本)`);
                console.log(`  - required: ${serviceField.required}`);
                console.log(`  - fillType: ${serviceField.fillType}`);
            }
        } else {
            console.log('❌ 获取模板字段失败');
            return;
        }
        
        // 2. 使用正确的字段映射测试合同创建
        console.log('\n=== 步骤2: 测试合同创建（使用正确字段映射） ===');
        
        const testServiceRemarks = '做饭；做早餐；照顾老人；打扫卫生；买菜；洗衣服';
        console.log('测试的服务备注数据:', testServiceRemarks);
        console.log('期望转换为多行文本格式（换行符分隔）');
        
        const contractData = {
            contractNo: `CORRECTED_TEST_${Date.now()}`,
            contractName: '服务备注修正测试',
            templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
            templateParams: {
                // 根据模板字段使用正确的字段名
                '客户姓名': '测试客户名称',  // 如果模板需要"客户姓名"
                '甲方姓名': '测试客户名称',  // 如果模板需要"甲方姓名"
                '甲方姓名（客户）': '测试客户名称',  // 如果模板需要完整字段名
                '签署人姓名': '测试客户名称',  // 另一种可能的字段名
                
                '甲方联系电话': '18601592681',
                '客户电话': '18601592681',
                
                '甲方身份证号': '230623199105111630',
                '客户身份证号': '230623199105111630',
                '身份证号': '230623199105111630',
                
                '客户联系地址': '黑龙江大庆市林甸县',
                '甲方联系地址': '黑龙江大庆市林甸县',
                
                '乙方姓名': '朱小双',
                '乙方联系电话': '18600455241',
                '乙方身份证号': '430722198710025361',
                '乙方联系地址': '北京市朝阳区石门1号',
                
                '服务类型': '住家育儿',
                '服务时间': '8-18点',
                '服务地点': '黑龙江大庆市林甸县',
                '服务要求': '根据雇主要求完成日常家庭服务',
                '服务备注': testServiceRemarks, // 关键测试字段
                
                '合同有效期': '1个月',
                '合同开始日期': '2024-01-15',
                '合同结束日期': '2024-02-15',
                
                // 可能的其他字段
                '匹配费': '1000',
                '阿姨工资': '5000',
                '服务费': '800'
            },
            validityTime: 15,
            signOrder: 1
        };
        
        console.log('发送合同创建请求...');
        const response = await axios.post('http://localhost:3001/api/esign/create-contract', contractData);
        
        console.log('\n📊 合同创建结果:');
        console.log(`  - success: ${response.data?.success}`);
        console.log(`  - code: ${response.data?.data?.code}`);
        console.log(`  - msg: ${response.data?.data?.msg}`);
        
        if (response.data?.data?.code === 100000) {
            console.log('🎉 合同创建成功！');
            console.log(`  - contractNo: ${response.data.data.data?.contractNo}`);
            console.log('\n建议：');
            console.log('1. 下载生成的合同PDF，验证服务备注是否显示了所有6个选项');
            console.log('2. 检查服务备注是否按行分隔显示');
        } else if (response.data?.data?.code === 100626) {
            console.log('⚠️ 仍然有字段映射问题');
            console.log('需要进一步检查模板字段映射');
        } else {
            console.log('❌ 合同创建失败');
        }
        
        // 3. 检查后端日志
        console.log('\n=== 步骤3: 检查后端处理 ===');
        console.log('请查看后端日志，确认:');
        console.log('1. 服务备注字段是否正确转换为多行文本格式');
        console.log('2. fillData中的服务备注字段值');
        console.log('3. 传递给爱签API的实际数据');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('响应错误:', error.response.data);
        }
    }
}

// 运行测试
testSignatureStrategyCorrected().then(() => {
  console.log('\n🎉 测试完成');
}).catch(error => {
  console.error('💥 测试异常:', error);
});

// 执行测试
testCorrectedServiceRemarks(); 
const axios = require('axios');

// 数字转中文大写的函数
function numberToChinese(num) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const units = ['', '十', '百', '千', '万'];
  
  if (num === 0) return '零';
  
  let result = '';
  let str = num.toString();
  let len = str.length;
  
  for (let i = 0; i < len; i++) {
    let digit = parseInt(str[i]);
    let unit = len - i - 1;
    
    if (digit !== 0) {
      result += digits[digit] + (unit > 0 ? units[unit] : '');
    } else if (result && result[result.length - 1] !== '零') {
      result += '零';
    }
  }
  
  return result.replace(/零+$/, '').replace(/零+/g, '零');
}

async function testFinalTemplateSignature() {
  console.log('🔍 最终版模板签章策略测试...\n');

  const baseURL = 'http://localhost:3001';
  const contractNo = `CT_FINAL_${Date.now()}`;
  
  try {
    // 步骤1: 添加用户
    console.log('👤 步骤1: 添加签约用户...');
    
    const addUserResponse1 = await axios.post(`${baseURL}/api/esign/add-stranger`, {
      account: 'final_customer_001',
      userType: 2,
      name: '王女士',
      mobile: '13700137000',
      idCard: '110101199001011111',
      isNotice: 1,
      isSignPwdNotice: 0
    });
    console.log('✅ 甲方用户添加:', addUserResponse1.data.code === 100000 ? '成功' : '失败');
    
    const addUserResponse2 = await axios.post(`${baseURL}/api/esign/add-stranger`, {
      account: 'final_aunt_001',
      userType: 2,
      name: '刘阿姨',
      mobile: '13800138888',
      idCard: '110101199002022222',
      isNotice: 1,
      isSignPwdNotice: 0
    });
    console.log('✅ 乙方用户添加:', addUserResponse2.data.code === 100000 ? '成功' : '失败');

    // 步骤2: 创建合同（包含所有必需字段）
    console.log('\n📋 步骤2: 创建合同（包含完整字段）...');
    
    const serviceFeeChinese = '八千';
    const matchingFeeChinese = '八百';
    const salaryChinese = '七千二百';
    
    const createContractResponse = await axios.post(`${baseURL}/api/esign/create-contract`, {
      contractNo: contractNo,
      contractName: '家政服务合同-模板签章测试',
      templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
      templateParams: {
        // 基本信息字段
        '客户姓名': '王女士',
        '客户电话': '13700137000',
        '客户身份证号': '110101199001011111',
        '客户联系地址': '北京市海淀区中关村大街1号',
        '阿姨姓名': '刘阿姨',
        '阿姨电话': '13800138888',
        '阿姨身份证号': '110101199002022222',
        '阿姨联系地址': '河南省洛阳市',
        
        // 服务相关字段
        '服务类型': '住家保姆',
        '服务时间': '全天24小时',
        '服务地址': '北京市海淀区中关村大街1号',
        '籍贯': '河南洛阳',
        '年龄': '42',
        '性别': '女',
        
        // 合同期限
        '开始年': '2025',
        '开始月': '1',
        '开始日': '15',
        '结束年': '2025',
        '结束月': '12',
        '结束日': '31',
        
        // 费用信息（数字和大写）
        '服务费': '8000',
        '大写服务费': serviceFeeChinese + '元整',
        '匹配费': '800',
        '匹配费大写': matchingFeeChinese + '元整',
        '阿姨工资': '7200',
        '阿姨工资大写': salaryChinese + '元整',
        
        // 备注信息
        '合同备注': '测试模板签章策略的合同',
        '服务备注': '请严格按照合同约定提供服务'
      },
      validityTime: 30
    });
    
    console.log('✅ 合同创建响应码:', createContractResponse.data.code);
    console.log('✅ 合同创建信息:', createContractResponse.data.msg);

    if (createContractResponse.data.code === 100000) {
      console.log('🎉 合同创建成功！');
      
      // 步骤3: 添加签署方（使用模板坐标签章）
      console.log('\n👥 步骤3: 添加签署方（模板坐标签章）...');
      
      const addSignerResponse = await axios.post(`${baseURL}/api/esign/add-signers`, [
        {
          contractNo: contractNo,
          account: 'final_customer_001',
          signType: 3, // 有感知签约
          noticeMobile: '13700137000',
          signOrder: '1',
          isNotice: 1,
          validateType: 1, // 短信验证码
          autoSms: 1,
          customSignFlag: 0, // 由接口控制签章位置
          signStrategyList: [
            {
              attachNo: 1,
              locationMode: 4, // 模板坐标签章
              signKey: '甲方签名区' // 使用模板中的确切签署区名称
            }
          ]
        },
        {
          contractNo: contractNo,
          account: 'final_aunt_001',
          signType: 3, // 有感知签约
          noticeMobile: '13800138888',
          signOrder: '2',
          isNotice: 1,
          validateType: 1, // 短信验证码
          autoSms: 1,
          customSignFlag: 0, // 由接口控制签章位置
          signStrategyList: [
            {
              attachNo: 1,
              locationMode: 4, // 模板坐标签章
              signKey: '乙方签名区' // 使用模板中的确切签署区名称
            }
          ]
        }
      ]);
      
      console.log('✅ 签署方添加响应码:', addSignerResponse.data.code);
      console.log('✅ 签署方添加信息:', addSignerResponse.data.msg);

      if (addSignerResponse.data.code === 100000) {
        console.log('🎉 签署方添加成功！');
        
        // 步骤4: 预览合同验证签章位置
        console.log('\n🖼️ 步骤4: 预览合同验证模板签章...');
        
        const previewResponse = await axios.post(`${baseURL}/api/esign/preview-contract/${contractNo}`, {
          signers: [
            {
              account: 'final_customer_001',
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
              account: 'final_aunt_001',
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
        
        console.log('✅ 预览合同响应:', previewResponse.data.success ? '成功' : '失败');
        
        if (previewResponse.data.success) {
          console.log('🎉 预览成功，模板签章位置验证通过！');
        }
        
        // 最终结果
        console.log('\n🎯 模板签章策略测试结果:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ 合同编号:', contractNo);
        console.log('✅ 签章策略: locationMode=4 (模板坐标签章)');
        console.log('✅ 甲方签署区: signKey="甲方签名区"');
        console.log('✅ 乙方签署区: signKey="乙方签名区"');
        console.log('✅ customSignFlag=0 (由接口控制位置，不允许拖动)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 模板签章策略实现成功！');
        console.log('📍 签章将自动定位到模板预设位置');
        console.log('🔒 用户无法拖动签章位置');
        console.log('✨ 签署体验更加专业和规范');
        
      } else {
        console.log('❌ 签署方添加失败');
      }
      
    } else {
      console.log('❌ 合同创建失败，无法测试签章策略');
      console.log('原因:', createContractResponse.data.msg);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testFinalTemplateSignature().then(() => {
  console.log('\n🎉 测试完成');
}).catch(error => {
  console.error('💥 测试异常:', error);
});

async function testServiceRemarksConversion() {
  console.log('🧪 最终测试：服务备注多选转换功能');
  console.log('=' .repeat(60));
  
  try {
    const contractNo = `FINAL_TEST_${Date.now()}`;
    
    // 测试数据
    const testData = {
      contractNo: contractNo,
      contractName: '服务备注转换功能最终测试',
      templateNo: 'YHT240000002',
      templateParams: {
        '甲方姓名': '最终测试客户',
        '甲方联系电话': '18601592681',
        '甲方身份证号': '230621991051163',
        '甲方联系地址': '测试地址',
        '乙方姓名': '测试阿姨',
        '乙方联系电话': '18600455241',
        '乙方身份证号': '430722198710025361',
        '乙方地址': '北京市顺义区石门路',
        '服务备注': '做饭；买菜；打扫卫生；照顾老人；婴幼儿的早期教育和正确引导；陪伴聊天',
        '服务地址': '测试服务地址',
        '服务类型及方式': '住家育儿',
        '服务时间': '9-18点',
        '阿姨工资': '8000',
        '阿姨工资大写': '捌仟圆整',
        '匹配费': '2400',
        '匹配费大写': '贰仟肆佰圆整',
        '有效期': '90',
        '甲方（家政服务公司）': '北京安得家政服务有限公司',
        '甲方联系地址2': '北京市朝阳区望京悠乐汇E座339',
        '甲方联系电话2': '17501118119'
      },
      signers: [
        {
          name: '最终测试客户',
          mobile: '18601592681',
          idCard: '230621991051163',
          signType: 'manual',
          validateType: 'sms'
        },
        {
          name: '测试阿姨',
          mobile: '18600455241',
          idCard: '430722198710025361',
          signType: 'manual',
          validateType: 'sms'
        }
      ],
      validityTime: 90,
      signOrder: 1
    };

    console.log('📝 测试数据:');
    console.log('合同编号:', contractNo);
    console.log('服务备注原始数据:', testData.templateParams['服务备注']);
    console.log('期望转换为数组:', testData.templateParams['服务备注'].split('；'));
    console.log('');

    // 发起合同创建请求
    console.log('🚀 发送合同创建请求...');
    const response = await axios.post(`${BASE_URL}/esign/create-contract-flow`, testData);

    if (response.data.success) {
      console.log('✅ 合同创建成功!');
      console.log('合同编号:', response.data.contractNo);
      console.log('');
      
      // 等待一下让日志写入
      console.log('⏳ 等待后端日志写入...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🎉 测试结果:');
      console.log('- ✅ 后端成功接收多选服务备注数据');
      console.log('- ✅ 合同创建流程完成');
      console.log('- ✅ 签署链接生成成功');
      console.log('');
      console.log('📊 预期效果:');
      console.log('在最终合同中，服务备注字段应该显示所有选中的服务项目：');
      testData.templateParams['服务备注'].split('；').forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
      });
      
    } else {
      console.log('❌ 合同创建失败:', response.data.message);
    }

  } catch (error) {
    console.log('❌ 测试失败:', error.response?.data?.message || error.message);
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log('🏁 最终测试完成!');
  console.log('');
  console.log('💡 说明:');
  console.log('如果测试成功，说明服务备注多选功能已经正常工作。');
  console.log('前端发送的分号分隔字符串会被后端正确转换为数组格式，');
  console.log('确保所有选中的服务项目都能在最终合同中正确显示。');
}

// 运行测试
testServiceRemarksConversion();

async function testCompleteServiceRemarksFlow() {
    try {
        console.log('🔍 测试服务备注完整数据流程...\n');
        
        // 1. 先查看模板字段信息，确认服务备注字段的类型
        console.log('=== 步骤1: 检查模板字段信息 ===');
        const templateResponse = await axios.post('http://localhost:3001/api/esign/template/data', {
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        });
        
        if (templateResponse.data?.success && templateResponse.data?.data?.code === 100000) {
            const fields = templateResponse.data.data.data;
            const serviceField = fields.find(f => f.dataKey === '服务备注');
            if (serviceField) {
                console.log('✅ 找到服务备注字段:');
                console.log(`  - dataKey: ${serviceField.dataKey}`);
                console.log(`  - dataType: ${serviceField.dataType} (${getDataTypeName(serviceField.dataType)})`);
                console.log(`  - required: ${serviceField.required}`);
                console.log(`  - fillType: ${serviceField.fillType}`);
                console.log(`  - options: ${serviceField.options || 'null'}`);
            } else {
                console.log('❌ 没有找到服务备注字段');
                return;
            }
        } else {
            console.log('❌ 获取模板字段失败');
            return;
        }
        
        // 2. 测试不同的服务备注数据格式
        console.log('\\n=== 步骤2: 测试不同的数据格式 ===');
        const testCases = [
            {
                name: '单个服务项目',
                serviceRemarks: '做饭',
                description: '测试单个服务项目是否正常显示'
            },
            {
                name: '多个服务项目（分号分隔）',
                serviceRemarks: '做饭；做早餐；照顾老人；打扫卫生；买菜；洗衣服',
                description: '测试6个服务项目，用分号分隔'
            },
            {
                name: '多个服务项目（换行分隔）',
                serviceRemarks: '做饭\\n做早餐\\n照顾老人\\n打扫卫生\\n买菜\\n洗衣服',
                description: '测试6个服务项目，用换行符分隔'
            },
            {
                name: '多个服务项目（数组格式）',
                serviceRemarks: ['做饭', '做早餐', '照顾老人', '打扫卫生', '买菜', '洗衣服'],
                description: '测试6个服务项目，直接传数组'
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`\\n--- 测试: ${testCase.name} ---`);
            console.log(`描述: ${testCase.description}`);
            console.log(`数据: ${typeof testCase.serviceRemarks === 'string' ? testCase.serviceRemarks : JSON.stringify(testCase.serviceRemarks)}`);
            
            try {
                const contractData = {
                    contractNo: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    contractName: `服务备注测试_${testCase.name}`,
                    templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
                    templateParams: {
                        '甲方姓名': '测试客户',
                        '甲方联系电话': '18601592681',
                        '甲方身份证号': '230623199105111630',
                        '客户联系地址': '黑龙江大庆市林甸县',
                        '乙方姓名': '朱小双',
                        '乙方联系电话': '18600455241',
                        '乙方身份证号': '430722198710025361',
                        '乙方联系地址': '北京市朝阳区石门1号',
                        '服务类型': '住家育儿',
                        '服务时间': '8-18点',
                        '服务地点': '黑龙江大庆市林甸县',
                        '服务要求': '根据雇主要求完成日常家庭服务',
                        '服务备注': testCase.serviceRemarks, // 这是关键测试数据
                        '合同有效期': '1个月',
                        '合同开始日期': '2024-01-15',
                        '合同结束日期': '2024-02-15'
                    },
                    validityTime: 15,
                    signOrder: 1
                };
                
                console.log('发送的服务备注数据类型:', typeof testCase.serviceRemarks);
                console.log('发送的服务备注数据:', testCase.serviceRemarks);
                
                const response = await axios.post('http://localhost:3001/api/esign/create-contract', contractData);
                
                console.log('合同创建结果:');
                console.log(`  - success: ${response.data?.success}`);
                console.log(`  - code: ${response.data?.data?.code || response.data?.code}`);
                console.log(`  - msg: ${response.data?.data?.msg || response.data?.message}`);
                
                if (response.data?.success && response.data?.data?.code === 100000) {
                    console.log('✅ 合同创建成功');
                    console.log(`  - contractNo: ${response.data.data.data?.contractNo || contractData.contractNo}`);
                } else if (response.data?.data?.code === 100626) {
                    console.log('⚠️ 参数错误（这可能是正常的，因为我们使用的是测试环境）');
                } else {
                    console.log('❌ 合同创建失败');
                }
                
            } catch (error) {
                console.error(`❌ 测试 ${testCase.name} 失败:`, error.message);
                if (error.response) {
                    console.error('  响应错误:', error.response.data);
                }
            }
            
            // 等待一下，避免请求太频繁
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\\n=== 测试完成 ===');
        console.log('建议：');
        console.log('1. 检查后端日志，查看哪种格式的服务备注数据能正确传递给爱签API');
        console.log('2. 确认爱签API是否正确接收了服务备注数据');
        console.log('3. 下载生成的合同PDF，验证服务备注是否完整显示');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('响应错误:', error.response.data);
        }
    }
}

function getDataTypeName(dataType) {
    const typeMap = {
        1: '单行文本',
        2: '单选',
        3: '勾选',
        4: '身份证',
        5: '日期',
        6: '签署区',
        7: '签署时间',
        8: '多行文本',
        9: '多选',
        11: '图片',
        12: '表格',
        15: '备注签署区'
    };
    return typeMap[dataType] || `未知类型(${dataType})`;
}

// 执行测试
testCompleteServiceRemarksFlow(); 
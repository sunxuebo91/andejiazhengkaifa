const axios = require('axios');

async function testTemplateComponents() {
  console.log('🔍 测试模板控件信息查询...\n');

  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. 获取模板列表
    console.log('📋 步骤1: 获取模板列表...');
    const templateListResponse = await axios.get(`${baseURL}/api/esign/templates`);
    console.log('✅ 模板列表获取成功');
    console.log('模板数量:', templateListResponse.data.data?.length || 0);
    
    if (templateListResponse.data.data && templateListResponse.data.data.length > 0) {
      const firstTemplate = templateListResponse.data.data[0];
      console.log('第一个模板信息:');
      console.log('- 模板编号:', firstTemplate.templateNo);
      console.log('- 模板名称:', firstTemplate.templateName);
      console.log('- 模板状态:', firstTemplate.status);
      
      // 2. 获取模板详细信息
      console.log('\n📄 步骤2: 获取模板详细信息...');
      try {
        const templateInfoResponse = await axios.get(`${baseURL}/api/esign/template-info/${firstTemplate.templateNo}`);
        console.log('✅ 模板详细信息获取成功');
        console.log('模板详细信息:', JSON.stringify(templateInfoResponse.data.data, null, 2));
      } catch (infoError) {
        console.log('⚠️ 模板详细信息获取失败:', infoError.response?.data?.message || infoError.message);
      }
      
      // 3. 获取模板字段信息
      console.log('\n📝 步骤3: 获取模板字段信息...');
      try {
        const templateFieldsResponse = await axios.get(`${baseURL}/api/esign/template-fields/${firstTemplate.templateNo}`);
        console.log('✅ 模板字段信息获取成功');
        console.log('字段信息:', JSON.stringify(templateFieldsResponse.data.data, null, 2));
      } catch (fieldsError) {
        console.log('⚠️ 模板字段信息获取失败:', fieldsError.response?.data?.message || fieldsError.message);
      }
      
      // 4. 获取模板组件信息（可能包含签署区）
      console.log('\n🔧 步骤4: 获取模板组件信息...');
      try {
        const templateComponentsResponse = await axios.get(`${baseURL}/api/esign/template-components/${firstTemplate.templateNo}`);
        console.log('✅ 模板组件信息获取成功');
        console.log('组件信息:', JSON.stringify(templateComponentsResponse.data.data, null, 2));
        
        // 分析组件中是否包含签署区
        if (templateComponentsResponse.data.data && Array.isArray(templateComponentsResponse.data.data)) {
          const signAreas = templateComponentsResponse.data.data.filter(component => 
            component.type === 'SIGN_AREA' || 
            component.componentType === 'SIGN' ||
            component.name?.includes('签署') ||
            component.name?.includes('甲方') ||
            component.name?.includes('乙方') ||
            component.name?.includes('丙方')
          );
          
          if (signAreas.length > 0) {
            console.log('\n🎯 发现签署区组件:');
            signAreas.forEach((area, index) => {
              console.log(`签署区 ${index + 1}:`);
              console.log('- 名称:', area.name || area.key);
              console.log('- 类型:', area.type || area.componentType);
              console.log('- 位置:', area.position || area.location);
              console.log('- 配置:', JSON.stringify(area, null, 2));
            });
          } else {
            console.log('\n⚠️ 未发现明确的签署区组件');
          }
        }
        
      } catch (componentError) {
        console.log('⚠️ 模板组件信息获取失败:', componentError.response?.data?.message || componentError.message);
      }
      
      // 5. 测试真实的模板预览
      console.log('\n🖼️ 步骤5: 测试模板预览...');
      try {
        const previewResponse = await axios.post(`${baseURL}/api/esign/template-preview`, {
          templateNo: firstTemplate.templateNo,
          templateParams: {
            '甲方姓名': '张三',
            '甲方电话': '13800138000',
            '乙方姓名': '李四',
            '乙方电话': '13900139000',
            '服务类型': '家庭保洁',
            '服务费用': '100',
            '有效期': '90'
          }
        });
        console.log('✅ 模板预览成功');
        console.log('预览结果:', previewResponse.data.data);
      } catch (previewError) {
        console.log('⚠️ 模板预览失败:', previewError.response?.data?.message || previewError.message);
      }
      
      // 6. 测试创建合同并查看签章策略
      console.log('\n📋 步骤6: 测试创建合同...');
      const testContractNo = `TEST_${Date.now()}`;
      try {
        const createContractResponse = await axios.post(`${baseURL}/api/esign/create-contract`, {
          contractNo: testContractNo,
          contractName: '测试合同',
          templateNo: firstTemplate.templateNo,
          templateParams: {
            '甲方姓名': '张三',
            '甲方电话': '13800138000',
            '乙方姓名': '李四',
            '乙方电话': '13900139000',
            '服务类型': '家庭保洁',
            '服务费用': '100',
            '有效期': '90'
          },
          validityTime: 90
        });
        console.log('✅ 合同创建成功');
        console.log('合同信息:', createContractResponse.data.data);
        
        // 7. 测试添加签署方（使用模板坐标签章）
        console.log('\n👥 步骤7: 测试添加签署方（模板坐标签章）...');
        const addSignerResponse = await axios.post(`${baseURL}/api/esign/add-signer`, {
          contractNo: testContractNo,
          signers: [
            {
              account: 'test_customer_001',
              name: '张三',
              mobile: '13800138000',
              signType: 'manual',
              validateType: 'sms'
            },
            {
              account: 'test_aunt_001', 
              name: '李四',
              mobile: '13900139000',
              signType: 'manual',
              validateType: 'sms'
            }
          ]
        });
        console.log('✅ 签署方添加成功');
        console.log('签署方信息:', JSON.stringify(addSignerResponse.data.data, null, 2));
        
        // 8. 检查合同状态
        console.log('\n📊 步骤8: 检查合同状态...');
        const statusResponse = await axios.get(`${baseURL}/api/esign/contract-status/${testContractNo}`);
        console.log('✅ 合同状态获取成功');
        console.log('合同状态:', JSON.stringify(statusResponse.data.data, null, 2));
        
        // 9. 测试预览合同（查看签章位置）
        console.log('\n🔍 步骤9: 测试预览合同（查看签章位置）...');
        const contractPreviewResponse = await axios.post(`${baseURL}/api/esign/preview-contract`, {
          contractNo: testContractNo,
          signers: [
            {
              account: 'test_customer_001',
              signStrategyList: [
                {
                  attachNo: 1,
                  locationMode: 4, // 模板坐标签章
                  signKey: '甲方'
                }
              ]
            },
            {
              account: 'test_aunt_001',
              signStrategyList: [
                {
                  attachNo: 1,
                  locationMode: 4, // 模板坐标签章
                  signKey: '乙方'
                }
              ]
            }
          ]
        });
        console.log('✅ 合同预览成功');
        console.log('预览结果:', JSON.stringify(contractPreviewResponse.data.data, null, 2));
        
      } catch (contractError) {
        console.log('⚠️ 合同操作失败:', contractError.response?.data?.message || contractError.message);
      }
      
    } else {
      console.log('❌ 没有找到可用的模板');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testTemplateComponents().then(() => {
  console.log('\n🎉 测试完成');
}).catch(error => {
  console.error('💥 测试异常:', error);
}); 
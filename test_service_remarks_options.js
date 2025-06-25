const axios = require('axios');

async function testServiceRemarksOptions() {
    try {
        console.log('🧪 测试服务备注字段的选项显示...');
        
        // 1. 获取模板数据
        console.log('\n📋 步骤1: 获取模板数据...');
        const templateResponse = await axios.post('http://localhost:3001/api/esign/template/data', {
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        });
        
        if (!templateResponse.data?.success || templateResponse.data?.data?.code !== 100000) {
            console.error('❌ 获取模板数据失败:', templateResponse.data);
            return;
        }
        
        const templateFields = templateResponse.data.data.data;
        console.log(`✅ 获取到 ${templateFields.length} 个模板字段`);
        
        // 2. 查找服务备注字段
        console.log('\n🔍 步骤2: 查找服务备注字段...');
        const serviceRemarkField = templateFields.find(field => field.dataKey === '服务备注');
        
        if (!serviceRemarkField) {
            console.log('❌ 未找到服务备注字段');
            return;
        }
        
        console.log('✅ 找到服务备注字段:');
        console.log('  dataKey:', serviceRemarkField.dataKey);
        console.log('  dataType:', serviceRemarkField.dataType);
        console.log('  fillType:', serviceRemarkField.fillType);
        console.log('  required:', serviceRemarkField.required);
        console.log('  options:', serviceRemarkField.options);
        
        // 3. 获取前端模板信息（已转换）
        console.log('\n📋 步骤3: 获取前端使用的模板信息...');
        const templateInfoResponse = await axios.get('http://localhost:3001/api/esign/templates');
        
        console.log('前端模板信息响应状态:', templateInfoResponse.data?.success);
        
        if (templateInfoResponse.data?.success && templateInfoResponse.data?.data) {
            const templates = templateInfoResponse.data.data;
            console.log(`✅ 获取到 ${templates.length} 个模板`);
            
            // 查找第一个模板的字段
            if (templates[0] && templates[0].fields) {
                const serviceField = templates[0].fields.find(field => 
                    field.key === '服务备注' || field.label === '服务备注'
                );
                
                if (serviceField) {
                    console.log('✅ 在前端模板中找到服务备注字段:');
                    console.log('  key:', serviceField.key);
                    console.log('  label:', serviceField.label);
                    console.log('  type:', serviceField.type);
                    console.log('  required:', serviceField.required);
                    console.log('  options数量:', serviceField.options ? serviceField.options.length : 0);
                    
                    if (serviceField.options && serviceField.options.length > 0) {
                        console.log('  前5个选项:');
                        serviceField.options.slice(0, 5).forEach((option, index) => {
                            console.log(`    ${index + 1}. ${option.label}`);
                        });
                        if (serviceField.options.length > 5) {
                            console.log(`    ... 还有 ${serviceField.options.length - 5} 个选项`);
                        }
                    } else {
                        console.log('  ❌ 没有找到选项数据');
                    }
                } else {
                    console.log('❌ 在前端模板中未找到服务备注字段');
                }
            }
        }
        
        console.log('\n✅ 测试完成');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

// 运行测试
testServiceRemarksOptions(); 
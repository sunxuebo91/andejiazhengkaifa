const axios = require('axios');

async function debugServiceOptions() {
    try {
        console.log('🔍 调试服务备注选项问题...');
        
        // 1. 测试 getTemplateData 接口（原始爱签API数据）
        console.log('\n=== 步骤1: 测试原始模板数据接口 ===');
        const templateDataResponse = await axios.post('http://localhost:3001/api/esign/template/data', {
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        });
        
        console.log('原始模板数据响应:');
        console.log('- success:', templateDataResponse.data?.success);
        console.log('- code:', templateDataResponse.data?.data?.code);
        console.log('- 字段数量:', templateDataResponse.data?.data?.data?.length);
        
        if (templateDataResponse.data?.success && templateDataResponse.data?.data?.data) {
            const serviceField = templateDataResponse.data.data.data.find(f => f.dataKey === '服务备注');
            if (serviceField) {
                console.log('✅ 原始服务备注字段:', JSON.stringify(serviceField, null, 2));
            } else {
                console.log('❌ 未找到原始服务备注字段');
            }
        }
        
        // 2. 测试 getTemplates 接口（转换后的模板数据）
        console.log('\n=== 步骤2: 测试转换后的模板接口 ===');
        const templatesResponse = await axios.get('http://localhost:3001/api/esign/templates');
        
        console.log('转换后的模板响应:');
        console.log('- success:', templatesResponse.data?.success);
        console.log('- 模板数量:', templatesResponse.data?.data?.length);
        
        if (templatesResponse.data?.success && templatesResponse.data?.data?.[0]?.fields) {
            const fields = templatesResponse.data.data[0].fields;
            console.log('- 字段数量:', fields.length);
            
            const serviceField = fields.find(f => f.key === '服务备注' || f.label === '服务备注');
            if (serviceField) {
                console.log('✅ 转换后的服务备注字段:');
                console.log(JSON.stringify(serviceField, null, 2));
                
                if (serviceField.options) {
                    console.log(`📋 选项数量: ${serviceField.options.length}`);
                    console.log('前3个选项:', serviceField.options.slice(0, 3));
                } else {
                    console.log('❌ 没有options字段');
                }
            } else {
                console.log('❌ 未找到转换后的服务备注字段');
                console.log('所有字段keys:', fields.map(f => f.key));
            }
        }
        
        // 3. 直接调用后端日志看看
        console.log('\n=== 步骤3: 检查后端转换过程 ===');
        console.log('请检查后端日志中的转换过程信息...');
        
    } catch (error) {
        console.error('❌ 调试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            if (error.response.data) {
                console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }
}

// 运行调试
debugServiceOptions(); 
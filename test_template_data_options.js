const axios = require('axios');

async function testTemplateData() {
    try {
        console.log('🔍 测试模板数据的options字段...');
        
        // 调用后端接口获取模板数据
        const response = await axios.post('http://localhost:3001/api/esign/template/data', {
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        });
        
        console.log('📋 模板数据响应:', response.data);
        
        if (response.data?.success && response.data?.data?.code === 100000) {
            const templateFields = response.data.data.data;
            console.log(`\n🔍 找到 ${templateFields.length} 个模板字段:`);
            
            templateFields.forEach((field, index) => {
                console.log(`\n字段 ${index + 1}:`);
                console.log(`- dataKey: ${field.dataKey}`);
                console.log(`- dataType: ${field.dataType}`);
                console.log(`- fillType: ${field.fillType}`);
                console.log(`- required: ${field.required}`);
                
                // 重点检查options字段
                if (field.options && Array.isArray(field.options)) {
                    console.log(`- options (${field.options.length} 个):`);
                    field.options.forEach((option, optIndex) => {
                        console.log(`  ${optIndex + 1}. ${option.label} (selected: ${option.selected}, index: ${option.index})`);
                    });
                } else if (field.dataType === 2 || field.dataType === 9) {
                    console.log(`- ⚠️  dataType为${field.dataType}但没有options字段!`);
                } else {
                    console.log(`- options: 无 (dataType=${field.dataType}，不需要)`);
                }
                
                // 检查服务备注相关字段
                if (field.dataKey && (field.dataKey.includes('服务') || field.dataKey.includes('备注'))) {
                    console.log(`- 🎯 这是服务备注相关字段!`);
                }
            });
            
            // 专门查找服务备注字段
            const serviceFields = templateFields.filter(field => 
                field.dataKey && (
                    field.dataKey.includes('服务') || 
                    field.dataKey.includes('备注') ||
                    field.dataKey.includes('内容')
                )
            );
            
            if (serviceFields.length > 0) {
                console.log('\n🎯 服务备注相关字段详情:');
                serviceFields.forEach((field, index) => {
                    console.log(`\n服务字段 ${index + 1}:`);
                    console.log(`- dataKey: ${field.dataKey}`);
                    console.log(`- dataType: ${field.dataType} (${getDataTypeDescription(field.dataType)})`);
                    console.log(`- 完整字段数据:`, JSON.stringify(field, null, 2));
                });
            }
            
        } else {
            console.error('❌ 获取模板数据失败:', response.data);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('响应数据:', error.response.data);
        }
    }
}

function getDataTypeDescription(dataType) {
    const types = {
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
    return types[dataType] || `未知类型(${dataType})`;
}

// 运行测试
testTemplateData(); 
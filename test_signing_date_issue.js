const axios = require('axios');

async function analyzeSigningDateIssues() {
    console.log('🔍 分析签署日期在合同中的显示问题');
    console.log('='.repeat(80));

    try {
        // 1. 获取模板数据，分析日期控件配置
        console.log('\n📋 步骤1: 分析模板中的日期控件配置');
        const templateResponse = await axios.post('http://localhost:3001/api/esign/template/data', {
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        });
        
        console.log('🔍 API响应状态:', templateResponse.status);
        console.log('🔍 API响应结构:', typeof templateResponse.data);
        console.log('🔍 API响应数据键:', Object.keys(templateResponse.data || {}));
        
                 // 检查多种可能的数据结构
         let controlList = null;
         if (templateResponse.data) {
             if (templateResponse.data.controlList) {
                 controlList = templateResponse.data.controlList;
             } else if (templateResponse.data.data && templateResponse.data.data.controlList) {
                 controlList = templateResponse.data.data.controlList;
             } else if (templateResponse.data.data && templateResponse.data.data.data && Array.isArray(templateResponse.data.data.data)) {
                 controlList = templateResponse.data.data.data;
             } else if (templateResponse.data.components) {
                 controlList = templateResponse.data.components;
             }
         }
        
        if (!controlList) {
            console.log('❌ 无法获取模板控件列表');
            console.log('📋 完整响应数据:', JSON.stringify(templateResponse.data, null, 2));
            return;
        }

        const controls = controlList;
        const dateControls = controls.filter(control => 
            control.dataType === 7 || control.dataKey.includes('日期')
        );

        console.log(`\n📊 找到 ${dateControls.length} 个日期相关控件:`);
        dateControls.forEach((control, index) => {
            console.log(`\n${index + 1}. 控件: ${control.dataKey}`);
            console.log(`   - 数据类型: ${control.dataType} (${getDataTypeDescription(control.dataType)})`);
            console.log(`   - 页码: ${control.page}`);
            console.log(`   - 坐标: (${control.x}, ${control.y})`);
            console.log(`   - 是否必填: ${control.required ? '是' : '否'}`);
            console.log(`   - 默认值: ${control.defaultValue || '无'}`);
            console.log(`   - 控件大小: ${control.width} x ${control.height}`);
            
            if (control.dataKey.includes('签约日期')) {
                console.log(`   ⚠️  这是签约日期控件 - 应该由爱签自动填充`);
            }
        });

        // 2. 分析目前系统的日期处理逻辑
        console.log('\n\n🔧 步骤2: 分析当前系统的日期处理逻辑');
        
        console.log('\n当前在合同创建时传递的参数:');
        const currentDateHandling = {
            '开始年': '2024',
            '开始月': '12', 
            '开始日': '26',
            '结束年': '2025',
            '结束月': '12',
            '结束日': '25',
            '年龄': '25'
        };
        
        Object.entries(currentDateHandling).forEach(([key, value]) => {
            const control = controls.find(c => c.dataKey === key);
            if (control) {
                console.log(`✅ ${key}: ${value} -> 数据类型: ${control.dataType}`);
            }
        });

        // 3. 签约日期控件的具体分析
        console.log('\n\n🎯 步骤3: 签约日期控件详细分析');
        
        const signingDateControls = dateControls.filter(control => 
            control.dataKey.includes('签约日期')
        );
        
        console.log(`\n找到 ${signingDateControls.length} 个签约日期控件:`);
        signingDateControls.forEach(control => {
            console.log(`\n📅 ${control.dataKey}:`);
            console.log(`   - 控件类型: ${control.dataType === 7 ? '自动日期控件' : '其他类型'}`);
            console.log(`   - 位置: 第${control.page}页 (${control.x}, ${control.y})`);
            console.log(`   - 宽高: ${control.width} x ${control.height}`);
            
            if (control.dataType === 7) {
                console.log(`   ✅ 这是自动日期控件 - 理论上应该在签署时自动填充`);
            } else {
                console.log(`   ❌ 这不是自动日期控件 - 可能需要手动传递参数`);
            }
        });

        // 4. 检查 waterMark 参数的使用
        console.log('\n\n💧 步骤4: 检查 waterMark 日期水印功能');
        console.log('在爱签的签署人配置中:');
        console.log('- waterMark: 0 表示不添加日期水印');
        console.log('- waterMark: 1 表示在距底部10px中央位置添加日期水印');
        console.log('');
        console.log('🤔 问题分析:');
        console.log('1. 当前系统 waterMark 设置为 0，不会自动添加日期水印');
        console.log('2. 签约日期控件(dataType=7)依赖爱签系统在签署时自动填充');
        console.log('3. 如果签约日期不显示，可能的原因:');
        console.log('   - 模板控件配置问题');
        console.log('   - 爱签系统的自动填充逻辑问题');
        console.log('   - 签署时没有正确触发日期填充');

        // 5. 建议的解决方案
        console.log('\n\n🔧 步骤5: 建议的解决方案');
        console.log('\n方案1: 启用日期水印');
        console.log('在签署人配置中设置 waterMark: 1');
        console.log('这会在合同底部自动添加签署日期');
        
        console.log('\n方案2: 检查模板控件配置');
        console.log('确认签约日期控件是否正确配置为 dataType: 7');
        
        console.log('\n方案3: 手动填充签约日期');
        console.log('在 templateParams 中预设签约日期:');
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];
        console.log(`{`);
        signingDateControls.forEach(control => {
            console.log(`  "${control.dataKey}": "${currentDate}",`);
        });
        console.log(`}`);

        // 6. 检查当前代码的 waterMark 设置
        console.log('\n\n🔍 步骤6: 检查当前代码中的 waterMark 设置');
        console.log('根据 esign.service.ts 的代码分析:');
        console.log('- 在 addSimpleContractSigners 方法中，waterMark 默认设置为 0');
        console.log('- 这意味着不会添加自动日期水印');
        console.log('- 建议修改为 waterMark: 1 来启用日期水印功能');

        // 7. 生成测试用的签署配置
        console.log('\n\n⚙️  步骤7: 建议的签署配置修改');
        console.log('在 esign.service.ts 的 addSimpleContractSigners 方法中:');
        console.log('');
        console.log('修改前:');
        console.log('waterMark: 0, // 是否在距底部10px中央位置添加日期水印');
        console.log('');
        console.log('修改后:');
        console.log('waterMark: 1, // 启用日期水印，自动显示签署日期');

        console.log('\n\n📝 总结建议:');
        console.log('1. 立即修改: 设置 waterMark: 1 启用日期水印');
        console.log('2. 长期优化: 确保模板中的签约日期控件配置正确');
        console.log('3. 备选方案: 在 templateParams 中预设签约日期');
        console.log('4. 测试验证: 创建一个测试合同验证日期显示效果');

    } catch (error) {
        console.error('❌ 分析失败:', error.message);
    }
}

function getDataTypeDescription(dataType) {
    const types = {
        1: '单行文本',
        2: '多行文本', 
        3: '单选',
        4: '复选',
        5: '下拉选择',
        6: '签名/印章',
        7: '日期控件(自动)',
        8: '图片',
        9: '表格'
    };
    return types[dataType] || '未知类型';
}

// 执行分析
analyzeSigningDateIssues(); 
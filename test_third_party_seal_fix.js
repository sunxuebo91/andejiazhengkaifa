const axios = require('axios');

async function testThirdPartySealFix() {
    console.log('🧪 测试丙方默认印章设置和自动签章修复');
    console.log('='.repeat(80));

    const baseURL = 'http://localhost:3000';
    const contractNo = `TEST_THIRD_PARTY_SEAL_${Date.now()}`;

    try {
        // 1. 创建测试合同
        console.log('\n📄 步骤1: 创建测试合同');
        const contractData = {
            contractNo: contractNo,
            contractName: `测试丙方自动签章-${new Date().toLocaleDateString()}`,
            templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
            templateParams: {
                '客户姓名': '张三测试',
                '客户电话': '13800138000',
                '客户身份证号': '110101199001011234',
                '客户联系地址': '北京市朝阳区测试街道123号',
                '阿姨姓名': '李阿姨',
                '阿姨电话': '13900139000',
                '阿姨身份证号': '110101198001011234',
                '阿姨联系地址': '北京市海淀区测试路456号',
                '服务类型': '住家保姆',
                '服务时间': '全天',
                '服务地址': '客户家中',
                '籍贯': '山东',
                '年龄': '45',
                '性别': '女',
                '开始年': '2025',
                '开始月': '01',
                '开始日': '01',
                '结束年': '2025',
                '结束月': '12',
                '结束日': '31',
                '服务费': '8000',
                '大写服务费': '捌仟',
                '匹配费': '800',
                '匹配费大写': '捌佰',
                '阿姨工资': '7200',
                '阿姨工资大写': '柒仟贰佰',
                '合同备注': '测试丙方自动签章功能',
                '服务备注': '验证企业印章自动签署；测试默认印章设置；检查签章策略配置'
            },
            validityTime: 30,
            signOrder: 1
        };

        const createResponse = await axios.post(`${baseURL}/api/esign/create-contract-template`, contractData);
        
        if (createResponse.data.success) {
            console.log('✅ 合同创建成功');
        } else {
            console.log('❌ 合同创建失败:', createResponse.data.message);
            return;
        }

        // 2. 添加签署人（包含丙方企业用户）
        console.log('\n👥 步骤2: 添加签署人（包含丙方企业用户）');
        
        const signersData = {
            contractNo: contractNo,
            signers: [
                {
                    account: 'test_customer_third_party',
                    name: '张三测试',
                    mobile: '13800138000',
                    signType: 'manual',
                    validateType: 'sms'
                },
                {
                    account: 'test_aunt_third_party',
                    name: '李阿姨',
                    mobile: '13900139000',
                    signType: 'manual',
                    validateType: 'sms'
                },
                {
                    account: 'test_company_third_party', // 丙方企业用户
                    name: '安得家政公司',
                    mobile: '13700137000',
                    signType: 'manual', // 先设置为手动，后续可改为auto测试自动签章
                    validateType: 'sms'
                }
            ],
            signOrder: 'sequential', // 顺序签署，确保丙方最后签署
            templateParams: contractData.templateParams
        };

        console.log('📋 签署人配置:');
        signersData.signers.forEach((signer, index) => {
            console.log(`  ${index + 1}. ${signer.name} (${signer.account})`);
            if (index === 2) {
                console.log('     ⭐ 丙方企业用户 - 将自动设置默认印章');
            }
        });

                 const addSignersResponse = await axios.post(`${baseURL}/api/esign/add-signers-simple`, signersData);
        
        if (addSignersResponse.data.success) {
            console.log('✅ 签署人添加成功');
            
            // 检查返回的签署人配置
            console.log('\n🔍 检查签署人配置结果:');
            if (addSignersResponse.data.data && addSignersResponse.data.data.data) {
                const signersResult = addSignersResponse.data.data.data;
                signersResult.forEach((signer, index) => {
                    console.log(`\n签署人 ${index + 1}: ${signer.account}`);
                    console.log(`  signType: ${signer.signType}`);
                    console.log(`  waterMark: ${signer.waterMark}`);
                    
                    if (signer.signStrategyList && signer.signStrategyList.length > 0) {
                        console.log(`  签章策略:`);
                        signer.signStrategyList.forEach(strategy => {
                            console.log(`    - locationMode: ${strategy.locationMode}`);
                            console.log(`    - signKey: ${strategy.signKey}`);
                            console.log(`    - signType: ${strategy.signType}`);
                            console.log(`    - sealNo: ${strategy.sealNo || '未设置'}`);
                            console.log(`    - canDrag: ${strategy.canDrag}`);
                        });
                        
                        // 特别检查丙方的配置
                        if (index === 2) {
                            const strategy = signer.signStrategyList[0];
                            console.log(`\n  🎯 丙方签章策略验证:`);
                            console.log(`    ✅ signKey: ${strategy.signKey === '丙方签章区' ? '正确' : '错误'} (${strategy.signKey})`);
                            console.log(`    ✅ sealNo: ${strategy.sealNo ? '已设置' : '未设置'} (${strategy.sealNo || 'N/A'})`);
                            console.log(`    ✅ canDrag: ${strategy.canDrag === 0 ? '正确' : '错误'} (${strategy.canDrag})`);
                            console.log(`    ✅ locationMode: ${strategy.locationMode === 4 ? '正确' : '错误'} (${strategy.locationMode})`);
                        }
                    }
                });
            }
        } else {
            console.log('❌ 签署人添加失败:', addSignersResponse.data.message);
            return;
        }

        // 3. 获取合同状态和签署链接
        console.log('\n📊 步骤3: 获取合同状态和签署链接');
        
        const statusResponse = await axios.get(`${baseURL}/api/esign/contract-status/${contractNo}`);
        
        if (statusResponse.data.success) {
            console.log('✅ 合同状态获取成功');
            const contractStatus = statusResponse.data.data;
            
            console.log(`📋 合同状态: ${contractStatus.signStatus || '未知'}`);
            
            if (contractStatus.signUrls && contractStatus.signUrls.length > 0) {
                console.log('\n🔗 签署链接:');
                contractStatus.signUrls.forEach((urlInfo, index) => {
                    console.log(`  ${index + 1}. ${urlInfo.account}: ${urlInfo.signUrl}`);
                    if (index === 2) {
                        console.log('     ⭐ 丙方企业签署链接 - 应该能够自动使用默认印章');
                    }
                });
            }
        } else {
            console.log('❌ 获取合同状态失败:', statusResponse.data.message);
        }

        // 4. 验证修复效果总结
        console.log('\n📝 步骤4: 修复效果验证总结');
        console.log('='.repeat(50));
        
        console.log('\n✅ 已实施的修复:');
        console.log('1. ✅ 添加了 setDefaultSeal 方法');
        console.log('2. ✅ 在丙方签署人配置中自动调用默认印章设置');
        console.log('3. ✅ 在签章策略中添加了 sealNo 参数');
        console.log('4. ✅ 在签章策略中添加了 canDrag: 0 参数');
        console.log('5. ✅ 确保使用正确的 signKey: "丙方签章区"');
        
        console.log('\n🔧 技术细节:');
        console.log('- 默认印章编号: e5a9b6ff9e754771b0c364f68f2c3717');
        console.log('- 签章定位方式: locationMode: 4 (模板坐标签章)');
        console.log('- 签章控件名称: "丙方签章区"');
        console.log('- 签章类型: signType: 1 (签名/签章)');
        console.log('- 位置控制: canDrag: 0 (不允许拖动)');
        
        console.log('\n🧪 测试建议:');
        console.log('1. 使用丙方签署链接进行实际签署测试');
        console.log('2. 检查签署过程中是否自动选择了默认印章');
        console.log('3. 验证签署完成后印章是否正确显示在"丙方签章区"');
        console.log('4. 确认签署日期水印是否正确显示');

        console.log(`\n📄 测试合同编号: ${contractNo}`);
        console.log('💡 可以使用此合同编号进行进一步的签署测试');

        // 5. 可选：测试自动签署模式
        console.log('\n🤖 步骤5: 自动签署模式测试建议');
        console.log('如需测试完全自动签署，可以修改丙方签署人配置:');
        console.log('```javascript');
        console.log('{');
        console.log('  account: "test_company_third_party",');
        console.log('  name: "安得家政公司",');
        console.log('  mobile: "13700137000",');
        console.log('  signType: "auto", // 改为自动签署');
        console.log('  validateType: "none" // 无需验证');
        console.log('}');
        console.log('```');

    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('\n💡 提示: 请确保后端服务正在运行 (端口3000)');
        }
    }
}

// 执行测试
testThirdPartySealFix(); 
const axios = require('axios');

async function analyzeThirdPartyAutoSigningIssue() {
    console.log('🔍 分析丙方不自动签章问题');
    console.log('='.repeat(80));

    try {
        // 1. 首先检查模板中的丙方签章控件配置
        console.log('\n📋 步骤1: 检查模板中的丙方签章控件');
        const templateResponse = await axios.post('http://localhost:3000/api/esign/template/data', {
            templateIdent: 'TNF606E6D81E2D49C99CC983F4D0412276-3387'
        });

        const controls = templateResponse.data.data.data;
        const thirdPartyControls = controls.filter(control => 
            control.dataKey.includes('丙方') && control.dataType === 6
        );

        console.log(`✅ 找到 ${thirdPartyControls.length} 个丙方签章控件:`);
        thirdPartyControls.forEach(control => {
            console.log(`  - ${control.dataKey}`);
            console.log(`    类型: ${control.dataType} (签章控件)`);
            console.log(`    页码: ${control.page}`);
            console.log(`    坐标: (${control.locationX}, ${control.locationY})`);
            console.log(`    签署用户类型: ${control.signUserType} (${control.signUserType === 1 ? '企业签章' : '个人签名'})`);
            console.log(`    必填: ${control.required ? '是' : '否'}`);
            console.log('');
        });

        // 2. 分析当前签章策略实现
        console.log('\n🔧 步骤2: 分析当前丙方签章策略');
        console.log('当前后端实现:');
        console.log('```typescript');
        console.log('} else {');
        console.log('  // 第三个及以后的签署人（企业）');
        console.log('  signKey = "丙方签章区";');
        console.log('}');
        console.log('');
        console.log('signStrategyList.push({');
        console.log('  attachNo: 1,');
        console.log('  locationMode: 4, // 模板坐标签章');
        console.log('  signKey: signKey, // "丙方签章区"');
        console.log('  signType: 1 // 签名/签章');
        console.log('});');
        console.log('```');

        // 3. 分析可能的问题原因
        console.log('\n❓ 步骤3: 分析丙方不自动签章的可能原因');
        console.log('根据官方文档和实际情况，可能的原因包括:');
        console.log('');
        
        console.log('🔍 原因1: 缺少默认印章设置');
        console.log('  - 企业用户需要设置默认印章才能自动签章');
        console.log('  - API: /user/setDefaultSeal');
        console.log('  - 参数: account, sealNo');
        console.log('  - 官方默认章编号: e5a9b6ff9e754771b0c364f68f2c3717');
        console.log('');
        
        console.log('🔍 原因2: 签章策略配置不完整');
        console.log('  - 可能缺少 sealNo 参数');
        console.log('  - 可能缺少 canDrag 参数');
        console.log('  - signType 可能需要调整');
        console.log('');
        
        console.log('🔍 原因3: 企业用户认证问题');
        console.log('  - 企业用户可能未完成认证');
        console.log('  - 企业印章可能未创建或未激活');
        console.log('  - 企业账号权限可能不足');
        console.log('');
        
        console.log('🔍 原因4: 签署顺序和触发机制');
        console.log('  - 丙方可能需要在甲乙方签署完成后才能签署');
        console.log('  - 自动签章可能需要特定的触发条件');
        console.log('  - 签署通知可能未正确发送');

        // 4. 提供解决方案
        console.log('\n💡 步骤4: 解决方案建议');
        console.log('='.repeat(50));
        
        console.log('\n✅ 解决方案1: 设置默认印章');
        console.log('为丙方企业用户设置默认印章:');
        console.log('```javascript');
        console.log('// 设置默认印章的API调用');
        console.log('async function setDefaultSeal(account, sealNo) {');
        console.log('  const response = await axios.post("https://{host}/user/setDefaultSeal", {');
        console.log('    account: account, // 企业用户账号');
        console.log('    sealNo: sealNo || "e5a9b6ff9e754771b0c364f68f2c3717" // 默认章编号');
        console.log('  });');
        console.log('  return response.data;');
        console.log('}');
        console.log('```');
        console.log('');
        
        console.log('✅ 解决方案2: 完善签章策略配置');
        console.log('在签章策略中添加印章相关参数:');
        console.log('```typescript');
        console.log('signStrategyList.push({');
        console.log('  attachNo: 1,');
        console.log('  locationMode: 4, // 模板坐标签章');
        console.log('  signKey: "丙方签章区",');
        console.log('  signType: 1, // 签名/签章');
        console.log('  sealNo: "e5a9b6ff9e754771b0c364f68f2c3717", // 指定印章编号');
        console.log('  canDrag: 0 // 不允许拖动');
        console.log('});');
        console.log('```');
        console.log('');
        
        console.log('✅ 解决方案3: 确保企业用户配置');
        console.log('检查并配置企业用户信息:');
        console.log('```typescript');
        console.log('// 1. 添加企业用户');
        console.log('await addEnterpriseUser({');
        console.log('  account: "company_account",');
        console.log('  name: "安得家政公司",');
        console.log('  idType: "CRED_ORG_USCC", // 统一社会信用代码');
        console.log('  idNumber: "企业信用代码",');
        console.log('  orgLegalIdNumber: "法人身份证号",');
        console.log('  orgLegalName: "法人姓名"');
        console.log('});');
        console.log('');
        console.log('// 2. 创建企业印章');
        console.log('await createEnterpriseSeal({');
        console.log('  account: "company_account",');
        console.log('  sealName: "安得家政公司印章"');
        console.log('});');
        console.log('');
        console.log('// 3. 设置默认印章');
        console.log('await setDefaultSeal("company_account", sealNo);');
        console.log('```');
        console.log('');
        
        console.log('✅ 解决方案4: 调整签署流程');
        console.log('优化签署顺序和自动化流程:');
        console.log('```typescript');
        console.log('// 设置顺序签署，确保丙方在最后签署');
        console.log('signOrder: "sequential", // 顺序签署');
        console.log('');
        console.log('// 或者设置自动签署');
        console.log('signType: 2, // 无感知签约（自动签署）');
        console.log('validateType: 0, // 无需验证');
        console.log('autoSms: 0, // 不发送短信');
        console.log('```');

        // 5. 创建测试用例
        console.log('\n🧪 步骤5: 测试用例建议');
        console.log('='.repeat(50));
        
        console.log('\n测试用例1: 验证默认印章设置');
        console.log('1. 调用 /user/setDefaultSeal 为丙方设置默认印章');
        console.log('2. 验证设置是否成功');
        console.log('3. 查询印章列表确认默认印章');
        console.log('');
        
        console.log('测试用例2: 验证签章策略');
        console.log('1. 创建包含丙方的测试合同');
        console.log('2. 添加丙方签署人时包含完整的签章策略');
        console.log('3. 检查签章策略是否正确应用');
        console.log('');
        
        console.log('测试用例3: 验证自动签署流程');
        console.log('1. 设置丙方为自动签署（signType: 2）');
        console.log('2. 触发签署流程');
        console.log('3. 验证丙方是否自动完成签署');

        // 6. 生成具体的修复代码
        console.log('\n🔧 步骤6: 具体修复代码建议');
        console.log('='.repeat(50));
        
        console.log('\n修复1: 在 ESignService 中添加设置默认印章方法');
        console.log('```typescript');
        console.log('async setDefaultSeal(account: string, sealNo?: string): Promise<any> {');
        console.log('  const bizData = {');
        console.log('    account: account,');
        console.log('    sealNo: sealNo || "e5a9b6ff9e754771b0c364f68f2c3717" // 官方默认章');
        console.log('  };');
        console.log('  ');
        console.log('  return await this.callESignAPI("/user/setDefaultSeal", bizData);');
        console.log('}');
        console.log('```');
        console.log('');
        
        console.log('修复2: 修改 addSimpleContractSigners 方法');
        console.log('```typescript');
        console.log('} else {');
        console.log('  // 第三个及以后的签署人（企业）');
        console.log('  signKey = "丙方签章区";');
        console.log('  ');
        console.log('  // 为企业用户设置默认印章');
        console.log('  try {');
        console.log('    await this.setDefaultSeal(signer.account);');
        console.log('    console.log(`✅ 已为企业用户 ${signer.account} 设置默认印章`);');
        console.log('  } catch (error) {');
        console.log('    console.warn(`⚠️ 设置默认印章失败: ${error.message}`);');
        console.log('  }');
        console.log('}');
        console.log('');
        console.log('signStrategyList.push({');
        console.log('  attachNo: 1,');
        console.log('  locationMode: 4, // 模板坐标签章');
        console.log('  signKey: signKey,');
        console.log('  signType: 1, // 签名/签章');
        console.log('  sealNo: "e5a9b6ff9e754771b0c364f68f2c3717", // 默认印章编号');
        console.log('  canDrag: 0 // 不允许拖动');
        console.log('});');
        console.log('```');

        console.log('\n📊 总结');
        console.log('='.repeat(30));
        console.log('丙方不自动签章的主要原因可能是:');
        console.log('1. ❌ 缺少默认印章设置');
        console.log('2. ❌ 签章策略配置不完整');
        console.log('3. ❌ 企业用户认证未完成');
        console.log('4. ❌ 签署流程配置问题');
        console.log('');
        console.log('建议优先实施:');
        console.log('1. ✅ 添加 setDefaultSeal 方法');
        console.log('2. ✅ 完善签章策略配置');
        console.log('3. ✅ 创建测试用例验证修复效果');

    } catch (error) {
        console.error('❌ 分析失败:', error.response?.data || error.message);
    }
}

// 执行分析
analyzeThirdPartyAutoSigningIssue(); 
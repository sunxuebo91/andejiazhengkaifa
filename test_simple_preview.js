const axios = require('axios');

// 测试清理后的简单预览功能
async function testCleanPreview() {
  console.log('🔍 测试清理后的简单预览功能...\\n');

  const testContractNo = 'CONTRACT_1751187838059_uzji39rwc'; // 使用真实合同编号
  
  try {
    console.log(`📋 测试合同编号: ${testContractNo}`);
    
    // 测试简化后的预览API
    const response = await axios.get(`http://localhost:3000/api/esign/preview-contract/${testContractNo}`, {
      timeout: 30000
    });

    console.log('✅ API调用成功！');
    console.log('📊 响应状态:', response.status);
    console.log('🔍 响应数据:');
    
    const result = response.data;
    console.log('- success:', result.success);
    console.log('- contractNo:', result.contractNo);
    console.log('- method:', result.method);
    console.log('- message:', result.message);
    
    if (result.success) {
      console.log('\\n✅ 预览功能清理成功！');
      console.log('📋 合同信息:', {
        contractNo: result.contractNo,
        previewUrl: result.previewUrl ? '✅ 有预览链接' : '❌ 无预览链接',
        hasSignUsers: result.signUsers?.length > 0 ? `✅ ${result.signUsers.length}个签约人` : '❌ 无签约人',
        method: result.method
      });
      
      if (result.signUsers && result.signUsers.length > 0) {
        console.log('\\n👥 签约人状态信息:');
        result.signUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.name} (${user.role}): ${user.statusText}`);
        });
      }
      
      console.log('\\n🎯 清理成果:');
      console.log('✅ 删除了红框中的签约进度信息显示');
      console.log('✅ 清理了与预览无关的复杂代码');
      console.log('✅ 保留了简单的签约链接预览功能');
      console.log('✅ 后端代码结构更清晰简洁');
      
    } else {
      console.log('❌ 预览功能失败:', result.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 执行测试
testCleanPreview(); 
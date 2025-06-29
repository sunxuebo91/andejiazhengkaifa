// 爱签权限查询脚本
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

// 爱签配置
const config = {
  appId: 'bbc1e38b5c394f8bb4b8c7f4b6dc7d05',
  // 使用正确的完整私钥
  privateKey: `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=`,
  host: 'https://smlopenapi.esign.cn',
  testAccount: 'ASIGN91110111MACJMD2R5J'
};

// 生成爱签API签名
function generateSignature(bizData, timestamp) {
  // 1. 计算bizData的MD5
  const md5Hash = crypto.createHash('md5').update(bizData, 'utf8').digest('hex');
  
  // 2. 构建待签名字符串
  const updateString = bizData + md5Hash + config.appId + timestamp;
  
  // 3. 格式化私钥
  const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${config.privateKey.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
  
  // 4. 生成签名
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(updateString, 'utf8');
  const signature = sign.sign(privateKeyPEM, 'base64').replace(/\r\n/g, '');
  
  return signature;
}

// 调用爱签API
async function callESignAPI(endpoint, bizData) {
  try {
    const bizDataString = JSON.stringify(bizData);
    const timestamp = (Date.now() + 10 * 60 * 1000).toString();
    const signature = generateSignature(bizDataString, timestamp);
    
    const formData = new FormData();
    formData.append('appId', config.appId);
    formData.append('timestamp', timestamp);
    formData.append('bizData', bizDataString);
    
    console.log(`📤 调用API: ${endpoint}`);
    console.log(`  - 参数: ${bizDataString}`);
    console.log(`  - 签名: ${signature.substring(0, 20)}...`);
    
    const response = await axios.post(`${config.host}${endpoint}`, formData, {
      headers: {
        'sign': signature,
        'timestamp': timestamp,
        'Content-Type': formData.getHeaders()['content-type']
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ API调用失败:`, error.response?.data || error.message);
    throw error;
  }
}

// 方式1：直接查询权限状态
async function checkPermissionsDirect() {
  console.log('\n🔍 方式1：直接查询权限状态');
  console.log('='.repeat(50));
  
  try {
    const bizData = {
      account: config.testAccount
    };
    
    const response = await callESignAPI('/permission/query', bizData);
    
    if (response.code === 100000) {
      console.log('✅ 权限查询成功');
      const data = response.data;
      
      console.log('\n📋 权限状态详情:');
      console.log(`  - 自动签署权限: ${data.autoSignEnabled ? '✅ 已开通' : '❌ 未开通'}`);
      console.log(`  - 默认印章权限: ${data.defaultSealPermission ? '✅ 已开通' : '❌ 未开通'}`);
      
      if (data.permissionList && data.permissionList.length > 0) {
        console.log('  - 详细权限列表:');
        data.permissionList.forEach((permission, index) => {
          console.log(`    ${index + 1}. ${permission}`);
        });
      }
      
      return {
        success: true,
        autoSignEnabled: data.autoSignEnabled,
        defaultSealPermission: data.defaultSealPermission,
        permissions: data.permissionList || []
      };
    } else {
      console.log(`❌ 权限查询失败: [${response.code}] ${response.msg}`);
      return { success: false, error: response.msg };
    }
  } catch (error) {
    console.log('❌ 权限查询接口调用失败，可能该接口不存在或无权限访问');
    return { success: false, error: error.message };
  }
}

// 方式2：通过印章信息间接验证权限
async function checkPermissionsBySeal() {
  console.log('\n🔍 方式2：通过印章信息验证权限');
  console.log('='.repeat(50));
  
  try {
    const bizData = {
      account: config.testAccount,
      sealType: '' // 查询所有类型印章
    };
    
    const response = await callESignAPI('/seal/query', bizData);
    
    if (response.code === 100000) {
      console.log('✅ 印章查询成功');
      const sealList = response.data.sealList || [];
      
      console.log(`\n📋 印章列表 (共${sealList.length}个):`);
      
      let hasAutoSignSeal = false;
      let defaultSealInfo = null;
      
      sealList.forEach((seal, index) => {
        const isDefault = seal.isDefault === 1;
        const autoSignEnabled = seal.autoSignEnabled === '1' || seal.autoSignEnabled === 1;
        
        console.log(`  ${index + 1}. ${seal.sealName || '未命名印章'}`);
        console.log(`     - 印章ID: ${seal.sealNo}`);
        console.log(`     - 是否默认: ${isDefault ? '✅ 是' : '❌ 否'}`);
        console.log(`     - 自动签署: ${autoSignEnabled ? '✅ 已开通' : '❌ 未开通'}`);
        console.log(`     - 印章状态: ${seal.sealStatus === 1 ? '正常' : '异常'}`);
        
        if (isDefault) {
          defaultSealInfo = seal;
        }
        
        if (autoSignEnabled) {
          hasAutoSignSeal = true;
        }
      });
      
      console.log('\n📊 权限状态总结:');
      console.log(`  - 拥有自动签署印章: ${hasAutoSignSeal ? '✅ 是' : '❌ 否'}`);
      
      if (defaultSealInfo) {
        const defaultAutoSign = defaultSealInfo.autoSignEnabled === '1' || defaultSealInfo.autoSignEnabled === 1;
        console.log(`  - 默认印章自动签署: ${defaultAutoSign ? '✅ 已开通' : '❌ 未开通'}`);
        
        if (!defaultAutoSign) {
          console.log('\n⚠️ 警告: 默认印章未开通自动签署权限');
          console.log('   需要联系爱签商务开通或设置其他印章为默认');
        }
      } else {
        console.log('  - 默认印章: ❌ 未设置');
        console.log('\n⚠️ 警告: 未设置默认印章，需要先设置默认印章');
      }
      
      return {
        success: true,
        hasAutoSignSeal,
        defaultSealInfo,
        sealList,
        totalSeals: sealList.length
      };
    } else {
      console.log(`❌ 印章查询失败: [${response.code}] ${response.msg}`);
      return { success: false, error: response.msg };
    }
  } catch (error) {
    console.log('❌ 印章查询失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 检查账号状态
async function checkAccountStatus() {
  console.log('\n🔍 方式3：检查账号状态');
  console.log('='.repeat(50));
  
  try {
    const bizData = {
      account: config.testAccount
    };
    
    const response = await callESignAPI('/account/status', bizData);
    
    if (response.code === 100000) {
      console.log('✅ 账号状态查询成功');
      const data = response.data;
      
      console.log('\n📋 账号状态详情:');
      console.log(`  - 账号ID: ${data.account || config.testAccount}`);
      console.log(`  - 账号状态: ${data.status === 1 ? '✅ 正常' : '❌ 异常'}`);
      console.log(`  - 实名状态: ${data.realNameStatus === 1 ? '✅ 已实名' : '❌ 未实名'}`);
      console.log(`  - 账号类型: ${data.accountType === 1 ? '个人' : '企业'}`);
      
      return { success: true, accountData: data };
    } else {
      console.log(`❌ 账号状态查询失败: [${response.code}] ${response.msg}`);
      return { success: false, error: response.msg };
    }
  } catch (error) {
    console.log('❌ 账号状态查询失败，可能该接口不存在');
    return { success: false, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('🚀 开始全面权限查询');
  console.log(`📋 查询账号: ${config.testAccount}`);
  console.log(`🌐 API地址: ${config.host}`);
  console.log('='.repeat(60));
  
  const results = {
    permissionQuery: null,
    sealQuery: null,
    accountQuery: null
  };
  
  // 执行所有查询
  results.permissionQuery = await checkPermissionsDirect();
  results.sealQuery = await checkPermissionsBySeal();
  results.accountQuery = await checkAccountStatus();
  
  // 综合分析结果
  console.log('\n📊 综合分析结果');
  console.log('='.repeat(60));
  
  let canAutoSign = false;
  let issues = [];
  
  // 分析权限查询结果
  if (results.permissionQuery?.success) {
    if (results.permissionQuery.autoSignEnabled) {
      console.log('✅ 权限查询：自动签署权限已开通');
      canAutoSign = true;
    } else {
      console.log('❌ 权限查询：自动签署权限未开通');
      issues.push('需要联系爱签商务开通自动签署权限');
    }
  } else {
    console.log('⚠️ 权限查询：接口调用失败，使用印章查询结果');
  }
  
  // 分析印章查询结果
  if (results.sealQuery?.success) {
    if (results.sealQuery.hasAutoSignSeal) {
      console.log('✅ 印章查询：存在可自动签署的印章');
      if (!canAutoSign) canAutoSign = true;
    } else {
      console.log('❌ 印章查询：没有可自动签署的印章');
      issues.push('需要开通印章自动签署权限或设置默认印章');
    }
    
    if (!results.sealQuery.defaultSealInfo) {
      issues.push('需要设置默认印章');
    }
  }
  
  // 最终结论
  console.log('\n🎯 最终结论:');
  if (canAutoSign && issues.length === 0) {
    console.log('✅ 权限状态正常，可以使用自动签署功能');
  } else {
    console.log('❌ 权限状态异常，需要处理以下问题:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log('\n📞 联系信息:');
    console.log('   - 需要提供给爱签商务的信息:');
    console.log(`     * 账号ID: ${config.testAccount}`);
    console.log('     * 开通权限: DEFAULT_SEAL_AUTO_SIGN');
    console.log('     * 环境: 测试环境(test)');
  }
  
  console.log('\n🔍 权限查询完成');
}

// 运行查询
main().catch(console.error); 
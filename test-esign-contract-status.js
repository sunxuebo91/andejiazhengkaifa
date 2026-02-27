/**
 * 测试爱签合同状态查询
 */

const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

const ESIGN_APP_ID = '141496759';
const ESIGN_HOST = 'https://oapi.asign.cn';
const ESIGN_PRIVATE_KEY = `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=`;

// 生成签名（按照后端的官方实现）
function generateSignature(appId, privateKey, bizDataString, timestamp) {
  // 1. 计算bizDataString的MD5哈希值
  const md5Hash = crypto.createHash('md5').update(bizDataString, 'utf8').digest('hex');

  // 2. 构建待签名字符串：bizDataString + md5(bizDataString) + appId + timestamp
  const updateString = bizDataString + md5Hash + appId + timestamp;

  console.log('签名调试信息:');
  console.log('- bizDataString:', bizDataString);
  console.log('- md5Hash:', md5Hash);
  console.log('- updateString:', updateString);

  // 3. 准备私钥
  const cleanPrivateKey = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\r?\n/g, '')
    .replace(/\s/g, '');

  const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`;

  // 4. 使用SHA1withRSA算法签名
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(updateString, 'utf8');
  const signature = sign.sign(privateKeyPEM, 'base64');

  // 5. 移除签名中的换行符
  const finalSignature = signature.replace(/\r\n/g, '');

  console.log('- 最终签名:', finalSignature.substring(0, 50) + '...');

  return finalSignature;
}

// 查询合同状态
async function queryContractStatus(contractNo) {
  try {
    console.log(`🔍 查询合同状态: ${contractNo}`);
    
    const bizData = { contractNo };
    const bizDataString = JSON.stringify(bizData);
    const timestamp = (Date.now() + 10 * 60 * 1000).toString();
    
    const signature = generateSignature(ESIGN_APP_ID, ESIGN_PRIVATE_KEY, bizDataString, timestamp);
    
    const formData = new FormData();
    formData.append('appId', ESIGN_APP_ID);
    formData.append('timestamp', timestamp);
    formData.append('bizData', bizDataString);
    
    const response = await axios.post(
      `${ESIGN_HOST}/contract/queryContract`,
      formData,
      {
        headers: {
          'sign': signature,
          ...formData.getHeaders()
        }
      }
    );
    
    console.log('📊 爱签API响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data.code === 100000) {
      console.log('✅ 合同存在');
      console.log('   - 合同状态:', response.data.data?.status);
      console.log('   - 合同名称:', response.data.data?.contractName);
    } else {
      console.log('❌ 查询失败');
      console.log('   - 错误码:', response.data.code);
      console.log('   - 错误信息:', response.data.msg);
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    if (error.response) {
      console.error('   - 响应状态:', error.response.status);
      console.error('   - 响应数据:', error.response.data);
    }
    throw error;
  }
}

// 执行测试
const contractNo = process.argv[2] || 'CON97972069144';
queryContractStatus(contractNo);


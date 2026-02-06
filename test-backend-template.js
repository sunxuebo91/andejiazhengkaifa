const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

// 配置
const appId = '141496759';
const privateKey = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
const host = 'https://oapi.asign.cn';
const templateNo = 'TN84E8C106BFE74FD3AE36AC2CA33A44DE';

// 生成签名
function generateSignature(appId, privateKey, dataString, timestamp) {
  try {
    const md5Hash = crypto.createHash('md5').update(dataString, 'utf8').digest('hex');
    const updateString = dataString + md5Hash + appId + timestamp;
    
    let cleanPrivateKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
      .replace(/-----END RSA PRIVATE KEY-----/g, '')
      .replace(/\r?\n/g, '')
      .replace(/\s/g, '');
    
    const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`;
    const sign = crypto.createSign('RSA-SHA1');
    sign.update(updateString, 'utf8');
    const signature = sign.sign(privateKeyPEM, 'base64');
    
    return signature.replace(/\r\n/g, '');
  } catch (error) {
    console.error('签名生成失败:', error);
    throw error;
  }
}

// 测试新模板编号
async function testNewTemplate() {
  try {
    console.log('\n=== 测试新模板编号 ===');
    console.log('模板编号:', templateNo);
    console.log('应用ID:', appId);
    
    const bizData = { templateIdent: templateNo };
    const sortedBizData = Object.keys(bizData).sort().reduce((obj, key) => {
      obj[key] = bizData[key];
      return obj;
    }, {});
    const bizDataString = JSON.stringify(sortedBizData);
    const timestamp = (Date.now() + 10 * 60 * 1000).toString();
    const sign = generateSignature(appId, privateKey, bizDataString, timestamp);
    
    const formData = new FormData();
    formData.append('appId', appId);
    formData.append('timestamp', timestamp);
    formData.append('bizData', bizDataString);
    
    const response = await axios.post(`${host}/template/data`, formData, {
      headers: {
        'sign': sign,
        'timestamp': timestamp,
        ...formData.getHeaders()
      }
    });
    
    if (response.data.code === 100000) {
      console.log('\n✅ 新模板编号有效！');
      console.log('字段数量:', response.data.data?.length || 0);
      console.log('\n前5个字段:');
      response.data.data.slice(0, 5).forEach((field, index) => {
        console.log(`${index + 1}. ${field.dataKey} (类型: ${field.dataType}, 必填: ${field.required ? '是' : '否'})`);
      });
      return true;
    } else {
      console.log('\n❌ 模板编号无效');
      console.log('错误信息:', response.data.msg);
      return false;
    }
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// 运行测试
testNewTemplate().then(success => {
  process.exit(success ? 0 : 1);
});


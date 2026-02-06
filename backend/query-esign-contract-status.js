/**
 * 查询爱签合同的真实状态
 * 使用爱签官方API: /contract/status
 */

const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
require('dotenv').config();

const contractNo = 'CONTRACT_1770341803997_7uy0hwd34';

// 爱签配置
const config = {
  appId: process.env.ESIGN_APP_ID || '141496759',
  host: process.env.ESIGN_HOST || 'https://prev.asign.cn',
  privateKey: process.env.ESIGN_PRIVATE_KEY,
};

async function queryContractStatus() {
  try {
    console.log('🔍 查询爱签合同状态...');
    console.log(`合同编号: ${contractNo}\n`);

    // 请求数据
    const requestData = {
      contractNo: contractNo
    };

    // 生成签名
    const timestamp = Date.now() + 600 * 1000;
    const jsonData = JSON.stringify(requestData, null, 0);
    const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');
    const signStr = jsonData + md5Hash + config.appId + timestamp;
    
    const signer = crypto.createSign('sha1');
    signer.update(signStr);
    signer.end();
    
    // 格式化私钥
    const privateKeyBase64 = config.privateKey.replace(/\s+/g, '');
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
    const signature = signer.sign({ key: privateKeyPem, format: 'pem' }, 'base64');
    
    // 构建表单数据
    const formData = new FormData();
    formData.append('bizData', jsonData);
    formData.append('appId', config.appId);
    formData.append('timestamp', timestamp.toString());
    
    const headers = { 
      'sign': signature, 
      ...formData.getHeaders() 
    };
    
    console.log('📤 发送请求到爱签API...');
    const response = await axios.post(
      `${config.host}/contract/status`,
      formData,
      { headers: headers, timeout: 30000 }
    );

    console.log('📥 爱签API响应:\n');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.data.code === 100000) {
      const status = response.data.data.status;
      const statusMap = {
        0: '等待签约',
        1: '签约中',
        2: '已签约',
        3: '过期',
        4: '拒签',
        6: '作废',
        7: '撤销'
      };
      
      console.log('✅ 查询成功！');
      console.log(`合同状态: ${status} (${statusMap[status] || '未知'})`);
      console.log('');
      
      if (status === 2) {
        console.log('🎉 合同已签约！但是本地数据库状态还是 draft');
        console.log('💡 这说明爱签回调没有触发，需要手动同步状态');
      } else if (status === 1) {
        console.log('⚠️  合同还在签约中，请确认是否真的完成了签约');
      }
    } else {
      console.error('❌ 查询失败:', response.data.msg);
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

queryContractStatus();


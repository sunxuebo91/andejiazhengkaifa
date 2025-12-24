/**
 * 直接测试 WechatCloudService
 */

const fs = require('fs');
const path = require('path');

// 手动读取 .env 文件
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

console.log('🧪 测试 WechatCloudService\n');

// 模拟 NestJS 的 Logger
class MockLogger {
  log(message) {
    console.log('📝 [LOG]', message);
  }
  
  warn(message) {
    console.log('⚠️  [WARN]', message);
  }
  
  error(message) {
    console.log('❌ [ERROR]', message);
  }
}

// 模拟 ConfigService
class MockConfigService {
  get(key) {
    const config = {
      'MINIPROGRAM_APPID': process.env.MINIPROGRAM_APPID,
      'MINIPROGRAM_APPSECRET': process.env.MINIPROGRAM_APPSECRET,
      'MINIPROGRAM_CLOUD_ENV': process.env.MINIPROGRAM_CLOUD_ENV,
    };
    return config[key];
  }
}

// 导入 WechatCloudService 的代码
const https = require('https');

class WechatCloudService {
  constructor(configService, logger) {
    this.configService = configService;
    this.logger = logger;
    this.accessTokenCache = null;
    
    const appId = this.configService.get('MINIPROGRAM_APPID');
    const appSecret = this.configService.get('MINIPROGRAM_APPSECRET');
    const cloudEnv = this.configService.get('MINIPROGRAM_CLOUD_ENV');

    if (!appId || !appSecret || !cloudEnv) {
      this.logger.warn('⚠️ 小程序配置不完整，云函数调用功能将不可用');
      this.logger.warn(`   AppID: ${appId ? '已配置' : '未配置'}`);
      this.logger.warn(`   AppSecret: ${appSecret && appSecret !== 'your_miniprogram_secret_here' ? '已配置' : '未配置'}`);
      this.logger.warn(`   CloudEnv: ${cloudEnv ? '已配置' : '未配置'}`);
      return;
    }

    this.appId = appId;
    this.appSecret = appSecret;
    this.cloudEnv = cloudEnv;

    this.logger.log(`✅ 微信云函数服务初始化完成 - AppID: ${this.appId}`);
  }

  async getAccessToken() {
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      this.logger.log('🔄 使用缓存的access_token');
      return this.accessTokenCache.token;
    }

    this.logger.log('🔑 获取小程序access_token');

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;

    const data = await this.httpsGet(url);

    if (data.errcode) {
      throw new Error(`获取access_token失败: ${data.errmsg} (${data.errcode})`);
    }

    this.accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    this.logger.log('✅ 成功获取access_token');
    return data.access_token;
  }

  async sendCustomerAssignNotification(notificationData) {
    if (!this.appId || !this.appSecret || !this.cloudEnv) {
      this.logger.warn('⚠️ 小程序AppSecret未配置，跳过通知发送');
      return;
    }

    try {
      this.logger.log(`📱 调用云函数发送通知 - 被分配人: ${notificationData.assignedToId}`);

      const accessToken = await this.getAccessToken();

      const cloudFunctionData = {
        type: 'sendCustomerAssignNotify',
        notificationData: notificationData,
      };

      const url = `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${accessToken}&env=${this.cloudEnv}&name=quickstartFunctions`;

      const result = await this.httpsPost(url, cloudFunctionData);

      if (result.errcode && result.errcode !== 0) {
        throw new Error(`云函数调用失败: ${result.errmsg} (${result.errcode})`);
      }

      this.logger.log('✅ 云函数调用成功');
      this.logger.log(`   响应: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`发送通知失败: ${error.message}`);
      throw error;
    }
  }

  httpsGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        });
      }).on('error', reject);
    });
  }

  httpsPost(url, postData) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(postData);
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

// 运行测试
async function runTest() {
  console.log('📋 环境变量:');
  console.log('   MINIPROGRAM_APPID:', process.env.MINIPROGRAM_APPID);
  console.log('   MINIPROGRAM_APPSECRET:', process.env.MINIPROGRAM_APPSECRET ? '已配置' : '未配置');
  console.log('   MINIPROGRAM_CLOUD_ENV:', process.env.MINIPROGRAM_CLOUD_ENV);
  console.log('');

  const logger = new MockLogger();
  const configService = new MockConfigService();
  const service = new WechatCloudService(configService, logger);

  console.log('\n🚀 开始测试发送通知...\n');

  const notificationData = {
    assignedToId: '6848f5e2809126015584f13d',
    customerName: '测试客户',
    source: '手动分配',
    assignerName: '测试管理员',
    customerId: '6847fa0e6798cab487d828f1',
    assignTime: new Date().toISOString(),
  };

  try {
    await service.sendCustomerAssignNotification(notificationData);
    console.log('\n✅ 测试完成！');
  } catch (error) {
    console.log('\n❌ 测试失败:', error.message);
  }
}

runTest();


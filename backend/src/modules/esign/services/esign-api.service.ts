import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { AppLogger } from '../../../common/logging/app-logger';

// API通用响应接口
export interface ESignResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// 爱签OpenAPI配置接口
export interface ESignConfig {
  type: string; // API类型: 'openapi' | 'saasapi'
  appId: string;
  publicKey: string; // 爱签提供的公钥，用于验证回调
  privateKey?: string; // 商户私钥，用于签名请求（OpenAPI必需）
  privateKeyPath?: string; // 私钥文件路径
  host: string;
  version: string;
  notifyUrl: string;
}

@Injectable()
export class ESignApiService {
  private readonly logger = new AppLogger(ESignApiService.name);
  axiosInstance: AxiosInstance;
  config: ESignConfig;

  constructor(private configService: ConfigService) {
    // 爱签OpenAPI配置 - 使用正确的域名

    this.config = {
      type: 'openapi',
      appId: this.configService.get<string>('ESIGN_APP_ID', '141496759'),
      publicKey: this.configService.get<string>('ESIGN_PUBLIC_KEY', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjkWacvkz1GQnZtln/YqkaemCdiBNpM39XPY2Tcev3ZEBlrW8fradWAT2HgtbAL/+zo07KMEUSd9fHVGdUzjbZOfcmY/JQhbZEXud3w250CpN5luK1XhQZ+KUP8mtnRDPo2TnYyykx1jbVA+3MlZeKmoLF/vEwqBQSfZT8qTNIprxdVnLC7/VoJCA/fo7w9DX2uF0kxEEs0tQK6BJl/Xjl/O8k2EzBWTY9DnLg1H/In8IXM9UKGtpPTQDIVCvRo8PuFyOz/BVI/ttOdQPchbti6aIi5w5Osvp2wkplt1myU+fbtYzc/7Broxui4rWEAsyiSERrPBRmzUgO6dDII38iQIDAQAB'),
      privateKey: this.configService.get<string>('ESIGN_PRIVATE_KEY'),
      privateKeyPath: this.configService.get<string>('ESIGN_PRIVATE_KEY_PATH'),
      host: this.configService.get<string>('ESIGN_HOST', 'https://oapi.asign.cn'), // 从环境变量获取域名
      version: this.configService.get<string>('ESIGN_VERSION', 'v1'),
      notifyUrl: this.configService.get<string>('ESIGN_NOTIFY_URL', 'https://crm.andejiazheng.com/api/esign/callback'),
    };

    // 优先从私钥文件读取
    const privateKeyPath = this.config.privateKeyPath;
    if (privateKeyPath) {
      try {
        const keyPath = path.resolve(privateKeyPath);
        if (fs.existsSync(keyPath)) {
          this.config.privateKey = fs.readFileSync(keyPath, 'utf8');
          this.logger.log('esign.private_key.loaded_from_file', { keyPath });
        } else {
          this.logger.warn('esign.private_key.file_missing', { keyPath });
        }
      } catch (error) {
        this.logger.error('esign.private_key.file_read_failed', error);
      }
    }

    // 如果文件读取失败，尝试使用环境变量
    if (!this.config.privateKey) {
      const envPrivateKey = this.configService.get<string>('ESIGN_PRIVATE_KEY');
      if (envPrivateKey && envPrivateKey.trim() !== '') {
        this.config.privateKey = envPrivateKey;
        this.logger.log('esign.private_key.loaded_from_env');
      }
    }

    // 私钥未配置时记录错误，服务将无法正常签名
    if (!this.config.privateKey) {
      this.logger.error('esign.private_key.not_configured', undefined, {
        hint: '请配置 ESIGN_PRIVATE_KEY 环境变量或 ESIGN_PRIVATE_KEY_PATH 指向私钥文件',
      });
    }

    this.logger.info('esign.config.loaded', {
      type: this.config.type,
      appId: this.config.appId,
      host: this.config.host,
      hasPrivateKey: !!this.config.privateKey,
      privateKeyLength: this.config.privateKey?.length || 0,
      isPemFormat: this.config.privateKey?.includes('-----BEGIN') || false
    });

    // 创建简单的axios实例（不使用拦截器）
    this.axiosInstance = axios.create({
      baseURL: this.config.host,
      timeout: 30000,
    });

    // 添加简单的响应拦截器用于日志
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug('esign.api.response', { data: response.data });
        return response;
      },
      (error) => {
        this.logger.error('esign.api.error', error, {
          response: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 将 this.config.privateKey（Base64 或 PEM 格式）统一转为 PEM 格式私钥字符串
   */
  getPrivateKeyPem(): string {
    const cleanKey = this.config.privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
      .replace(/-----END RSA PRIVATE KEY-----/g, '')
      .replace(/\r?\n/g, '')
      .replace(/\s/g, '');
    return `-----BEGIN PRIVATE KEY-----\n${cleanKey.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
  }

  /**
   * 通用爱签API调用方法（基于官方Java Demo规范）
   */
  async callESignAPI(uri: string, bizData: any): Promise<any> {
    try {
      // 1. 准备参数
      const appId = this.config.appId;
      const privateKey = this.config.privateKey;

      if (!appId || !privateKey) {
        throw new Error('爱签配置不完整，缺少appId或privateKey');
      }

      // 2. 处理bizData - 按字母排序（官方要求）
      const sortedBizData = this.sortObjectKeys(bizData);
      const bizDataString = JSON.stringify(sortedBizData);

      // 3. 生成13位时间戳（当前时间 + 10分钟）
      const timestamp = (Date.now() + 10 * 60 * 1000).toString();

      this.logger.debug('🔐 [callESignAPI] 签名前数据:');
      this.logger.debug('  - URI:', { data: uri });
      this.logger.debug('  - appId:', { data: appId });
      this.logger.debug('  - timestamp:', { data: timestamp });
      this.logger.debug('  - bizDataString (前100字符):', { data: bizDataString.substring(0, 100) });

      // 4. 生成签名
      const sign = this.generateOfficialSignature(appId, privateKey, bizDataString, timestamp);

      this.logger.debug('  - 生成的签名 (前50字符):', { data: sign.substring(0, 50) });

             // 5. 构建FormData请求
       const formData = new FormData();
       formData.append('appId', appId);
       formData.append('timestamp', timestamp);
       formData.append('bizData', bizDataString);

       // 6. 发送请求
       const response = await this.axiosInstance.post(uri, formData, {
         headers: {
           'sign': sign,
           'timestamp': timestamp,
           'Content-Type': formData.getHeaders()['content-type']
         }
       });

      this.logger.debug('✅ [callESignAPI] 请求成功，响应码:', { data: response.data?.code });
      return response.data;
    } catch (error) {
      this.logger.error('❌ [callESignAPI] 爱签API调用失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 生成官方签名（基于Java官方实现）
   * @param appId 接入者APPID
   * @param privateKey 用户私钥（Base64编码的PKCS8格式）
   * @param dataString 请求参数JSON字符串
   * @param timestamp 时间戳
   * @returns 签名字符串
   */
  generateOfficialSignature(appId: string, privateKey: string, dataString: string, timestamp: string): string {
    try {
      // 1. 计算dataString的MD5哈希值
      const md5Hash = crypto.createHash('md5').update(dataString, 'utf8').digest('hex');

      // 2. 构建待签名字符串：dataString + md5(dataString) + appId + timestamp
      const updateString = dataString + md5Hash + appId + timestamp;

      this.logger.debug('🔐 [generateOfficialSignature] 签名算法调试信息:');
      this.logger.debug('  - appId:', { data: appId });
      this.logger.debug('  - timestamp:', { data: timestamp });
      this.logger.debug('  - dataString (前200字符):', { data: dataString.substring(0, 200) });
      this.logger.debug('  - dataString 长度:', { data: dataString.length });
      this.logger.debug('  - md5Hash:', { data: md5Hash });
      this.logger.debug('  - updateString (前200字符):', { data: updateString.substring(0, 200) });
      this.logger.debug('  - updateString 长度:', { data: updateString.length });

      // 3. 准备私钥
      // 清理私钥格式，移除头尾标识和换行符
      let cleanPrivateKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
        .replace(/-----END RSA PRIVATE KEY-----/g, '')
        .replace(/\r?\n/g, '')
        .replace(/\s/g, '');

      this.logger.debug('  - 清理后的私钥长度:', { data: cleanPrivateKey.length });
      this.logger.debug('  - 私钥前50字符:', { data: cleanPrivateKey.substring(0, 50) });

      // 4. 构建完整的PKCS8格式私钥
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`;

      // 5. 使用SHA1withRSA算法签名
      const sign = crypto.createSign('RSA-SHA1');
      sign.update(updateString, 'utf8');
      const signature = sign.sign(privateKeyPEM, 'base64');

      // 6. 移除签名中的换行符（按照Java实现）
      const finalSignature = signature.replace(/\r\n/g, '').replace(/\n/g, '');

      this.logger.debug('  - 签名长度:', { data: finalSignature.length });
      this.logger.debug('  - 最终签名 (前100字符):', { data: finalSignature.substring(0, 100) });

      return finalSignature;
    } catch (error) {
      this.logger.error('❌ [generateOfficialSignature] 签名生成失败详细信息:', error);
      throw new Error(`签名生成失败: ${error.message}`);
    }
  }

  /**
   * 官方NetSignUtils.getSign签名算法实现
   */
  generateOfficialSign(appId: string, privateKey: string, dataString: string, timestamp: string): string {

    try {
      // 1. 计算dataString的MD5值
      const md5Hash = crypto.createHash('md5').update(dataString, 'utf8').digest('hex');
      this.logger.debug('🔐 MD5 hash:', { data: md5Hash });

      // 2. 构建签名字符串：dataString + md5(dataString) + appId + timestamp
      const signString = dataString + md5Hash + appId + timestamp;
      this.logger.debug('🔐 Sign string length:', { data: signString.length });

      // 3. 格式化私钥为PEM格式
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKey.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

      // 4. 使用SHA1withRSA算法进行签名
      const sign = crypto.createSign('sha1');
      sign.update(signString, 'utf8');
      sign.end();

      const signature = sign.sign(privateKeyPem, 'base64');

      // 5. 移除换行符
      const cleanSignature = signature.replace(/\r\n/g, '');

      return cleanSignature;
    } catch (error) {
      this.logger.error('🚨 官方签名生成失败:', error);
      throw new Error(`签名生成失败: ${error.message}`);
    }
  }

  /**
   * 官方NetSignUtils.addTextValue实现
   */
  addTextValue(name: string, value: string, boundary: string): string {
    return `--${boundary}\r\n` +
           `Content-Disposition: form-data; name="${name}"\r\n` +
           `\r\n` +
           `${value}\r\n`;
  }

  /**
   * 对象键按字母排序（官方要求）
   */
  sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const sortedKeys = Object.keys(obj).sort();
      const sortedObj = {};
      sortedKeys.forEach(key => {
        sortedObj[key] = this.sortObjectKeys(obj[key]);
      });
      return sortedObj;
    }

    return obj;
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; config: any }> {
    try {
      this.logger.info('esign.connection_test.start', {
        appId: this.config.appId,
        host: this.config.host,
        hasPrivateKey: !!this.config.privateKey,
        privateKeyLength: this.config.privateKey?.length || 0,
        privateKeyType: typeof this.config.privateKey,
        privateKeyExists: this.config.privateKey !== undefined,
        privateKeyEmpty: this.config.privateKey === '',
        privateKeyNull: this.config.privateKey === null,
        privateKeyPreview: this.config.privateKey?.substring(0, 50) || 'NO_KEY'
      });

      // 测试基本的API连接
      const response = await this.axiosInstance.get('/v1/accounts/verify');

      return {
        success: true,
        message: 'API连接成功',
        config: {
          appId: this.config.appId,
          host: this.config.host,
          hasPrivateKey: !!this.config.privateKey,
          privateKeyLength: this.config.privateKey?.length || 0,
          privateKeyType: typeof this.config.privateKey,
          privateKeyExists: this.config.privateKey !== undefined,
          privateKeyEmpty: this.config.privateKey === '',
          privateKeyNull: this.config.privateKey === null,
          privateKeyPreview: this.config.privateKey?.substring(0, 50) || 'NO_KEY',
          response: response.data
        }
      };
    } catch (error) {
      this.logger.error('esign.connection_test.failed', error);
      return {
        success: false,
        message: `API连接失败: ${error.response?.data?.message || error.message}`,
        config: {
          appId: this.config.appId,
          host: this.config.host,
          hasPrivateKey: !!this.config.privateKey,
          privateKeyLength: this.config.privateKey?.length || 0,
          error: error.response?.data || error.message
        }
      };
    }
  }
}

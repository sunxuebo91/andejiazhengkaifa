import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// 爱签OpenAPI配置接口
interface ESignConfig {
  type: string; // API类型: 'openapi' | 'saasapi'
  appId: string;
  publicKey: string; // 爱签提供的公钥，用于验证回调
  privateKey?: string; // 商户私钥，用于签名请求（OpenAPI必需）
  privateKeyPath?: string; // 私钥文件路径
  host: string;
  version: string;
  notifyUrl: string;
}

// 签署参数接口
interface SignRequest {
  contractId: string;
  documentTitle: string;
  signers: Array<{
    name: string;
    mobile: string;
    signType: 'PERSONAL' | 'COMPANY';
    signAction: 'SIGN' | 'APPROVAL';
  }>;
  signFlowConfig?: {
    signType: 'SEQUENTIAL' | 'PARALLEL'; // 顺序签署或并行签署
    deadline?: string; // 签署截止时间
    notifyUrl?: string; // 回调地址
  };
}

// API响应接口
interface ESignResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

@Injectable()
export class ESignService {
  private readonly logger = new Logger(ESignService.name);
  private axiosInstance: AxiosInstance;
  private config: ESignConfig;

  constructor(private configService: ConfigService) {
    // 爱签OpenAPI配置 - 使用正确的域名
    const defaultPrivateKey = `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=`;

    this.config = {
      type: 'openapi',
      appId: this.configService.get<string>('ESIGN_APP_ID', '141496759'),
      publicKey: this.configService.get<string>('ESIGN_PUBLIC_KEY', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjkWacvkz1GQnZtln/YqkaemCdiBNpM39XPY2Tcev3ZEBlrW8fradWAT2HgtbAL/+zo07KMEUSd9fHVGdUzjbZOfcmY/JQhbZEXud3w250CpN5luK1XhQZ+KUP8mtnRDPo2TnYyykx1jbVA+3MlZeKmoLF/vEwqBQSfZT8qTNIprxdVnLC7/VoJCA/fo7w9DX2uF0kxEEs0tQK6BJl/Xjl/O8k2EzBWTY9DnLg1H/In8IXM9UKGtpPTQDIVCvRo8PuFyOz/BVI/ttOdQPchbti6aIi5w5Osvp2wkplt1myU+fbtYzc/7Broxui4rWEAsyiSERrPBRmzUgO6dDII38iQIDAQAB'),
      privateKey: this.configService.get<string>('ESIGN_PRIVATE_KEY'),
      privateKeyPath: this.configService.get<string>('ESIGN_PRIVATE_KEY_PATH'),
      host: 'https://prev.asign.cn', // 开发环境域名
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
          console.log('✅ 成功从文件加载私钥:', keyPath);
        } else {
          console.warn('⚠️ 私钥文件不存在:', keyPath);
        }
      } catch (error) {
        console.error('❌ 读取私钥文件失败:', error.message);
      }
    }

    // 如果文件读取失败，尝试使用环境变量
    if (!this.config.privateKey) {
      const envPrivateKey = this.configService.get<string>('ESIGN_PRIVATE_KEY');
      if (envPrivateKey && envPrivateKey.trim() !== '') {
        this.config.privateKey = envPrivateKey;
        console.log('✅ 使用环境变量私钥');
      }
    }

    // 最后使用默认私钥（转换为PEM格式）
    if (!this.config.privateKey) {
      this.config.privateKey = defaultPrivateKey;
      console.log('⚠️ 使用内置默认私钥（Base64格式）');
    }

    console.log('🔍 爱签配置状态:', {
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
        console.log('爱签API响应:', response.data);
        return response;
      },
      (error) => {
        console.error('爱签API错误:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }



  /**
   * 获取调试配置信息
   */
  getDebugConfig() {
    return {
      type: this.config.type,
      appId: this.config.appId,
      host: this.config.host,
      hasPublicKey: !!this.config.publicKey,
      hasPrivateKey: !!this.config.privateKey,
      privateKeyLength: this.config.privateKey?.length || 0,
      privateKeyStart: this.config.privateKey?.substring(0, 50) || 'None',
      notifyUrl: this.config.notifyUrl
    };
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; config: any }> {
    try {
      console.log('🚀 开始测试API连接');
      console.log('🔑 私钥原始值:', typeof this.config.privateKey, this.config.privateKey?.length);
      console.log('🔑 私钥布尔值:', !!this.config.privateKey);
      console.log('🔑 私钥开头:', this.config.privateKey?.substring(0, 30));
      
      console.log('测试API连接，当前配置:', {
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
      console.error('API连接测试失败:', error);
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

  /**
   * 上传合同文档
   */
  async uploadDocument(fileBuffer: Buffer, fileName: string): Promise<string> {
    try {
      console.log('开始上传文档:', fileName, '大小:', fileBuffer.length);
      
      // 如果没有私钥，返回模拟的文件ID
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟上传');
        return `mock_file_${Date.now()}`;
      }

      // 1. 获取文件上传地址
      const uploadUrlResponse = await this.axiosInstance.post<ESignResponse<{ uploadUrl: string; fileId: string }>>(
        '/v1/files/getUploadUrl',
        {
          fileName,
          fileSize: fileBuffer.length,
          contentType: 'application/pdf',
        }
      );

      if (uploadUrlResponse.data.code !== 0) {
        throw new BadRequestException(`获取上传地址失败: ${uploadUrlResponse.data.message}`);
      }

      const { uploadUrl, fileId } = uploadUrlResponse.data.data;

      // 2. 上传文件到获取的地址
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      return fileId;
    } catch (error) {
      console.error('上传文档失败:', error);
      throw new BadRequestException(`上传文档失败: ${error.message}`);
    }
  }

  /**
   * 创建签署流程
   */
  async createSignFlow(signRequest: SignRequest): Promise<{ signFlowId: string; signUrl: string }> {
    try {
      console.log('创建签署流程:', signRequest);
      
      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟创建签署流程');
        const mockSignFlowId = `mock_flow_${Date.now()}`;
        return {
          signFlowId: mockSignFlowId,
          signUrl: `https://mock-esign.com/sign/${mockSignFlowId}`
        };
      }

      const response = await this.axiosInstance.post<ESignResponse<{ signFlowId: string }>>(
        '/v1/signflows',
        {
          businessScene: 'CONTRACT_SIGN', // 业务场景
          signFlowTitle: signRequest.documentTitle,
          signFlowType: signRequest.signFlowConfig?.signType || 'SEQUENTIAL',
          signers: signRequest.signers.map((signer, index) => ({
            signerType: signer.signType,
            signerName: signer.name,
            signerMobile: signer.mobile,
            signAction: signer.signAction,
            signOrder: index + 1, // 签署顺序
          })),
          documents: [
            {
              fileId: signRequest.contractId, // 这里应该是上传后的文件ID
              fileName: signRequest.documentTitle,
            },
          ],
          signFlowConfig: {
            signType: signRequest.signFlowConfig?.signType || 'SEQUENTIAL',
            deadline: signRequest.signFlowConfig?.deadline,
            callbackUrl: this.config.notifyUrl,
          },
        }
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`创建签署流程失败: ${response.data.message}`);
      }

      const signFlowId = response.data.data.signFlowId;

      // 获取签署链接
      const signUrlResponse = await this.axiosInstance.post<ESignResponse<{ signUrl: string }>>(
        `/v1/signflows/${signFlowId}/signers/signUrl`,
        {
          signerMobile: signRequest.signers[0].mobile, // 第一个签署人
          signType: 'REDIRECT', // 重定向模式
          callbackUrl: this.config.notifyUrl,
        }
      );

      if (signUrlResponse.data.code !== 0) {
        throw new BadRequestException(`获取签署链接失败: ${signUrlResponse.data.message}`);
      }

      return {
        signFlowId,
        signUrl: signUrlResponse.data.data.signUrl,
      };
    } catch (error) {
      console.error('创建签署流程失败:', error);
      throw new BadRequestException(`创建签署流程失败: ${error.message}`);
    }
  }

  /**
   * 查询签署流程状态
   */
  async getSignFlowStatus(signFlowId: string): Promise<{ status: string; documents: any[] }> {
    try {
      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟查询');
        return {
          status: 'COMPLETED',
          documents: [
            {
              fileId: signFlowId,
              fileName: '已签署合同.pdf',
              downloadUrl: `https://mock-esign.com/download/${signFlowId}`
            }
          ]
        };
      }

      const response = await this.axiosInstance.get<ESignResponse<{ 
        status: string; 
        documents: Array<{ fileId: string; fileName: string; downloadUrl?: string }> 
      }>>(
        `/v1/signflows/${signFlowId}`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`查询签署状态失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('查询签署状态失败:', error);
      throw new BadRequestException(`查询签署状态失败: ${error.message}`);
    }
  }

  /**
   * 下载已签署文档
   */
  async downloadSignedDocument(signFlowId: string, documentId: string): Promise<{ downloadUrl: string }> {
    try {
      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟下载链接');
        return {
          downloadUrl: `https://mock-esign.com/download/${signFlowId}/${documentId}`
        };
      }

      const response = await this.axiosInstance.get<ESignResponse<{ downloadUrl: string }>>(
        `/v1/signflows/${signFlowId}/documents/${documentId}/downloadUrl`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取下载链接失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('获取下载链接失败:', error);
      throw new BadRequestException(`获取下载链接失败: ${error.message}`);
    }
  }

  /**
   * 验证回调签名（用于接收签署完成通知）
   */
  verifyCallback(signature: string, timestamp: string, body: string): boolean {
    try {
      if (!this.config.publicKey) {
        console.warn('未配置公钥，无法验证回调签名');
        return true; // 在没有公钥的情况下，暂时允许通过
      }

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(`${timestamp}${body}`);
      verify.end();
      
      return verify.verify(this.config.publicKey, signature, 'base64');
    } catch (error) {
      console.error('验证回调签名失败:', error);
      return false;
    }
  }

  /**
   * 使用模板创建合同
   */
  async createContractFromTemplate(params: {
    templateId: string;
    contractName: string;
    templateParams: Record<string, any>;
    signers: Array<{
      name: string;
      mobile: string;
      signType: 'PERSONAL' | 'COMPANY';
      signAction: 'SIGN' | 'APPROVAL';
    }>;
  }): Promise<{ signFlowId: string; signUrl: string }> {
    try {
      console.log('使用模板创建合同:', params);
      
      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟创建合同');
        const mockSignFlowId = `mock_template_flow_${Date.now()}`;
        return {
          signFlowId: mockSignFlowId,
          signUrl: `https://mock-esign.com/sign/${mockSignFlowId}`
        };
      }

      // 1. 使用模板创建文档
      const createDocResponse = await this.axiosInstance.post<ESignResponse<{ fileId: string }>>(
        '/v1/files/createByTemplate',
        {
          templateId: params.templateId,
          fileName: params.contractName,
          simpleFormFields: params.templateParams,
        }
      );

      if (createDocResponse.data.code !== 0) {
        throw new BadRequestException(`使用模板创建文档失败: ${createDocResponse.data.message}`);
      }

      const fileId = createDocResponse.data.data.fileId;

      // 2. 创建签署流程
      const signFlowResponse = await this.axiosInstance.post<ESignResponse<{ signFlowId: string }>>(
        '/v1/signflows',
        {
          businessScene: 'CONTRACT_SIGN',
          signFlowTitle: params.contractName,
          signFlowType: 'SEQUENTIAL', // 顺序签署
          signers: params.signers.map((signer, index) => ({
            signerType: signer.signType,
            signerName: signer.name,
            signerMobile: signer.mobile,
            signAction: signer.signAction,
            signOrder: index + 1,
          })),
          documents: [
            {
              fileId: fileId,
              fileName: params.contractName,
            },
          ],
          signFlowConfig: {
            signType: 'SEQUENTIAL',
            callbackUrl: this.config.notifyUrl,
          },
        }
      );

      if (signFlowResponse.data.code !== 0) {
        throw new BadRequestException(`创建签署流程失败: ${signFlowResponse.data.message}`);
      }

      const signFlowId = signFlowResponse.data.data.signFlowId;

      // 3. 获取签署链接
      const signUrlResponse = await this.axiosInstance.post<ESignResponse<{ signUrl: string }>>(
        `/v1/signflows/${signFlowId}/signers/signUrl`,
        {
          signerMobile: params.signers[0].mobile, // 第一个签署人
          signType: 'REDIRECT',
          callbackUrl: this.config.notifyUrl,
        }
      );

      if (signUrlResponse.data.code !== 0) {
        throw new BadRequestException(`获取签署链接失败: ${signUrlResponse.data.message}`);
      }

      return {
        signFlowId,
        signUrl: signUrlResponse.data.data.signUrl,
      };
    } catch (error) {
      console.error('使用模板创建合同失败:', error);
      throw new BadRequestException(`使用模板创建合同失败: ${error.message}`);
    }
  }

  /**
   * 获取模板详情
   */
  async getTemplateInfo(templateId: string): Promise<any> {
    try {
      console.log('获取模板详情:', templateId);
      
      const response = await this.axiosInstance.get<ESignResponse<any>>(
        `/v1/files/template/${templateId}`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取模板详情失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('获取模板详情失败:', error);
      throw new BadRequestException(`获取模板详情失败: ${error.message}`);
    }
  }

  /**
   * 获取模板列表
   */
  async getTemplateList(): Promise<any> {
    try {
      console.log('获取模板列表');
      
      const response = await this.axiosInstance.get<ESignResponse<any>>(
        '/v1/files/templates'
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取模板列表失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('获取模板列表失败:', error);
      throw new BadRequestException(`获取模板列表失败: ${error.message}`);
    }
  }

  /**
   * 根据模板ID获取模板字段信息
   */
  async getTemplateFields(templateId: string): Promise<any> {
    try {
      console.log('获取模板字段信息:', templateId);
      
      const response = await this.axiosInstance.get<ESignResponse<any>>(
        `/v1/files/template/${templateId}/fields`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取模板字段失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('获取模板字段失败:', error);
      throw new BadRequestException(`获取模板字段失败: ${error.message}`);
    }
  }

  /**
   * 获取模板预览
   */
  async getTemplatePreview(templateId: string, templateParams: any): Promise<any> {
    try {
      console.log('获取模板预览:', templateId, templateParams);
      
      // 首先尝试下载模板文件
      try {
        const templateData = await this.downloadTemplateDirectSDK(templateId);
        if (templateData && templateData.data) {
          return {
            templateFile: templateData,
            previewUrl: `data:application/pdf;base64,${templateData.data}`,
            fileName: templateData.fileName,
            templateInfo: templateData
          };
        }
      } catch (downloadError) {
        console.log('下载模板失败，尝试获取模板控件信息:', downloadError.message);
      }
      
      // 如果下载失败，尝试获取模板控件信息
      try {
        const templateControls = await this.getTemplateData(templateId);
        return {
          templateControls: templateControls,
          mockPreview: true,
          templateParams: templateParams,
          message: '基于模板控件信息生成预览'
        };
      } catch (controlsError) {
        console.log('获取模板控件信息失败:', controlsError.message);
      }
      
      // 如果都失败，返回基本的预览数据
      return {
        mockPreview: true,
        templateParams: templateParams,
        message: '模板预览功能暂不可用，显示基于输入数据的模拟预览'
      };
    } catch (error) {
      console.error('获取模板预览失败:', error);
      
      // 返回错误信息，但不抛出异常，让前端显示基本预览
      return {
        error: true,
        mockPreview: true,
        templateParams: templateParams,
        message: '模板预览加载失败，显示基于输入数据的模拟预览'
      };
    }
  }

  /**
   * 直接使用对方SDK代码的下载模板方法
   */
  async downloadTemplateDirectSDK(templateNo: string): Promise<any> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    // 完全复用对方SDK的AiqianClient类逻辑
    const appId = this.config.appId;
    const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
    const domain = this.config.host;

    try {
      console.log('🔽 使用对方SDK代码直接下载模板:', templateNo);

      // 1. 过滤空值并排序（对方SDK的filterEmpty + 排序逻辑）
      const data = { templateNo };
      const filteredData = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          filteredData[key] = data[key];
        }
      });
      const sortedKeys = Object.keys(filteredData).sort();
      const sortedData = {};
      sortedKeys.forEach(k => sortedData[k] = filteredData[k]);

      // 2. 生成JSON字符串
      const jsonData = JSON.stringify(sortedData, null, 0);
      console.log('📋 bizData:', jsonData);

      // 3. 生成时间戳（加10分钟缓冲）
      const time = Date.now() + 600 * 1000;
      console.log('🕐 timestamp:', time);

      // 4. MD5计算
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');
      console.log('🔐 MD5:', md5Hash);

      // 5. 构建签名字符串
      const signStr = jsonData + md5Hash + appId + time;
      console.log('🔐 签名字符串:', signStr);
      console.log('🔐 签名字符串长度:', signStr.length);

      // 6. 生成签名（完全按照对方SDK）
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();

      // 格式化为PEM格式
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

      const signature = signer.sign({
        key: privateKeyPem,
        format: 'pem'
      }, 'base64');

      console.log('✍️ 签名:', signature.substring(0, 50) + '...');

      // 7. 构建FormData请求（完全按照对方SDK）
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', time.toString());

      const headers = {
        'sign': signature,
        ...formData.getHeaders()
      };

      console.log('📤 请求头:', headers);

      // 8. 发送请求
      const response = await axios.post(`${domain}/contract/downloadTemplate`, formData, {
        headers: headers,
        timeout: 30000
      });

      console.log('✅ API调用成功:');
      console.log('   状态码:', response.status);
      console.log('   响应数据:', response.data);

      if (response.data.code !== 100000) {
        throw new Error(`下载模板失败: ${response.data.msg}`);
      }

      // 返回base64字符串
      const base64Str = response.data.data?.data || response.data.data;
      if (typeof base64Str !== 'string') {
        throw new Error('下载模板成功但未获得base64字符串');
      }
      return base64Str;

    } catch (error) {
      console.log('❌ API调用失败:');
      if (error.response) {
        console.log('   状态码:', error.response.status);
        console.log('   响应数据:', error.response.data);
      } else {
        console.log('   错误信息:', error.message);
      }
      throw new Error(`下载模板失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 获取已同步的模板控件信息
   * 根据爱签官方文档：https://{host}/template/getTemplateData
   */
  async getTemplateData(templateIdent: string): Promise<any> {
    try {
      console.log('🔍 使用官方API获取模板控件信息:', templateIdent);
      
      // 使用官方的 /template/data 接口
      const response = await this.callESignAPI('/template/data', {
        templateIdent: templateIdent
      });

      console.log('📋 官方API模板控件信息响应:', response);

      if (response.code !== 100000) {
        throw new BadRequestException(`获取模板控件信息失败: ${response.msg}`);
      }

      return response.data;
    } catch (error) {
      console.error('❌ 获取模板控件信息失败:', error);
      throw new BadRequestException(`获取模板控件信息失败: ${error.message}`);
    }
  }

  /**
   * 使用模板创建填充后的PDF文件
   * 使用爱签的createByTemplate API
   */
  async createFilledTemplate(
    templateNo: string,
    templateParams: Record<string, any>,
    fileName?: string
  ): Promise<any> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    try {
      console.log('🔄 使用爱签模板填充API创建文件:', {
        templateNo,
        templateParams,
        fileName
      });

      // 使用官方SDK的签名逻辑
      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      // 构建请求数据
      const requestData = {
        templateNo: templateNo,
        templateParams: templateParams,
        fileName: fileName || `合同_${Date.now()}.pdf`
      };

      // 1. 过滤空值并排序
      const filteredData = {};
      Object.keys(requestData).forEach(key => {
        if (requestData[key] !== null && requestData[key] !== undefined && requestData[key] !== '') {
          filteredData[key] = requestData[key];
        }
      });
      const sortedKeys = Object.keys(filteredData).sort();
      const sortedData = {};
      sortedKeys.forEach(k => sortedData[k] = filteredData[k]);

      // 2. 生成JSON字符串
      const jsonData = JSON.stringify(sortedData, null, 0);

      // 3. 生成时间戳（加10分钟缓冲）
      const time = Date.now() + 600 * 1000;

      // 4. MD5计算
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');

      // 5. 构建签名字符串
      const signStr = jsonData + md5Hash + appId + time;

      // 6. 生成签名
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();

      // 格式化为PEM格式
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

      const signature = signer.sign({
        key: privateKeyPem,
        format: 'pem'
      }, 'base64');

      // 7. 构建FormData请求
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', time.toString());

      const headers = {
        'sign': signature,
        ...formData.getHeaders()
      };

      // 8. 发送请求到模板填充接口
      const response = await axios.post(`${domain}/contract/createByTemplate`, formData, {
        headers: headers,
        timeout: 30000
      });

      console.log('✅ 模板填充API调用成功:', response.data);

      if (response.data.code !== 100000) {
        throw new Error(`模板填充失败: ${response.data.msg}`);
      }

      const base64Str2 = response.data.data?.data || response.data.data;
      if (typeof base64Str2 !== 'string') {
        throw new Error('模板填充接口未返回base64字符串');
      }
      return base64Str2;

    } catch (error) {
      console.error('❌ 模板填充失败:', error);
      throw new BadRequestException(`模板填充失败: ${error.response?.data?.msg || error.message}`);
    }
  }



  /**
   * 下载文件（通过文件ID）
   */
  async downloadFile(fileId: string): Promise<any> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    try {
      console.log('🔽 下载文件:', fileId);

      // 使用官方SDK的签名逻辑
      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      // 构建请求数据
      const requestData = {
        fileId: fileId
      };

      // 1. 过滤空值并排序
      const filteredData = {};
      Object.keys(requestData).forEach(key => {
        if (requestData[key] !== null && requestData[key] !== undefined && requestData[key] !== '') {
          filteredData[key] = requestData[key];
        }
      });
      const sortedKeys = Object.keys(filteredData).sort();
      const sortedData = {};
      sortedKeys.forEach(k => sortedData[k] = filteredData[k]);

      // 2. 生成JSON字符串
      const jsonData = JSON.stringify(sortedData, null, 0);

      // 3. 生成时间戳（加10分钟缓冲）
      const time = Date.now() + 600 * 1000;

      // 4. MD5计算
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');

      // 5. 构建签名字符串
      const signStr = jsonData + md5Hash + appId + time;

      // 6. 生成签名
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();

      // 格式化为PEM格式
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

      const signature = signer.sign({
        key: privateKeyPem,
        format: 'pem'
      }, 'base64');

      // 7. 构建FormData请求
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', time.toString());

      const headers = {
        'sign': signature,
        ...formData.getHeaders()
      };

      // 8. 发送请求到文件下载接口
      const response = await axios.post(`${domain}/contract/downloadFile`, formData, {
        headers: headers,
        timeout: 30000
      });

      console.log('✅ 文件下载API调用成功:', response.data);

      if (response.data.code !== 100000) {
        throw new Error(`文件下载失败: ${response.data.msg}`);
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ 文件下载失败:', error);
      throw new BadRequestException(`文件下载失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 添加企业用户
   */
  async addEnterpriseUser(userData: {
    account: string;
    name: string;
    idType: string;
    idNumber: string;
    orgLegalIdNumber: string;
    orgLegalName: string;
  }): Promise<any> {
    try {
      console.log('🏢 添加企业用户:', userData);

      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟添加企业用户');
        return {
          accountId: `mock_enterprise_${Date.now()}`,
          account: userData.account,
          name: userData.name,
          success: true
        };
      }

      // 🎯 使用正确的爱签API：/v2/user/addEnterpriseUser
      // 根据官方文档，企业用户创建需要先进行企业认证或提供认证流水号
      const bizData = {
        account: userData.account, // 用户唯一识别码
        companyName: userData.orgLegalName, // 企业名称
        creditCode: userData.orgLegalIdNumber, // 企业统一社会信用代码
        creditType: 1, // 企业证件类型：1-统一社会信用代码
        name: userData.name, // 企业法人姓名
        idCard: userData.idNumber, // 法人身份证号
        idCardType: parseInt(userData.idType), // 法人证件类型：1-身份证
        mobile: '400-000-0000', // 签约手机号
        isNotice: 1 // 是否发送通知：1-发送
      };

      // 如果没有实名认证流水号，尝试不传递该字段
      // 根据官方文档，某些情况下可以直接创建企业用户

      console.log('📤 调用爱签API - 添加企业用户:', bizData);

      // 调用爱签官方API
      const response = await this.callESignAPI('/v2/user/addEnterpriseUser', bizData);

      console.log('📥 爱签API响应 - 添加企业用户:', response);

      // 爱签API成功码是 100000
      if (response.code !== 100000) {
        console.error('❌ 添加企业用户失败:', response);
        throw new BadRequestException(`添加企业用户失败: ${response.msg || response.message}`);
      }

      console.log('✅ 企业用户添加成功:', userData.account);
      return response.data || response;
    } catch (error) {
      console.error('❌ 添加企业用户异常:', error);
      
      // 如果用户已存在，不抛出异常，返回成功状态
      if (error.message?.includes('用户已存在') || error.response?.data?.msg?.includes('用户已存在')) {
        console.log('⚠️ 企业用户已存在，继续执行:', userData.account);
        return {
          account: userData.account,
          name: userData.name,
          success: true,
          message: '用户已存在'
        };
      }
      
      throw new BadRequestException(`添加企业用户失败: ${error.message}`);
    }
  }

  /**
   * 创建企业印章（使用嵌入式网页版 - 官方推荐方式）
   * 根据爱签官方文档：https://open.esign.cn/doc/opendoc/pdf-sign3/yx5b1a
   * 该接口返回一个可嵌入的制作印章页面，避免复杂的签名验证问题
   */
  async createEnterpriseSeal(sealData: {
    account: string;
    sealName?: string;
    sealNo?: string;
    redirectUrl?: string;
    notifyUrl?: string;
  }): Promise<any> {
    try {
      console.log('🖊️ 创建企业印章（嵌入式网页版）:', sealData);
      
      // 如果没有私钥，返回模拟数据
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟企业印章制作页面');
        const mockUrl = `https://mock-seal-maker.com/make?account=${sealData.account}&t=${Date.now()}`;
        return {
          success: true,
          data: {
            makeSealUrl: mockUrl,
            account: sealData.account,
            message: '模拟模式：请在生产环境中配置真实的爱签私钥',
            validHours: 3
          }
        };
      }

      // 构建请求参数
      const requestData: any = {
        account: sealData.account
      };

      // 可选参数
      if (sealData.sealNo) {
        requestData.sealNo = sealData.sealNo;
      }
      
      // 设置回调地址
      if (sealData.redirectUrl) {
        requestData.redirectUrl = sealData.redirectUrl;
      }
      
      if (sealData.notifyUrl) {
        requestData.notifyUrl = sealData.notifyUrl;
      } else {
        // 默认使用系统配置的回调地址
        requestData.notifyUrl = this.config.notifyUrl;
      }

      console.log('📤 请求嵌入式印章制作页面:', requestData);

      // 调用爱签嵌入式印章制作接口（这个接口相对简单，避免复杂签名问题）
      const response = await this.axiosInstance.post<any>(
        '/seal/makeOnline',
        requestData
      );

      console.log('📥 爱签响应:', response.data);

      // 爱签嵌入式接口的成功码是 100000
      if (response.data.code !== 100000) {
        throw new BadRequestException(`获取印章制作页面失败: ${response.data.msg}`);
      }

      return {
        success: true,
        data: {
          makeSealUrl: response.data.data,
          account: sealData.account,
          sealNo: sealData.sealNo,
          message: '印章制作页面获取成功，有效期3小时',
          validHours: 3,
          instructions: [
            '1. 点击链接进入印章制作页面',
            '2. 在页面中设计您的企业印章',
            '3. 完成后印章将自动同步到爱签平台',
            '4. 链接有效期为3小时，请及时使用'
          ]
        }
      };
    } catch (error) {
      console.error('🚨 获取企业印章制作页面失败:', error);
      
      // 如果是网络错误或API不可用，提供友好的错误信息
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: '网络连接失败，请检查网络设置或稍后重试',
          suggestion: '请联系管理员检查爱签API配置'
        };
      }

      // 如果是签名相关错误，提供具体建议
      if (error.message?.includes('签名') || error.response?.data?.code === 100016) {
        return {
          success: false,
          error: 'SIGNATURE_ERROR',
          message: '签名验证失败，建议使用嵌入式印章制作方式',
          suggestion: '嵌入式印章制作页面可以避免复杂的签名验证问题'
        };
      }

      throw new BadRequestException(`获取企业印章制作页面失败: ${error.message}`);
    }
  }

  /**
   * 获取印章列表
   */
  async getSealList(params: {
    account: string;
    sealType?: string;
  }): Promise<any> {
    try {
      console.log('获取印章列表:', params);

      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟印章列表');
        return {
          seals: [
            {
              sealId: 'mock_seal_1',
              sealName: '模拟企业印章1',
              sealType: 'TEMPLATE_ROUND',
              status: 'NORMAL'
            },
            {
              sealId: 'mock_seal_2', 
              sealName: '模拟企业印章2',
              sealType: 'TEMPLATE_ROUND',
              status: 'NORMAL'
            }
          ]
        };
      }

      // 首先获取用户的accountId
      const accountResponse = await this.axiosInstance.get<ESignResponse<any>>(
        `/v2/accounts/getByThirdId?thirdPartyUserId=${params.account}`
      );

      if (accountResponse.data.code !== 0) {
        throw new BadRequestException(`获取用户信息失败: ${accountResponse.data.message}`);
      }

      const accountId = accountResponse.data.data.accountId;

      // 获取印章列表
      let url = `/v2/seals?accountId=${accountId}`;
      if (params.sealType) {
        url += `&sealType=${params.sealType}`;
      }

      const response = await this.axiosInstance.get<ESignResponse<any>>(url);

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取印章列表失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('获取印章列表失败:', error);
      throw new BadRequestException(`获取印章列表失败: ${error.message}`);
    }
  }

  /**
   * 删除印章
   */
  async deleteSeal(params: {
    account: string;
    sealId: string;
  }): Promise<any> {
    try {
      console.log('删除印章:', params);

      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟删除印章');
        return {
          success: true,
          message: '模拟删除印章成功'
        };
      }

      const response = await this.axiosInstance.delete<ESignResponse<any>>(
        `/v2/seals/${params.sealId}`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`删除印章失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('删除印章失败:', error);
      throw new BadRequestException(`删除印章失败: ${error.message}`);
    }
  }

  /**
   * 获取印章详情
   */
  async getSealDetail(params: {
    account: string;
    sealId: string;
  }): Promise<any> {
    try {
      console.log('获取印章详情:', params);

      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        console.warn('未配置私钥，使用模拟印章详情');
        return {
          sealId: params.sealId,
          sealName: '模拟企业印章',
          sealType: 'TEMPLATE_ROUND',
          sealWidth: 159,
          sealHeight: 159,
          color: 'RED',
          status: 'NORMAL',
          createTime: new Date().toISOString()
        };
      }

      const response = await this.axiosInstance.get<ESignResponse<any>>(
        `/v2/seals/${params.sealId}`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取印章详情失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('获取印章详情失败:', error);
      throw new BadRequestException(`获取印章详情失败: ${error.message}`);
    }
  }

  /**
   * 添加签署人（基于爱签官方文档）
   * 接口地址: https://{host}/contract/addSigner
   * 请求格式：数组，每个account对应一个签署方
   */
  async addSigner(contractData: {
    contractNo: string;
    signers: Array<{
      account: string;
      signType: number; // 2：无感知签约，3：有感知签约
      sealNo?: string;
      authSignAccount?: string;
      noticeMobile?: string;
      signOrder?: string;
      isNotice?: number;
      validateType?: number;
      signStrategyList?: Array<{
        attachNo: number;
        locationMode: number;
        signKey?: string;
        signPage?: number;
        signX?: number;
        signY?: number;
        signType?: number;
        sealNo?: number;
        canDrag?: number;
        offsetX?: number;
        offsetY?: number;
      }>;
    }>;
  }): Promise<any> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    try {
      console.log('🔄 添加签署人（官方API）:', contractData);

      // 使用官方SDK的签名逻辑
      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      // 构建请求数据（按照官方文档：数组格式）
      const requestData = contractData.signers.map(signer => ({
        contractNo: contractData.contractNo,
        account: signer.account,
        signType: signer.signType || 3, // 默认有感知签约
        sealNo: signer.sealNo,
        authSignAccount: signer.authSignAccount,
        noticeMobile: signer.noticeMobile,
        signOrder: signer.signOrder || '1',
        isNotice: signer.isNotice || 1, // 默认接收通知
        validateType: signer.validateType || 1, // 默认短信验证码
        signStrategyList: signer.signStrategyList || [
          {
            attachNo: 1,
            locationMode: 4, // 模板坐标签章（仅支持模板文件）
            signKey: `sign_${signer.account}`,
            signType: 1, // 签名/签章
            canDrag: 0 // 不允许拖动
          }
        ]
      }));

      // 1. 过滤空值并排序
      const filteredData = requestData.map(item => {
        const filtered = {};
        Object.keys(item).forEach(key => {
          if (item[key] !== null && item[key] !== undefined && item[key] !== '') {
            filtered[key] = item[key];
          }
        });
        return filtered;
      });

      // 2. 生成JSON字符串
      const jsonData = JSON.stringify(filteredData, null, 0);

      // 3. 生成时间戳（加10分钟缓冲）
      const time = Date.now() + 600 * 1000;

      // 4. MD5计算
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');

      // 5. 构建签名字符串
      const signStr = jsonData + md5Hash + appId + time;

      // 6. 生成签名
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();

      // 格式化为PEM格式
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

      const signature = signer.sign({
        key: privateKeyPem,
        format: 'pem'
      }, 'base64');

      // 7. 构建FormData请求
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', time.toString());

      const headers = {
        'sign': signature,
        ...formData.getHeaders()
      };

      console.log('📤 发送添加签署人请求（官方API）...');
      console.log('请求数据:', jsonData);

      // 8. 发送请求到正确的API端点
      const response = await axios.post(`${domain}/contract/addSigner`, formData, {
        headers: headers,
        timeout: 30000
      });

      console.log('✅ 添加签署人API调用成功:', response.data);

      if (response.data.code !== 100000) {
        throw new Error(`添加签署人失败: ${response.data.msg}`);
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ 添加签署人失败:', error);
      throw new BadRequestException(`添加签署人失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 完整的合同签约流程
   * 基于爱签官方文档实现标准流程
   */
  async createCompleteSigningFlow(params: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    signers: Array<{
      account: string;
      name: string;
      idType: string;
      idNumber: string;
      mobile?: string;
      email?: string;
      signType?: 'PERSONAL' | 'COMPANY';
    }>;
    validityTime?: number;
    signOrder?: number;
    notifyUrl?: string;
    redirectUrl?: string;
  }): Promise<any> {
    try {
      console.log('🚀 开始完整的合同签约流程:', params);

      const results = {
        contractNo: params.contractNo,
        signers: [],
        contract: null,
        signUrls: [],
        errors: []
      };

      // 步骤1: 添加所有签署人
      console.log('📝 步骤1: 添加签署人...');
      for (const signer of params.signers) {
        try {
          const signerResult = await this.addSigner({
            contractNo: params.contractNo,
            signers: [
              {
                account: signer.account,
                signType: 3,
                sealNo: '',
                authSignAccount: '',
                noticeMobile: '',
                signOrder: '1',
                isNotice: 1,
                validateType: 1,
                signStrategyList: [
                  {
                    attachNo: 1,
                    locationMode: 4, // 模板坐标签章
                    signKey: `sign_${signer.account}`,
                    signType: 1, // 签名/签章
                    canDrag: 0 // 不允许拖动
                  }
                ]
              }
            ]
          });
          
          results.signers.push({
            account: signer.account,
            name: signer.name,
            result: signerResult,
            status: 'success'
          });
          
          console.log(`✅ 签署人 ${signer.name} 添加成功`);
        } catch (signerError) {
          console.warn(`⚠️ 签署人 ${signer.name} 添加失败:`, signerError.message);
          results.signers.push({
            account: signer.account,
            name: signer.name,
            error: signerError.message,
            status: 'failed'
          });
          results.errors.push(`签署人 ${signer.name}: ${signerError.message}`);
        }
      }

      // 步骤2: 创建待签署合同
      console.log('📄 步骤2: 创建待签署合同...');
      try {
        const contractResult = await this.createContractWithTemplate({
          contractNo: params.contractNo,
          contractName: params.contractName,
          templateNo: params.templateNo,
          templateParams: params.templateParams,
          validityTime: params.validityTime,
          signOrder: params.signOrder,
          notifyUrl: params.notifyUrl,
          redirectUrl: params.redirectUrl
        });

        results.contract = {
          contractNo: params.contractNo,
          result: contractResult,
          status: 'success'
        };

        console.log('✅ 合同创建成功:', contractResult);

        // 步骤3: 如果合同创建成功且有预览链接，返回结果
        if (contractResult && contractResult.previewUrl) {
          results.signUrls.push({
            type: 'preview',
            url: contractResult.previewUrl,
            description: '合同预览和签署页面'
          });
        }

      } catch (contractError) {
        console.error('❌ 合同创建失败:', contractError.message);
        results.contract = {
          contractNo: params.contractNo,
          error: contractError.message,
          status: 'failed'
        };
        results.errors.push(`合同创建: ${contractError.message}`);
      }

      // 返回完整结果
      return {
        success: results.errors.length === 0,
        data: results,
        message: results.errors.length === 0 
          ? '合同签约流程创建成功' 
          : `部分步骤失败: ${results.errors.join('; ')}`,
        summary: {
          totalSigners: params.signers.length,
          successfulSigners: results.signers.filter(s => s.status === 'success').length,
          contractCreated: results.contract?.status === 'success',
          hasSignUrls: results.signUrls.length > 0
        }
      };

    } catch (error) {
      console.error('❌ 完整签约流程失败:', error);
      throw new BadRequestException(`完整签约流程失败: ${error.message}`);
    }
  }

  /**
   * 真正可用的合同创建功能
   * 基于成功的downloadTemplateDirectSDK方法的签名逻辑
   */
  async createRealContract(params: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    signers: Array<{
      account: string;
      name: string;
      idType: string;
      idNumber: string;
      mobile?: string;
      email?: string;
    }>;
  }): Promise<any> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    try {
      console.log('🚀 使用经过验证的签名逻辑创建合同:', params);

      // 使用与downloadTemplateDirectSDK完全相同的配置和逻辑
      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      // 构建合同创建请求数据（按照官方文档格式）
      const requestData = {
        contractNo: params.contractNo,
        contractName: params.contractName,
        signOrder: 1, // 无序签约
        validityTime: 365, // 365天有效期
        // 使用模板方式（按照官方文档格式）
        templates: [
          {
            templateNo: params.templateNo,
            templateParams: params.templateParams
          }
        ],
        // 可选配置
        readSeconds: 3, // 强制阅读3秒
        needAgree: 0, // 不需要同意协议
        autoExpand: 1, // 自动展开文件列表
        refuseOn: 0, // 关闭退回按钮
        autoContinue: 0, // 关闭自动跳转
        viewFlg: 0, // 允许查看合同内容
        enableDownloadButton: 1 // 允许下载
      };

      // 1. 过滤空值并排序
      const filteredData = {};
      Object.keys(requestData).forEach(key => {
        if (requestData[key] !== null && requestData[key] !== undefined && requestData[key] !== '') {
          filteredData[key] = requestData[key];
        }
      });
      const sortedKeys = Object.keys(filteredData).sort();
      const sortedData = {};
      sortedKeys.forEach(k => sortedData[k] = filteredData[k]);

      // 2. 生成JSON字符串
      const jsonData = JSON.stringify(sortedData, null, 0);

      // 3. 生成时间戳（加10分钟缓冲）
      const time = Date.now() + 600 * 1000;

      // 4. MD5计算
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');

      // 5. 构建签名字符串
      const signStr = jsonData + md5Hash + appId + time;

      // 6. 生成签名
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();

      // 格式化为PEM格式
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

      const signature = signer.sign({
        key: privateKeyPem,
        format: 'pem'
      }, 'base64');

      // 7. 构建FormData请求
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', time.toString());

      const headers = {
        'sign': signature,
        ...formData.getHeaders()
      };

      console.log('📤 发送创建合同请求...');
      console.log('请求数据:', jsonData);
      console.log('签名:', signature);

      // 8. 发送请求到创建合同接口
      const response = await axios.post(`${domain}/contract/createContract`, formData, {
        headers: headers,
        timeout: 30000
      });

      console.log('✅ 创建合同API调用成功:', response.data);

      if (response.data.code !== 100000) {
        throw new Error(`创建合同失败: ${response.data.msg}`);
      }

      return {
        contractNo: params.contractNo,
        contractId: response.data.data?.contractId,
        success: true,
        message: '合同创建成功',
        data: response.data.data
      };

    } catch (error) {
      console.error('❌ 创建合同失败:', error);
      throw new BadRequestException(`创建合同失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  // 根据爱签官方文档实现的7个完整流程模块

  /**
   * 模块1：用户预注册
   * 将用户基本信息同步到爱签平台，延迟实名认证
   */
  async preRegisterUser(userData: {
    phone: string;
    name: string;
    idCard: string;
  }): Promise<{ account: string; sealNo: string }> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    try {
      console.log('📝 模块1：用户预注册 (延迟认证):', userData);

      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      const requestData = {
        account: userData.phone, // 手机号作为唯一ID
        name: userData.name,
        idCard: userData.idCard,
        mobile: userData.phone,
        identifyLater: true // 关键：允许签署时认证
      };

      // 签名逻辑
      const timestamp = Date.now() + 600 * 1000;
      const filteredData = Object.fromEntries(
        Object.entries(requestData).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const sortedData = Object.fromEntries(
        Object.keys(filteredData).sort().map(k => [k, filteredData[k]])
      );
      
      const jsonData = JSON.stringify(sortedData, null, 0);
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');
      const signStr = jsonData + md5Hash + appId + timestamp;
      
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();
      
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
      const signature = signer.sign({ key: privateKeyPem, format: 'pem' }, 'base64');
      
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', timestamp.toString());
      
      const headers = { 'sign': signature, ...formData.getHeaders() };
      
      const response = await axios.post(`${domain}/v2/user/addPersonalUser`, formData, {
        headers: headers,
        timeout: 30000
      });

      if (response.data.code !== 100000) {
        throw new Error(`用户预注册失败: ${response.data.msg}`);
      }

      return {
        account: response.data.data.account,
        sealNo: response.data.data.sealNo
      };

    } catch (error) {
      console.error('❌ 用户预注册失败:', error);
      throw new BadRequestException(`用户预注册失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 模块2：模板数据准备
   * 从SaaS系统获取业务数据，转换为爱签模板结构
   */
  prepareTemplateData(contractData: any): any {
    console.log('📋 模块2：模板数据准备');
    
    // 敏感信息脱敏处理
    const sanitizedData = {
      ...contractData,
      customerIdCard: contractData.customerIdCard?.replace(/^(.{6})(?:\d+)(.{4})$/, '$1******$2'),
      workerIdCard: contractData.workerIdCard?.replace(/^(.{6})(?:\d+)(.{4})$/, '$1******$2')
    };

    return {
      // 普通字段
      basic: {
        甲方姓名: sanitizedData.customerName,
        甲方电话: sanitizedData.customerPhone,
        甲方身份证号: sanitizedData.customerIdCard,
        乙方姓名: sanitizedData.workerName,
        乙方电话: sanitizedData.workerPhone,
        乙方身份证号: sanitizedData.workerIdCard,
        服务期间: `${sanitizedData.startDate}至${sanitizedData.endDate}`,
        服务类型: sanitizedData.contractType,
        月薪资: `¥${sanitizedData.workerSalary}`,
        服务费: `¥${sanitizedData.customerServiceFee}`,
        工作天数: `${sanitizedData.monthlyWorkDays}天/月`,
        备注: sanitizedData.remarks || '无'
      },
      
      // 表格控件（如果需要）
      service_table: {
        head: ["服务项目", "单价", "频次", "备注"],
        body: [{
          colValues: [
            sanitizedData.contractType,
            `¥${sanitizedData.workerSalary}/月`,
            `${sanitizedData.monthlyWorkDays}天/月`,
            sanitizedData.remarks || "无"
          ],
          insertRow: false
        }]
      }
    };
  }

  /**
   * 模块3：合同创建（按照官方文档重构）
   * 基于模板和业务数据创建三方合同
   */
  async createContractOfficial(contractData: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    validityTime?: number;
    signOrder?: number;
    notifyUrl?: string;
    redirectUrl?: string;
  }): Promise<any> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    try {
      console.log('📄 模块3：合同创建 (官方流程):', contractData);

      // 获取预处理数据
      const templateData = this.prepareTemplateData(contractData.templateParams);
      
      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      const requestData = {
        contractNo: contractData.contractNo,
        contractName: contractData.contractName,
        validityTime: contractData.validityTime || 365,
        signOrder: contractData.signOrder || 1,
        templates: [
          {
            templateNo: contractData.templateNo,
            templateParams: {
              ...templateData.basic,
              service_table: JSON.stringify(templateData.service_table)
            }
          }
        ]
      };

      // 添加可选参数
      if (contractData.notifyUrl) requestData['notifyUrl'] = contractData.notifyUrl;
      if (contractData.redirectUrl) requestData['redirectUrl'] = contractData.redirectUrl;

      // 标准签名逻辑
      const timestamp = Date.now() + 600 * 1000;
      const filteredData = Object.fromEntries(
        Object.entries(requestData).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const sortedData = Object.fromEntries(
        Object.keys(filteredData).sort().map(k => [k, filteredData[k]])
      );
      
      const jsonData = JSON.stringify(sortedData, null, 0);
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');
      const signStr = jsonData + md5Hash + appId + timestamp;
      
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();
      
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
      const signature = signer.sign({ key: privateKeyPem, format: 'pem' }, 'base64');
      
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', timestamp.toString());
      
      const headers = { 'sign': signature, ...formData.getHeaders() };
      
      const response = await axios.post(`${domain}/contract/createContract`, formData, {
        headers: headers,
        timeout: 30000
      });

      if (response.data.code !== 100000) {
        throw new Error(`合同创建失败: ${response.data.msg}`);
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ 合同创建失败:', error);
      throw new BadRequestException(`合同创建失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 模块4：签署方配置
   * 配置甲方/乙方/丙方的签署信息和顺序
   */
  async configureSigners(contractNo: string, signers: Array<{
    account: string;
    name: string;
    signType: 'PERSONAL' | 'COMPANY';
    signOrder: number;
    signPositions?: Array<{ page: number; x: number; y: number }>;
    sealNo?: string;
  }>): Promise<any> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');

    try {
      console.log('👥 模块4：签署方配置:', { contractNo, signers });

      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      const requestData = {
        contractNo,
        signers: signers.map(signer => ({
          account: signer.account,
          signerType: signer.signType === 'PERSONAL' ? 0 : 1,
          signOrder: signer.signOrder,
          signPositions: signer.signPositions || [{ page: 1, x: 150, y: 500 + signer.signOrder * 50 }],
          sealNo: signer.sealNo
        }))
      };

      // 标准签名逻辑
      const timestamp = Date.now() + 600 * 1000;
      const filteredData = Object.fromEntries(
        Object.entries(requestData).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const sortedData = Object.fromEntries(
        Object.keys(filteredData).sort().map(k => [k, filteredData[k]])
      );
      
      const jsonData = JSON.stringify(sortedData, null, 0);
      const md5Hash = crypto.createHash('md5').update(jsonData).digest('hex');
      const signStr = jsonData + md5Hash + appId + timestamp;
      
      const signer = crypto.createSign('sha1');
      signer.update(signStr);
      signer.end();
      
      const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
      const signature = signer.sign({ key: privateKeyPem, format: 'pem' }, 'base64');
      
      const formData = new FormData();
      formData.append('bizData', jsonData);
      formData.append('appId', appId);
      formData.append('timestamp', timestamp.toString());
      
      const headers = { 'sign': signature, ...formData.getHeaders() };
      
      const response = await axios.post(`${domain}/v2/signer/addSigner`, formData, {
        headers: headers,
        timeout: 30000
      });

      if (response.data.code !== 100000) {
        throw new Error(`签署方配置失败: ${response.data.msg}`);
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ 签署方配置失败:', error);
      throw new BadRequestException(`签署方配置失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 模块5-7：完整的签署流程管理
   * 签署链接处理、签署时认证、合同下载
   */
  async manageCompleteSigningProcess(params: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    signers: Array<{
      account: string;
      name: string;
      phone: string;
      idCard: string;
      signType: 'PERSONAL' | 'COMPANY';
    }>;
  }): Promise<any> {
    try {
      console.log('🚀 模块5-7：完整签署流程管理:', params);

      const results = {
        contractNo: params.contractNo,
        users: [],
        contract: null,
        signers: null,
        signUrls: [],
        errors: []
      };

      // 步骤1: 用户预注册（所有签署方）
      console.log('📝 步骤1: 用户预注册...');
      for (const signer of params.signers) {
        try {
          const userResult = await this.preRegisterUser({
            phone: signer.phone,
            name: signer.name,
            idCard: signer.idCard
          });
          
          results.users.push({
            account: signer.account,
            name: signer.name,
            result: userResult,
            status: 'success'
          });
          
          console.log(`✅ 用户 ${signer.name} 预注册成功`);
        } catch (userError) {
          console.warn(`⚠️ 用户 ${signer.name} 预注册失败:`, userError.message);
          results.users.push({
            account: signer.account,
            name: signer.name,
            error: userError.message,
            status: 'failed'
          });
          results.errors.push(`用户预注册 ${signer.name}: ${userError.message}`);
        }
      }

      // 步骤2: 创建合同
      console.log('📄 步骤2: 创建合同...');
      try {
        const contractResult = await this.createContractOfficial({
          contractNo: params.contractNo,
          contractName: params.contractName,
          templateNo: params.templateNo,
          templateParams: params.templateParams,
          validityTime: 30,
          signOrder: 1,
          notifyUrl: this.config.notifyUrl
        });

        results.contract = {
          contractNo: params.contractNo,
          result: contractResult,
          status: 'success'
        };

        console.log('✅ 合同创建成功');
      } catch (contractError) {
        console.error('❌ 合同创建失败:', contractError.message);
        results.contract = {
          contractNo: params.contractNo,
          error: contractError.message,
          status: 'failed'
        };
        results.errors.push(`合同创建: ${contractError.message}`);
      }

      // 步骤3: 配置签署方（如果合同创建成功）
      if (results.contract?.status === 'success') {
        console.log('👥 步骤3: 配置签署方...');
        try {
          const signersConfig = params.signers.map((signer, index) => ({
            account: signer.phone, // 使用手机号作为account
            name: signer.name,
            signType: signer.signType,
            signOrder: index + 1
          }));

          const signersResult = await this.configureSigners(params.contractNo, signersConfig);

          results.signers = {
            result: signersResult,
            status: 'success'
          };

          // 如果有签署链接，添加到结果中
          if (signersResult && signersResult.signUrl) {
            results.signUrls.push({
              type: 'signing',
              url: signersResult.signUrl,
              description: '签署链接'
            });
          }

          console.log('✅ 签署方配置成功');
        } catch (signersError) {
          console.error('❌ 签署方配置失败:', signersError.message);
          results.signers = {
            error: signersError.message,
            status: 'failed'
          };
          results.errors.push(`签署方配置: ${signersError.message}`);
        }
      }

      return {
        success: results.errors.length === 0,
        data: results,
        message: results.errors.length === 0 
          ? '完整签署流程创建成功' 
          : `部分步骤失败: ${results.errors.join('; ')}`,
        summary: {
          totalUsers: params.signers.length,
          successfulUsers: results.users.filter(u => u.status === 'success').length,
          contractCreated: results.contract?.status === 'success',
          signersConfigured: results.signers?.status === 'success',
          hasSignUrls: results.signUrls.length > 0
        }
      };

    } catch (error) {
      console.error('❌ 完整签署流程失败:', error);
      throw new BadRequestException(`完整签署流程失败: ${error.message}`);
    }
  }

  /**
   * 专门用于前端合同预览的方法 - 更新版本
   * 优先使用官方模板数据写入API，如果失败则使用其他方法
   */
  async getTemplatePreviewForFrontend(
    templateNo: string, 
    templateParams: Record<string, any>
  ): Promise<string> {
    const errors: string[] = [];

    // 1. 首先尝试使用官方模板数据写入API
    try {
      this.logger.log(`[Preview Step 1] 尝试使用官方模板数据写入API: ${templateNo}`);
      const officialResult = await this.writeTemplateDataOfficial(templateNo, templateParams);
      
      if (officialResult && typeof officialResult === 'string' && officialResult.length > 100) {
        this.logger.log(`[Preview Step 1] 成功: 使用官方API生成了预览. Length: ${officialResult.length}`);
        return officialResult; // 直接返回base64字符串
      }
      this.logger.warn(`[Preview Step 1] 失败: 官方API返回的结果不是有效的base64字符串. Result: ${officialResult}`);
      errors.push('官方模板数据API未返回有效预览文件');
    } catch (officialError) {
      this.logger.error(`[Preview Step 1] 异常: ${officialError.message}`, officialError.stack);
      errors.push(`官方模板数据API失败: ${officialError.message}`);
    }

    // 2. 如果官方API失败，尝试使用模板填充API生成预览
    try {
      this.logger.log(`[Preview Step 2] 尝试使用填充模板API生成预览: ${templateNo}`);
      const filledResult = await this.createFilledTemplate(
        templateNo,
        templateParams,
        `预览_${templateNo}_${Date.now()}.pdf`
      );
      
      if (filledResult && typeof filledResult === 'string' && filledResult.length > 100) {
        this.logger.log(`[Preview Step 2] 成功: 使用填充模板生成了预览. Length: ${filledResult.length}`);
        return filledResult; // 直接返回base64字符串
      }
      this.logger.warn(`[Preview Step 2] 失败: 填充模板API返回的结果不是有效的base64字符串. Result: ${filledResult}`);
      errors.push('填充模板API未返回有效预览文件');
    } catch (fillError) {
      this.logger.error(`[Preview Step 2] 异常: ${fillError.message}`, fillError.stack);
      errors.push(`填充模板失败: ${fillError.message}`);
    }

    // 3. 如果填充失败，使用空白模板下载
    try {
      this.logger.log(`[Preview Step 3] 尝试下载空白模板: ${templateNo}`);
      const emptyTemplate = await this.downloadTemplateDirectSDK(templateNo);
      
      if (emptyTemplate && typeof emptyTemplate === 'string' && emptyTemplate.length > 100) {
        this.logger.log(`[Preview Step 3] 成功: 下载了空白模板作为预览. Length: ${emptyTemplate.length}`);
        return emptyTemplate;
      }
      this.logger.warn(`[Preview Step 3] 失败: 下载空白模板API返回的结果不是有效的base64字符串. Result: ${emptyTemplate}`);
      errors.push('下载空白模板API未返回有效预览文件');
    } catch (downloadError) {
      this.logger.error(`[Preview Step 3] 异常: ${downloadError.message}`, downloadError.stack);
      errors.push(`下载空白模板失败: ${downloadError.message}`);
    }

    // 4. 如果都失败，抛出包含所有失败原因的错误
    const finalErrorMessage = `无法生成模板预览，所有方式都失败了。原因: [${errors.join('; ')}]`;
    this.logger.error(finalErrorMessage);
    throw new BadRequestException(finalErrorMessage);
  }

  /**
   * 获取模板控件信息（用于前端动态表单生成）
   */
  async getTemplateComponents(templateId: string): Promise<any> {
    try {
      console.log('🔍 获取模板控件信息:', templateId);
      
      // 基于爱签模板ID TNF606E6D81E2D49C99CC983F4D0412276-3387 的预期控件
      // 这里我们定义该模板的实际控件结构
      const templateComponents = this.getTemplateComponentsConfig(templateId);
      
      return {
        code: 0,
        message: 'success',
        data: {
          templateId,
          templateName: '服务合同模板',
          components: templateComponents
        }
      };
    } catch (error) {
      console.error('获取模板控件信息失败:', error);
      throw new BadRequestException(`获取模板控件信息失败: ${error.message}`);
    }
  }

  /**
   * 生成模板预览（用于实时预览）
   */
  async generateTemplatePreview(templateId: string, formData: Record<string, any>): Promise<any> {
    try {
      console.log('🔍 生成模板预览:', { templateId, formData });
      
      // 转换表单数据为模板参数
      const templateParams = this.convertFormDataToTemplateParams(formData);
      
      // 使用现有的预览方法
      const previewUrl = await this.getTemplatePreviewForFrontend(templateId, templateParams);
      
      return {
        code: 0,
        message: 'success',
        data: {
          previewUrl: `data:application/pdf;base64,${previewUrl}`,
          previewId: `preview_${templateId}_${Date.now()}`
        }
      };
    } catch (error) {
      console.error('生成模板预览失败:', error);
      throw new BadRequestException(`生成模板预览失败: ${error.message}`);
    }
  }

  /**
   * 获取模板控件配置
   */
  private getTemplateComponentsConfig(templateId: string): any[] {
    // 针对模板 TNF606E6D81E2D49C99CC983F4D0412276-3387 的控件配置
    const components = [
      {
        id: 'party_a_name',
        name: '甲方名称',
        type: 'text',
        required: true,
        placeholder: '请输入甲方名称',
        group: 'basic'
      },
      {
        id: 'party_b_name', 
        name: '乙方名称',
        type: 'text',
        required: true,
        placeholder: '请输入乙方名称',
        group: 'basic'
      },
      {
        id: 'party_a_contact',
        name: '甲方联系人',
        type: 'text',
        required: true,
        placeholder: '请输入甲方联系人',
        group: 'contact'
      },
      {
        id: 'party_a_phone',
        name: '甲方联系电话',
        type: 'text',
        required: true,
        placeholder: '请输入甲方联系电话',
        group: 'contact'
      },
      {
        id: 'party_b_contact',
        name: '乙方联系人',
        type: 'text',
        required: true,
        placeholder: '请输入乙方联系人',
        group: 'contact'
      },
      {
        id: 'party_b_phone',
        name: '乙方联系电话',
        type: 'text',
        required: true,
        placeholder: '请输入乙方联系电话',
        group: 'contact'
      },
      {
        id: 'service_content',
        name: '服务内容',
        type: 'textarea',
        required: true,
        placeholder: '请详细描述服务内容',
        group: 'service'
      },
      {
        id: 'service_period',
        name: '服务期限',
        type: 'text',
        required: true,
        placeholder: '请输入服务期限（如：2024年1月1日至2024年12月31日）',
        group: 'service'
      },
      {
        id: 'contract_amount',
        name: '合同金额',
        type: 'number',
        required: true,
        placeholder: '请输入合同金额（元）',
        group: 'financial'
      },
      {
        id: 'payment_method',
        name: '付款方式',
        type: 'select',
        required: true,
        options: [
          { label: '一次性付款', value: '一次性付款' },
          { label: '分期付款', value: '分期付款' },
          { label: '按月付款', value: '按月付款' },
          { label: '按季度付款', value: '按季度付款' }
        ],
        group: 'financial'
      },
      {
        id: 'contract_date',
        name: '合同签署日期',
        type: 'date',
        required: true,
        placeholder: '请选择合同签署日期',
        group: 'basic'
      },
      {
        id: 'party_a_address',
        name: '甲方地址',
        type: 'text',
        required: false,
        placeholder: '请输入甲方详细地址',
        group: 'contact'
      },
      {
        id: 'party_b_address',
        name: '乙方地址',
        type: 'text',
        required: false,
        placeholder: '请输入乙方详细地址',
        group: 'contact'
      },
      {
        id: 'special_terms',
        name: '特殊条款',
        type: 'textarea',
        required: false,
        placeholder: '请输入特殊条款（可选）',
        group: 'terms'
      }
    ];

    return components;
  }

  /**
   * 转换表单数据为模板参数
   */
  private convertFormDataToTemplateParams(formData: Record<string, any>): Record<string, any> {
    const templateParams = {};
    
    // 直接映射表单数据到模板参数
    for (const [key, value] of Object.entries(formData)) {
      if (value !== undefined && value !== null && value !== '') {
        templateParams[key] = value;
      }
    }
    
    return templateParams;
  }

  /**
   * 根据爱签官方文档实现模板数据写入API
   * 接口地址: /template/data
   * 使用multipart/form-data格式，完全按照官方Java示例实现
   */
  async writeTemplateDataOfficial(templateIdent: string, templateParams: Record<string, any> = {}): Promise<string> {
    const axios = require('axios');
    const crypto = require('crypto');
    const FormData = require('form-data');
    const { v4: uuidv4 } = require('uuid');

    try {
      console.log('🔄 使用爱签官方模板数据写入API:', { templateIdent, templateParams });

      // 使用官方SDK的签名逻辑
      const appId = this.config.appId;
      const privateKeyBase64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=';
      const domain = this.config.host;

      // 1. 构建bizData - 完全按照官方文档示例
      const bizDataObj = {
        templateIdent: templateIdent
      };

      // 如果有模板参数，添加到bizData中
      if (templateParams && Object.keys(templateParams).length > 0) {
        bizDataObj['templateParams'] = templateParams;
      }

      // 2. 按照官方文档要求：对JSON进行排序处理
      const sortedKeys = Object.keys(bizDataObj).sort();
      const sortedBizData = {};
      sortedKeys.forEach(key => {
        sortedBizData[key] = bizDataObj[key];
      });

      // 3. 生成JSON字符串
      const dataString = JSON.stringify(sortedBizData);
      console.log('📋 dataString:', dataString);

      // 4. 生成时间戳（当前时间 + 10分钟的毫秒数）
      const now = new Date();
      const timestamp = (now.getTime() + 10 * 60 * 1000).toString();
      console.log('⏰ timestamp:', timestamp);

      // 5. 生成签名 - 使用官方NetSignUtils.getSign算法
      const sign = this.generateOfficialSign(appId, privateKeyBase64, dataString, timestamp);
      console.log('🔐 sign:', sign.substring(0, 50) + '...');

      // 6. 构建multipart/form-data请求 - 完全按照官方Java示例
      const boundary = uuidv4();
      
      // 使用官方文档中的addTextValue格式
      const textValues = this.addTextValue('appId', appId, boundary) +
                        this.addTextValue('timestamp', timestamp, boundary) +
                        this.addTextValue('bizData', dataString, boundary);

      // 7. 发送请求到官方模板数据接口
      const response = await axios.post(`${domain}/template/data`, textValues + `--${boundary}--\r\n`, {
        headers: {
          'sign': sign,
          'timestamp': timestamp,
          'Content-Type': `multipart/form-data;boundary=${boundary}`,
          'Connection': 'Keep-Alive',
          'Charset': 'UTF-8'
        },
        timeout: 30000
      });

      console.log('✅ 模板数据写入API调用成功:', response.data);

      if (response.data.code !== 100000) {
        throw new Error(`模板数据写入失败: ${response.data.msg}`);
      }

      // 返回base64字符串或文件下载链接
      const resultData = response.data.data;
      if (typeof resultData === 'string' && resultData.length > 100) {
        return resultData; // 直接返回base64字符串
      } else if (resultData && resultData.downloadUrl) {
        return resultData.downloadUrl; // 返回下载链接
      } else {
        throw new Error('模板数据写入API未返回预期的结果格式');
      }

    } catch (error) {
      console.error('❌ 模板数据写入失败:', error);
      throw new BadRequestException(`模板数据写入失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 官方NetSignUtils.getSign签名算法实现
   */
  private generateOfficialSign(appId: string, privateKey: string, dataString: string, timestamp: string): string {
    const crypto = require('crypto');

    try {
      // 1. 计算dataString的MD5值
      const md5Hash = crypto.createHash('md5').update(dataString, 'utf8').digest('hex');
      console.log('🔐 MD5 hash:', md5Hash);

      // 2. 构建签名字符串：dataString + md5(dataString) + appId + timestamp
      const signString = dataString + md5Hash + appId + timestamp;
      console.log('🔐 Sign string length:', signString.length);

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
      console.error('🚨 官方签名生成失败:', error);
      throw new Error(`签名生成失败: ${error.message}`);
    }
  }

  /**
   * 官方NetSignUtils.addTextValue实现
   */
  private addTextValue(name: string, value: string, boundary: string): string {
    return `--${boundary}\r\n` +
           `Content-Disposition: form-data; name="${name}"\r\n` +
           `\r\n` +
           `${value}\r\n`;
  }

  /**
   * 专门用于前端合同预览的方法 - 更新版本
   * 优先使用官方模板数据写入API，如果失败则使用其他方法
   */

  /**
   * 爱签官方完整流程实现
   * 流程：1.添加陌生用户 -> 2.创建合同 -> 3.添加签署方 -> 4.获取签署链接 -> 5.下载已签署合同
   */

  /**
   * 步骤1：添加陌生用户
   * API: /user/addStranger
   */
  async addStranger(userData: {
    account: string;
    userType: number;
    name?: string;
    companyName?: string;
    mobile?: string;
    signPwd?: string;
    isSignPwdNotice?: number;
    isNotice?: number;
    identifiedNotifyUrl?: string;
    creditCode?: string;
    agentName?: string;
    agentCardNo?: string;
    idCard?: string;
    bankCard?: string;
    immutableInfoList?: string[];
  }): Promise<any> {
    try {
      console.log('🔄 步骤1：添加陌生用户:', userData);

      // 构建符合官方API的bizData
      const bizData: any = {
        account: userData.account,
        userType: userData.userType
      };

      // 添加可选参数
      if (userData.name) bizData.name = userData.name;
      if (userData.companyName) bizData.companyName = userData.companyName;
      if (userData.mobile) bizData.mobile = userData.mobile;
      if (userData.signPwd) bizData.signPwd = userData.signPwd;
      if (userData.isSignPwdNotice !== undefined) bizData.isSignPwdNotice = userData.isSignPwdNotice;
      if (userData.isNotice !== undefined) bizData.isNotice = userData.isNotice;
      if (userData.identifiedNotifyUrl) bizData.identifiedNotifyUrl = userData.identifiedNotifyUrl;
      if (userData.creditCode) bizData.creditCode = userData.creditCode;
      if (userData.agentName) bizData.agentName = userData.agentName;
      if (userData.agentCardNo) bizData.agentCardNo = userData.agentCardNo;
      if (userData.idCard) bizData.idCard = userData.idCard;
      if (userData.bankCard) bizData.bankCard = userData.bankCard;
      if (userData.immutableInfoList) bizData.immutableInfoList = userData.immutableInfoList;

      console.log('📤 发送给爱签的bizData:', bizData);

      const response = await this.callESignAPI('/v2/user/addStranger', bizData);
      console.log('✅ 添加陌生用户响应:', response);
      
      // callESignAPI已经返回了response.data，所以这里直接返回
      return response;
    } catch (error) {
      console.error('❌ 添加陌生用户失败:', error);
      // 返回一个标准的错误响应格式，而不是抛出异常
      return {
        code: -1,
        message: error.message || '添加陌生用户失败',
        success: false,
        error: error
      };
    }
  }

  /**
   * 步骤2：创建合同（基于模板）
   * API: /contract/createContract
   */

  /**
   * 添加签署方（官方标准实现）
   * API: /contract/addSigner
   * 文档：https://doc.aisign.cn/docs/api/contract/addSigner
   */
  async addContractSigners(signersData: Array<{
    contractNo: string;
    account: string;
    signType: number; // 2：无感知签约，3：有感知签约
    sealNo?: string;
    authSignAccount?: string;
    noticeMobile?: string;
    signOrder?: string;
    isNotice?: number; // 0：否，1：是
    validateType?: number; // 1：短信验证码，2：签约密码，3：人脸识别等
    faceAuthMode?: number; // 人脸识别方式：1：支付宝，2：H5（默认）
    validateTypeList?: string; // 组合签署方式，如"1,2,3"
    autoSwitch?: number; // 自动切换签约方式
    isNoticeComplete?: number; // 合同签署完成后是否通知用户
    waterMark?: number; // 是否添加日期水印
    autoSms?: number; // 是否自动触发验证码短信
    customSignFlag?: number; // 签章位置策略：0：指定位置，1：用户拖动
    signStrategyList?: Array<{
      attachNo: number; // 附件序号（从1开始）
      locationMode: number; // 定位方式：2：坐标签章，3：关键字签章，4：模板坐标签章（仅支持模板文件）
      signKey?: string; // 关键字或表单域名称
      signPage?: number; // 签章页码（从1开始）
      signX?: number; // X坐标（百分比，0-1）
      signY?: number; // Y坐标（百分比，0-1）
      signType?: number; // 签章类型：1：印章，2：时间戳
    }>;
    signStrikeList?: Array<{
      attachNo: number;
      signPage: string; // 骑缝章页码范围，如"1-3"
      signX?: number;
      signY?: number;
    }>;
    receiverFillStrategyList?: Array<{
      attachNo: number;
      key?: string; // 兼容多行文本填充
      signKey?: string; // 原有的signKey
      value?: string; // 多行文本的值
      defaultValue?: string; // 原有的defaultValue
      fillStage?: number; // 填充阶段：2=即时填充，3=页面填充
    }>;
    authConfig?: {
      idType?: string;
      idNumber?: string;
      name?: string;
      mobile?: string;
    };
    isIframe?: number; // H5人脸是否开启无Cookie模式
    willType?: string; // 视频双录核身模式：0：问答模式，1：播报模式
    signMark?: string; // 业务系统传递的唯一标识
  }>): Promise<any> {
    try {
      console.log('🔄 添加签署方（官方标准）:', signersData);

      // 验证必填参数
      for (const signer of signersData) {
        if (!signer.contractNo || !signer.account || !signer.signType) {
          throw new Error('缺少必填参数：contractNo、account、signType');
        }
      }

      // 构建请求数据（按照官方文档格式）
      const bizData = signersData.map(signer => ({
        contractNo: signer.contractNo,
        account: signer.account,
        signType: signer.signType,
        ...(signer.sealNo && { sealNo: signer.sealNo }),
        ...(signer.authSignAccount && { authSignAccount: signer.authSignAccount }),
        ...(signer.noticeMobile && { noticeMobile: signer.noticeMobile }),
        ...(signer.signOrder && { signOrder: signer.signOrder }),
        isNotice: signer.isNotice ?? 1, // 默认发送通知
        ...(signer.validateType && { validateType: signer.validateType }),
        ...(signer.faceAuthMode && { faceAuthMode: signer.faceAuthMode }),
        ...(signer.validateTypeList && { validateTypeList: signer.validateTypeList }),
        ...(signer.autoSwitch && { autoSwitch: signer.autoSwitch }),
        ...(signer.isNoticeComplete && { isNoticeComplete: signer.isNoticeComplete }),
        waterMark: signer.waterMark ?? 1, // 默认启用日期水印
        autoSms: signer.autoSms ?? 1, // 默认自动发送短信
        customSignFlag: signer.customSignFlag ?? 0, // 默认指定签章位置
        ...(signer.signStrategyList && { signStrategyList: signer.signStrategyList }),
        ...(signer.signStrikeList && { signStrikeList: signer.signStrikeList }),
        ...(signer.receiverFillStrategyList && { receiverFillStrategyList: signer.receiverFillStrategyList }),
        ...(signer.authConfig && { authConfig: signer.authConfig }),
        ...(signer.isIframe && { isIframe: signer.isIframe }),
        ...(signer.willType && { willType: signer.willType }),
        ...(signer.signMark && { signMark: signer.signMark })
      }));

      console.log('📋 构建的签署方数据:', JSON.stringify(bizData, null, 2));

      const response = await this.callESignAPI('/contract/addSigner', bizData);
      
      console.log('✅ 添加签署方成功:', response);
      // 直接返回爱签API的原始响应格式 { code, msg, data }
      return response;
    } catch (error) {
      console.error('❌ 添加签署方失败:', error);
      // 如果是爱签API错误，直接抛出让上层处理
      throw error;
    }
  }

  /**
   * 简化版添加签署方（适用于常见场景）
   */
  async addSimpleContractSigners(params: {
    contractNo: string;
    signers: Array<{
      account: string;
      name: string;
      mobile: string;
      signType?: 'auto' | 'manual'; // auto：无感知，manual：有感知
      validateType?: 'sms' | 'password' | 'face'; // 验证方式
      signPosition?: {
        page?: number;
        x?: number;
        y?: number;
        keyword?: string;
      };
    }>;
    signOrder?: 'sequential' | 'parallel'; // 签署顺序
    templateParams?: Record<string, any>; // 添加模板参数，用于处理多行文本填充
  }): Promise<any> {
    try {
      console.log('🔄 简化版添加签署方:', params);

      const signersData = await Promise.all(params.signers.map(async (signer, index) => {
        // 签署类型：2-无感知签章，3-有感知签章
        // 特殊处理：丙方（企业发起方）始终使用无感知签章
        let signType = signer.signType === 'auto' ? 2 : 3;
        
        // 如果是第三个及以后的签署人（通常是企业发起方），强制设置为无感知签章
        if (index >= 2) {
          signType = 2; // 无感知签章（自动签章）
          console.log(`🏢 检测到企业发起方（第${index + 1}个签署人），强制启用无感知签章`);
        }
        
        // 验证方式：1-短信验证码，2-签约密码，3-人脸识别
        let validateType = 1; // 默认短信验证
        if (signer.validateType === 'password') validateType = 2;
        if (signer.validateType === 'face') validateType = 3;

        // 构建签章策略
        const signStrategyList: any[] = [];
        
        if (signer.signPosition) {
          if (signer.signPosition.keyword) {
            // 关键字签章
            signStrategyList.push({
              attachNo: 1,
              locationMode: 3, // 关键字签章
              signKey: signer.signPosition.keyword,
              canDrag: 0, // 不允许拖动
              signType: 1 // 签名/签章
            });
          } else if (signer.signPosition.page && signer.signPosition.x !== undefined && signer.signPosition.y !== undefined) {
            // 坐标签章
            signStrategyList.push({
              attachNo: 1,
              locationMode: 2, // 坐标签章
              signPage: signer.signPosition.page,
              signX: parseFloat((signer.signPosition.x || 0.25).toFixed(2)),
              signY: parseFloat((signer.signPosition.y || 0.55).toFixed(2)),
              canDrag: 0, // 不允许拖动
              signType: 1 // 签名/签章
            });
          }
        } else {
          // 使用坐标签章（基于模板控件的实际坐标）
          // 根据签署人顺序确定签章位置
          let signKey: string;
          
          if (index === 0) {
            // 第一个签署人通常是甲方（客户）
            signKey = '甲方签名区';
          } else if (index === 1) {
            // 第二个签署人通常是乙方（阿姨）
            signKey = '乙方签名区';
          } else {
            // 第三个及以后的签署人（企业）
            signKey = '丙方签章区';
            
            // 🎯 关键修复：企业用户已在步骤1添加，这里需设置支持自动签约的印章权限
            try {
              console.log(`📋 为企业用户 ${signer.account} 设置自动签约印章权限（用户已在步骤1添加）...`);
              
              // 步骤1：确保企业有默认印章
              await this.setDefaultSeal(signer.account); 
              console.log(`✅ 企业用户 ${signer.account} 默认印章设置成功`);
              
              // 步骤2：🔑 关键 - 确保印章支持自动签约功能（根据官方要求）
              try {
                await this.enableAutoSignForSeal(signer.account);
                console.log(`✅ 企业用户 ${signer.account} 印章自动签约功能启用成功`);
              } catch (autoSignError) {
                console.warn(`⚠️ 启用印章自动签约功能失败: ${autoSignError.message}`);
                // 继续执行，但记录警告
              }
              
            } catch (sealError) {
              console.warn(`⚠️ 设置企业用户 ${signer.account} 印章权限失败: ${sealError.message}`);
              // 继续执行，可能用户已经有相关权限
            }
          }

          signStrategyList.push({
            attachNo: 1,
            locationMode: 4, // 🎯 修复：模板坐标签章（官方文档要求，该方式仅支持模板文件）
            signKey: signKey, // 模板中设置的签署区名称
            signType: 1, // 签名/签章
            canDrag: 0 // 不允许拖动
            // 注意：sealNo参数应该在顶层，不在signStrategyList中
          });
        }

        // 构建接收方模板填充策略（用于多行文本等控件）
        // 只在第一个签署人中添加模板填充策略，避免重复
        let receiverFillStrategyList: Array<{
          attachNo: number;
          key: string;
          value: string;
          fillStage?: number;
        }> = [];

        // 处理服务备注等多行文本字段（只在第一个签署人中处理）
        console.log(`🔍 处理签署人 ${index + 1}/${params.signers.length}: ${signer.name}`);
        console.log(`📋 templateParams存在: ${!!params.templateParams}`);
        
        if (index === 0 && params.templateParams) {
          console.log(`✅ 开始处理第一个签署人的模板填充策略`);
          
          Object.entries(params.templateParams).forEach(([key, value]) => {
            console.log(`🔍 检查字段: ${key} = ${typeof value === 'string' ? value.substring(0, 30) + '...' : value}`);
            
            if (key === '服务备注' || key.includes('服务备注') || key.includes('服务内容') || key.includes('服务项目')) {
              console.log(`✅ 字段匹配: ${key}`);
              
              if (value && typeof value === 'string' && value.trim()) {
                console.log(`✅ 值有效: ${typeof value}, 长度: ${value.length}`);
                
                // 对于多行文本，将分号分隔的内容转换为换行符分隔
                const multiLineContent = value.split('；')
                  .filter(item => item.trim())
                  .join('\n'); // 使用换行符连接多个服务项目
                
                receiverFillStrategyList.push({
                  attachNo: 1, // 合同附件序号
                  key: key, // 模板中的字段key
                  value: multiLineContent, // 多行文本内容
                  fillStage: 2 // 2=即时填充（接口调用时填充）
                });
                
                console.log(`🔄 添加多行文本填充策略: ${key} -> ${multiLineContent.substring(0, 50)}...`);
                console.log(`📝 完整的多行文本内容:\n${multiLineContent}`);
              } else {
                console.log(`❌ 值无效: ${typeof value}, 值: "${value}"`);
              }
            } else {
              console.log(`❌ 字段不匹配: ${key}`);
            }
          });
        } else {
          console.log(`❌ 跳过填充策略处理: index=${index}, templateParams=${!!params.templateParams}`);
        }
        
        console.log(`📊 最终receiverFillStrategyList长度: ${receiverFillStrategyList.length}`);

        // 构建签署人数据，严格按照爱签官方文档格式
        const signerData: any = {
          contractNo: params.contractNo,
          account: signer.account,
          signType: signType,
          signOrder: params.signOrder === 'sequential' ? (index + 1).toString() : '1',
          isNotice: 1,
          validateType: validateType,
          waterMark: 1, // 启用日期水印，自动显示签署日期
          autoSms: 1,
          customSignFlag: 0,
          signStrategyList: signStrategyList,
          ...(receiverFillStrategyList.length > 0 && { receiverFillStrategyList }),
          signMark: `${signer.name}_${Date.now()}`
        };

        // 🔑 关键修复：无感知签约（signType=2）不需要传递 noticeMobile 参数
        if (signType === 3) {
          // 有感知签约才需要手机号通知
          signerData.noticeMobile = signer.mobile;
          console.log(`📱 有感知签约用户 ${signer.name} 设置通知手机号: ${signer.mobile}`);
        } else {
          // 无感知签约不传递 noticeMobile 参数
          console.log(`🔑 无感知签约用户 ${signer.name} 跳过手机号参数（账号: ${signer.account}）`);
        }

        // 🔧 关键修复：为企业用户添加顶层sealNo参数，按照官方文档要求
        const isEnterpriseUser = signer.account.includes('company') || signer.account.includes('test_company') || index >= 2;
        if (isEnterpriseUser) {
          // 🎯 重要：根据官方文档，无感知签约用户不能自定义签章位置（错误码100111）
          // 因此不需要传sealNo，让系统使用企业的默认印章
          // signerData.sealNo = "DEFAULT"; // 注释掉，让系统自动使用默认印章
          console.log(`🏢 企业签署人将使用默认印章进行无感知签约: ${signer.account}`);
        }

        return signerData;
      }));

      // 调用标准的添加签署方方法，直接返回爱签API响应
      return await this.addContractSigners(signersData);
    } catch (error) {
      console.error('❌ 简化版添加签署方失败:', error);
      // 如果是爱签API错误，直接抛出让上层处理
      throw error;
    }
  }

  /**
   * 步骤4：获取合同状态和签署链接（增强版 - 支持精准状态解析）
   * API: /contract/status (根据官方文档)
   */
  async getContractStatus(contractNo: string): Promise<any> {
    try {
      console.log('🔄 步骤4：获取合同状态:', contractNo);

      const bizData = {
        contractNo: contractNo
      };

      // 使用正确的API端点：/contract/status（根据官方文档）
      const response = await this.callESignAPI('/contract/status', bizData);
      console.log('✅ 获取合同状态成功:', response);
      
      // 🎯 关键修复：添加精准状态解析
      let detailedStatus = null;
      
      try {
        // 如果有签署方信息，进行精准状态解析
        if (response.data && response.data.signUser) {
          console.log('📋 发现签署方信息，进行精准状态解析...');
          detailedStatus = this.parseDetailedContractStatus(response.data);
        } else {
          console.log('📋 无签署方信息，尝试通过预览API获取...');
          // 尝试通过预览API获取签署方信息
          const previewInfo = await this.getContractSignersFromPreview(contractNo);
          if (previewInfo) {
            detailedStatus = this.parseDetailedContractStatusFromPreview(response.data, previewInfo);
          } else {
            // 使用基础状态解析
            detailedStatus = this.parseBasicContractStatus(response.data);
          }
        }
      } catch (parseError) {
        console.warn('⚠️ 精准状态解析失败，使用基础状态:', parseError.message);
        detailedStatus = this.parseBasicContractStatus(response.data);
      }
      
      // 返回包含精准状态的响应
      const result = {
        ...response,
        detailedStatus: detailedStatus
      };
      
      console.log('✅ 合同状态解析完成:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取合同状态失败:', error);
      throw error;
    }
  }

  /**
   * 🎯 基础状态解析（当无法获取详细签署方信息时）
   */
  private parseBasicContractStatus(contractData: any): any {
    const status = contractData?.status;
    const baseStatusMap = {
      0: { text: '等待签约', color: 'orange', type: 'warning', summary: '合同已创建，等待签署' },
      1: { text: '签约中', color: 'blue', type: 'info', summary: '合同正在签署过程中' },
      2: { text: '已签约', color: 'green', type: 'success', summary: '合同已完成签署' },
      3: { text: '过期', color: 'red', type: 'error', summary: '合同已过期' },
      4: { text: '拒签', color: 'red', type: 'error', summary: '签署方拒绝签署' },
      6: { text: '作废', color: 'gray', type: 'warning', summary: '合同已作废' },
      7: { text: '撤销', color: 'gray', type: 'warning', summary: '合同已撤销' }
    };

    const statusInfo = baseStatusMap[status] || { 
      text: '未知状态', 
      color: 'gray', 
      type: 'default', 
      summary: '无法确定合同状态' 
    };

    return {
      ...statusInfo,
      detailed: false,
      source: 'basic'
    };
  }

  /**
   * 🔄 从合同预览获取签署方信息（备用方案）
   */
  private async getContractSignersFromPreview(contractNo: string): Promise<any> {
    try {
      console.log('🔍 从合同预览获取签署方信息:', contractNo);
      
      // 调用合同信息查询API获取签署方详情
      const contractInfo = await this.getContractInfo(contractNo);
      if (contractInfo.success && contractInfo.data) {
        const signers = contractInfo.data.signers || [];
        console.log('📋 从合同信息获取到签署方:', signers);
        return {
          signers: signers,
          source: 'contractInfo'
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ 从合同预览获取签署方信息失败:', error);
      return null;
    }
  }

  /**
   * 🎯 基于预览信息的精准状态解析
   */
  private parseDetailedContractStatusFromPreview(contractData: any, previewInfo: any): any {
    try {
      const { status: contractStatus } = contractData;
      const { signers = [] } = previewInfo;
      
      console.log('🔍 基于预览信息解析精准状态:');
      console.log('- 合同整体状态:', contractStatus);
      console.log('- 预览签署方信息:', signers);

      // 基础状态映射
      const baseStatusMap = {
        0: { text: '等待签约', color: 'orange', type: 'warning' },
        1: { text: '签约中', color: 'blue', type: 'info' },
        2: { text: '已签约', color: 'green', type: 'success' },
        3: { text: '过期', color: 'red', type: 'error' },
        4: { text: '拒签', color: 'red', type: 'error' },
        6: { text: '作废', color: 'gray', type: 'warning' },
        7: { text: '撤销', color: 'gray', type: 'warning' }
      };

      // 如果合同已完成签署，直接返回
      if (contractStatus === 2) {
        return {
          ...baseStatusMap[contractStatus],
          text: '已签约（双方完成签约）',
          detailed: true,
          signers: signers,
          summary: '合同签署已完成',
          source: 'preview'
        };
      }

      // 如果不是签约中状态，返回基础状态
      if (contractStatus !== 0 && contractStatus !== 1) {
        return {
          ...baseStatusMap[contractStatus],
          detailed: false,
          signers: signers,
          summary: `合同状态：${baseStatusMap[contractStatus]?.text || '未知'}`,
          source: 'preview'
        };
      }

      // 🎯 核心：基于预览信息的精准解析
      if (signers.length >= 2) {
        // 根据预览信息中的签署方状态进行解析
        // 假设第一个是甲方（客户），第二个是乙方（阿姨）
        const customer = signers[0];
        const worker = signers[1];

        console.log('👥 从预览信息识别的签署方:');
        console.log('- 甲方(客户):', customer);
        console.log('- 乙方(阿姨):', worker);

        if (customer && worker) {
          // 根据签署状态判断（status: 1=待签署, 2=已签署）
          const customerSigned = customer.status === 2;
          const workerSigned = worker.status === 2;

          console.log('📋 基于预览的签署状态:');
          console.log('- 客户已签约:', customerSigned);
          console.log('- 阿姨已签约:', workerSigned);

          // 精准状态判断
          let detailedText = '';
          let summary = '';

          if (!customerSigned && !workerSigned) {
            detailedText = '未签约（双方都未签约）';
            summary = '等待双方签署合同';
          } else if (customerSigned && !workerSigned) {
            detailedText = '阿姨未签约（乙方未签约）';
            summary = '客户已签约，等待阿姨签署';
          } else if (!customerSigned && workerSigned) {
            detailedText = '客户未签约（甲方未签约）';
            summary = '阿姨已签约，等待客户签署';
          } else {
            detailedText = '签约状态更新中';
            summary = '双方已签约，状态同步中';
          }

          return {
            text: detailedText,
            color: 'blue',
            type: 'info',
            detailed: true,
            signers: signers,
            summary: summary,
            customerSigned: customerSigned,
            workerSigned: workerSigned,
            customer: customer,
            worker: worker,
            source: 'preview'
          };
        }
      }

      // 回退到基础状态
      console.log('⚠️ 预览信息不足，回退到基础状态');
      return {
        ...baseStatusMap[contractStatus],
        detailed: false,
        signers: signers,
        summary: `合同状态：${baseStatusMap[contractStatus]?.text || '未知'}`,
        source: 'preview'
      };

    } catch (error) {
      console.error('❌ 基于预览信息的精准状态解析失败:', error);
      return {
        text: '状态解析中',
        color: 'blue',
        type: 'info',
        detailed: false,
        error: error.message,
        source: 'preview'
      };
    }
  }

  /**
   * 🎯 精准合同状态解析器
   * 根据签署方状态解析出具体的签约情况
   */
  private parseDetailedContractStatus(contractData: any): any {
    try {
      const { status: contractStatus, signers = [] } = contractData;
      
      console.log('🔍 开始精准状态解析:');
      console.log('- 合同整体状态:', contractStatus);
      console.log('- 签署方数量:', signers.length);
      console.log('- 签署方详情:', signers);

      // 基础状态映射
      const baseStatusMap = {
        0: { text: '等待签约', color: 'orange', type: 'warning' },
        1: { text: '签约中', color: 'blue', type: 'info' },
        2: { text: '已签约', color: 'green', type: 'success' },
        3: { text: '过期', color: 'red', type: 'error' },
        4: { text: '拒签', color: 'red', type: 'error' },
        6: { text: '作废', color: 'gray', type: 'warning' },
        7: { text: '撤销', color: 'gray', type: 'warning' }
      };

      // 如果合同已完成签署，直接返回
      if (contractStatus === 2) {
        return {
          ...baseStatusMap[contractStatus],
          text: '已签约（双方完成签约）',
          detailed: true,
          signers: signers,
          summary: '合同签署已完成'
        };
      }

      // 如果不是签约中状态，返回基础状态
      if (contractStatus !== 0 && contractStatus !== 1) {
        return {
          ...baseStatusMap[contractStatus],
          detailed: false,
          signers: signers,
          summary: `合同状态：${baseStatusMap[contractStatus]?.text || '未知'}`
        };
      }

      // 🎯 核心：签约中状态的精准解析
      if (signers.length >= 2) {
        // 识别签署方：按signOrder排序或按account特征识别
        const sortedSigners = signers.sort((a, b) => (a.signOrder || 999) - (b.signOrder || 999));
        
        // 甲方（客户）：通常是第一个签署方或account包含customer
        const customer = sortedSigners.find(s => 
          s.account?.includes('customer') || 
          s.account?.includes('client') ||
          s.signOrder === 1
        ) || sortedSigners[0];

        // 乙方（阿姨/工人）：通常是第二个签署方或account包含worker
        const worker = sortedSigners.find(s => 
          s.account?.includes('worker') || 
          s.account?.includes('staff') ||
          s.account?.includes('employee') ||
          s.signOrder === 2
        ) || sortedSigners[1];

        console.log('👥 识别的签署方:');
        console.log('- 甲方(客户):', customer);
        console.log('- 乙方(阿姨):', worker);

        if (customer && worker) {
          const customerSigned = customer.status === 2;
          const workerSigned = worker.status === 2;

          console.log('📋 签署状态:');
          console.log('- 客户已签约:', customerSigned);
          console.log('- 阿姨已签约:', workerSigned);

          // 精准状态判断
          let detailedText = '';
          let summary = '';

          if (!customerSigned && !workerSigned) {
            detailedText = '未签约（双方都未签约）';
            summary = '等待双方签署合同';
          } else if (customerSigned && !workerSigned) {
            detailedText = '阿姨未签约（乙方未签约）';
            summary = '客户已签约，等待阿姨签署';
          } else if (!customerSigned && workerSigned) {
            detailedText = '客户未签约（甲方未签约）';
            summary = '阿姨已签约，等待客户签署';
          } else {
            // 理论上不应该到这里，因为双方都签约了应该是status=2
            detailedText = '签约状态更新中';
            summary = '双方已签约，状态同步中';
          }

          return {
            text: detailedText,
            color: 'blue',
            type: 'info',
            detailed: true,
            signers: signers,
            summary: summary,
            customerSigned: customerSigned,
            workerSigned: workerSigned,
            customer: customer,
            worker: worker
          };
        }
      }

      // 回退到基础状态
      console.log('⚠️ 无法精准解析，回退到基础状态');
      return {
        ...baseStatusMap[contractStatus],
        detailed: false,
        signers: signers,
        summary: `合同状态：${baseStatusMap[contractStatus]?.text || '未知'}`
      };

    } catch (error) {
      console.error('❌ 精准状态解析失败:', error);
      // 发生错误时返回基础状态
      return {
        text: '状态解析中',
        color: 'blue',
        type: 'info',
        detailed: false,
        error: error.message
      };
    }
  }

  /**
   * 查询合同信息（包含预览链接）
   * API: /contract/getContract
   * 根据官方文档，这个接口会返回合同的详细信息，包括previewUrl
   */
  async getContractInfo(contractNo: string): Promise<any> {
    try {
      console.log('🔍 查询合同信息:', contractNo);

      const bizData = {
        contractNo: contractNo
      };

      const response = await this.callESignAPI('/contract/getContract', bizData);
      console.log('✅ 获取合同信息成功:', response);
      
      if (response.code === 100000) {
        return {
          success: true,
          contractNo,
          data: response.data,
          message: '获取合同信息成功'
        };
      } else {
        throw new Error(response.msg || '获取合同信息失败');
      }
    } catch (error) {
      console.error('❌ 获取合同信息失败:', error);
      throw new Error(`获取合同信息失败: ${error.message}`);
    }
  }

  /**
   * 步骤5：下载已签署合同（完善版本）
   * API: /contract/downloadContract
   * 支持官方文档中的所有参数
   */
  async downloadSignedContract(contractNo: string, options?: {
    force?: number; // 强制下载标识：0（默认）：未签署完的无法下载，1：无论什么状态都强制下载
    downloadFileType?: number; // 下载文件类型：1：PDF文件，2：多个单张PNG文件，含PDF文件，3：分页PNG压缩文件，含PDF文件，4：合同单张图片，不含PDF文件，5：所有分页图片，不含PDF文件
    outfile?: string; // 文件本地路径（可选）
  }): Promise<any> {
    try {
      console.log('🔄 步骤5：下载已签署合同:', contractNo, options);

      const bizData = {
        contractNo: contractNo,
        force: options?.force ?? 1, // 默认强制下载
        downloadFileType: options?.downloadFileType ?? 1, // 默认PDF文件
        ...(options?.outfile && { outfile: options.outfile })
      };

      const response = await this.callESignAPI('/contract/downloadContract', bizData);
      console.log('✅ 下载合同成功:', response.data);
      
      // 如果返回的是base64数据，我们需要处理
      if (response.data && response.data.data) {
        const downloadData = {
          ...response.data,
          // 提供额外的处理信息
          downloadInfo: {
            contractNo,
            fileName: response.data.fileName || `${contractNo}.pdf`,
            size: response.data.size,
            md5: response.data.md5,
            fileType: response.data.fileType,
            downloadFileType: bizData.downloadFileType,
            isBase64: !!response.data.data
          }
        };
        
        return downloadData;
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ 下载合同失败:', error);
      throw error;
    }
  }

  /**
   * 设置默认印章
   * API: /user/setDefaultSeal
   * 将指定印章设置为默认章，如果没有指定印章，则会将系统默认生成印章设置为默认章
   */
  async setDefaultSeal(account: string, sealNo?: string): Promise<any> {
    try {
      console.log(`🔧 为用户 ${account} 设置默认印章: ${sealNo || '系统默认章'}`);
      
      const bizData = {
        account: account,
        sealNo: sealNo || "e5a9b6ff9e754771b0c364f68f2c3717" // 官方默认章编号
      };

      const response = await this.callESignAPI('/user/setDefaultSeal', bizData);
      
      if (response.code === 100000) {
        console.log(`✅ 用户 ${account} 默认印章设置成功`);
      } else {
        console.warn(`⚠️ 用户 ${account} 默认印章设置失败: ${response.msg}`);
      }
      
      return response;
    } catch (error) {
      console.error(`❌ 设置默认印章失败:`, error);
      throw error;
    }
  }

  /**
   * 🔍 查询用户权限状态
   * API: /permission/query
   * 检查自动签署权限、默认印章权限等
   */
  async checkUserPermissions(account: string): Promise<any> {
    try {
      console.log(`🔍 查询用户权限状态: ${account}`);
      
      const bizData = {
        account: account
      };

      const response = await this.callESignAPI('/permission/query', bizData);
      
      if (response.code === 100000) {
        const permissionData = response.data || {};
        
        // 解析权限信息
        const autoSignEnabled = permissionData.autoSignEnabled || false;
        const defaultSealPermission = permissionData.defaultSealPermission || false;
        const permissionList = permissionData.permissionList || [];
        
        console.log(`✅ 用户 ${account} 权限查询成功:`);
        console.log(`  - 自动签署权限: ${autoSignEnabled ? '已开通' : '未开通'}`);
        console.log(`  - 默认印章权限: ${defaultSealPermission ? '已开通' : '未开通'}`);
        console.log(`  - 完整权限列表:`, permissionList);
        
        return {
          code: response.code,
          success: true,
          data: {
            account: account,
            autoSignEnabled: autoSignEnabled,
            defaultSealPermission: defaultSealPermission,
            permissionList: permissionList,
            rawData: permissionData
          },
          message: '权限查询成功'
        };
      } else {
        console.warn(`⚠️ 用户 ${account} 权限查询失败: ${response.msg}`);
        return {
          code: response.code,
          success: false,
          message: response.msg || '权限查询失败',
          data: response.data
        };
      }
    } catch (error) {
      console.error(`❌ 查询用户权限失败:`, error);
      return {
        success: false,
        message: `权限查询失败: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * 🔑 启用印章自动签约功能
   * 根据官方要求：印章需授权自动签约功能
   * 这个方法确保企业印章支持无感知签约
   */
  async enableAutoSignForSeal(account: string, sealNo?: string): Promise<any> {
    try {
      console.log(`🔑 为企业用户 ${account} 启用印章自动签约功能...`);
      
      // 方法1：尝试创建支持自动签约的企业印章
      try {
        const autoSealData = {
          account: account,
          sealName: '企业自动签约章',
          sealNo: sealNo || "AUTO_SIGN_SEAL", // 自动签约印章编号
        };
        
        const createSealResponse = await this.createEnterpriseSeal(autoSealData);
        console.log(`✅ 企业自动签约印章创建成功: ${account}`, createSealResponse);
        
        // 设置为默认印章
        if (createSealResponse.code === 100000) {
          await this.setDefaultSeal(account, autoSealData.sealNo);
        }
        
        return createSealResponse;
      } catch (createError) {
        console.warn(`⚠️ 创建自动签约印章失败，尝试其他方法: ${createError.message}`);
        
        // 方法2：如果创建失败，尝试获取现有印章列表并设置自动签约权限
        try {
          const sealListResponse = await this.getSealList({ account: account });
          console.log(`📋 获取企业印章列表: ${account}`, sealListResponse);
          
          if (sealListResponse.code === 100000 && sealListResponse.data && sealListResponse.data.length > 0) {
            // 使用第一个印章作为默认自动签约印章
            const firstSeal = sealListResponse.data[0];
            await this.setDefaultSeal(account, firstSeal.sealNo);
            console.log(`✅ 使用现有印章作为自动签约印章: ${firstSeal.sealNo}`);
            return { code: 100000, msg: '使用现有印章启用自动签约', sealNo: firstSeal.sealNo };
          } else {
            // 方法3：如果没有印章，使用系统默认章
            await this.setDefaultSeal(account);
            console.log(`✅ 使用系统默认章启用自动签约`);
            return { code: 100000, msg: '使用系统默认章启用自动签约' };
          }
        } catch (listError) {
          console.warn(`⚠️ 获取印章列表失败，使用默认方案: ${listError.message}`);
          // 最后方案：直接使用默认印章
          await this.setDefaultSeal(account);
          return { code: 100000, msg: '使用默认印章启用自动签约' };
        }
      }
    } catch (error) {
      console.error(`❌ 启用印章自动签约功能失败:`, error);
      // 不抛出异常，返回失败状态但继续执行
      return { code: -1, msg: `启用自动签约功能失败: ${error.message}` };
    }
  }

  /**
   * 通用爱签API调用方法（基于官方Java Demo规范）
   */
  private async callESignAPI(uri: string, bizData: any): Promise<any> {
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
      
      // 4. 生成签名
      const sign = this.generateOfficialSignature(appId, privateKey, bizDataString, timestamp);
      
             // 5. 构建FormData请求
       const FormData = require('form-data');
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

      return response.data;
    } catch (error) {
      console.error('爱签API调用失败:', error.response?.data || error.message);
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
  private generateOfficialSignature(appId: string, privateKey: string, dataString: string, timestamp: string): string {
    try {
      // 1. 计算dataString的MD5哈希值
      const md5Hash = crypto.createHash('md5').update(dataString, 'utf8').digest('hex');
      
      // 2. 构建待签名字符串：dataString + md5(dataString) + appId + timestamp
      const updateString = dataString + md5Hash + appId + timestamp;
      
      console.log('签名算法调试信息:');
      console.log('- appId:', appId);
      console.log('- timestamp:', timestamp);
      console.log('- dataString:', dataString);
      console.log('- md5Hash:', md5Hash);
      console.log('- updateString:', updateString);
      
      // 3. 准备私钥
      // 清理私钥格式，移除头尾标识和换行符
      let cleanPrivateKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
        .replace(/-----END RSA PRIVATE KEY-----/g, '')
        .replace(/\r?\n/g, '')
        .replace(/\s/g, '');
      
      console.log('- 清理后的私钥长度:', cleanPrivateKey.length);
      
      // 4. 构建完整的PKCS8格式私钥
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`;
      
      // 5. 使用SHA1withRSA算法签名
      const sign = crypto.createSign('RSA-SHA1');
      sign.update(updateString, 'utf8');
      const signature = sign.sign(privateKeyPEM, 'base64');
      
      // 6. 移除签名中的换行符（按照Java实现）
      const finalSignature = signature.replace(/\r\n/g, '');
      
      console.log('- 最终签名:', finalSignature);
      
      return finalSignature;
    } catch (error) {
      console.error('签名生成失败详细信息:', error);
      throw new Error(`签名生成失败: ${error.message}`);
    }
  }

  /**
   * 对象键按字母排序（官方要求）
   */
  private sortObjectKeys(obj: any): any {
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
   * 完整的合同创建和签署流程
   */
  async createCompleteContractFlow(params: {
    // 合同信息
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    // 签署人信息（支持多个签署人）
    signers?: Array<{
      name: string;
      mobile: string;
      idCard: string;
      signType?: 'auto' | 'manual';
      validateType?: 'sms' | 'password' | 'face';
    }>;
    // 兼容旧版本单个签署人参数
    signerName?: string;
    signerMobile?: string;
    signerIdCard?: string;
    // 可选参数
    validityTime?: number;
    signOrder?: number;
  }): Promise<{
    success: boolean;
    contractNo: string;
    signUrl?: string;
    signUrls?: Array<{ name: string; mobile: string; signUrl: string }>;
    message: string;
  }> {
    try {
      console.log('🚀 开始完整的合同创建和签署流程:', params);

      // 处理签署人信息（支持新旧两种格式）
      let signersData: Array<{
        name: string;
        mobile: string;
        idCard: string;
        signType: 'auto' | 'manual';
        validateType: 'sms' | 'password' | 'face';
      }> = [];

      if (params.signers && params.signers.length > 0) {
        // 新格式：多个签署人
        signersData = params.signers.map(signer => ({
          name: signer.name,
          mobile: signer.mobile,
          idCard: signer.idCard,
          signType: signer.signType || 'manual',
          validateType: signer.validateType || 'sms'
        }));
      } else if (params.signerName && params.signerMobile && params.signerIdCard) {
        // 旧格式：单个签署人（向后兼容）
        signersData = [{
          name: params.signerName,
          mobile: params.signerMobile,
          idCard: params.signerIdCard,
          signType: 'manual',
          validateType: 'sms'
        }];
      } else {
        throw new Error('缺少签署人信息，请提供signers数组或signerName/signerMobile/signerIdCard');
      }

      console.log('📝 处理后的签署人信息:', signersData);

      // 步骤1：为每个签署人添加陌生用户
      const signerAccounts: Array<{ name: string; mobile: string; account: string }> = [];
      
      for (const [index, signer] of signersData.entries()) {
        const signerAccount = `account_${Date.now()}_${index}`;
        
        await this.addStranger({
          account: signerAccount,
          userType: 2, // 个人用户
          name: signer.name,
          mobile: signer.mobile,
          idCard: signer.idCard,
          isNotice: 1, // 开启短信通知
          isSignPwdNotice: 0 // 不通知签约密码
        });

        signerAccounts.push({
          name: signer.name,
          mobile: signer.mobile,
          account: signerAccount
        });

        console.log(`✅ 签署人 ${signer.name} 添加成功，账户: ${signerAccount}`);
      }

      // 步骤2：创建合同
      await this.createContractWithTemplate({
        contractNo: params.contractNo,
        contractName: params.contractName,
        templateNo: params.templateNo,
        templateParams: params.templateParams,
        validityTime: params.validityTime,
        signOrder: params.signOrder
      });

      // 步骤3：添加所有签署方（使用模板坐标签章）
      const signerResult = await this.addSimpleContractSigners({
        contractNo: params.contractNo,
        signers: signerAccounts.map((signerAccount, index) => ({
          account: signerAccount.account,
          name: signerAccount.name,
          mobile: signerAccount.mobile,
          signType: signersData[index].signType,
          validateType: signersData[index].validateType
        })),
        signOrder: 'parallel', // 并行签署
        templateParams: params.templateParams // 传递模板参数用于多行文本填充
      });

      // 处理返回结果
      if (signersData.length === 1) {
        // 单个签署人：返回单个签署链接（向后兼容）
        const signUrl = signerResult?.signUrl || `https://prev.asign.cn/sign/${params.contractNo}`;
        console.log('✅ 完整流程执行成功，签署链接:', signUrl);

        return {
          success: true,
          contractNo: params.contractNo,
          signUrl: signUrl,
          message: '合同创建成功，签署链接已生成'
        };
      } else {
        // 多个签署人：返回多个签署链接
        const signUrls = signerAccounts.map(signerAccount => ({
          name: signerAccount.name,
          mobile: signerAccount.mobile,
          signUrl: `https://prev.asign.cn/sign/${params.contractNo}?account=${signerAccount.account}`
        }));

        console.log('✅ 完整流程执行成功，多个签署链接:', signUrls);

        return {
          success: true,
          contractNo: params.contractNo,
          signUrls: signUrls,
          message: `合同创建成功，已为${signersData.length}个签署人生成签署链接`
        };
      }

    } catch (error) {
      console.error('❌ 完整流程执行失败:', error);
      return {
        success: false,
        contractNo: params.contractNo,
        message: error.message || '合同创建失败'
      };
    }
  }

  /**
   * 基于官方爱签API创建模板合同（正确的实现）
   * 参考Java示例和官方文档
   */
  async createContractWithTemplate(contractData: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    validityTime?: number;
    signOrder?: number;
    [key: string]: any;
  }): Promise<any> {
    try {
      console.log('🔄 开始创建模板合同（官方API）:', contractData);

      // 构建请求参数，严格按照官方API文档
      console.log('🔥🔥🔥 即将调用convertToFillData方法');
      const fillData = this.convertToFillData(contractData.templateParams);
      console.log('🔥🔥🔥 convertToFillData调用完成，结果:', JSON.stringify(fillData, null, 2));
      
      const requestParams = {
        contractNo: contractData.contractNo,
        contractName: contractData.contractName,
        signOrder: contractData.signOrder || 1, // 1=无序签约，2=顺序签约
        validityTime: contractData.validityTime || 15, // 合同有效期（天）
        templates: [{
          templateNo: contractData.templateNo, // 平台分配的模板编号
          fillData: fillData, // 文本类填充
          componentData: this.convertToComponentData(contractData.templateParams) // 选择类填充
        }]
      };

      console.log('📋 发送到爱签API的请求参数:', JSON.stringify(requestParams, null, 2));

      // 调用官方API
      const response = await this.callESignAPI('/contract/createContract', requestParams);

      console.log('✅ 爱签API响应:', response);

      // 直接返回爱签API的原始响应格式 { code, msg, data }
      return response;
    } catch (error) {
      console.error('❌ 创建模板合同失败:', error);
      // 如果是爱签API错误，直接抛出让上层处理
      throw error;
    }
  }

  /**
   * 转换模板参数为fillData格式（文本类填充）
   */
  private convertToFillData(templateParams: Record<string, any>): Record<string, any> {
    const fillData: Record<string, any> = {};
    
    console.log('🔥🔥🔥 convertToFillData 开始处理 🔥🔥🔥');
    console.log('🔥 输入参数:', JSON.stringify(templateParams, null, 2));
    
    // 遍历所有模板参数，特殊处理不同类型的字段
    Object.entries(templateParams).forEach(([key, value]) => {
      console.log(`🔥 处理字段: "${key}" = ${JSON.stringify(value)} (类型: ${typeof value}, 是否数组: ${Array.isArray(value)})`);
      
      if (value !== null && value !== undefined && value !== '') {
        // 特殊处理：服务备注字段（多行文本类型，需要换行符分隔的字符串）
        // 扩展匹配条件，包含更多可能的字段名
        const isServiceField = key === '服务备注' || 
                              key.includes('服务备注') || 
                              key.includes('服务内容') || 
                              key.includes('服务项目') ||
                              key.includes('服务需求') ||
                              key === '服务需求' ||
                              key === '服务内容' ||
                              key === '服务项目';
        
        console.log(`🔥 字段"${key}"匹配检查: isServiceField=${isServiceField}`);
        
        if (isServiceField) {
          console.log(`🔥🔥 检测到服务相关字段: "${key}"`);
          console.log(`🔥🔥 字段值: ${JSON.stringify(value)}`);
          console.log(`🔥🔥 字段类型: ${typeof value}`);
          console.log(`🔥🔥 是否数组: ${Array.isArray(value)}`);
          
          if (Array.isArray(value)) {
            // 🔥 优先处理数组格式（前端Checkbox.Group可能直接传递数组）
            console.log(`🔥🔥🔥 开始处理数组格式: ${JSON.stringify(value)}`);
            const serviceLines = value.filter(item => item && item.trim()).join('\n');
            fillData[key] = serviceLines;
            console.log(`🔥🔥🔥 服务备注数组转换成功!`);
            console.log(`🔥🔥🔥 原始数组: [${value.join(', ')}]`);
            console.log(`🔥🔥🔥 转换结果: "${serviceLines}"`);
          } else if (typeof value === 'string' && value.includes('；')) {
            // 将分号分隔的字符串转换为换行符分隔的字符串（多行文本格式）
            console.log(`🔥🔥 开始处理分号分隔字符串: "${value}"`);
            const serviceLines = value.split('；').filter(item => item.trim()).join('\n');
            fillData[key] = serviceLines;
            console.log(`🔥🔥 服务备注字符串转换成功: "${value}" -> 多行文本:\n${serviceLines}`);
          } else {
            // 单个值保持字符串格式
            console.log(`🔥🔥 处理单个值: "${value}"`);
            fillData[key] = String(value);
            console.log(`🔥🔥 服务备注单值转换: "${value}" -> "${fillData[key]}"`);
          }
        } else {
          // 其他字段保持字符串格式
          fillData[key] = String(value);
          console.log(`➡️ 普通字段转换: "${key}" -> "${fillData[key]}"`);
        }
      } else {
        console.log(`⚠️ 跳过空值字段: "${key}" = ${value}`);
      }
    });

    console.log('🔥🔥🔥 转换后的fillData完整数据 🔥🔥🔥');
    console.log(JSON.stringify(fillData, null, 2));
    
    // 检查是否有服务相关字段
    const serviceFieldsInFillData = Object.keys(fillData).filter(key => 
      key.includes('服务') || key.includes('备注')
    );
    
    if (serviceFieldsInFillData.length > 0) {
      console.log('🔥🔥 fillData中包含的服务相关字段:', serviceFieldsInFillData);
      serviceFieldsInFillData.forEach(field => {
        console.log(`🔥  ${field}: ${fillData[field]}`);
      });
    } else {
      console.log('🔥🔥 ⚠️ fillData中未找到服务相关字段');
    }
    
    return fillData;
  }

  /**
   * 转换模板参数为componentData格式（选择类填充）
   * 目前主要处理勾选框类型的组件
   */
  private convertToComponentData(templateParams: Record<string, any>): Array<{
    type: number;
    keyword: string;
    defaultValue: string;
  }> {
    const componentData: Array<{
      type: number;
      keyword: string;
      defaultValue: string;
    }> = [];

    // 遍历模板参数，查找需要转换为组件数据的字段
    Object.entries(templateParams).forEach(([key, value]) => {
      // 如果字段名包含"同意"、"确认"、"勾选"等关键词，或者值为布尔类型
      if (typeof value === 'boolean' || 
          key.includes('同意') || 
          key.includes('确认') || 
          key.includes('勾选') ||
          key.includes('选择')) {
        componentData.push({
          type: 3, // 3=勾选组件
          keyword: key,
          defaultValue: value ? 'Yes' : 'Off'
        });
      }
    });

    console.log('🔘 转换后的componentData:', componentData);
    return componentData;
  }

  /**
   * 从爱签API获取真实的模板信息
   * 使用模板编号获取模板的字段配置
   */
  async getRealTemplateInfo(templateNo: string): Promise<any> {
    try {
      console.log('🔍 从爱签API获取模板信息:', templateNo);

      // 直接调用getTemplateData方法，它使用真正的爱签API
      const templateFields = await this.getTemplateData(templateNo);

      console.log('📋 爱签API返回的原始模板数据:', templateFields);

      // 转换为前端需要的格式
      const formattedTemplate = {
        templateNo: templateNo,
        templateName: '家政服务合同模板',
        description: '基于爱签平台的真实模板',
        fields: this.convertTemplateFieldsToFormFields(templateFields)
      };

      console.log('✅ 转换后的模板信息:', formattedTemplate);
      return formattedTemplate;
    } catch (error) {
      console.error('❌ 获取模板信息失败:', error);
      
      // 如果API调用失败，返回空字段列表，提示用户重试
      console.log('🔄 API调用失败，返回空模板');
      return {
        templateNo: templateNo,
        templateName: '模板加载失败',
        description: '无法从爱签API获取模板字段，请刷新页面重试',
        fields: []
      };
    }
  }

  /**
   * 将爱签API返回的模板字段转换为前端表单字段格式
   * 只使用爱签API返回的原始字段，不添加自定义字段
   * 彻底解决重复字段问题
   */
  private convertTemplateFieldsToFormFields(templateFields: any[]): any[] {
    console.log('🔍 开始转换爱签API原始模板字段，字段数量:', templateFields?.length);
    
    const formFields: any[] = [];
    const seenKeys = new Set();

    // 只处理从爱签API获取的原始字段
    if (Array.isArray(templateFields)) {
      templateFields.forEach((field, index) => {
        if (field.dataKey) {
          const fieldKey = field.dataKey;
          console.log(`🔍 处理字段 ${index + 1}/${templateFields.length}: ${fieldKey} (dataType: ${field.dataType})`);
          
          // 特殊处理：客户/甲方相关字段合并
          if (fieldKey === '客户姓名' || fieldKey === '签署人姓名' || fieldKey === '甲方姓名' || fieldKey === '甲方姓名（客户）') {
            if (seenKeys.has('甲方姓名_group')) {
              console.log(`⚠️  跳过重复的甲方姓名字段: ${fieldKey}`);
              return;
            } else {
              seenKeys.add('甲方姓名_group');
              seenKeys.add('客户姓名');
              seenKeys.add('签署人姓名');
              seenKeys.add('甲方姓名');
              seenKeys.add('甲方姓名（客户）');
              const formField = {
                key: '甲方姓名',
                label: '甲方姓名（客户）',
                type: this.getFieldTypeByDataType(field.dataType),
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加甲方姓名字段: 甲方姓名 (合并了客户姓名、签署人姓名、甲方姓名)`);
              return;
            }
          }

          // 客户/甲方电话字段合并
          if (fieldKey === '客户电话' || fieldKey === '甲方联系电话') {
            if (seenKeys.has('甲方电话_group')) {
              console.log(`⚠️  跳过重复的甲方电话字段: ${fieldKey}`);
              return;
            } else {
              seenKeys.add('甲方电话_group');
              seenKeys.add('客户电话');
              seenKeys.add('甲方联系电话');
              const formField = {
                key: '甲方联系电话',
                label: '甲方联系电话',
                type: this.getFieldTypeByDataType(field.dataType),
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加甲方电话字段: 甲方联系电话 (合并了客户电话、甲方联系电话)`);
              return;
            }
          }

          // 客户/甲方身份证号字段合并
          if (fieldKey === '客户身份证号' || fieldKey === '身份证号' || fieldKey === '甲方身份证号') {
            if (seenKeys.has('甲方身份证_group')) {
              console.log(`⚠️  跳过重复的甲方身份证字段: ${fieldKey}`);
              return;
            } else {
              seenKeys.add('甲方身份证_group');
              seenKeys.add('客户身份证号');
              seenKeys.add('身份证号');
              seenKeys.add('甲方身份证号');
              const formField = {
                key: '甲方身份证号',
                label: '甲方身份证号',
                type: this.getFieldTypeByDataType(field.dataType),
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加甲方身份证字段: 甲方身份证号 (合并了客户身份证号、身份证号、甲方身份证号)`);
              return;
            }
          }

          // 客户/甲方地址字段合并
          if (fieldKey === '客户联系地址') {
            if (seenKeys.has('甲方地址_group')) {
              console.log(`⚠️  跳过重复的甲方地址字段: ${fieldKey}`);
              return;
            } else {
              seenKeys.add('甲方地址_group');
              seenKeys.add('客户联系地址');
              const formField = {
                key: '客户联系地址',
                label: '甲方联系地址',
                type: this.getFieldTypeByDataType(field.dataType),
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加甲方地址字段: 客户联系地址`);
              return;
            }
          }

          // 特殊处理：匹配费相关字段只保留第一个
          if (fieldKey === '匹配费' || fieldKey === '匹配费大写') {
            if (seenKeys.has('匹配费_group')) {
              console.log(`⚠️  跳过重复的匹配费字段: ${fieldKey}`);
              return;
            } else {
              seenKeys.add('匹配费_group');
              seenKeys.add('匹配费');
              seenKeys.add('匹配费大写');
              const formField = {
                key: '匹配费',
                label: '匹配费',
                type: this.getFieldTypeByDataType(field.dataType),
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加匹配费字段: 匹配费 (合并了匹配费和匹配费大写)`);
              return;
            }
          }
          
          // 阿姨工资相关字段只保留第一个
          if (fieldKey === '阿姨工资' || fieldKey === '阿姨工资大写') {
            if (seenKeys.has('阿姨工资_group')) {
              console.log(`⚠️  跳过重复的阿姨工资字段: ${fieldKey}`);
              return;
            } else {
              seenKeys.add('阿姨工资_group');
              seenKeys.add('阿姨工资');
              seenKeys.add('阿姨工资大写');
              const formField = {
                key: '阿姨工资',
                label: '阿姨工资',
                type: this.getFieldTypeByDataType(field.dataType),
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加阿姨工资字段: 阿姨工资 (合并了阿姨工资和阿姨工资大写)`);
              return;
            }
          }
          
          // 服务费相关字段只保留第一个
          if (fieldKey === '服务费' || fieldKey === '大写服务费') {
            if (seenKeys.has('服务费_group')) {
              console.log(`⚠️  跳过重复的服务费字段: ${fieldKey}`);
              return;
            } else {
              seenKeys.add('服务费_group');
              seenKeys.add('服务费');
              seenKeys.add('大写服务费');
              const formField = {
                key: '服务费',
                label: '服务费',
                type: this.getFieldTypeByDataType(field.dataType),
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加服务费字段: 服务费 (合并了服务费和大写服务费)`);
              return;
            }
          }

          // 甲乙丙方字段特殊处理：只保留checkbox类型，跳过text类型
          if (fieldKey === '甲方' || fieldKey === '乙方' || fieldKey === '丙方') {
            const fieldType = this.getFieldTypeByDataType(field.dataType);
            
            // 如果是text类型的甲乙丙方字段，直接跳过
            if (fieldType === 'text') {
              console.log(`⚠️  跳过text类型的${fieldKey}字段`);
              return;
            }
            
            // checkbox类型的甲乙丙方字段，检查是否已存在
            if (seenKeys.has(fieldKey)) {
              console.log(`⚠️  跳过重复的${fieldKey}字段`);
              return;
            } else {
              seenKeys.add(fieldKey);
              const formField = {
                key: fieldKey,
                label: fieldKey,
                type: fieldType,
                required: field.required === 1,
                originalField: field
              };
              formFields.push(formField);
              console.log(`✅ 添加${fieldKey}字段: ${fieldKey} (只保留checkbox类型)`);
              return;
            }
          }
          
          // 其他字段正常处理 - 严格去重
          if (!seenKeys.has(fieldKey)) {
            seenKeys.add(fieldKey);
            
            // 特殊处理：服务备注字段，添加预定义选项
            let options = undefined;
            console.log(`🔍 检查字段: ${fieldKey}, dataType: ${field.dataType}`);
            if (fieldKey === '服务备注' && field.dataType === 8) {
              // 为服务备注字段添加预定义的选项
              const serviceOptions = [
                '做饭', '做早餐', '做午餐', '做晚餐', '买菜', '熨烫衣服', '洗衣服', '打扫卫生',
                '照顾老人', '照顾孩子', '辅助照顾老人\\孩子',
                '科学合理的喂养指导，保障婴幼儿生长发育的营养需要',
                '婴幼儿洗澡、洗头、清洗五官',
                '婴幼儿换洗衣物、尿不湿等，保障婴幼儿卫生、干爽、预防尿布疹',
                '为婴幼儿进行抚触、被动操、安抚哭闹、呵护入睡',
                '随时对婴幼儿的身体状况（如摄入量、大小便、皮肤、体温等）进行观察，协助护理婴幼儿常见疾病。',
                '婴幼儿房间的卫生、通风，奶瓶、餐具的清洁消毒',
                '婴幼儿的早期教育和正确引导',
                '婴幼儿的辅食制作及喂养',
                '做儿童早餐', '做儿童中餐', '做儿童晚餐',
                '手洗儿童衣服', '熨烫儿童衣服', '整理儿童玩具、书籍',
                '接送孩子上学、课外辅导'
              ];
              
              options = serviceOptions.map((option, index) => ({
                label: option,
                value: option,
                selected: false,
                index: index
              }));
              
              console.log(`✅ 为服务备注字段添加了 ${serviceOptions.length} 个预定义选项`);
            } else if (field.options && Array.isArray(field.options)) {
              // 处理爱签API原有的options字段
              options = field.options.map((opt: any) => ({
                label: opt.label,
                value: opt.label,
                selected: opt.selected,
                index: opt.index
              }));
            }
            
            const formField = {
              key: fieldKey,
              label: fieldKey, // 使用原始字段名作为标签
              type: this.getFieldTypeByDataType(field.dataType),
              required: field.required === 1,
              originalField: field, // 保留原始字段信息
              options: options // 可能包含服务备注的预定义选项或爱签API的选项
            };
            
            formFields.push(formField);
            console.log(`✅ 添加爱签原始字段: ${fieldKey} (类型: ${field.dataType}, options: ${options ? options.length : 0})`);
          } else {
            console.log(`⚠️  跳过重复字段: ${fieldKey}`);
          }
        }
      });
    }

    console.log(`🔍 去重后字段数量: ${formFields.length} (原始: ${templateFields?.length})`);
    console.log('📋 最终字段列表:', formFields.map(f => f.key));
    
    return formFields;
  }

  /**
   * 根据爱签API的数据类型转换为表单控件类型
   */
  private getFieldTypeByDataType(dataType: number): string {
    switch (dataType) {
      case 1: // 单行文本
        return 'text';
      case 2: // 多行文本
        return 'textarea';
      case 3: // 数字
        return 'number';
      case 4: // 日期
        return 'date';
      case 5: // 选择框
        return 'select';
      case 6: // 勾选框
        return 'checkbox';
      default:
        return 'text';
    }
  }

  /**
   * 获取真实的模板列表（从爱签API）
   */
  async getRealTemplateList(): Promise<any[]> {
    try {
      console.log('🔍 获取真实模板列表');

      // 目前使用已知的模板编号
      const knownTemplateNo = 'TNF606E6D81E2D49C99CC983F4D0412276-3387';
      
      // 获取模板信息
      const templateInfo = await this.getRealTemplateInfo(knownTemplateNo);
      
      return [templateInfo];
    } catch (error) {
      console.error('❌ 获取模板列表失败:', error);
      
      // 返回空模板列表，提示用户重试
      return [{
        templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387',
        templateName: '模板加载失败',
        description: '无法从爱签API获取模板字段，请刷新页面重试',
        fields: []
      }];
    }
  }

  /**
   * 预览合同（根据官方文档优化：基于合同状态处理预览逻辑）
   * - 签约中状态（Status=1）：可以正常预览，显示已签署方签名和待签署位置
   * - 签约完成状态（Status=2）：提示下载合同进行预览
   * - 其他状态：根据情况处理
   */
  /**
   * 预览合同 - 根据官方文档实现
   * @param contractNo 合同编号
   * @param signers 签署人配置（可选）
   */
  async previewContract(contractNo: string, signers?: Array<{
    account: string;
    signStrategyList: Array<{
      attachNo: number;
      locationMode: number;
      signPage: number;
      signX: number;
      signY: number;
      signKey?: string;
    }>;
    isWrite?: number;
  }>): Promise<any> {
    try {
      console.log('🔍 预览合同:', contractNo);

      // 首先检查合同编号格式，如果不是真实的爱签合同编号，返回模拟预览
      if (contractNo.startsWith('CONTRACT_')) {
        console.log('📋 检测到本地生成的合同编号，返回模拟预览信息');
        return {
          success: true,
          contractNo,
          contractStatus: 1,
          statusText: '签约中',
          message: '合同正在签署中，可预览当前签署进度',
          previewData: null, // 没有真实预览数据
          fallbackMode: true,
          previewInfo: {
            canDownload: false,
            hasPreviewImage: false,
            contractSigning: true,
            statusText: '签约中',
            recommendation: '这是本地生成的合同编号，需要真实的爱签合同编号才能预览。请先完成爱签合同创建流程。',
            availableFormats: [
              { type: 'info', name: '状态信息', recommended: true, description: '合同信息查看' }
            ]
          }
        };
      }

      // 步骤1: 首先获取合同状态，根据状态决定预览策略
      let contractStatus = null;
      try {
        console.log('📋 步骤1: 获取合同状态');
        const statusResult = await this.getContractStatus(contractNo);
        contractStatus = statusResult.data?.status;
        console.log('✅ 合同状态:', this.getContractStatusText(contractStatus));
      } catch (statusError) {
        console.log('⚠️ 获取合同状态失败，尝试其他方案:', statusError.message);
      }

      // 步骤2: 根据合同状态处理预览逻辑
      if (contractStatus === 2) {
        // 签约完成状态：提示下载合同
        console.log('📋 合同已签约完成，建议下载合同进行预览');
        return {
          success: true,
          contractNo,
          contractStatus: 2,
          statusText: '签约完成',
          message: '合同已签约完成，请下载合同进行预览',
          shouldDownload: true,
          previewInfo: {
            canDownload: true,
            shouldDownload: true,
            contractCompleted: true,
            statusText: '签约完成',
            recommendation: '合同已签约完成，建议下载PDF文件进行查看',
            availableFormats: [
              { type: 1, name: 'PDF文件', recommended: true, description: '完整签署版本' },
              { type: 2, name: 'PNG图片+PDF', description: '图片格式+PDF' },
              { type: 3, name: '分页PNG压缩+PDF', description: '分页图片压缩包' }
            ]
          }
        };
      } else if (contractStatus === 1) {
        // 签约中状态：可以预览，显示签署进度
        console.log('📋 合同签约中，可以预览当前签署状态');
        
        try {
          // 🔥 根据3.1.9版本的预览参数配置
          if (!signers || signers.length === 0) {
            // 使用3.1.9版本的默认预览配置
            signers = [
              {
                account: 'preview_user_1',
                isWrite: 0,
                signStrategyList: [
                  {
                    attachNo: 1,
                    locationMode: 4, // 模板坐标签章
                    signKey: '甲方',
                    signPage: 1,
                    signX: 0.1,
                    signY: 0.1
                  }
                ]
              },
              {
                account: 'preview_user_2',
                isWrite: 0,
                signStrategyList: [
                  {
                    attachNo: 1,
                    locationMode: 4, // 模板坐标签章
                    signKey: '乙方',
                    signPage: 1,
                    signX: 0.6,
                    signY: 0.1
                  }
                ]
              }
            ];
          }

          // 🔥 根据3.1.9版本的正确实现：传递多个签署人的数组
          const previewRequestData = signers.map(signer => ({
            contractNo,
            account: signer.account,
            isWrite: signer.isWrite || 0,
            signStrategyList: signer.signStrategyList
          }));

          console.log('📋 调用预览合同API，请求参数:', JSON.stringify(previewRequestData, null, 2));
          
          const result = await this.callESignAPI('/contract/previewContract', previewRequestData);
          console.log('📋 预览合同API响应:', result);
          
          if (result.code === 100000) {
            // 成功获取预览数据
            return {
              success: true,
              contractNo,
              contractStatus: 1,
              statusText: '签约中',
              previewData: result.data, // 这应该是base64编码的图片或预览URL
              message: '合同预览生成成功（签约中状态）',
              method: 'previewContract',
              previewInfo: {
                canDownload: false,
                hasPreviewImage: !!result.data,
                contractSigning: true,
                statusText: '签约中',
                recommendation: '合同正在签署中，可预览当前签署进度',
                availableFormats: [
                  { type: 'preview', name: '在线预览', recommended: true, description: '查看当前签署状态' }
                ]
              }
            };
          } else {
            // API调用失败，记录错误信息
            console.log('❌ 预览合同API失败:', result.msg, '错误码:', result.code);
            
            // 根据错误码提供具体的错误信息
            let errorMessage = result.msg || 'previewContract接口失败';
            let recommendation = '请联系管理员处理';
            
            switch (result.code) {
              case 100034:
                errorMessage = '模板不存在';
                recommendation = '请检查合同模板配置';
                break;
              case 100054:
                errorMessage = '签约用户错误';
                recommendation = '请检查签约用户配置';
                break;
              case 100056:
                errorMessage = '合同编号为空';
                recommendation = '请提供有效的合同编号';
                break;
              case 100066:
                errorMessage = '合同不存在';
                recommendation = '请检查合同编号是否正确';
                break;
              case 100084:
                errorMessage = '签约人不存在';
                recommendation = '请先添加签约人';
                break;
              case 100613:
                errorMessage = '合同已删除';
                recommendation = '该合同已被删除，无法预览';
                break;
            }
            
            return {
              success: false,
              contractNo,
              contractStatus: 1,
              statusText: '签约中',
              message: `预览失败: ${errorMessage}`,
              error: true,
              previewInfo: {
                canDownload: false,
                hasPreviewImage: false,
                error: true,
                statusText: '签约中',
                recommendation,
                errorCode: result.code,
                availableFormats: []
              }
            };
          }
        } catch (previewError) {
          console.log('⚠️ 签约中状态预览失败:', previewError.message);
          
          return {
            success: false,
            contractNo,
            contractStatus: 1,
            statusText: '签约中',
            message: `预览合同时发生错误: ${previewError.message}`,
            error: true,
            previewInfo: {
              canDownload: false,
              hasPreviewImage: false,
              error: true,
              statusText: '签约中',
              recommendation: '网络错误或服务异常，请稍后重试',
              availableFormats: []
            }
          };
        }
      }

      // 步骤3: 尝试使用getContract接口获取预览链接（适用于其他状态）
      try {
        console.log('📋 步骤3: 尝试使用getContract接口');
        const contractInfo = await this.getContractInfo(contractNo);
        
        if (contractInfo.success && contractInfo.data?.previewUrl) {
          console.log('✅ 成功获取预览链接:', contractInfo.data.previewUrl);
          
          return {
            success: true,
            contractNo,
            contractStatus: contractInfo.data.status,
            statusText: this.getContractStatusText(contractInfo.data.status),
            previewUrl: contractInfo.data.previewUrl,
            embeddedUrl: contractInfo.data.embeddedUrl,
            contractInfo: contractInfo.data,
            message: '获取合同预览链接成功',
            method: 'getContract',
            previewInfo: {
              canDownload: contractInfo.data.status === 2,
              hasPreviewUrl: true,
              hasEmbeddedUrl: !!contractInfo.data.embeddedUrl,
              contractStatus: contractInfo.data.status,
              statusText: this.getContractStatusText(contractInfo.data.status),
              contractName: contractInfo.data.contractName,
              validityTime: contractInfo.data.validityTime,
              signUsers: contractInfo.data.signUser || [],
              availableFormats: [
                { type: 'preview', name: '在线预览', recommended: true },
                { type: 'embedded', name: '嵌入式预览' },
                ...(contractInfo.data.status === 2 ? [{ type: 'download', name: 'PDF下载' }] : [])
              ]
            }
          };
        }
      } catch (getContractError) {
        console.log('⚠️ getContract接口调用失败:', getContractError.message);
      }

      // 步骤4: 最后回退方案
      return {
        success: false,
        contractNo,
        contractStatus,
        statusText: this.getContractStatusText(contractStatus),
        message: '无法获取合同预览，请稍后重试',
        fallbackMode: true,
        previewInfo: {
          canDownload: contractStatus === 2,
          hasPreviewImage: false,
          error: true,
          statusText: this.getContractStatusText(contractStatus),
          recommendation: contractStatus === 2 ? '建议下载合同进行查看' : '请联系管理员处理',
          availableFormats: contractStatus === 2 ? [
            { type: 1, name: 'PDF文件', recommended: true },
            { type: 2, name: 'PNG图片+PDF' },
            { type: 3, name: '分页PNG压缩+PDF' }
          ] : []
        }
      };
    } catch (error) {
      console.error('❌ 预览合同失败:', error);
      
      // 即使出错，也尝试返回合同状态信息，而不是直接抛出异常
      try {
        console.log('🔄 预览失败，尝试获取合同状态作为回退信息');
        const statusResult = await this.getContractStatus(contractNo);
        const contractStatus = statusResult.data?.status;
        
        return {
          success: false,
          contractNo,
          contractStatus,
          statusText: this.getContractStatusText(contractStatus),
          message: `预览合同失败: ${error.message}`,
          error: true,
          previewInfo: {
            canDownload: contractStatus === 2,
            error: true,
            statusText: this.getContractStatusText(contractStatus),
            recommendation: contractStatus === 2 ? 
              '合同已签约完成，建议下载PDF文件查看' : 
              '请联系管理员处理预览问题',
            availableFormats: contractStatus === 2 ? [
              { type: 1, name: 'PDF文件', recommended: true, description: '完整签署版本' },
              { type: 2, name: 'PNG图片+PDF', description: '图片格式+PDF' }
            ] : []
          }
        };
      } catch (statusError) {
        console.error('❌ 获取合同状态也失败:', statusError);
        // 如果连状态都获取不到，才抛出异常
        throw new Error(`预览合同失败: ${error.message}`);
      }
    }
  }

  /**
   * 获取合同状态文本描述
   */
  private getContractStatusText(status: number): string {
    const statusMap = {
      0: '等待签约',
      1: '签约中', 
      2: '已签约',
      3: '过期',
      4: '拒签',
      6: '作废',
      7: '撤销',
      '-2': '状态异常'
    };
    return statusMap[status] || '未知状态';
  }

  /**
   * 撤销合同
   * 根据官方文档实现撤销合同功能
   * @param contractNo 合同唯一编码
   * @param withdrawReason 撤销原因，最多50字
   * @param isNoticeSignUser 是否短信通知签署用户，默认false
   */
  async withdrawContract(
    contractNo: string, 
    withdrawReason?: string, 
    isNoticeSignUser: boolean = false
  ): Promise<any> {
    try {
      console.log('🔍 撤销合同:', contractNo);

      // 构建撤销合同请求数据（按照官方文档）
      const withdrawData: any = {
        contractNo,
        isNoticeSignUser
      };

      // 可选字段：撤销原因（最多50字）
      if (withdrawReason && withdrawReason.trim()) {
        withdrawData.withdrawReason = withdrawReason.slice(0, 50); // 限制50字
      }

      console.log('📋 撤销合同请求数据:', JSON.stringify(withdrawData, null, 2));

      // 调用爱签撤销合同API
      const result = await this.callESignAPI('/contract/withdraw', withdrawData);
      
      console.log('✅ 撤销合同响应:', result);

      if (result.code === 100000) {
        return {
          success: true,
          contractNo,
          message: '合同撤销成功',
          data: result.data
        };
      } else {
        throw new Error(result.msg || '撤销合同失败');
      }
    } catch (error) {
      console.error('❌ 撤销合同失败:', error);
      
      // 处理特定的错误码
      if (error.response?.data?.code) {
        const errorCode = error.response.data.code;
        const errorMsg = error.response.data.msg;
        
        switch (errorCode) {
          case 101000:
            throw new Error('合同已签署完成，请通过作废接口完成作废操作');
          case 101001:
            throw new Error('合同已撤销，不能重复撤销');
          case 101002:
            throw new Error('合同已作废，不能再次撤销');
          case 100613:
            throw new Error('合同已删除');
          case 0:
            throw new Error('合同不存在');
          default:
            throw new Error(errorMsg || '撤销合同失败');
        }
      }
      
      throw new Error(`撤销合同失败: ${error.message}`);
    }
  }

  /**
   * 作废合同（针对已签署完成的合同）
   * @param contractNo 合同唯一编码
   * @param invalidReason 作废原因
   * @param isNoticeSignUser 是否短信通知签署用户，默认false
   */
  async invalidateContract(
    contractNo: string, 
    invalidReason?: string, 
    isNoticeSignUser: boolean = false
  ): Promise<any> {
    try {
      console.log('🔍 作废合同:', contractNo);

      // 构建作废合同请求数据
      const invalidateData: any = {
        contractNo,
        isNoticeSignUser
      };

      // 可选字段：作废原因
      if (invalidReason && invalidReason.trim()) {
        invalidateData.invalidReason = invalidReason;
      }

      console.log('📋 作废合同请求数据:', JSON.stringify(invalidateData, null, 2));

      // 调用爱签作废合同API
      const result = await this.callESignAPI('/contract/invalid', invalidateData);
      
      console.log('✅ 作废合同响应:', result);

      if (result.code === 100000) {
        return {
          success: true,
          contractNo,
          message: '合同作废成功',
          data: result.data
        };
      } else {
        throw new Error(result.msg || '作废合同失败');
      }
    } catch (error) {
      console.error('❌ 作废合同失败:', error);
      throw new Error(`作废合同失败: ${error.message}`);
    }
  }

  /**
   * 智能撤销/作废合同
   * 根据合同状态自动选择撤销或作废操作
   * @param contractNo 合同唯一编码
   * @param reason 撤销/作废原因
   * @param isNoticeSignUser 是否短信通知签署用户
   */
  async cancelContract(
    contractNo: string, 
    reason?: string, 
    isNoticeSignUser: boolean = false
  ): Promise<any> {
    try {
      console.log('🔍 智能撤销/作废合同:', contractNo);

      // 首先尝试撤销合同
      try {
        const withdrawResult = await this.withdrawContract(contractNo, reason, isNoticeSignUser);
        return {
          ...withdrawResult,
          action: 'withdraw',
          message: '合同撤销成功'
        };
      } catch (withdrawError) {
        // 如果是101000错误码（合同已签署完成），则尝试作废
        if (withdrawError.message.includes('已签署完成')) {
          console.log('🔄 合同已签署完成，尝试作废操作...');
          const invalidateResult = await this.invalidateContract(contractNo, reason, isNoticeSignUser);
          return {
            ...invalidateResult,
            action: 'invalidate',
            message: '合同作废成功'
          };
        }
        
        // 其他错误直接抛出
        throw withdrawError;
      }
    } catch (error) {
      console.error('❌ 智能撤销/作废合同失败:', error);
      throw error;
    }
  }

  /**
   * 简单预览合同方法 - 严格按照官方文档实现
   */
  async simplePreviewContract(contractNo: string): Promise<any> {
    try {
      console.log('🔍 简单预览合同:', contractNo);

      // 构建符合官方文档的请求参数
      const previewParams = {
        contractNo: contractNo,
        account: "USER_12345",  // 用户唯一标识
        isWrite: 0,             // 0=非手写章
        signStrategyList: [
          {
            attachNo: 1,        // 第一个文件
            locationMode: 2,    // 坐标签章
            signPage: 1,        // 第一页
            signX: 0.75,        // 右侧位置
            signY: 0.90         // 底部位置
          }
        ]
      };

      console.log('📋 预览请求参数:', JSON.stringify(previewParams, null, 2));
      
      const result = await this.callESignAPI('/contract/previewContract', previewParams);
      console.log('📋 预览API响应:', result);
      
      if (result.code === 100000) {
        return {
          success: true,
          contractNo,
          previewData: result.data,
          message: '合同预览成功',
          method: 'simplePreview'
        };
      } else {
        return {
          success: false,
          contractNo,
          error: result.msg,
          errorCode: result.code,
          message: `预览失败: ${result.msg}`
        };
      }
    } catch (error) {
      console.error('简单预览合同失败:', error);
      return {
        success: false,
        contractNo,
        error: error.message,
        message: `预览异常: ${error.message}`
      };
    }
  }
}
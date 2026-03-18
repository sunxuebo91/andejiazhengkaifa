import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import { Contract, ContractDocument } from '../contracts/models/contract.model';
import { Customer, CustomerDocument } from '../customers/models/customer.model';
import { NotificationGateway } from '../notification/notification.gateway';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AppLogger } from '../../common/logging/app-logger';
import { RequestContextStore } from '../../common/logging/request-context';

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
  private readonly logger = new AppLogger(ESignService.name);
  private axiosInstance: AxiosInstance;
  private config: ESignConfig;

  constructor(
    private configService: ConfigService,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>, // 注入合同模型
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @Inject(forwardRef(() => NotificationGateway))
    private notificationGateway: NotificationGateway,
  ) {
    // 爱签OpenAPI配置 - 使用正确的域名
    const defaultPrivateKey = `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCORZpy+TPUZCdm2Wf9iqRp6YJ2IE2kzf1c9jZNx6/dkQGWtbx+tp1YBPYeC1sAv/7OjTsowRRJ318dUZ1TONtk59yZj8lCFtkRe53fDbnQKk3mW4rVeFBn4pQ/ya2dEM+jZOdjLKTHWNtUD7cyVl4qagsX+8TCoFBJ9lPypM0imvF1WcsLv9WgkID9+jvD0Nfa4XSTEQSzS1AroEmX9eOX87yTYTMFZNj0OcuDUf8ifwhcz1Qoa2k9NAMhUK9Gjw+4XI7P8FUj+2051A9yFu2LpoiLnDk6y+nbCSmW3WbJT59u1jNz/sGujG6LitYQCzKJIRGs8FGbNSA7p0MgjfyJAgMBAAECggEAXeuVClF45b04Ra0/+SCNaV29wj2RBDr4B2aCctZgQuR3KAbRaNUlCfY8g5j7eoNEsxaI915/BkVvhOtb8JSYQQTPnJBPTFHI+sGgdp+ZCtLimi/Udxf1/J6XP4TkF8wBRtxV5CKUpQUDxXqadaCOiXF34V1ThyhN2IXE5WnmAfFBk271ovsiTlRM9OlGzgyhWXqULBpADdI+LkHYrtZYaMVcGDloAlU881D0e38Hgtb7Z8TB7qyZwZjc4Y5aeYujyEFSTXNU2vPcwaWO2gYSHfgq6H3a3aST9htYQk02EDnsPB2zdls7Q6SNJGeKiXEsJcivCQV9Sh49TS5Yobm0AQKBgQD8Y+P98timrfqZULK1VJ10lTxKSj+ORejCjoWU6Hsn4yNVFG9P7HSRN4IkOLpeOG9/ptaveAjqY9hwilv4Glx7XGyKaQy5h6sgqljM0/Cq28n8hQNbjMJ11IadwTsvmx0F2ht+5ZG2IfqcJyOiir4n+lnNJhzUflVR95bIC0fk7wKBgQCQToWnHw1mj2wWM8ZqFVWRoF4UF1AQsvUJ0uEaRGiDSRZvRgNOS1JeB54Lkp5tZnjSkHqrM4SHSSchxUeshbk4+aKbCVE6M1zYXLjj8hi+r8z3wvKY+QXAXVSjhF7aOadCihElSixfb/qfNwa78OBqnHpEzPQE+R0cZkSEdJjmBwKBgFfTFqHmoFcX0U0KVLVelU/dIlajkYwbbYxN9dPENh7CHihb7QP9vu5NR379MnTY5Iuh7bCvb0LIraczrh8eZTIUDjz3oxLoT7cVL8NOuL9rrdSuIGX6DCzeYF2CwOqm6imAJPM6RUMAfelagT7tUpAswJTvfza+I0hbhF9l9YWHAoGAR7P8jRHM4s0Y898+E7AOGJIKrQj4a5PAVeVGnHqpQ7KpRxkOw3SBtN8sFKwBtHJaTqYjjbXHgEFFBG62Mm8vnbPMrCRxC+5Bj/BinkDJMta/jcx8Jq51wSOezrETQHOtPE7GPjUg3zsQ2NPKsM/7cn3V8yGzjlUJtfbKzNXyszkCgYEA9rt1fn9khwIHFCd7qdB+/zUTwD4mzTZ3V1QtZHdIvz+s9uudbIs9IOrJmR3JYBX6Nay5BY2noFZyyYkZMGKFaCqZzEJT+i64vus6VMCNZAu7dnWCpDoQkKegLFTnCBiMBW9TRC4wi4dTYeVL/iEUE6AKRe4rvU86+wzzwi+5ntw=`;

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

    // 最后使用默认私钥（转换为PEM格式）
    if (!this.config.privateKey) {
      this.config.privateKey = defaultPrivateKey;
      this.logger.warn('esign.private_key.using_builtin_default');
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

  /**
   * 上传合同文档
   */
  async uploadDocument(fileBuffer: Buffer, fileName: string): Promise<string> {
    try {
      this.logger.info('esign.document_upload.start', { fileName, size: fileBuffer.length });
      
      // 如果没有私钥，返回模拟的文件ID
      if (!this.config.privateKey) {
        this.logger.warn('esign.document_upload.mock_used', { fileName });
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
      this.logger.error('esign.document_upload.failed', error, { fileName });
      throw new BadRequestException(`上传文档失败: ${error.message}`);
    }
  }

  /**
   * 创建签署流程
   */
  async createSignFlow(signRequest: SignRequest): Promise<{ signFlowId: string; signUrl: string }> {
    try {
      this.logger.info('esign.sign_flow.create_start', {
        contractId: signRequest.contractId,
        documentTitle: signRequest.documentTitle,
        signerCount: signRequest.signers.length,
      });
      
      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        this.logger.warn('esign.sign_flow.create_mock_used', {
          contractId: signRequest.contractId,
        });
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
      this.logger.error('esign.sign_flow.create_failed', error, {
        contractId: signRequest.contractId,
      });
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
        this.logger.warn('esign.sign_flow.status_mock_used', { signFlowId });
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
      this.logger.error('esign.sign_flow.status_failed', error, { signFlowId });
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
        this.logger.warn('esign.document_download.mock_used', { signFlowId, documentId });
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
      this.logger.error('esign.document_download.failed', error, {
        signFlowId,
        documentId,
      });
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
      this.logger.info('esign.template_contract.create_start', {
        contractName: params.contractName,
        templateId: params.templateId,
        signerCount: params.signers.length,
      });
      
      // 如果没有私钥，返回模拟结果
      if (!this.config.privateKey) {
        this.logger.warn('esign.template_contract.create_mock_used', {
          templateId: params.templateId,
        });
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
      this.logger.error('esign.template_contract.create_failed', error, {
        templateId: params.templateId,
        contractName: params.contractName,
      });
      throw new BadRequestException(`使用模板创建合同失败: ${error.message}`);
    }
  }

  /**
   * 获取模板详情
   */
  async getTemplateInfo(templateId: string): Promise<any> {
    try {
      this.logger.info('esign.template.info_fetch_start', { templateId });
      
      const response = await this.axiosInstance.get<ESignResponse<any>>(
        `/v1/files/template/${templateId}`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取模板详情失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('esign.template.info_fetch_failed', error, { templateId });
      throw new BadRequestException(`获取模板详情失败: ${error.message}`);
    }
  }

  /**
   * 获取模板列表
   */
  async getTemplateList(): Promise<any> {
    try {
      this.logger.info('esign.template.list_fetch_start');
      
      const response = await this.axiosInstance.get<ESignResponse<any>>(
        '/v1/files/templates'
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取模板列表失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('esign.template.list_fetch_failed', error);
      throw new BadRequestException(`获取模板列表失败: ${error.message}`);
    }
  }

  /**
   * 根据模板ID获取模板字段信息
   */
  async getTemplateFields(templateId: string): Promise<any> {
    try {
      this.logger.info('esign.template.fields_fetch_start', { templateId });
      
      const response = await this.axiosInstance.get<ESignResponse<any>>(
        `/v1/files/template/${templateId}/fields`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取模板字段失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('esign.template.fields_fetch_failed', error, { templateId });
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
   * 🔥 过滤掉签署方占位符字段（甲方、乙方、丙方等），这些字段由后端自动处理
   * 🔥 使用与 CRM 端相同的过滤逻辑（convertTemplateFieldsToFormFields）
   */
  async getTemplateData(templateIdent: string): Promise<any> {
    try {
      console.log('🔍 使用官方API获取模板控件信息:', templateIdent);

      // 使用官方的 /template/data 接口
      const response = await this.callESignAPI('/template/data', {
        templateIdent: templateIdent
      });

      console.log('📋 官方API模板控件信息响应 - response.code:', response.code);
      console.log('📋 官方API模板控件信息响应 - response.msg:', response.msg);
      console.log('📋 官方API模板控件信息响应 - response.data类型:', typeof response.data);
      console.log('📋 官方API模板控件信息响应 - response.data是否为数组:', Array.isArray(response.data));

      if (response.code !== 100000) {
        throw new BadRequestException(`获取模板控件信息失败: ${response.msg}`);
      }

      // 🔥 使用与 CRM 端相同的过滤和去重逻辑
      // 过滤规则：
      // 1. dataType = 6 (签名区) 或 7 (签章区/印章) 或 15 (备注签署区) 的字段
      // 2. 字段名包含"签名区"、"签章区"、"签署区"、"印章"的字段
      // 3. 去重：同一个 dataKey 只保留第一次出现的字段
      let filteredData = response.data;
      if (response.data && Array.isArray(response.data)) {
        console.log('📋 官方API返回的原始字段数量:', response.data.length);

        // 第一步：过滤签署字段
        const afterFilter = response.data.filter((field: any) => {
          if (!field.dataKey) {
            return false; // 跳过没有dataKey的字段
          }

          const fieldKey = field.dataKey;

          // 🔥 过滤签名区、签章区等不需要用户填写的字段
          // dataType: 6=签署区, 7=签章区/印章, 15=备注签署区
          if (field.dataType === 6 || field.dataType === 7 || field.dataType === 15) {
            console.log(`⚠️  过滤签名/签章字段: ${fieldKey} (dataType: ${field.dataType})`);
            return false;
          }

          // 🔥 过滤签名区、签章区相关的字段名
          const lowerKey = fieldKey.toLowerCase();
          if (lowerKey.includes('签名区') || lowerKey.includes('签章区') ||
              lowerKey.includes('签署区') || lowerKey.includes('印章')) {
            console.log(`⚠️  过滤签名相关字段: ${fieldKey}`);
            return false;
          }

          // 🔥 过滤甲乙丙方占位符字段（与 CRM 端逻辑一致）
          // 这些是签名/印章位置字段，由爱签平台在签署时自动处理，不需要用户填写
          if (fieldKey === '甲方' || fieldKey === '乙方' || fieldKey === '丙方') {
            console.log(`⚠️  过滤签名位置字段: ${fieldKey} (dataType: ${field.dataType})`);
            return false;
          }

          // 其他字段保留
          return true;
        });

        console.log('📋 过滤签署字段后的数量:', afterFilter.length);

        // 第二步：去重 - 使用与 CRM 端相同的逻辑
        const seenKeys = new Set<string>();
        filteredData = [];

        for (const field of afterFilter) {
          const fieldKey = field.dataKey;

          // 如果已经见过这个字段，跳过
          if (seenKeys.has(fieldKey)) {
            console.log(`⚠️  跳过重复字段: ${fieldKey} (page: ${field.page})`);
            continue;
          }

          // 标记为已见过
          seenKeys.add(fieldKey);
          filteredData.push(field);
          console.log(`✅ 保留字段: ${fieldKey} (page: ${field.page}, dataType: ${field.dataType})`);
        }

        console.log('📋 去重后的字段数量:', filteredData.length);
        console.log('📋 过滤掉的字段数量:', response.data.length - filteredData.length);
        console.log('📋 前3个保留字段示例:', JSON.stringify(filteredData.slice(0, 3), null, 2));
      }

      // 🔥 返回过滤和去重后的字段数组
      return filteredData;
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
      console.log('添加企业用户:', userData);

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

      const response = await this.axiosInstance.post<ESignResponse<any>>(
        '/v2/accounts/createByThirdPartyUserId',
        {
          thirdPartyUserId: userData.account,
          name: userData.name,
          idType: userData.idType,
          idNumber: userData.idNumber,
          mobile: '', // 企业用户可能没有手机号
          accountType: 1, // 1表示企业
          orgInfo: {
            orgLegalIdNumber: userData.orgLegalIdNumber,
            orgLegalName: userData.orgLegalName,
          }
        }
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`添加企业用户失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('添加企业用户失败:', error);
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
      const notifyUrl = this.config.notifyUrl;
      const requestData = {
        contractNo: params.contractNo,
        contractName: params.contractName,
        signOrder: 2,
        validityTime: 365, // 365天有效期
        notifyUrl: notifyUrl, // 🔥 合同全部签完后回调（status=2）
        userNotifyUrl: notifyUrl, // 🔥 某个用户签完后回调（甲方签完通知）
        callbackUrl: notifyUrl, // 🔥 过期/拒签/失败时回调（status=3,4,-3）
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
        signOrder: contractData.signOrder || 2, // 🔥 默认顺序签约：客户先签→阿姨后签
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

      // 添加可选参数 - 使用默认回调URL确保能收到通知
      const notifyUrl = contractData.notifyUrl || this.config.notifyUrl;
      requestData['notifyUrl'] = notifyUrl; // 🔥 合同全部签完后回调
      requestData['userNotifyUrl'] = notifyUrl; // 🔥 某个用户签完后回调（甲方签完通知）
      requestData['callbackUrl'] = notifyUrl; // 🔥 过期/拒签/失败时回调
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
          signOrder: 2, // 🔥 顺序签约：客户先签→阿姨后签
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
      
      // 基于爱签模板ID TN84E8C106BFE74FD3AE36AC2CA33A44DE 的预期控件
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
    // 针对模板 TN84E8C106BFE74FD3AE36AC2CA33A44DE 的控件配置
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
      locationMode: number; // 定位方式：1：关键字，2：坐标，3：表单域，4：二维码
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
        isNotice: signer.isNotice ?? 0, // 🔕 默认不发送通知
        ...(signer.validateType && { validateType: signer.validateType }),
        ...(signer.faceAuthMode && { faceAuthMode: signer.faceAuthMode }),
        ...(signer.validateTypeList && { validateTypeList: signer.validateTypeList }),
        ...(signer.autoSwitch && { autoSwitch: signer.autoSwitch }),
        ...(signer.isNoticeComplete && { isNoticeComplete: signer.isNoticeComplete }),
        waterMark: signer.waterMark ?? 1, // 默认启用日期水印
        autoSms: signer.autoSms ?? 0, // 🔕 默认不自动发送短信
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

        // 🔥 使用模板坐标签章（locationMode: 4），复用模板中配置好的签章区
        // 签章区名称必须与模板中配置的一致：甲方、乙方、丙方
        let signKey: string;

        if (index === 0) {
          // 第一个签署人：甲方（客户）
          signKey = '甲方';
        } else if (index === 1) {
          // 第二个签署人：乙方（阿姨）
          signKey = '乙方';
        } else {
          // 第三个及以后的签署人：丙方（企业）
          signKey = '丙方';

          // 为企业用户设置默认印章
          try {
            console.log(`🔧 为企业用户 ${signer.account} 设置默认印章...`);
            await this.setDefaultSeal(signer.account, "5f0e3bd2fc744bd8b500576e60b17711");
            console.log(`✅ 企业用户 ${signer.account} 默认印章设置完成`);
          } catch (error) {
            console.warn(`⚠️ 为企业用户 ${signer.account} 设置默认印章失败: ${error.message}`);
          }
        }

        const signStrategyList = [{
          attachNo: 1,
          locationMode: 4, // 模板坐标签章（复用模板配置）
          signKey: signKey,
          signType: 1, // 签名/签章
          canDrag: 0   // 不允许拖动
        }];

        console.log(`📝 签署人 ${index + 1} (${signer.name}) 签章策略: signKey=${signKey}`);

        // 构建接收方模板填充策略（用于多行文本等控件）
        // 只在第一个签署人中添加模板填充策略，避免重复
        let receiverFillStrategyList: Array<{
          attachNo: number;
          key: string;
          value: string;
          fillStage?: number;
        }> = [];

        // 处理服务备注等多行文本字段（只在第一个签署人中处理）
        // 🔥🔥🔥 注意："服务内容"已改为多选控件(dataType=9)，在 createContractWithTemplate 的
        //        componentData 中处理，不能再放入 receiverFillStrategyList，否则爱签报 100629
        console.log(`🔍 处理签署人 ${index + 1}/${params.signers.length}: ${signer.name}`);
        console.log(`📋 templateParams存在: ${!!params.templateParams}`);

        // 🔥🔥🔥 2025-03-11 关键修复：移除 receiverFillStrategyList 逻辑
        // 原因：receiverFillStrategyList 用于"签署时填充"场景，要求模板中配置"签署方可填充"控件。
        // 当前模板 TN84E8C106BFE74FD3AE36AC2CA33A44DE 没有此类控件，所有字段都是预填充的。
        // 如果设置了 receiverFillStrategyList，爱签会报错 100629: "此合同附件无该用户的填充策略"
        //
        // 正确做法：所有字段数据应通过 createContractWithTemplate 的 fillData 参数预填充，
        // 而不是在添加签署方时通过 receiverFillStrategyList 填充。
        //
        // 如果将来需要"签署时填充"功能，需要：
        // 1. 在爱签模板中配置"签署方可填充"控件
        // 2. 在 receiverFillStrategyList 中指定对应字段的 key
        // 3. 设置 fillStage=1（待签署时填充）或 fillStage=2（即时填充）

        console.log(`📋 签署人 ${index + 1}/${params.signers.length}: ${signer.name}`);
        console.log(`⚠️ 不设置 receiverFillStrategyList（当前模板没有"签署方可填充"控件，所有字段已通过 fillData 预填充）`);
        console.log(`📊 receiverFillStrategyList长度: ${receiverFillStrategyList.length}（保持为空）`);

        // 构建签署人数据，严格按照爱签官方文档格式
        const signerData: any = {
          contractNo: params.contractNo,
          account: signer.account,
          signType: signType,
          signOrder: params.signOrder === 'sequential' ? (index + 1).toString() : '1',
          isNotice: 0, // 🔕 不发送短信通知
          validateType: validateType,
          waterMark: 1, // 启用日期水印，自动显示签署日期
          autoSms: 0, // 🔕 不自动发送短信
          customSignFlag: 0,
          signStrategyList: signStrategyList, // 使用模板坐标签章策略
          ...(receiverFillStrategyList.length > 0 && { receiverFillStrategyList }),
          signMark: `${signer.name}_${Date.now()}`
        };

        // 🔧 关键修复：只为甲方和乙方设置noticeMobile，企业用户不设置
        if (index < 2 && signer.mobile) {
          signerData.noticeMobile = signer.mobile;
          console.log(`📱 为${index === 0 ? '甲方' : '乙方'}设置通知手机号: ${signer.mobile}`);
        } else if (index >= 2) {
          console.log(`🏢 企业用户不设置noticeMobile字段，避免长度限制错误`);
        }

        // 🔧 关键修复：为丙方（企业）添加顶层sealNo参数，按照官方文档要求
        if (index >= 2) {
          signerData.sealNo = "5f0e3bd2fc744bd8b500576e60b17711"; // 企业默认印章编号
          console.log(`🏢 为企业签署人设置顶层sealNo参数: ${signerData.sealNo}`);
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
   * 步骤4：获取合同状态和签署链接
   * API: /contract/status (根据官方文档)
   * 🔥 增强：同时获取签署方详细信息，用于前端显示签署状态
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

      // 🔥 增强：尝试获取签署方详细信息
      if (response.code === 100000 && response.data) {
        try {
          // 调用 getContract 接口获取签署方信息
          const contractInfoResult = await this.getContractInfo(contractNo);

          if (contractInfoResult.success && contractInfoResult.data?.signUser) {
            const signUsers = contractInfoResult.data.signUser;

            console.log('🔍 爱签返回的签署方原始数据:', JSON.stringify(signUsers, null, 2));

            // 将签署方信息添加到响应中
            response.data.signUsers = signUsers.map((user: any, index: number) => {
              // 🔥 修复：使用多种方式判断角色
              // 按照创建合同时的顺序：第1个是客户(甲方)，第2个是阿姨(乙方)，第3个是企业(丙方)
              let role = '签署方';
              const userName = user.name || '';

              // 🔥 方法1：根据名称关键词判断
              if (userName.includes('企业') || userName.includes('公司') || userName.includes('安得') || userName.includes('家政')) {
                role = '丙方（企业）';
              } else if (userName.includes('客户') || userName.includes('甲方') || userName.includes('雇主')) {
                role = '甲方（客户）';
              } else if (userName.includes('阿姨') || userName.includes('乙方') || userName.includes('服务人员') || userName.includes('保姆') || userName.includes('育儿嫂')) {
                role = '乙方（阿姨）';
              }
              // 🔥 方法2：如果名称没有关键词，根据 userType 判断（1=企业，0=个人）
              else if (user.userType === 1) {
                role = '丙方（企业）';
              }
              // 🔥 方法3：如果以上都不满足，根据索引判断
              else if (index === 0) {
                role = '甲方（客户）';
              } else if (index === 1) {
                role = '乙方（阿姨）';
              } else if (index >= 2) {
                role = '丙方（企业）';
              }

              console.log(`🔍 签署方 ${index}: name=${user.name}, userType=${user.userType}, signOrder=${user.signOrder}, role=${role}`);

              return {
                account: user.account,
                name: user.name || `签署方${index + 1}`,
                role: role,
                phone: user.mobile || user.phone,
                signStatus: user.signStatus,
                signStatusText: this.getSignStatusText(user.signStatus || 0),
                signTime: user.signTime,
                signOrder: user.signOrder || (index + 1),
                userType: user.userType // 0=个人, 1=企业
              };
            });

            console.log('✅ 获取签署方信息成功:', JSON.stringify(response.data.signUsers, null, 2));
          }
        } catch (signersError) {
          console.warn('⚠️ 获取签署方信息失败，但不影响主流程:', signersError.message);
        }
      }

      return response;
    } catch (error) {
      console.error('❌ 获取合同状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取合同签署链接
   * 使用合同预览接口获取签署方信息和链接
   */
  async getContractSignUrls(contractNo: string): Promise<any> {
    try {
      console.log('🔄 获取合同签署链接:', contractNo);

      // 使用合同预览接口获取签署方信息（这个接口返回完整的signUser数据）
      const previewResult = await this.previewContractWithSignUrls(contractNo);

      if (!previewResult.success) {
        throw new Error(previewResult.message || '获取合同信息失败');
      }

      const signUsers = previewResult.signUsers || [];
      if (signUsers.length === 0) {
        throw new Error('该合同暂无签署方信息，请确保已添加签署人');
      }

      console.log('📋 签署方列表:', signUsers);

      // 构建签署链接数据
      const signUrls = signUsers.map((user: any, index: number) => {
        // 根据签署顺序判断角色
        let role = '签署方';
        if (user.signOrder === 1 || index === 0) {
          role = '甲方（客户）';
        } else if (user.signOrder === 2 || index === 1) {
          role = '乙方（服务人员）';
        } else if (user.signOrder === 3 || index === 2) {
          role = '丙方（企业）';
        }

        console.log(`🔍 签署方 ${index + 1}: signOrder=${user.signOrder}, index=${index}, role=${role}, name=${user.name}, signUrl=${user.signUrl}`);

        // 如果是企业签署方且没有签署链接，说明使用的是无感知签章（自动签章）
        let signUrl = user.signUrl;
        if (!signUrl && (index >= 2 || role.includes('丙方'))) {
          signUrl = '无需签署（企业自动签章）';
          console.log(`ℹ️ 企业签署方使用无感知签章，无需签署链接`);
        }

        return {
          name: user.name || '未知',
          mobile: user.phone || user.account,
          role: role,
          signUrl: signUrl, // 从预览接口获取的签署链接
          account: user.account,
          signOrder: user.signOrder || (index + 1),
          status: user.signStatus || 1, // 1=待签署, 2=已签署
          statusText: user.statusText || '待签署',
          userType: user.userType || 0, // 0=个人, 1=企业
        };
      });

      console.log('✅ 签署链接获取成功:', JSON.stringify(signUrls, null, 2));

      return {
        success: true,
        data: {
          signUrls,
          contractNo,
        },
        message: '签署链接获取成功',
      };
    } catch (error) {
      console.error('❌ 获取签署链接失败:', error);
      throw error;
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
        sealNo: sealNo || "5f0e3bd2fc744bd8b500576e60b17711" // 官方默认章编号
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

      console.log('🔐 [callESignAPI] 签名前数据:');
      console.log('  - URI:', uri);
      console.log('  - appId:', appId);
      console.log('  - timestamp:', timestamp);
      console.log('  - bizDataString (前100字符):', bizDataString.substring(0, 100));

      // 4. 生成签名
      const sign = this.generateOfficialSignature(appId, privateKey, bizDataString, timestamp);

      console.log('  - 生成的签名 (前50字符):', sign.substring(0, 50));

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

      console.log('✅ [callESignAPI] 请求成功，响应码:', response.data?.code);
      return response.data;
    } catch (error) {
      console.error('❌ [callESignAPI] 爱签API调用失败:', error.response?.data || error.message);
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

      console.log('🔐 [generateOfficialSignature] 签名算法调试信息:');
      console.log('  - appId:', appId);
      console.log('  - timestamp:', timestamp);
      console.log('  - dataString (前200字符):', dataString.substring(0, 200));
      console.log('  - dataString 长度:', dataString.length);
      console.log('  - md5Hash:', md5Hash);
      console.log('  - updateString (前200字符):', updateString.substring(0, 200));
      console.log('  - updateString 长度:', updateString.length);

      // 3. 准备私钥
      // 清理私钥格式，移除头尾标识和换行符
      let cleanPrivateKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
        .replace(/-----END RSA PRIVATE KEY-----/g, '')
        .replace(/\r?\n/g, '')
        .replace(/\s/g, '');

      console.log('  - 清理后的私钥长度:', cleanPrivateKey.length);
      console.log('  - 私钥前50字符:', cleanPrivateKey.substring(0, 50));

      // 4. 构建完整的PKCS8格式私钥
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`;

      // 5. 使用SHA1withRSA算法签名
      const sign = crypto.createSign('RSA-SHA1');
      sign.update(updateString, 'utf8');
      const signature = sign.sign(privateKeyPEM, 'base64');

      // 6. 移除签名中的换行符（按照Java实现）
      const finalSignature = signature.replace(/\r\n/g, '').replace(/\n/g, '');

      console.log('  - 签名长度:', finalSignature.length);
      console.log('  - 最终签名 (前100字符):', finalSignature.substring(0, 100));

      return finalSignature;
    } catch (error) {
      console.error('❌ [generateOfficialSignature] 签名生成失败详细信息:', error);
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

      // 步骤1：为每个签署人添加陌生用户（区分个人用户和企业用户）
      const signerAccounts: Array<{ name: string; mobile: string; account: string }> = [];

      // 🔥 企业账号（丙方）使用固定的已实名企业账号
      const ENTERPRISE_ACCOUNT = 'ASIGN91110111MACJMD2R5J';
      const ENTERPRISE_NAME = '北京安得家政有限公司';

      for (const [index, signer] of signersData.entries()) {
        // 🔥 判断是否是企业用户（第3个签署人或名称包含"公司"）
        const isEnterprise = index >= 2 || signer.name.includes('公司') || signer.name.includes('企业');

        if (isEnterprise) {
          // 企业用户：使用固定的已实名企业账号
          signerAccounts.push({
            name: ENTERPRISE_NAME,
            mobile: signer.mobile,
            account: ENTERPRISE_ACCOUNT
          });
          console.log(`🏢 企业签署人 ${ENTERPRISE_NAME} 使用已有账户: ${ENTERPRISE_ACCOUNT}`);
        } else {
          // 个人用户：创建新账户
          const signerAccount = `account_${Date.now()}_${index}`;

          // 🔥 修复：检查 addStranger 的返回结果
          const addStrangerResult = await this.addStranger({
            account: signerAccount,
            userType: 2, // 个人用户
            name: signer.name,
            mobile: signer.mobile,
            idCard: signer.idCard,
            isNotice: 0, // 🔕 不发送短信通知
            isSignPwdNotice: 0 // 不通知签约密码
          });

          // 🔥 检查用户创建是否成功（爱签返回100000表示成功，100049表示用户已存在也算成功）
          if (addStrangerResult && addStrangerResult.code !== 100000 && addStrangerResult.code !== 100049) {
            const errorMsg = addStrangerResult?.msg || '添加陌生用户失败';
            const errorCode = addStrangerResult?.code || 'UNKNOWN';
            console.error(`❌ 爱签添加陌生用户失败: code=${errorCode}, msg=${errorMsg}`);
            throw new Error(`爱签添加签署人失败: ${errorMsg} (错误码: ${errorCode})`);
          }

          signerAccounts.push({
            name: signer.name,
            mobile: signer.mobile,
            account: signerAccount
          });

          console.log(`✅ 签署人 ${signer.name} 添加成功，账户: ${signerAccount}`);
        }
      }

      // 步骤2：创建合同（🔥 支持合同编号重复时自动重试）
      let contractNo = params.contractNo;
      let createResult: any = null;
      const maxContractRetries = 3; // 最多重试3次

      for (let retryCount = 0; retryCount < maxContractRetries; retryCount++) {
        createResult = await this.createContractWithTemplate({
          contractNo: contractNo,
          contractName: params.contractName,
          templateNo: params.templateNo,
          templateParams: params.templateParams,
          validityTime: params.validityTime,
          signOrder: 2,
          notifyUrl: this.config.notifyUrl // 🔥 添加回调URL，确保爱签在合同状态变化时通知我们
        });

        // 🔥 检查是否是合同编号重复错误（100055）
        if (createResult?.code === 100055) {
          // 生成新的合同编号并重试
          const timestamp = Date.now().toString();
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          contractNo = `CON${timestamp.slice(-10)}${random}`;
          console.log(`⚠️ 合同编号重复，重新生成编号: ${contractNo} (重试 ${retryCount + 1}/${maxContractRetries})`);
          continue;
        }

        // 检查其他错误
        if (!createResult || createResult.code !== 100000) {
          const errorMsg = createResult?.msg || '创建合同失败';
          const errorCode = createResult?.code || 'UNKNOWN';
          console.error(`❌ 爱签创建合同失败: code=${errorCode}, msg=${errorMsg}`);
          throw new Error(`爱签创建合同失败: ${errorMsg} (错误码: ${errorCode})`);
        }

        // 成功创建合同
        console.log(`✅ 步骤2完成：合同创建成功，合同编号: ${contractNo}`);
        break;
      }

      // 🔥 更新params中的合同编号（可能已经被重新生成）
      params.contractNo = contractNo;

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
        signOrder: 'sequential',
        templateParams: params.templateParams // 传递模板参数用于多行文本填充
      });

      // 🔥 检查添加签署方是否成功
      if (signerResult && signerResult.code !== 100000) {
        const errorMsg = signerResult?.msg || '添加签署方失败';
        const errorCode = signerResult?.code || 'UNKNOWN';
        console.error(`❌ 爱签添加签署方失败: code=${errorCode}, msg=${errorMsg}`);
        throw new Error(`爱签添加签署方失败: ${errorMsg} (错误码: ${errorCode})`);
      }
      console.log('✅ 步骤3完成：添加签署方成功');

      // 处理返回结果
      // 🔥 修复：小程序端使用 hxcx.asign.cn，后端API使用 oapi.asign.cn
      // 根据环境变量判断使用哪个域名
      const apiHost = this.config.host || 'https://oapi.asign.cn';
      // 小程序签署页面域名（生产环境）
      const miniProgramSignHost = apiHost.includes('prev.asign.cn') || apiHost.includes('bprev.asign.cn')
        ? 'https://bpre.asign.cn'  // 测试环境
        : 'https://hxcx.asign.cn'; // 生产环境

      console.log('🔧 签署链接域名配置:', {
        apiHost,
        miniProgramSignHost,
        environment: apiHost.includes('prev') ? '测试环境' : '生产环境'
      });

      // 🔥 等待爱签系统处理完成，然后获取真正的短链接（带重试机制）
      console.log('🔄 等待爱签系统处理，然后获取真正的签署短链接...');

      // 尝试获取爱签返回的真正签署链接（短链接格式）- 最多重试5次
      let realSignUrls: any[] = [];
      const maxRetries = 5;
      const retryDelays = [2000, 3000, 4000, 5000, 6000]; // 递增等待时间

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const delay = retryDelays[attempt];
          console.log(`⏳ 等待 ${delay}ms 后获取签署链接 (尝试 ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          const contractInfoResult = await this.getContractInfo(params.contractNo);
          if (contractInfoResult.success && contractInfoResult.data?.signUser?.length > 0) {
            // 检查是否有真实的签署链接
            const signUsers = contractInfoResult.data.signUser;
            const hasRealSignUrls = signUsers.some((user: any) => user.signUrl && user.signUrl.includes('hzuul.asign.cn'));

            if (hasRealSignUrls) {
              realSignUrls = signUsers.map((user: any, index: number) => ({
                name: user.name || signerAccounts[index]?.name,
                mobile: user.mobile || signerAccounts[index]?.mobile,
                signUrl: user.signUrl, // 🔥 这是爱签返回的真正短链接！
                account: user.account || signerAccounts[index]?.account,
                signOrder: index + 1,
                role: index === 0 ? '甲方（客户）' : (index === 1 ? '乙方（服务人员）' : '丙方（企业）')
              }));
              console.log(`✅ 获取到爱签真正的签署链接 (尝试 ${attempt + 1}):`, realSignUrls.map(u => ({ name: u.name, signUrl: u.signUrl })));
              break; // 成功获取，跳出循环
            } else {
              console.log(`⚠️ signUser 有数据但没有签署链接 (尝试 ${attempt + 1})`);
            }
          } else {
            console.log(`⚠️ signUser 为空 (尝试 ${attempt + 1})`);
          }
        } catch (infoError) {
          console.warn(`⚠️ 获取爱签签署链接失败 (尝试 ${attempt + 1}):`, infoError.message);
        }

        if (attempt === maxRetries - 1) {
          console.warn('⚠️ 多次尝试后仍无法获取真实签署链接，使用备用链接');
        }
      }

      // 如果获取到了真正的签署链接，使用它；否则使用拼接的备用链接
      if (realSignUrls.length > 0 && realSignUrls[0].signUrl) {
        if (signersData.length === 1) {
          return {
            success: true,
            contractNo: params.contractNo,
            signUrl: realSignUrls[0].signUrl,
            message: '合同创建成功，签署链接已生成'
          };
        } else {
          return {
            success: true,
            contractNo: params.contractNo,
            signUrls: realSignUrls,
            message: `合同创建成功，已为${signersData.length}个签署人生成签署链接`
          };
        }
      }

      // 🔥 备用方案：使用拼接的小程序链接
      console.log('⚠️ 使用拼接的备用签署链接');
      if (signersData.length === 1) {
        const signUrl = signerResult?.signUrl || `${miniProgramSignHost}/sign/${params.contractNo}`;
        console.log('✅ 完整流程执行成功，签署链接(备用):', signUrl);

        return {
          success: true,
          contractNo: params.contractNo,
          signUrl: signUrl,
          message: '合同创建成功，签署链接已生成'
        };
      } else {
        const signUrls = signerAccounts.map((signerAccount, index) => ({
          name: signerAccount.name,
          mobile: signerAccount.mobile,
          signUrl: `${miniProgramSignHost}/sign/${params.contractNo}?account=${signerAccount.account}`,
          account: signerAccount.account,
          signOrder: index + 1,
          role: index === 0 ? '甲方（客户）' : '乙方（服务人员）'
        }));

        console.log('✅ 完整流程执行成功，多个签署链接(备用):', signUrls);

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

      // 🔥 检查 templateParams 中的数组字段
      console.log('🔥🔥🔥 检查 templateParams 中的字段类型:');
      Object.entries(contractData.templateParams || {}).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value} ${Array.isArray(value) ? '(数组)' : ''} = ${JSON.stringify(value).substring(0, 100)}`);
      });

      // 🔥🔥🔥 关键修改：获取模板控件信息，用于处理多选字段
      console.log('🔥 获取模板控件信息...');
      const templateData = await this.getTemplateControlInfo(contractData.templateNo);
      console.log('🔥 模板控件信息:', JSON.stringify(templateData, null, 2));

      // 🔒 兜底：确保模板必填的派生字段存在（例如“阿姨工资大写”）
      // 说明：后端模板字段转换时会把“阿姨工资/阿姨工资大写”等合并成一个输入控件，
      // 前端若只提交了“阿姨工资”，这里必须补齐“阿姨工资大写”，否则爱签会报“缺少参数”。
      let normalizedTemplateParams = this.normalizeTemplateParamsForESign(contractData.templateParams);

      // 🔒 步骤2：验证并补充必填字段的默认值
      // ⚠️ 禁用 ensureRequiredFields()，只发送模板中实际存在的字段
      // normalizedTemplateParams = this.ensureRequiredFields(normalizedTemplateParams);

      // 构建请求参数，严格按照官方API文档
      console.log('🔥🔥🔥 即将调用convertToFillData方法');
      // 🔥 传递模板控件信息，用于正确识别多选字段（dataType 9）
      const fillData = this.convertToFillData(normalizedTemplateParams, templateData);
      console.log('🔥🔥🔥 convertToFillData调用完成，结果:', JSON.stringify(fillData, null, 2));
      
      // 🔥 确保 notifyUrl 始终有值：优先使用传入的值，否则使用配置中的默认值
      const notifyUrl = contractData.notifyUrl || this.config.notifyUrl;
      console.log('🔔 回调URL:', notifyUrl);

      const requestParams: Record<string, any> = {
        contractNo: contractData.contractNo,
        contractName: contractData.contractName,
        signOrder: contractData.signOrder || 2, // 🔥 默认顺序签约：1=无序，2=顺序（客户先签→阿姨后签）
        validityTime: contractData.validityTime || 15, // 合同有效期（天）
        notifyUrl: notifyUrl, // 🔥 合同全部签完后回调（status=2）
        userNotifyUrl: notifyUrl, // 🔥 某个用户签完后回调（用于甲方签完通知）
        callbackUrl: notifyUrl, // 🔥 过期/拒签/失败时回调（status=3,4,-3）
        templates: [{
          templateNo: contractData.templateNo, // 平台分配的模板编号
          fillData: fillData, // 文本类填充
          componentData: this.convertToComponentData(normalizedTemplateParams, templateData) // 选择类填充
        }]
      };

      // 🔥 传递额外的可选参数（如 readSeconds, needAgree 等）
      const optionalParams = ['readSeconds', 'needAgree', 'autoExpand', 'refuseOn', 'autoContinue', 'viewFlg', 'enableDownloadButton', 'redirectUrl'];
      for (const param of optionalParams) {
        if (contractData[param] !== undefined && contractData[param] !== null) {
          requestParams[param] = contractData[param];
        }
      }

      console.log('📋 发送到爱签API的请求参数:', JSON.stringify(requestParams, null, 2));

      // 调用官方API
      const response = await this.callESignAPI('/contract/createContract', requestParams);

      console.log('✅ 爱签API响应:', response);

      // 🔥 关键修改：处理previewUrl
      if (response && response.code === 100000 && response.data) {
        console.log('🎯 检查API响应中的previewUrl...');
        
        // 检查响应数据中是否包含previewUrl
        if (response.data.previewUrl) {
          console.log('✅ 发现官方previewUrl:', response.data.previewUrl);
          
          // 🔥 将previewUrl添加到响应数据中，确保前端能够获取
          response.data.officialPreviewUrl = response.data.previewUrl;
          
          // 🔥 尝试更新数据库中的合同记录，保存previewUrl
          try {
            await this.updateContractPreviewUrl(contractData.contractNo, response.data.previewUrl);
            console.log('✅ 合同预览链接已保存到数据库');
          } catch (dbError) {
            console.warn('⚠️ 保存预览链接到数据库失败:', dbError.message);
          }
        } else {
          console.log('⚠️ API响应中未包含previewUrl字段');
          console.log('📋 响应数据结构:', Object.keys(response.data || {}));
        }
      }

      // 直接返回爱签API的原始响应格式 { code, msg, data }
      return response;
    } catch (error) {
      console.error('❌ 创建模板合同失败:', error);
      // 如果是爱签API错误，直接抛出让上层处理
      throw error;
    }
  }

  /**
   * 兜底补齐爱签模板可能要求但前端未提交的字段（尤其是合并控件导致的“*_大写”字段）
   */
  private normalizeTemplateParamsForESign(templateParams: Record<string, any> = {}): Record<string, any> {
    const normalized: Record<string, any> = { ...(templateParams || {}) };

    // 只在“源字段有值、目标字段为空”的情况下补齐，避免覆盖前端显式传入
    const ensureUpper = (srcKey: string, dstKey: string) => {
      const srcVal = normalized[srcKey];
      const dstVal = normalized[dstKey];
      if ((dstVal === undefined || dstVal === null || dstVal === '') && srcVal !== undefined && srcVal !== null && srcVal !== '') {
        normalized[dstKey] = this.convertToChineseAmount(srcVal);
        console.log(`🧩 补齐模板参数: ${dstKey} <- ${srcKey} (${srcVal}) => ${normalized[dstKey]}`);
      }
    };

    // 阿姨工资大写（本次报错的核心字段）
    ensureUpper('阿姨工资', '阿姨工资大写');
    // 有些模板可能用“月工资”作为数值源
    if (!normalized['阿姨工资'] && normalized['月工资']) {
      normalized['阿姨工资'] = normalized['月工资'];
    }
    ensureUpper('阿姨工资', '阿姨工资大写');

    // 服务费大写（兼容“服务费大写/大写服务费”两种字段名）
    ensureUpper('服务费', '服务费大写');
    // ensureUpper('服务费', '大写服务费');  // ❌ 模板中不存在"大写服务费"字段

    // 匹配费/首次匹配费大写（避免类似缺参问题）
    // ensureUpper('匹配费', '匹配费大写');  // ❌ 模板中不存在"匹配费"和"匹配费大写"字段
    ensureUpper('首次匹配费', '首次匹配费大写');

    return normalized;
  }

  /**
   * 确保所有必填字段都有值，避免爱签API报"参数异常"
   * 根据爱签模板的实际必填字段，补充默认值
   */
  private ensureRequiredFields(templateParams: Record<string, any>): Record<string, any> {
    const params = { ...templateParams };

    console.log('🔍 开始检查必填字段...');

    // 定义必填字段及其默认值
    const requiredFields = {
      // 甲方（客户）信息
      '客户姓名': '未填写',
      '客户电话': '未填写',
      '客户身份证号': '未填写',
      '甲方姓名': '未填写',
      '甲方联系电话': '未填写',
      '甲方身份证号': '未填写',

      // 乙方（阿姨）信息
      '阿姨姓名': '未填写',
      '阿姨电话': '未填写',
      '阿姨身份证号': '未填写',
      '乙方姓名': '未填写',
      '乙方联系电话': '未填写',
      '乙方身份证号': '未填写',

      // 时间相关
      '开始年': new Date().getFullYear(),
      '开始月': new Date().getMonth() + 1,
      '开始日': new Date().getDate(),
      '结束年': new Date().getFullYear() + 1,
      '结束月': new Date().getMonth() + 1,
      '结束日': new Date().getDate(),

      // 金额相关
      '阿姨工资': '0',
      '阿姨工资大写': '零元整',
      '服务费': '0',
      '大写服务费': '零元整',
      '服务费大写': '零元整',
      '匹配费': '0',
      '匹配费大写': '零元整',
      '首次匹配费': '0',
      '首次匹配费大写': '零元整',

      // 其他常见字段
      '服务备注': '无',
      '备注': '无',
      '服务内容': '无',
      '服务项目': '无',
      '服务类型': '住家保姆',

      // 多选字段（componentData类型）
      '多选6': [],
    };

    // 检查并补充缺失的必填字段
    let addedCount = 0;
    Object.entries(requiredFields).forEach(([key, defaultValue]) => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        params[key] = defaultValue;
        addedCount++;
        console.log(`✅ 补充必填字段: ${key} = ${defaultValue}`);
      }
    });

    console.log(`🔍 必填字段检查完成，补充了 ${addedCount} 个字段`);

    return params;
  }

  /**
   * 数字金额转中文大写（与前端 convertToChineseAmount 保持一致）
   */
  private convertToChineseAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(num)) return '零元整';

    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = ['', '拾', '佰', '仟'];
    const section = ['', '万', '亿'];

    if (num === 0) return '零元整';

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let result = '';
    if (integerPart === 0) {
      result = '零';
    } else {
      const str = integerPart.toString();
      const len = str.length;
      for (let i = 0; i < len; i++) {
        const n = parseInt(str[i], 10);
        const pos = len - i - 1;
        const u = pos % 4;
        const s = Math.floor(pos / 4);

        if (n !== 0) {
          result += digit[n] + unit[u];
          if (u === 0 && s > 0) result += section[s];
        } else {
          if (result && !result.endsWith('零')) result += '零';
        }
      }
      result = result.replace(/零+/g, '零').replace(/零$/, '');
    }

    result += '元';

    if (decimalPart === 0) {
      result += '整';
    } else {
      const jiao = Math.floor(decimalPart / 10);
      const fen = decimalPart % 10;
      if (jiao > 0) result += digit[jiao] + '角';
      if (fen > 0) result += digit[fen] + '分';
    }

    return result;
  }

  /**
   * 更新合同的预览链接到数据库
   */
  private async updateContractPreviewUrl(contractNo: string, previewUrl: string): Promise<void> {
    try {
      console.log('💾 更新合同预览链接到数据库:', { contractNo, previewUrl });
      
      // 查找并更新合同记录
      const result = await this.contractModel.updateOne(
        { esignContractNo: contractNo },
        { 
          $set: { 
            esignPreviewUrl: previewUrl,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ 合同预览链接更新成功');
      } else {
        console.log('⚠️ 未找到匹配的合同记录或无需更新');
      }
    } catch (error) {
      console.error('❌ 更新合同预览链接失败:', error);
      throw error;
    }
  }

  /**
   * 获取模板控件信息
   * 用于获取模板中定义的所有控件信息，特别是多选字段的选项定义
   */
  private async getTemplateControlInfo(templateNo: string): Promise<any[]> {
    try {
      console.log('🔍 正在获取模板控件信息，模板编号:', templateNo);
      const response = await this.callESignAPI('/template/data', {
        templateIdent: templateNo
      });

      console.log('📋 爱签API响应:', JSON.stringify(response, null, 2));

      if (response.code === 100000 && response.data) {
        console.log('✅ 成功获取模板控件信息，字段数量:', response.data.length);
        return response.data;
      } else {
        console.warn('⚠️ 获取模板控件信息失败:', response);
        console.warn('⚠️ 错误码:', response.code);
        console.warn('⚠️ 错误信息:', response.msg);
        console.warn('⚠️ 这可能是因为模板在爱签平台上被修改后需要重新同步');
        return [];
      }
    } catch (error) {
      console.error('❌ 获取模板控件信息异常:', error);
      console.error('❌ 模板编号:', templateNo);
      return [];
    }
  }

  /**
   * 🎯 [桥接模式] 准备发送给爱签API的fillData（直接透传，不做转换）
   * 小程序提交的字段名就是爱签模板的原始字段名，直接使用即可
   */
  private prepareFillDataForESign(templateParams: Record<string, any>): Record<string, any> {
    const fillData: Record<string, any> = {};

    console.log('🎯 [桥接模式] 准备fillData，直接透传小程序数据');

    // 直接遍历所有字段，只做基本的类型转换（确保都是字符串）
    Object.entries(templateParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // 数组类型（如多选字段）转换为分号分隔的字符串
        if (Array.isArray(value)) {
          fillData[key] = value.join('；');
          console.log(`  📋 数组字段 "${key}": [${value.join(', ')}] -> "${fillData[key]}"`);
        } else {
          // 其他类型直接转字符串
          fillData[key] = String(value);
          console.log(`  ✅ 普通字段 "${key}": "${fillData[key]}"`);
        }
      }
    });

    console.log('✅ [桥接模式] fillData准备完成，字段数量:', Object.keys(fillData).length);
    return fillData;
  }

  /**
   * 🎯 [桥接模式] 准备发送给爱签API的componentData（处理勾选框等组件）
   */
  private prepareComponentDataForESign(templateParams: Record<string, any>): Array<{
    type: number;
    keyword: string;
    defaultValue: string;
  }> {
    const componentData: Array<{
      type: number;
      keyword: string;
      defaultValue: string;
    }> = [];

    // 遍历模板参数，查找需要转换为组件数据的字段（布尔类型或包含特定关键词）
    Object.entries(templateParams).forEach(([key, value]) => {
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
        console.log(`  ☑️ 勾选字段 "${key}": ${value ? 'Yes' : 'Off'}`);
      }
    });

    console.log('✅ [桥接模式] componentData准备完成，组件数量:', componentData.length);
    return componentData;
  }

  /**
   * 转换模板参数为fillData格式（文本类填充）
   * ⚠️ 已废弃：请使用 prepareFillDataForESign 方法（桥接模式）
   * @param templateParams - 模板参数
   * @param templateControls - 模板控件信息（用于正确识别字段类型）
   */
  private convertToFillData(templateParams: Record<string, any>, templateControls: any[] = []): Record<string, any> {
    const fillData: Record<string, any> = {};

    // 🔥 爱签模板字段长度限制（根据实际模板配置调整）
    const MAX_FIELD_LENGTH = 2000; // 大部分字段的最大长度
    const MAX_MULTISELECT_LENGTH = 500; // 多选字段的最大长度（通常更短）

    console.log('🔥🔥🔥 convertToFillData 开始处理 🔥🔥🔥');
    console.log('🔥 输入参数:', JSON.stringify(templateParams, null, 2));
    console.log('🔥 模板控件数量:', templateControls?.length || 0);

    // 🔥🔥🔥 关键修复：已知的多选字段列表
    // 这些字段名在爱签模板中是多选控件（dataType=9）
    // 注意：只有在模板控件信息可用时才跳过fillData
    const KNOWN_MULTISELECT_FIELDS = [
      '多选6',
      '多选7',
    ];

    // 🔥🔥🔥 服务内容特殊处理：当模板信息不可用时，作为文本字段处理
    // 因为CRM端在这种情况下成功地将"服务内容"作为换行分隔的文本放入fillData
    const SERVICE_CONTENT_FIELD = '服务内容';

    console.log('🔥 已知多选字段列表:', KNOWN_MULTISELECT_FIELDS);

    // 🔥 构建字段类型映射表（基于模板控件信息）
    const fieldTypeMap: Record<string, number> = {};
    if (templateControls && Array.isArray(templateControls)) {
      templateControls.forEach((control: any) => {
        if (control.dataKey && control.dataType !== undefined) {
          fieldTypeMap[control.dataKey] = control.dataType;
        }
      });
      console.log('🔥 字段类型映射表:', JSON.stringify(fieldTypeMap, null, 2));
    }

    // 🔥🔥🔥 关键：如果模板控件信息为空，使用已知多选字段列表作为回退
    const useKnownMultiselectFallback = !templateControls || templateControls.length === 0;
    if (useKnownMultiselectFallback) {
      console.log('⚠️ 模板控件信息为空，将使用已知多选字段列表作为回退机制');
    }

    // 遍历所有模板参数，特殊处理不同类型的字段
    Object.entries(templateParams).forEach(([key, value]) => {
      console.log(`🔥 处理字段: "${key}" = ${JSON.stringify(value)} (类型: ${typeof value}, 是否数组: ${Array.isArray(value)})`);

      if (value !== null && value !== undefined && value !== '') {
        // 🔥🔥🔥 关键修复：基于模板控件的 dataType 判断字段类型
        // dataType 9 = 多选控件, dataType 16 = 下拉控件
        const fieldDataType = fieldTypeMap[key];
        const isMultiSelectByDataType = fieldDataType === 9; // 多选控件
        const isDropdownByDataType = fieldDataType === 16; // 下拉控件

        // 🔥 兼容旧逻辑：字段名包含"多选"的也视为多选字段
        const isMultiSelectByName = key.includes('多选') || key.startsWith('多选');

        // 🔥🔥🔥 关键修复：使用已知多选字段列表作为回退机制（仅当模板信息可用时）
        // 注意：只在模板控件信息可用时才跳过这些字段，否则无法处理
        const isKnownMultiselectField = !useKnownMultiselectFallback && KNOWN_MULTISELECT_FIELDS.includes(key);

        // 🔥 综合判断：任一条件满足即为多选字段
        const isMultiSelectField = isMultiSelectByDataType || isMultiSelectByName || isKnownMultiselectField;

        // 🔥🔥🔥 关键：检查是否为"服务内容"字段
        // 当模板信息不可用时，"服务内容"需要作为文本字段处理（用换行符分隔）
        // 这与CRM端的处理方式一致
        const isServiceContentFallback = useKnownMultiselectFallback && key === SERVICE_CONTENT_FIELD;

        console.log(`🔥 字段"${key}" dataType=${fieldDataType}, isMultiSelectByDataType=${isMultiSelectByDataType}, isKnownMultiselectField=${isKnownMultiselectField}, isDropdownByDataType=${isDropdownByDataType}, isServiceContentFallback=${isServiceContentFallback}`);

        // 🔥 服务备注/服务内容字段：需要换行符分隔的多行文本
        // ⚠️ 注意：当模板信息可用时，多选字段和下拉控件字段不作为服务字段处理！
        // 🔥🔥🔥 关键修复：当模板信息不可用时，"服务内容"作为文本字段处理
        const isServiceField = (!isMultiSelectField && !isDropdownByDataType && (
                              key === '服务备注' ||
                              key.includes('服务备注') ||
                              key.includes('服务项目') ||
                              key.includes('服务需求') ||
                              key === '服务需求')) ||
                              isServiceContentFallback;  // 🔥 模板信息不可用时，服务内容作为文本处理

        // 🔥 备注类字段（需要保留换行符）- 排除多选和下拉字段
        const isRemarkField = !isMultiSelectField && !isDropdownByDataType && !isServiceContentFallback && (
                             key === '备注' ||
                             key.includes('备注') ||
                             key === '说明' ||
                             key.includes('说明') ||
                             key === '合同备注' ||
                             key.includes('合同备注'));

        console.log(`🔥 字段"${key}"匹配检查: isMultiSelectField=${isMultiSelectField}, isServiceContentFallback=${isServiceContentFallback}, isDropdownByDataType=${isDropdownByDataType}, isServiceField=${isServiceField}, isRemarkField=${isRemarkField}`);

        if (isMultiSelectField && !isServiceContentFallback) {
          // 🔥🔥🔥 重要修改：多选字段不添加到 fillData，改为在 componentData 中处理
          // 但如果是"服务内容"回退模式，则跳过此判断，继续作为文本处理
          console.log(`🔥🔥 检测到多选字段: "${key}" (byDataType=${isMultiSelectByDataType}, byName=${isMultiSelectByName}, byKnownList=${isKnownMultiselectField})，跳过 fillData 处理（将在 componentData 中处理）`);
          return;
        } else if (isDropdownByDataType) {
          // 🔥🔥🔥 重要修改：下拉控件字段不添加到 fillData，改为在 componentData 中处理
          console.log(`🔥🔥 检测到下拉控件字段(dataType=16): "${key}"，跳过 fillData 处理（将在 componentData 中处理）`);
          return;
        } else if (isServiceField) {
          // 🔥 服务备注字段：转换为换行符分隔的多行文本
          console.log(`🔥🔥 检测到服务备注字段: "${key}"`);
          if (Array.isArray(value)) {
            const serviceLines = value
              .filter(item => item && item.trim())
              .map(item => item.trim().replace(/\s+/g, ' '))
              .join('\n');
            fillData[key] = serviceLines;
            console.log(`🔥🔥 服务备注数组转换: [${value.join(', ')}] -> 多行文本`);
          } else if (typeof value === 'string' && value.includes('；')) {
            const serviceLines = value
              .split('；')
              .filter(item => item.trim())
              .map(item => item.trim().replace(/\s+/g, ' '))
              .join('\n');
            fillData[key] = serviceLines;
            console.log(`🔥🔥 服务备注字符串转换: "${value}" -> 多行文本`);
          } else {
            // 🔥 保留换行符，只清理每行内部的多余空格
            const cleanedValue = String(value)
              .split('\n')
              .map(line => line.trim().replace(/\s+/g, ' '))
              .join('\n');
            fillData[key] = cleanedValue;
            console.log(`🔥🔥 服务备注单值（保留换行）: "${value}" -> "${fillData[key]}"`);
          }
        } else if (isRemarkField) {
          // 🔥 备注类字段：保留换行符，只清理每行内部的多余空格
          console.log(`🔥🔥 检测到备注类字段: "${key}"`);
          const cleanedValue = String(value)
            .split('\n')
            .map(line => line.trim().replace(/\s+/g, ' '))
            .filter(line => line) // 移除空行
            .join('\n');
          fillData[key] = cleanedValue;
          console.log(`🔥🔥 备注字段转换（保留换行）: "${value}" -> "${fillData[key]}"`);
        } else {
          // 其他字段保持字符串格式，并清理多余空格（包括换行符）
          const cleanedValue = String(value).trim().replace(/\s+/g, ' ');
          fillData[key] = cleanedValue;
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
   * 处理勾选框和多选组件
   */
  private convertToComponentData(
    templateParams: Record<string, any>,
    templateControls: any[]
  ): Array<{
    type: number;
    keyword: string;
    defaultValue?: string;
    options?: Array<{index: number; selected: boolean}>;
  }> {
    const componentData: Array<{
      type: number;
      keyword: string;
      defaultValue?: string;
      options?: Array<{index: number; selected: boolean}>;
    }> = [];

    // 🔥 服务类型映射表：将小程序/CRM的服务类型映射到爱签模板的标准值
    const serviceTypeMapping: Record<string, string> = {
      '月嫂': '月嫂',
      '住家育儿嫂': '住家育儿嫂',
      '白班育儿': '白班育儿嫂',
      '白班育儿嫂': '白班育儿嫂',
      '保洁': '保洁',
      '白班保姆': '白班保姆',
      '住家保姆': '住家保姆',
      '养宠': '养宠',
      '小时工': '小时工',
      '住家护老': '住家护老'
    };

    // 🔥 预处理：映射服务类型字段
    if (templateParams['服务类型'] && serviceTypeMapping[templateParams['服务类型']]) {
      const originalValue = templateParams['服务类型'];
      const mappedValue = serviceTypeMapping[originalValue];
      if (originalValue !== mappedValue) {
        console.log(`🔄 服务类型映射: "${originalValue}" -> "${mappedValue}"`);
        templateParams['服务类型'] = mappedValue;
      }
    }

    // 遍历模板参数，查找需要转换为组件数据的字段
    Object.entries(templateParams).forEach(([key, value]) => {
      // 🔥🔥🔥 关键修复：优先基于模板控件的 dataType 判断字段类型
      const control = templateControls.find((c: any) => c.dataKey === key);
      const isMultiSelectByDataType = control && control.dataType === 9; // dataType 9 = 多选控件
      const isMultiSelectByName = key.includes('多选') || key.startsWith('多选');
      const isMultiSelectField = isMultiSelectByDataType || isMultiSelectByName;

      console.log(`🔥 [componentData] 字段"${key}": dataType=${control?.dataType}, isMultiSelectByDataType=${isMultiSelectByDataType}, isMultiSelectByName=${isMultiSelectByName}`);

      if (isMultiSelectField) {
        // 🔥🔥🔥 关键修改：多选字段使用正确的格式
        // 查找模板控件定义
        const multiSelectControl = templateControls.find((c: any) => c.dataKey === key && c.dataType === 9);
        if (!multiSelectControl || !multiSelectControl.options) {
          console.log(`⚠️ 未找到多选字段"${key}"的模板定义(dataType=9)，跳过`);
          return;
        }

        // 解析用户选择的值
        let selectedTexts: string[] = [];
        if (typeof value === 'string' && value.trim()) {
          // 前端发送的是分号分隔的字符串
          selectedTexts = value.split('；').map(t => t.trim()).filter(Boolean);
        } else if (Array.isArray(value)) {
          // 也支持数组格式
          selectedTexts = value.map(v => String(v).trim()).filter(Boolean);
        }

        console.log(`🔥 多选字段"${key}"用户选择:`, selectedTexts);
        console.log(`🔥 模板定义的选项:`, multiSelectControl.options);

        // 匹配用户选择的文本到模板选项的索引
        const options = multiSelectControl.options.map((opt: any) => {
          const isSelected = selectedTexts.some(text =>
            text.includes(opt.label) || opt.label.includes(text)
          );
          return {
            index: opt.index, // 使用模板中的 index 值（可能是字符串或数字）
            selected: isSelected
          };
        });

        // 🔥 关键修改：如果没有任何选项被选中，跳过这个多选字段
        const selectedCount = options.filter(o => o.selected).length;
        if (selectedCount === 0) {
          console.log(`⚠️ 多选字段"${key}"没有任何选项被选中，跳过`);
          return;
        }

        componentData.push({
          type: 9,
          keyword: key,
          options: options
        });

        console.log(`🔘 多选组件转换: "${key}" -> ${selectedCount}/${options.length} 项选中`);
        return;
      }

      // 🔥🔥🔥 处理下拉控件（type=16）
      const dropdownControl = templateControls.find(c => c.dataKey === key && c.dataType === 16);
      if (dropdownControl && dropdownControl.options) {
        // 🔥 标准化用户输入的值：将"元"替换为"圆"（爱签模板使用"圆"）
        const normalizedValue = String(value).replace(/元/g, '圆');

        // 查找用户选择的值在模板选项中的索引
        const selectedOption = dropdownControl.options.find(opt => {
          const normalizedLabel = String(opt.label).replace(/元/g, '圆');
          return normalizedLabel === normalizedValue ||
                 normalizedLabel.includes(normalizedValue) ||
                 normalizedValue.includes(normalizedLabel);
        });

        if (selectedOption) {
          componentData.push({
            type: 16,
            keyword: key,
            options: [{
              index: selectedOption.index,
              selected: true
            }]
          });
          console.log(`🔽 下拉控件转换: "${key}" -> 选中索引 ${selectedOption.index} (${selectedOption.label})`);
        } else {
          console.log(`⚠️ 下拉控件"${key}"未找到匹配的选项，值: "${value}" (标准化后: "${normalizedValue}")`);
          // 🔥 打印所有可用选项，帮助调试
          console.log(`⚠️ 可用选项: ${dropdownControl.options.map(o => o.label).join(', ')}`);
        }
        return;
      }

      // 处理勾选框类型
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

    console.log('🔘 转换后的componentData:', JSON.stringify(componentData, null, 2));
    return componentData;
  }

  /**
   * 从爱签API获取模板名称
   * 通过查询模板列表接口，找到对应模板的名称
   */
  private async getTemplateNameFromAPI(templateNo: string): Promise<string> {
    // 方法1：尝试查询模板列表接口
    try {
      console.log('🔍 方法1：尝试从模板列表接口获取模板名称:', templateNo);

      const response = await this.callESignAPI('/template/list', {
        pageNum: 1,
        pageSize: 100
      });

      console.log('📋 模板列表API响应:', JSON.stringify(response, null, 2));

      if (response.code === 100000 && response.data) {
        // 尝试多种可能的数据结构
        const templates = response.data.list ||
                         response.data.templates ||
                         response.data.data ||
                         (Array.isArray(response.data) ? response.data : null);

        if (Array.isArray(templates)) {
          console.log(`📋 找到 ${templates.length} 个模板`);

          const matchedTemplate = templates.find((t: any) =>
            t.templateNo === templateNo ||
            t.templateIdent === templateNo ||
            t.templateId === templateNo ||
            t.id === templateNo
          );

          if (matchedTemplate) {
            const templateName = matchedTemplate.templateName ||
                                matchedTemplate.name ||
                                matchedTemplate.title;
            if (templateName) {
              console.log('✅ 成功从模板列表获取模板名称:', templateName);
              return templateName;
            }
          } else {
            console.log('⚠️ 模板列表中未找到匹配的模板编号:', templateNo);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ 模板列表接口调用失败:', error.message);
    }

    // 方法2：尝试其他可能的接口
    const possibleEndpoints = [
      '/template/detail',
      '/template/get',
      '/template/query',
      '/template/info'
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔍 方法2：尝试接口 ${endpoint} 获取模板名称:`, templateNo);

        const response = await this.callESignAPI(endpoint, {
          templateIdent: templateNo
        });

        console.log(`📋 ${endpoint} 响应:`, JSON.stringify(response, null, 2));

        if (response.code === 100000 && response.data) {
          const templateName = response.data.templateName ||
                              response.data.name ||
                              response.data.title ||
                              response.data.templateTitle;
          if (templateName) {
            console.log(`✅ 成功从 ${endpoint} 获取模板名称:`, templateName);
            return templateName;
          }
        }
      } catch (error) {
        console.log(`⚠️ ${endpoint} 调用失败:`, error.message);
        // 继续尝试下一个接口
      }
    }

    console.log('⚠️ 所有方法都未能获取模板名称，使用默认值');
    return '未知模板';
  }

  /**
   * 从爱签API获取真实的模板信息
   * 使用模板编号获取模板的字段配置
   */
  async getRealTemplateInfo(templateNo: string): Promise<any> {
    try {
      console.log('🔍 从爱签API获取模板信息:', templateNo);

      // 1. 获取模板字段数据
      const templateFields = await this.getTemplateData(templateNo);
      console.log('📋 爱签API返回的原始模板数据:', templateFields);

      // 2. 🔥 尝试从API获取真实的模板名称
      const templateName = await this.getTemplateNameFromAPI(templateNo);

      // 3. 转换为前端需要的格式
      const formattedTemplate = {
        templateNo: templateNo,
        templateName: templateName,
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
   * 🔥 新策略：不做任何字段合并，原样返回所有字段
   * 让前端显示所有字段，避免遗漏必填字段
   */
  private convertTemplateFieldsToFormFields(templateFields: any[]): any[] {
    console.log('🔍 开始转换爱签API原始模板字段，字段数量:', templateFields?.length);

    // 🔥 打印所有原始字段的完整信息
    console.log('📋 所有原始字段详情:');
    templateFields?.forEach((field, index) => {
      console.log(`字段 ${index + 1}: dataKey="${field.dataKey}", dataType=${field.dataType}, required=${field.required}`);
    });

    const formFields: any[] = [];
    const seenKeys = new Set();  // 用于去重，但不合并字段

    // 只处理从爱签API获取的原始字段
    if (Array.isArray(templateFields)) {
      templateFields.forEach((field, index) => {
        if (!field.dataKey) {
          return;  // 跳过没有dataKey的字段
        }

        const fieldKey = field.dataKey;
        console.log(`🔍 处理字段 ${index + 1}/${templateFields.length}: ${fieldKey} (dataType: ${field.dataType}, required: ${field.required})`);

        // 🔥 过滤签名区、签章区等不需要用户填写的字段
        // dataType: 6=签署区, 7=签署时间, 15=备注签署区
        if (field.dataType === 6 || field.dataType === 7 || field.dataType === 15) {
          console.log(`⚠️  跳过签名/签章字段: ${fieldKey} (dataType: ${field.dataType})`);
          return;
        }

        // 🔥 过滤签名区、签章区相关的字段名
        const lowerKey = fieldKey.toLowerCase();
        if (lowerKey.includes('签名区') || lowerKey.includes('签章区') ||
            lowerKey.includes('签署区') || lowerKey.includes('印章')) {
          console.log(`⚠️  跳过签名相关字段: ${fieldKey}`);
          return;
        }

        // 🔥 严格去重：同一个dataKey只添加一次
        if (seenKeys.has(fieldKey)) {
          console.log(`⚠️  跳过重复字段: ${fieldKey}`);
          return;
        }

        // 🔥 添加字段到列表（不做任何合并）
        seenKeys.add(fieldKey);

        // 特殊处理：服务备注字段，添加预定义选项
        let options = undefined;
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

        // 特殊处理：阿姨身份证字段虽然在爱签API中是dataType: 1（单行文本），但应该作为身份证类型处理
        let fieldType = this.getFieldTypeByDataType(field.dataType);
        if (fieldKey === '阿姨身份证' && field.dataType === 1) {
          fieldType = 'idcard';
          console.log(`🔧 特殊处理: 将"阿姨身份证"字段类型从text强制转换为idcard`);
        }

        const formField = {
          key: fieldKey,
          label: fieldKey, // 使用原始字段名作为标签
          type: fieldType,
          required: field.required === 1,
          originalField: field, // 保留原始字段信息
          options: options // 可能包含服务备注的预定义选项或爱签API的选项
        };

        formFields.push(formField);
        console.log(`✅ 添加爱签原始字段: ${fieldKey} (类型: ${field.dataType}, required: ${field.required})`);
      });
    }

    console.log(`🔍 去重后字段数量: ${formFields.length} (原始: ${templateFields?.length})`);
    console.log('📋 最终字段列表:', formFields.map(f => f.key));
    
    return formFields;
  }

  /**
   * 根据爱签API的数据类型转换为表单控件类型
   * 爱签API数据类型说明：
   * 1: 单行文本
   * 2: 多行文本
   * 3: 数字
   * 4: 身份证
   * 5: 日期
   * 6: 签名
   * 7: 印章
   * 8: 多行文本
   * 9: 多选
   * 13: 勾选框
   * 16: 单选
   */
  private getFieldTypeByDataType(dataType: number): string {
    switch (dataType) {
      case 1: // 单行文本
        return 'text';
      case 2: // 多行文本
      case 8: // 多行文本
        return 'textarea';
      case 3: // 数字
        return 'number';
      case 4: // 身份证
        return 'idcard';
      case 5: // 日期
        return 'date';
      case 6: // 签名
      case 7: // 印章
        return 'signature';
      case 9: // 多选
        return 'multiselect';
      case 13: // 勾选框
        return 'checkbox';
      case 16: // 单选
        return 'select';
      default:
        return 'text';
    }
  }

  /**
   * 获取真实的模板列表（从爱签API）
   * 调用爱签 /template/list 接口动态获取所有模板
   */
  async getRealTemplateList(): Promise<any[]> {
    try {
      console.log('🔍 调用爱签API获取模板列表');

      // 调用爱签 /template/list 接口
      const response = await this.callESignAPI('/template/list', {
        page: 1,
        rows: 100, // 获取最多100个模板
        status: 1  // 只获取使用中的模板
      });

      console.log('📋 爱签模板列表API响应:', JSON.stringify(response, null, 2));

      if (response.code === 100000 && response.data?.list) {
        const templateList = response.data.list;
        console.log(`✅ 成功获取 ${templateList.length} 个模板`);

        // 转换为前端需要的格式
        const formattedTemplates = await Promise.all(
          templateList.map(async (template: any) => {
            try {
              // 获取每个模板的字段信息
              const templateFields = await this.getTemplateData(template.templateIdent);
              return {
                templateNo: template.templateIdent,
                templateName: template.templateName,
                description: template.comment || `${template.typeName || '合同模板'} - ${template.page}页`,
                templateType: template.templateType,
                status: template.status,
                syncStatus: template.syncStatus,
                fields: this.convertTemplateFieldsToFormFields(templateFields)
              };
            } catch (err) {
              console.warn(`⚠️ 获取模板 ${template.templateIdent} 字段信息失败:`, err.message);
              return {
                templateNo: template.templateIdent,
                templateName: template.templateName,
                description: template.comment || '合同模板',
                fields: []
              };
            }
          })
        );

        return formattedTemplates;
      } else {
        console.warn('⚠️ 爱签API返回异常:', response);
        throw new Error(response.msg || '获取模板列表失败');
      }
    } catch (error) {
      console.error('❌ 获取模板列表失败:', error);

      // 返回空模板列表，提示用户重试
      return [{
        templateNo: 'ERROR',
        templateName: '模板加载失败',
        description: `无法从爱签API获取模板列表: ${error.message}`,
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
   * 预览合同（严格真实版本） - 基于git版本aee21e2f3429406d241c690ab82862d6f73b9da0
   * 🗑️ 旧的复杂预览方法已删除，现在使用 previewContractWithSignUrls 简单方法
   */
     // 🗑️ previewContract 方法已删除，现在只使用 previewContractWithSignUrls 简单方法

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
   * 获取签约状态文本描述
   * 🔥 重要：根据爱签实际返回的数据调整状态映射
   * 爱签实际返回：signStatus=2 表示已签约（因为有 signFinishedTime）
   * 状态码映射（根据实际API返回推断）：
   * - 0: 待签约（未开始签署）
   * - 1: 签约中（正在签署）
   * - 2: 已签约（签署完成）
   * - 3: 拒签
   * - 4: 已撤销
   * - 5: 已过期
   */
  private getSignStatusText(signStatus: number): string {
    const statusMap = {
      0: '待签约',
      1: '签约中',
      2: '已签约',  // 🔥 修复：2 表示已签约，不是拒签
      3: '拒签',    // 🔥 修复：3 表示拒签
      4: '已撤销',
      5: '已过期'
    };
    return statusMap[signStatus] || '未知状态';
  }

  /**
   * 🔥 正确的预览合同接口 - 使用爱签官方 /contract/previewContract API
   * 根据官方文档：创建待签署文件后，在调用合同签署（添加签署方接口）前，可先调用此接口预览合同在签署完成后的样式效果。
   * 接口地址：https://{host}/contract/previewContract
   */
  async previewContractOfficial(contractNo: string, signStrategyList?: Array<{
    attachNo: number;
    locationMode: number;
    signKey?: string;
    signPage: number;
    signX?: number;
    signY?: number;
  }>): Promise<any> {
    try {
      console.log('🔍 调用官方预览合同接口:', contractNo);

      // 1. 获取合同信息，包括签署方信息
      const contractInfoResult = await this.getContractInfo(contractNo);

      if (!contractInfoResult.success || !contractInfoResult.data) {
        throw new Error('无法获取合同信息');
      }

      const contractInfo = contractInfoResult.data;
      const signUsers = contractInfo.signUser || [];

      if (signUsers.length === 0) {
        throw new Error('合同暂无签署方信息，无法预览');
      }

      // 2. 使用第一个签署方的 account 调用预览接口
      const firstSigner = signUsers[0];
      const account = firstSigner.account;

      // 3. 构建签署策略（如果没有提供，则使用默认的模板坐标签章）
      const defaultSignStrategyList = signStrategyList || [{
        attachNo: 1,
        locationMode: 4, // 模板坐标签章
        signKey: '甲方', // 使用甲方签署位置
        signPage: 1
      }];

      // 4. 调用爱签官方预览接口
      const bizData = [{
        account: account,
        contractNo: contractNo,
        isWrite: 0, // 非手写章
        signStrategyList: defaultSignStrategyList
      }];

      console.log('📤 调用预览接口参数:', JSON.stringify(bizData, null, 2));

      const response = await this.callESignAPI('/contract/previewContract', bizData);
      console.log('📥 预览接口响应:', response);

      if (response.code === 100000 && response.data) {
        console.log('✅ 获取官方预览链接成功:', response.data);
        return {
          success: true,
          contractNo,
          previewUrl: response.data, // 官方预览链接
          previewData: response.data,
          method: 'officialPreviewAPI',
          contractInfo: {
            contractNo: contractInfo.contractNo || contractNo,
            contractName: contractInfo.contractName,
            status: contractInfo.status,
          },
          signUsers: signUsers.map((user: any) => ({
            account: user.account,
            name: user.name,
            signStatus: user.signStatus || 0,
            statusText: this.getSignStatusText(user.signStatus || 0),
            signUrl: user.signUrl
          })),
          message: '获取官方预览链接成功'
        };
      } else {
        console.error('❌ 官方预览接口返回错误:', response);
        throw new Error(response.msg || '获取预览链接失败');
      }
    } catch (error) {
      console.error('❌ 调用官方预览接口失败:', error);
      throw error;
    }
  }

  /**
   * 简单预览合同 - 使用签约链接作为预览链接（备用方案）
   * 当官方预览接口不可用时的备选方案
   */
  async previewContractWithSignUrls(contractNo: string): Promise<any> {
    try {
      console.log('🔍 预览合同:', contractNo);

      // 🔥 优先尝试使用官方预览接口
      try {
        const officialResult = await this.previewContractOfficial(contractNo);
        if (officialResult.success && officialResult.previewUrl) {
          console.log('✅ 使用官方预览接口成功');
          return officialResult;
        }
      } catch (officialError) {
        console.warn('⚠️ 官方预览接口失败，尝试备用方案:', officialError.message);
      }

      // 🔥 备用方案：使用签约链接作为预览链接
      console.log('🔄 使用签约链接作为预览（备用方案）');

      // 步骤1：获取合同基本信息
      const contractInfoResult = await this.getContractInfo(contractNo);
      
      if (!contractInfoResult.success || !contractInfoResult.data) {
        throw new Error('无法获取合同信息。请确保合同已在爱签系统中正确创建。');
      }

      const contractInfo = contractInfoResult.data;
      console.log('✅ 获取到合同信息:', {
        contractNo: contractInfo.contractNo || contractNo,
        contractName: contractInfo.contractName,
        status: contractInfo.status,
        signUsers: contractInfo.signUser?.length || 0
      });
            
      // 步骤2：处理签约人信息和状态
      const signUsers = contractInfo.signUser?.map((user: any) => {
        const signStatus = user.signStatus || user.status || 1;
            return {
          account: user.account,
          name: user.name || user.signerName,
          role: user.name?.includes('客户') ? '甲方' : (user.name?.includes('阿姨') ? '乙方' : '丙方'),
          phone: user.mobile || user.phone,
          signStatus: signStatus,
          statusText: this.getSignStatusText(signStatus),
          signTime: user.signTime,
          signUrl: user.signUrl // 🔥 这就是真实的签约链接！
        };
      }) || [];

      // 步骤3：构建预览链接 - 使用任意一个签约人的签约链接作为预览链接
      let previewUrl = '';
      if (signUsers.length > 0 && signUsers[0].signUrl) {
        previewUrl = signUsers[0].signUrl; // 🔥 签约链接就是预览链接！
        console.log('✅ 使用签约链接作为预览链接:', previewUrl);
      } else {
        // 备选方案：如果没有签约链接，尝试从合同状态中获取
        console.log('⚠️ 未找到签约链接，尝试其他方式...');
        throw new Error('合同中没有可用的签约链接，无法预览。请确保已为合同添加签约人。');
      }

      // 步骤4：获取合同状态文本
      const contractStatus = this.getContractStatusText(contractInfo.status || 1);

      // 步骤5：返回预览信息
          return {
            success: true,
            contractNo,
        previewUrl: previewUrl, // 🔥 直接使用签约链接
        previewData: previewUrl,
        statusText: contractStatus,
        contractStatus: contractInfo.status,
        contractInfo: {
          contractNo: contractInfo.contractNo || contractNo,
          contractName: contractInfo.contractName,
          templateNo: contractInfo.templateNo,
          status: contractInfo.status,
          createTime: contractInfo.createTime,
          validityTime: contractInfo.validityTime
        },
        signUsers: signUsers, // 🔥 完整的签约人状态信息，前端显示用
        message: '合同预览链接获取成功（使用签约链接）',
        method: 'signUrlPreview',
        hasPreviewUrl: true,
            previewInfo: {
          canDownload: contractInfo.status === 2,
              hasPreviewUrl: true,
          hasPreviewImage: true,
          contractSigning: contractInfo.status === 1,
          statusText: contractStatus,
          contractStatus: contractInfo.status,
          signUsers: signUsers, // 🆕 签约人信息
          contractName: contractInfo.contractName,
          validityTime: contractInfo.validityTime,
          createTime: contractInfo.createTime,
          recommendation: contractInfo.status === 2 ? '合同已签约完成，可下载查看' : '点击查看合同预览和签约进度',
          previewUrl: previewUrl,
              availableFormats: [
            { type: 'signUrl', name: '签约预览', recommended: true, description: '查看合同预览和签约状态' }
          ]
        }
      };
    } catch (error) {
      console.error('❌ 签约链接预览失败:', error.message);
        return {
          success: false,
          contractNo,
          message: `预览合同失败: ${error.message}`,
        error: error.message,
          previewInfo: {
          canDownload: false,
          hasPreviewUrl: false,
            error: true,
          statusText: '预览失败',
          recommendation: '请确保合同已在爱签系统中正确创建并添加了签约人',
          availableFormats: []
          }
        };
    }
  }
  // 🗑️ 所有旧的复杂预览代码已删除，保持代码简洁

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
   * @param validityTime 作废签署剩余天数，默认15天
   * @param notifyUrl 合同签署完成后回调通知地址
   * @param redirectUrl 合同签署完成后同步回调地址
   */
  async invalidateContract(
    contractNo: string,
    validityTime: number = 15,
    notifyUrl?: string,
    redirectUrl?: string
  ): Promise<any> {
    try {
      console.log('🔍 作废合同:', contractNo);

      // 构建作废合同请求数据
      const cancellationData: any = {
        contractNo,
        validityTime // 作废签署剩余天数
      };

      // 可选字段：回调通知地址
      if (notifyUrl && notifyUrl.trim()) {
        cancellationData.notifyUrl = notifyUrl;
      }

      // 可选字段：同步回调地址
      if (redirectUrl && redirectUrl.trim()) {
        cancellationData.redirectUrl = redirectUrl;
      }

      console.log('📋 作废合同请求数据:', JSON.stringify(cancellationData, null, 2));

      // 调用爱签作废合同API（正确的端点是 /contract/cancellation）
      const result = await this.callESignAPI('/contract/cancellation', cancellationData);

      console.log('✅ 作废合同响应:', result);

      if (result.code === 100000) {
        return {
          success: true,
          contractNo,
          cancelContractNo: result.data?.cancelContractNo,
          message: '合同作废成功，签署方需要签署作废印章',
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
          // 使用默认15天有效期进行作废
          const invalidateResult = await this.invalidateContract(contractNo, 15);
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
   * 检查用户权限
   * @param account 用户账号
   * @returns 用户权限信息
   */
  async checkUserPermissions(account: string): Promise<any> {
    try {
      console.log('🔍 检查用户权限:', account);

      // 调用爱签API检查用户权限
      const result = await this.callESignAPI('/user/getUserPermissions', {
        account: account
      });
      
      if (result.code === 100000) {
        return {
          success: true,
          account,
          permissions: result.data,
          message: '用户权限获取成功'
        };
      } else {
        return {
          success: false,
          account,
          errorCode: result.code,
          message: result.msg || '用户权限获取失败'
        };
      }
    } catch (error) {
      console.error('❌ 检查用户权限失败:', error);
      return {
        success: false,
        account,
        message: `检查用户权限失败: ${error.message}`,
        error: error.message
      };
    }
  }

  // 🗑️ 所有重复的方法定义已删除，保持代码简洁

  /**
   * 处理爱签合同状态回调
   * 当爱签合同状态变化时，爱签会调用这个方法
   */
  async handleContractCallback(callbackData: any): Promise<void> {
    try {
      this.logger.info('esign.callback.received', { callbackData });

      // 爱签回调数据格式可能包含：
      // - contractNo: 合同编号
      // - status: 合同状态 (0=等待签约, 1=签约中, 2=已签约, 3=过期, 4=拒签, 6=作废, 7=撤销)
      // - signTime: 签署时间
      // 具体格式需要根据爱签实际回调数据调整

      const { contractNo, status } = callbackData;

      if (!contractNo) {
        this.logger.error('esign.callback.missing_contract_no');
        return;
      }

      this.logger.info('esign.callback.contract_status_received', { contractNo, status });

      // 查找本地数据库中的合同
      const contract = await this.contractModel.findOne({
        esignContractNo: contractNo
      }).exec();

      if (!contract) {
        this.logger.error('esign.callback.contract_not_found', undefined, { contractNo });
        return;
      }

      this.logger.info('esign.callback.contract_found', {
        contractId: contract._id.toString(),
        contractNo,
        currentStatus: contract.contractStatus,
      });

      // 更新爱签状态
      const updateData: any = {
        esignStatus: status.toString()
      };

      // 如果爱签状态是"已签约"(2)，则更新本地合同状态为"active"
      if (status === 2 || status === '2') {
        updateData.contractStatus = 'active';
        updateData.esignSignedAt = new Date();
        this.logger.info('esign.callback.contract_signed', {
          contractId: contract._id.toString(),
          contractNo,
        });
      }

      // 更新合同
      await this.contractModel.findByIdAndUpdate(contract._id, updateData).exec();

      this.logger.info('esign.callback.contract_updated', {
        contractId: contract._id.toString(),
        contractNo,
        nextStatus: updateData.contractStatus || contract.contractStatus,
      });

      // 签约完成后，同步客户姓名为合同中的真实姓名（合同发起姓名）
      if (status === 2 || status === '2') {
        await this.syncCustomerNameBySignedContract(contract);

        // 🆕 更新客户状态为"已签约"和线索等级为"O类"
        if (contract.customerId) {
          try {
            const customerId = contract.customerId.toString();
            this.logger.info('esign.callback.customer_sync_start', {
              contractId: contract._id.toString(),
              customerId,
            });

            // 调用客户服务更新状态
            const customerModel = this.contractModel.db.model('Customer');
            const customer = await customerModel.findById(customerId).exec();

            if (customer) {
              const oldStatus = customer.contractStatus;
              const oldLeadLevel = customer.leadLevel;

              // 更新客户状态和线索等级
              await customerModel.findByIdAndUpdate(customerId, {
                contractStatus: '已签约',
                leadLevel: 'O类',
                lastActivityAt: new Date(),
              }).exec();

              this.logger.info('esign.callback.customer_synced', {
                customerId,
                contractId: contract._id.toString(),
                oldStatus,
                oldLeadLevel,
              });

              // 记录操作日志
              const operationLogModel = this.contractModel.db.model('CustomerOperationLog');
              await operationLogModel.create({
                customerId: customer._id,
                operatorId: contract.createdBy || customer._id,
                entityType: 'contract',
                entityId: contract._id.toString(),
                operationType: 'update',
                operationName: '合同签约自动更新', // 🔥 修复：必填字段
                details: {
                  before: { contractStatus: oldStatus, leadLevel: oldLeadLevel },
                  after: { contractStatus: '已签约', leadLevel: 'O类' },
                  description: '合同签约成功，自动更新客户状态为已签约，线索等级为O类',
                  relatedId: contract._id.toString(),
                  relatedType: 'contract',
                },
                operatedAt: new Date(),
                requestId: RequestContextStore.getValue('requestId'),
              });

              // 🔔 广播刷新事件，通知前端更新客户列表
              try {
                await this.notificationGateway.broadcastRefresh('customerList', {
                  customerId: customerId,
                  contractNumber: contract.contractNumber,
                  action: 'statusUpdate',
                });
                this.logger.info('esign.callback.customer_refresh_broadcasted', {
                  customerId,
                  contractNumber: contract.contractNumber,
                });
              } catch (error) {
                this.logger.error('esign.callback.customer_refresh_failed', error, {
                  customerId,
                  contractNumber: contract.contractNumber,
                });
              }
            }
          } catch (error) {
            this.logger.error('esign.callback.customer_sync_failed', error, {
              contractId: contract._id.toString(),
              customerId: contract.customerId?.toString(),
            });
            // 不抛出异常，避免影响合同流程
          }
        }
      }

      // 🔔 如果状态变为 active，触发保险同步
      // 注意：这里不能直接注入 ContractsService（会造成循环依赖）
      // 保险同步会在 ContractsService.update() 方法中自动触发
      // 所以我们需要通过 ContractsService.update() 来更新合同，而不是直接更新数据库

      // 重新实现：通过事件或者直接调用 ContractsService
      // 由于循环依赖问题，这里我们先更新数据库，然后在 ContractsController 中手动触发同步

    } catch (error) {
      this.logger.error('esign.callback.handle_failed', error);
      throw error;
    }
  }

  private async syncCustomerNameBySignedContract(contract: ContractDocument): Promise<void> {
    const realName = contract.customerName?.trim();
    if (!realName) {
      this.logger.warn('esign.callback.customer_name_sync_missing_name', {
        contractId: contract._id.toString(),
        contractNumber: contract.contractNumber,
      });
      return;
    }

    // 优先按 customerId 精准更新
    if (contract.customerId) {
      const customer = await this.customerModel.findById(contract.customerId).select('_id name phone').exec();
      if (customer) {
        if ((customer.name || '').trim() === realName) {
          this.logger.info('esign.callback.customer_name_sync_skipped_same_name', {
            customerId: customer._id.toString(),
            contractId: contract._id.toString(),
          });
          return;
        }

        await this.customerModel.findByIdAndUpdate(customer._id, {
          name: realName,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        }).exec();

        this.logger.info('esign.callback.customer_name_synced_by_customer_id', {
          customerId: customer._id.toString(),
          contractId: contract._id.toString(),
        });
        return;
      }
    }

    // 兜底：按合同手机号更新（历史脏数据可能没有 customerId）
    if (contract.customerPhone) {
      const customer = await this.customerModel.findOne({ phone: contract.customerPhone }).select('_id name phone').exec();
      if (!customer) {
        this.logger.warn('esign.callback.customer_name_sync_customer_missing', {
          contractId: contract._id.toString(),
          contractNo: contract.contractNumber,
          customerPhone: contract.customerPhone,
        });
        return;
      }

      if ((customer.name || '').trim() === realName) {
        this.logger.info('esign.callback.customer_name_sync_skipped_same_name', {
          customerId: customer._id.toString(),
          contractId: contract._id.toString(),
        });
        return;
      }

      await this.customerModel.findByIdAndUpdate(customer._id, {
        name: realName,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      }).exec();

      this.logger.info('esign.callback.customer_name_synced_by_phone', {
        customerId: customer._id.toString(),
        contractId: contract._id.toString(),
      });
      return;
    }

    this.logger.warn('esign.callback.customer_name_sync_missing_customer_ref', {
      contractId: contract._id.toString(),
      contractNumber: contract.contractNumber,
    });
  }

}

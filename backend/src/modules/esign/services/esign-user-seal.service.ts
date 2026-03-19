import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import FormData from 'form-data';
import { AppLogger } from '../../../common/logging/app-logger';
import { ESignApiService, ESignResponse } from './esign-api.service';
import axios from 'axios';


@Injectable()
export class ESignUserSealService {
  private readonly logger = new AppLogger(ESignUserSealService.name);

  constructor(private readonly apiService: ESignApiService) {}

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
      this.logger.debug('添加企业用户:', { data: userData });

      // 如果没有私钥，返回模拟结果
      if (!this.apiService.config.privateKey) {
        this.logger.warn('未配置私钥，使用模拟添加企业用户');
        return {
          accountId: `mock_enterprise_${Date.now()}`,
          account: userData.account,
          name: userData.name,
          success: true
        };
      }

      const response = await this.apiService.axiosInstance.post<ESignResponse<any>>(
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
      this.logger.error('添加企业用户失败:', error);
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
      this.logger.debug('🖊️ 创建企业印章（嵌入式网页版）:', { data: sealData });
      
      // 如果没有私钥，返回模拟数据
      if (!this.apiService.config.privateKey) {
        this.logger.warn('未配置私钥，使用模拟企业印章制作页面');
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
        requestData.notifyUrl = this.apiService.config.notifyUrl;
      }

      this.logger.debug('📤 请求嵌入式印章制作页面:', { data: requestData });

      // 调用爱签嵌入式印章制作接口（这个接口相对简单，避免复杂签名问题）
      const response = await this.apiService.axiosInstance.post<any>(
        '/seal/makeOnline',
        requestData
      );

      this.logger.debug('📥 爱签响应:', { data: response.data });

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
      this.logger.error('🚨 获取企业印章制作页面失败:', error);
      
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
      this.logger.debug('获取印章列表:', { data: params });

      // 如果没有私钥，返回模拟结果
      if (!this.apiService.config.privateKey) {
        this.logger.warn('未配置私钥，使用模拟印章列表');
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
      const accountResponse = await this.apiService.axiosInstance.get<ESignResponse<any>>(
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

      const response = await this.apiService.axiosInstance.get<ESignResponse<any>>(url);

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取印章列表失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('获取印章列表失败:', error);
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
      this.logger.debug('删除印章:', { data: params });

      // 如果没有私钥，返回模拟结果
      if (!this.apiService.config.privateKey) {
        this.logger.warn('未配置私钥，使用模拟删除印章');
        return {
          success: true,
          message: '模拟删除印章成功'
        };
      }

      const response = await this.apiService.axiosInstance.delete<ESignResponse<any>>(
        `/v2/seals/${params.sealId}`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`删除印章失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('删除印章失败:', error);
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
      this.logger.debug('获取印章详情:', { data: params });

      // 如果没有私钥，返回模拟结果
      if (!this.apiService.config.privateKey) {
        this.logger.warn('未配置私钥，使用模拟印章详情');
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

      const response = await this.apiService.axiosInstance.get<ESignResponse<any>>(
        `/v2/seals/${params.sealId}`
      );

      if (response.data.code !== 0) {
        throw new BadRequestException(`获取印章详情失败: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('获取印章详情失败:', error);
      throw new BadRequestException(`获取印章详情失败: ${error.message}`);
    }
  }

  /**
   * 模块1：用户预注册
   * 将用户基本信息同步到爱签平台，延迟实名认证
   */
  async preRegisterUser(userData: {
    phone: string;
    name: string;
    idCard: string;
  }): Promise<{ account: string; sealNo: string }> {

    try {
      this.logger.debug('📝 模块1：用户预注册 (延迟认证):', { data: userData });

      const appId = this.apiService.config.appId;
      const domain = this.apiService.config.host;

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
      
      const privateKeyPem = this.apiService.getPrivateKeyPem();
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
      this.logger.error('❌ 用户预注册失败:', error);
      throw new BadRequestException(`用户预注册失败: ${error.response?.data?.msg || error.message}`);
    }
  }

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
      this.logger.debug('🔄 步骤1：添加陌生用户:', { data: userData });

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

      this.logger.debug('📤 发送给爱签的bizData:', { data: bizData });

      const response = await this.apiService.callESignAPI('/v2/user/addStranger', bizData);
      this.logger.debug('✅ 添加陌生用户响应:', { data: response });
      
      // callESignAPI已经返回了response.data，所以这里直接返回
      return response;
    } catch (error) {
      this.logger.error('❌ 添加陌生用户失败:', error);
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
   * 设置默认印章
   * API: /user/setDefaultSeal
   * 将指定印章设置为默认章，如果没有指定印章，则会将系统默认生成印章设置为默认章
   */
  async setDefaultSeal(account: string, sealNo?: string): Promise<any> {
    try {
      this.logger.debug(`🔧 为用户 ${account} 设置默认印章: ${sealNo || '系统默认章'}`);
      
      const bizData = {
        account: account,
        sealNo: sealNo || "5f0e3bd2fc744bd8b500576e60b17711" // 官方默认章编号
      };

      const response = await this.apiService.callESignAPI('/user/setDefaultSeal', bizData);
      
      if (response.code === 100000) {
        this.logger.debug(`✅ 用户 ${account} 默认印章设置成功`);
      } else {
        this.logger.warn(`⚠️ 用户 ${account} 默认印章设置失败: ${response.msg}`);
      }
      
      return response;
    } catch (error) {
      this.logger.error(`❌ 设置默认印章失败:`, error);
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
      this.logger.debug('🔍 检查用户权限:', { data: account });

      // 调用爱签API检查用户权限
      const result = await this.apiService.callESignAPI('/user/getUserPermissions', {
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
      this.logger.error('❌ 检查用户权限失败:', error);
      return {
        success: false,
        account,
        message: `检查用户权限失败: ${error.message}`,
        error: error.message
      };
    }
  }

}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ESignService } from './esign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// 预览请求DTO
interface PreviewRequestDto {
  templateId: string;
  formData: Record<string, any>;
}

@Controller('esign')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
export class ESignController {
  private readonly logger = new Logger(ESignController.name);
  
  constructor(private readonly esignService: ESignService) {
    this.logger.log('ESignController 已初始化');
  }

  /**
   * 获取合同列表
   */
  @Get('contracts')
  async getContracts() {
    this.logger.log('调用 contracts 端点');
    
    try {
      // 返回模拟数据，因为实际的合同数据存储尚未实现
      const mockContracts = [
        {
          id: '1',
          title: '劳动合同 - 张三',
          content: '这是一份基于爱签模板的劳动合同...',
          status: 'draft',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15',
          createdBy: 'admin',
        },
        {
          id: '2',
          title: '服务合同 - 李四',
          content: '基于爱签模板的服务合同内容...',
          status: 'pending',
          createdAt: '2024-01-14',
          updatedAt: '2024-01-14',
          createdBy: 'admin',
          signerName: '李四',
          signerEmail: 'lisi@example.com',
        },
        {
          id: '3',
          title: '购销合同 - 王五公司',
          content: '已完成签署的购销合同...',
          status: 'signed',
          createdAt: '2024-01-13',
          updatedAt: '2024-01-16',
          createdBy: 'admin',
          signedAt: '2024-01-16',
          signerName: '王五',
          signerEmail: 'wangwu@example.com',
        },
      ];
      
      return {
        success: true,
        data: mockContracts,
        message: '获取合同列表成功',
      };
    } catch (error) {
      this.logger.error('获取合同列表失败', error.stack);
      
      return {
        success: false,
        message: error.message || '获取合同列表失败',
      };
    }
  }

  /**
   * 发送签名请求
   */
  @Post('send-signature-request')
  async sendSignatureRequest(@Body() signatureData: any) {
    this.logger.log('调用 send-signature-request 端点');
    
    try {
      // 这里应该调用实际的爱签API发送签名请求
      // 目前返回模拟成功响应
      
      return {
        success: true,
        message: '签名请求已发送',
      };
    } catch (error) {
      this.logger.error('发送签名请求失败', error.stack);
      
      return {
        success: false,
        message: error.message || '发送签名请求失败',
      };
    }
  }

  /**
   * 签署合同
   */
  @Post('sign-contract')
  async signContract(@Body() signData: any) {
    this.logger.log('调用 sign-contract 端点');
    
    try {
      // 这里应该调用实际的爱签API进行签署
      // 目前返回模拟成功响应
      
      return {
        success: true,
        message: '合同签署成功',
      };
    } catch (error) {
      this.logger.error('合同签署失败', error.stack);
      
      return {
        success: false,
        message: error.message || '合同签署失败',
      };
    }
  }

  /**
   * 获取调试配置信息 - 移到顶部测试
   */
  @Get('debug-config')
  async getDebugConfig() {
    this.logger.log('调用 debug-config 端点');
    try {
      const config = this.esignService.getDebugConfig();
      
      return {
        success: true,
        data: config,
        message: '获取配置信息成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取配置信息失败',
      };
    }
  }

  /**
   * 获取调试配置信息 - 复制版本用于测试
   */
  @Get('debug-config-copy')
  async getDebugConfigCopy() {
    this.logger.log('调用 debug-config-copy 端点');
    try {
      const config = this.esignService.getDebugConfig();
      
      return {
        success: true,
        data: config,
        message: '获取配置信息成功 (复制版本)',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取配置信息失败',
      };
    }
  }

  /**
   * 简单测试端点
   */
  @Get('test')
  async simpleTest() {
    this.logger.log('调用 test 端点');
    return {
      success: true,
      message: '测试端点工作正常',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 测试爱签连接
   */
  @Get('test-connection')
  async testConnection() {
    this.logger.log('调用 test-connection 端点');
    
    try {
      const result = await this.esignService.testConnection();
      
      return {
        success: result.success,
        data: result,
        message: result.message,
      };
    } catch (error) {
      this.logger.error('爱签连接测试失败', error.stack);
      
      return {
        success: false,
        message: error.message || '连接测试失败',
      };
    }
  }

  /**
   * 获取模板控件信息（用于前端动态表单生成）
   */
  @Get('templates/:templateId/components')
  async getTemplateComponents(@Param('templateId') templateId: string) {
    this.logger.log(`调用 templates/${templateId}/components 端点`);
    
    try {
      const result = await this.esignService.getTemplateComponents(templateId);
      
      return {
        success: true,
        data: result.data,
        message: '获取模板控件信息成功',
      };
    } catch (error) {
      this.logger.error(`获取模板控件信息失败: ${templateId}`, error.stack);
      
      return {
        success: false,
        message: error.message || '获取模板控件信息失败',
      };
    }
  }

  /**
   * 生成模板预览
   */
  @Post('templates/preview')
  async generatePreview(@Body() previewRequest: PreviewRequestDto) {
    this.logger.log(`调用 templates/preview 端点`);
    
    try {
      if (!previewRequest.templateId) {
        throw new BadRequestException('模板ID不能为空');
      }

      const result = await this.esignService.generateTemplatePreview(
        previewRequest.templateId,
        previewRequest.formData || {}
      );

      return {
        success: true,
        data: {
          previewUrl: result.data.previewUrl,
          previewId: result.data.previewId
        },
        message: '生成预览成功',
      };
    } catch (error) {
      this.logger.error(`生成模板预览失败: ${previewRequest.templateId}`, error.stack);
      
      return {
        success: false,
        message: error.message || '生成预览失败',
      };
    }
  }

  /**
   * 获取模板控件信息 - 调用真实的爱签API
   * 基于官方SDK的 /template/data 端点
   */
  @Post('template/data')
  async getTemplateData(@Body() body: { templateIdent: string }) {
    this.logger.log(`调用 template/data 端点，模板标识: ${body.templateIdent}`);
    
    try {
      if (!body.templateIdent) {
        throw new BadRequestException('模板标识不能为空');
      }

      const result = await this.esignService.getTemplateData(body.templateIdent);
      
      return {
        code: 100000,
        data: result, // 直接返回result，而不是result.data
        msg: '成功'
      };
    } catch (error) {
      this.logger.error(`获取模板控件信息失败: ${body.templateIdent}`, error.stack);
      
      return {
        code: 500,
        data: null,
        msg: error.message || '获取模板控件信息失败'
      };
    }
  }

  /**
   * 创建完整的签署流程
   */
  @Post('contracts/create-with-template')
  async createContractWithTemplate(@Body() contractData: any) {
    this.logger.log(`调用 contracts/create-with-template 端点`);
    
    try {
      const result = await this.esignService.createContractWithTemplate(contractData);
      
      return {
        success: true,
        data: result,
        message: '创建合同成功',
      };
    } catch (error) {
      this.logger.error(`创建合同失败: ${contractData.templateId}`, error.stack);
      
      return {
        success: false,
        message: error.message || '创建合同失败',
      };
    }
  }

  /**
   * 基于官方爱签流程创建合同（完整流程）
   */
  @Post('create-contract-flow')
  async createContractFlow(@Body() contractData: {
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    signerName: string;
    signerMobile: string;
    signerIdCard: string;
    validityTime?: number;
    signOrder?: number;
  }) {
    this.logger.log('调用 create-contract-flow 端点');
    
    try {
      // 生成唯一合同编号
      const contractNo = `CONTRACT_${Date.now()}`;
      
      // 调用完整的合同创建流程
      const result = await this.esignService.createCompleteContractFlow({
        contractNo: contractNo,
        contractName: contractData.contractName,
        templateNo: contractData.templateNo,
        templateParams: contractData.templateParams,
        signerName: contractData.signerName,
        signerMobile: contractData.signerMobile,
        signerIdCard: contractData.signerIdCard,
        validityTime: contractData.validityTime || 30,
        signOrder: contractData.signOrder || 1
      });
      
      return {
        success: result.success,
        data: {
          contractNo: result.contractNo,
          signUrl: result.signUrl,
          message: result.message
        },
        message: result.success ? '合同创建成功' : '合同创建失败'
      };
    } catch (error) {
      this.logger.error('合同创建流程失败', error.stack);
      
      return {
        success: false,
        message: error.message || '合同创建流程失败',
      };
    }
  }

  /**
   * 添加陌生用户
   */
  @Post('add-stranger')
  async addStranger(@Body() userData: {
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
  }) {
    this.logger.log('调用 add-stranger 端点');
    
    try {
      const result = await this.esignService.addStranger(userData);
      
      return {
        success: true,
        data: result,
        message: '添加陌生用户成功'
      };
    } catch (error) {
      this.logger.error('添加陌生用户失败', error.stack);
      
      return {
        success: false,
        message: error.message || '添加陌生用户失败',
      };
    }
  }

  /**
   * 创建合同（基于模板）
   */
  @Post('create-contract-template')
  async createContractTemplate(@Body() contractData: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    validityTime?: number;
    signOrder?: number;
  }) {
    this.logger.log('调用 create-contract-template 端点');
    
    try {
      const result = await this.esignService.createContractWithTemplate(contractData);
      
      return {
        success: true,
        data: result,
        message: '创建合同成功'
      };
    } catch (error) {
      this.logger.error('创建合同失败', error.stack);
      
      return {
        success: false,
        message: error.message || '创建合同失败',
      };
    }
  }

  /**
   * 添加签署方（官方标准实现）
   * 支持添加多个签署方，返回签署链接
   */
  @Post('add-signers')
  async addSigners(@Body() signersData: Array<{
    contractNo: string;
    account: string;
    signType: number; // 2：无感知签约，3：有感知签约
    sealNo?: string;
    authSignAccount?: string;
    noticeMobile?: string;
    signOrder?: string;
    isNotice?: number;
    validateType?: number;
    faceAuthMode?: number;
    validateTypeList?: string;
    autoSwitch?: number;
    isNoticeComplete?: number;
    waterMark?: number;
    autoSms?: number;
    customSignFlag?: number;
    signStrategyList?: Array<{
      attachNo: number;
      locationMode: number;
      signKey?: string;
      signPage?: number;
      signX?: number;
      signY?: number;
      signType?: number;
    }>;
    signStrikeList?: Array<{
      attachNo: number;
      signPage: string;
      signX?: number;
      signY?: number;
    }>;
    receiverFillStrategyList?: Array<{
      attachNo: number;
      signKey: string;
      defaultValue?: string;
    }>;
    authConfig?: {
      idType?: string;
      idNumber?: string;
      name?: string;
      mobile?: string;
    };
    isIframe?: number;
    willType?: string;
    signMark?: string;
  }>) {
    this.logger.log('调用 add-signers 端点（官方标准）');
    
    try {
      const result = await this.esignService.addContractSigners(signersData);
      
      return result;
    } catch (error) {
      this.logger.error('添加签署方失败', error.stack);
      
      return {
        success: false,
        message: error.message || '添加签署方失败',
      };
    }
  }

  /**
   * 简化版添加签署方
   * 适用于常见的甲乙双方签署场景
   */
  @Post('add-signers-simple')
  async addSignersSimple(@Body() params: {
    contractNo: string;
    signers: Array<{
      account: string;
      name: string;
      mobile: string;
      signType?: 'auto' | 'manual';
      validateType?: 'sms' | 'password' | 'face';
      signPosition?: {
        page?: number;
        x?: number;
        y?: number;
        keyword?: string;
      };
    }>;
    signOrder?: 'sequential' | 'parallel';
  }) {
    this.logger.log('调用 add-signers-simple 端点');
    
    try {
      const result = await this.esignService.addSimpleContractSigners(params);
      
      // 直接返回爱签API的原始响应格式 { code, msg, data }
      return result;
    } catch (error) {
      this.logger.error('简化版添加签署方失败', error.stack);
      
      // 返回爱签API错误格式
      return {
        code: error.response?.data?.code || 100001,
        msg: error.response?.data?.msg || error.message || '添加签署方失败',
        data: null
      };
    }
  }

  /**
   * 获取合同状态
   */
  @Get('contract-status/:contractNo')
  async getContractStatus(@Param('contractNo') contractNo: string) {
    this.logger.log('调用 contract-status 端点');
    
    try {
      const result = await this.esignService.getContractStatus(contractNo);
      
      return {
        success: true,
        data: result,
        message: '获取合同状态成功'
      };
    } catch (error) {
      this.logger.error('获取合同状态失败', error.stack);
      
      return {
        success: false,
        message: error.message || '获取合同状态失败',
      };
    }
  }

  /**
   * 下载已签署合同
   */
  @Get('download-contract/:contractNo')
  async downloadContract(@Param('contractNo') contractNo: string) {
    this.logger.log('调用 download-contract 端点');
    
    try {
      const result = await this.esignService.downloadSignedContract(contractNo);
      
      return {
        success: true,
        data: result,
        message: '下载合同成功'
      };
    } catch (error) {
      this.logger.error('下载合同失败', error.stack);
      
      return {
        success: false,
        message: error.message || '下载合同失败',
      };
    }
  }

  /**
   * 创建合同（步骤2：上传待签署文件）
   * 基于模板创建合同
   */
  @Post('create-contract')
  async createContract(@Body() contractData: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    validityTime?: number;
    signOrder?: number;
    readSeconds?: number;
    needAgree?: number;
    autoExpand?: number;
    refuseOn?: number;
    autoContinue?: number;
    viewFlg?: number;
    enableDownloadButton?: number;
  }) {
    try {
      console.log('创建合同请求:', contractData);

      const result = await this.esignService.createContractWithTemplate(contractData);
      
      console.log('创建合同响应:', result);

      // 直接返回爱签API的原始响应格式 { code, msg, data }
      return result;
    } catch (error) {
      console.error('创建合同失败:', error);
      // 返回爱签API错误格式
      return {
        code: error.response?.data?.code || 100001,
        msg: error.response?.data?.msg || error.message || '创建合同失败',
        data: null
      };
    }
  }

  /**
   * 获取模板列表（从爱签API）
   */
  @Get('templates')
  async getTemplates() {
    this.logger.log('调用 templates 端点（从爱签API获取真实模板）');
    
    try {
      // 使用真实的爱签API获取模板列表
      const templates = await this.esignService.getRealTemplateList();

      return {
        success: true,
        data: templates,
        message: '获取模板列表成功'
      };
    } catch (error) {
      this.logger.error('获取模板列表失败', error.stack);
      
      return {
        success: false,
        message: error.message || '获取模板列表失败',
        error: error
      };
    }
  }

  /**
   * 添加甲乙双方用户
   * 同时添加甲方（客户）和乙方（阿姨）两个用户
   */
  @Post('add-users-batch')
  async addUsersBatch(@Body() body: {
    partyAName: string;
    partyAMobile: string;
    partyAIdCard?: string;
    partyBName: string;
    partyBMobile: string;
    partyBIdCard?: string;
    isNotice?: boolean;
    isSignPwdNotice?: boolean;
  }) {
    try {
      console.log('批量添加甲乙双方用户请求:', body);

      // 构建甲方用户请求
      const partyARequest = {
        account: body.partyAMobile,
        userType: 2, // 个人用户
        name: body.partyAName,
        mobile: body.partyAMobile,
        idCard: body.partyAIdCard,
        isNotice: body.isNotice ? 1 : 0,
        isSignPwdNotice: body.isSignPwdNotice ? 1 : 0,
      };

      // 构建乙方用户请求
      const partyBRequest = {
        account: body.partyBMobile,
        userType: 2, // 个人用户
        name: body.partyBName,
        mobile: body.partyBMobile,
        idCard: body.partyBIdCard,
        isNotice: body.isNotice ? 1 : 0,
        isSignPwdNotice: body.isSignPwdNotice ? 1 : 0,
      };

      // 依次添加甲方和乙方用户
      let partyAResponse = null;
      let partyBResponse = null;
      
      try {
        partyAResponse = await this.esignService.addStranger(partyARequest);
        console.log('甲方用户添加响应:', partyAResponse);
      } catch (error) {
        console.error('甲方用户添加失败:', error);
        partyAResponse = { code: -1, message: error.message || '甲方用户添加失败' };
      }

      try {
        partyBResponse = await this.esignService.addStranger(partyBRequest);
        console.log('乙方用户添加响应:', partyBResponse);
      } catch (error) {
        console.error('乙方用户添加失败:', error);
        partyBResponse = { code: -1, message: error.message || '乙方用户添加失败' };
      }

      // 检查结果 - 爱签API成功响应通常是 code: 100000，用户已存在是 100021
      const partyASuccess = partyAResponse && (partyAResponse.code === 100000 || partyAResponse.code === 100021);
      const partyBSuccess = partyBResponse && (partyBResponse.code === 100000 || partyBResponse.code === 100021);

      return {
        success: partyASuccess && partyBSuccess,
        message: partyASuccess && partyBSuccess ? '甲乙双方用户添加成功' : '部分用户添加失败',
        data: {
          partyA: {
            success: partyASuccess,
            message: partyAResponse?.msg || partyAResponse?.message || '未知状态',
            request: partyARequest,
            response: partyAResponse
          },
          partyB: {
            success: partyBSuccess,
            message: partyBResponse?.msg || partyBResponse?.message || '未知状态',
            request: partyBRequest,
            response: partyBResponse
          }
        }
      };
    } catch (error) {
      console.error('批量添加用户失败:', error);
      return {
        success: false,
        message: error.message || '批量添加用户失败',
        error: error
      };
    }
  }
} 
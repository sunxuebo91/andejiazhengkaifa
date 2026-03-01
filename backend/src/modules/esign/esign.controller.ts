import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Logger,
  Query,
  Inject,
  forwardRef,
  Res,
  Header,
} from '@nestjs/common';
import { ESignService } from './esign.service';
import { ContractsService } from '../contracts/contracts.service';
import { ContractSignNotificationService } from '../weixin/services/contract-sign-notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

// 预览请求DTO
interface PreviewRequestDto {
  templateId: string;
  formData: Record<string, any>;
}

@Controller('esign')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
export class ESignController {
  private readonly logger = new Logger(ESignController.name);

  constructor(
    private readonly esignService: ESignService,
    @Inject(forwardRef(() => ContractsService))
    private readonly contractsService: ContractsService,
    private readonly contractSignNotificationService: ContractSignNotificationService,
  ) {
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
  @Public() // 🔥 小程序需要公开访问此接口 - 必须在@Post之前
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
    // 支持多个签署人
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
        // 传递新的多签署人参数
        signers: contractData.signers,
        // 兼容旧版本参数
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
          signUrls: result.signUrls,
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
      sealNo?: number;
      canDrag?: number;
      offsetX?: number;
      offsetY?: number;
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
    this.logger.log('调用 contract-status 端点, contractNo:', contractNo);
    
    try {
      const result = await this.esignService.getContractStatus(contractNo);
      
      this.logger.log('获取合同状态成功:', result);
      
      // 🎯 修复：确保detailedStatus在正确的层级
      const response: any = {
        success: true,
        data: result.data || result, // 爱签API的原始数据
        message: '获取合同状态成功',
        code: result.code,
        msg: result.msg
      };
      
      // 如果有精准状态解析结果，添加到响应的根级别
      if (result.detailedStatus) {
        response.detailedStatus = result.detailedStatus;
        this.logger.log('🎯 添加精准状态到响应:', result.detailedStatus);
      }
      
      return response;
    } catch (error) {
      this.logger.error('获取合同状态失败', error.stack);
      
      // 处理爱签API的特定错误码
      let errorMessage = '获取合同状态失败';
      if (error.response?.data?.code) {
        const errorCode = error.response.data.code;
        const errorMsg = error.response.data.msg;
        
        switch (errorCode) {
          case 100056:
            errorMessage = '参数错误：合同编号为空';
            break;
          case 100066:
            errorMessage = '合同不存在';
            break;
          case 100613:
            errorMessage = '合同已删除';
            break;
          default:
            errorMessage = `爱签API错误 (${errorCode}): ${errorMsg}`;
        }
        
        this.logger.warn(`爱签API错误 - 错误码: ${errorCode}, 错误信息: ${errorMsg}`);
      }
      
      return {
        success: false,
        message: errorMessage,
        errorCode: error.response?.data?.code,
        originalError: error.response?.data,
        // 添加状态映射信息，方便前端处理
        statusInfo: this.getContractStatusInfo(error.response?.data?.code)
      };
    }
  }

  /**
   * 获取合同状态信息映射
   */
  private getContractStatusInfo(errorCode?: number): any {
    const statusMap = {
      0: { name: '等待签约', color: 'orange', description: '合同已创建，等待签署方签约' },
      1: { name: '签约中', color: 'blue', description: '合同正在签署过程中' },
      2: { name: '已签约', color: 'green', description: '合同已完成签署' },
      3: { name: '过期', color: 'red', description: '合同已过期' },
      4: { name: '拒签', color: 'red', description: '签署方拒绝签署合同' },
      6: { name: '作废', color: 'gray', description: '合同已作废' },
      7: { name: '撤销', color: 'gray', description: '合同已撤销' }
    };

    const errorMap = {
      100056: { name: '参数错误', color: 'red', description: '合同编号为空或格式错误' },
      100066: { name: '合同不存在', color: 'orange', description: '该合同编号不存在，请检查合同编号是否正确' },
      100613: { name: '合同已删除', color: 'gray', description: '该合同已被删除' }
    };

    if (errorCode && errorMap[errorCode]) {
      return errorMap[errorCode];
    }

    return { name: '未知状态', color: 'gray', description: '无法获取合同状态信息' };
  }

  /**
   * 同步合同状态 - 批量查询多个合同状态
   */
  @Post('sync-contract-status')
  async syncContractStatus(@Body() body: { contractNos: string[] }) {
    this.logger.log('批量同步合同状态:', body.contractNos);
    
    const results = [];
    
    for (const contractNo of body.contractNos) {
      try {
        const result = await this.esignService.getContractStatus(contractNo);
        results.push({
          contractNo,
          success: true,
          data: result,
          statusInfo: this.getContractStatusInfo(result.data?.status)
        });
      } catch (error) {
        const errorCode = error.response?.data?.code;
        results.push({
          contractNo,
          success: false,
          message: error.message || '获取合同状态失败',
          errorCode,
          statusInfo: this.getContractStatusInfo(errorCode)
        });
      }
    }

    return {
      success: true,
      data: results,
      message: `已处理 ${results.length} 个合同状态查询`
    };
  }

  /**
   * 下载已签署合同（完善版本）
   * 支持查询参数：force、downloadFileType、outfile
   */
  @Get('download-contract/:contractNo')
  async downloadContract(
    @Param('contractNo') contractNo: string,
    @Query('force') force?: string,
    @Query('downloadFileType') downloadFileType?: string,
    @Query('outfile') outfile?: string
  ) {
    this.logger.log('调用 download-contract 端点，参数:', { contractNo, force, downloadFileType, outfile });
    
    try {
      const options = {
        force: force ? parseInt(force) : undefined,
        downloadFileType: downloadFileType ? parseInt(downloadFileType) : undefined,
        outfile: outfile || undefined
      };

      const result = await this.esignService.downloadSignedContract(contractNo, options);
      
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
  @Public() // 🔥 小程序需要公开访问此接口 - 必须在@Get之前
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
   * 添加甲乙丙三方用户（恢复git 2.2.4版本的正确实现）
   * 甲方（客户）、乙方（阿姨）、丙方（企业）
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
      console.log('🔄 批量添加甲乙丙三方用户请求:', body);

      // 构建甲方用户请求
      const partyARequest = {
        account: body.partyAMobile,
        userType: 2, // 个人用户
        name: body.partyAName,
        mobile: body.partyAMobile,
        idCard: body.partyAIdCard,
        isNotice: 0, // 🔕 不发送短信通知
        isSignPwdNotice: 0, // 不通知签约密码
      };

      // 构建乙方用户请求
      const partyBRequest = {
        account: body.partyBMobile,
        userType: 2, // 个人用户
        name: body.partyBName,
        mobile: body.partyBMobile,
        idCard: body.partyBIdCard,
        isNotice: 0, // 🔕 不发送短信通知
        isSignPwdNotice: 0, // 不通知签约密码
      };

      // 🎯 关键修复：使用官方已实名的测试企业账号（支持无感知签约）
      const partyCRequest = {
        account: 'ASIGN91110111MACJMD2R5J', // 🔑 官方已实名测试企业账号
        userType: 1, // 企业用户类型
        companyName: '北京安得家政有限公司',
        mobile: '', // 企业用户不需要手机号
        isNotice: 0, // 企业用户不需要短信通知
        creditCode: '91110000000000000X', // 企业统一社会信用代码
        agentName: '张三', // 法人姓名
        agentCardNo: '110000000000000000', // 法人身份证号
        // 🔑 关键：根据官方回复，添加自动签约相关参数
        signPwd: '', // 签约密码（企业用户可留空）
        isSignPwdNotice: 0, // 不通知签约密码
        // 为了确保无感知签约权限，可能需要设置特定的不可变信息
        immutableInfoList: ['signPwd'] // 设置签约密码为不可变，支持自动签约
      };

      // 依次添加甲方、乙方和丙方用户
      let partyAResponse = null;
      let partyBResponse = null;
      let partyCResponse = null;
      
      try {
        partyAResponse = await this.esignService.addStranger(partyARequest);
        console.log('✅ 甲方用户添加响应:', partyAResponse);
      } catch (error) {
        console.error('❌ 甲方用户添加失败:', error);
        partyAResponse = { code: -1, message: error.message || '甲方用户添加失败' };
      }

      try {
        partyBResponse = await this.esignService.addStranger(partyBRequest);
        console.log('✅ 乙方用户添加响应:', partyBResponse);
      } catch (error) {
        console.error('❌ 乙方用户添加失败:', error);
        partyBResponse = { code: -1, message: error.message || '乙方用户添加失败' };
      }

      // 🎯 关键修复：添加丙方企业用户
      try {
        partyCResponse = await this.esignService.addStranger(partyCRequest);
        console.log('✅ 丙方企业用户添加响应:', partyCResponse);
      } catch (error) {
        console.error('❌ 丙方企业用户添加失败:', error);
        partyCResponse = { code: -1, message: error.message || '丙方企业用户添加失败' };
      }

      // 检查结果 - 爱签API成功响应通常是 code: 100000，用户已存在是 100021
      const partyASuccess = partyAResponse && (partyAResponse.code === 100000 || partyAResponse.code === 100021);
      const partyBSuccess = partyBResponse && (partyBResponse.code === 100000 || partyBResponse.code === 100021);
      const partyCSuccess = partyCResponse && (partyCResponse.code === 100000 || partyCResponse.code === 100021);

      const allSuccess = partyASuccess && partyBSuccess && partyCSuccess;

      return {
        success: allSuccess,
        message: allSuccess ? '甲乙丙三方用户添加成功' : '部分用户添加失败',
        data: {
          partyA: {
            success: partyASuccess,
            message: partyAResponse?.msg || partyAResponse?.message || '未知状态',
            code: partyAResponse?.code,
            request: partyARequest,
            response: partyAResponse
          },
          partyB: {
            success: partyBSuccess,
            message: partyBResponse?.msg || partyBResponse?.message || '未知状态',
            code: partyBResponse?.code,
            request: partyBRequest,
            response: partyBResponse
          },
          partyC: {
            success: partyCSuccess,
            message: partyCResponse?.msg || partyCResponse?.message || '未知状态',
            code: partyCResponse?.code,
            request: partyCRequest,
            response: partyCResponse
          }
        }
      };
    } catch (error) {
      console.error('❌ 批量添加用户失败:', error);
      return {
        success: false,
        message: error.message || '批量添加用户失败',
        error: error
      };
    }
  }

  /**
   * 预览合同信息 - 使用签约链接预览（最简单方案）
   * 支持GET和POST两种方式，POST可以传入自定义的签署方配置
   */
  @Get('preview-contract/:contractNo')
  async previewContract(@Param('contractNo') contractNo: string) {
    this.logger.log('调用 preview-contract 端点 (GET) - 使用签约链接预览');
    
    try {
      // 🔥 使用新的简单预览方法：直接使用签约链接作为预览链接
      const result = await this.esignService.previewContractWithSignUrls(contractNo);
      
      return result;
    } catch (error) {
      this.logger.error('获取合同预览信息失败', error.stack);
      
      // 注意：这里不再抛出异常，而是返回包含错误信息的响应
      // 这样前端就能收到错误响应而不是网络异常
      return {
        success: false,
        message: error.message || '获取合同预览信息失败',
      };
    }
  }

  /**
   * 预览合同信息（带自定义签署方配置）
   * 优先使用签约链接预览，如果需要自定义配置则使用原有方法
   */
  @Post('preview-contract/:contractNo')
  async previewContractWithSigners(
    @Param('contractNo') contractNo: string,
    @Body() body: {
      signers?: Array<{
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
      }>;
    }
  ) {
    this.logger.log('调用 preview-contract 端点 (POST)');
    
    try {
      // 🔥 如果没有提供自定义签署方配置，优先使用简单的签约链接预览
      if (!body.signers || body.signers.length === 0) {
        this.logger.log('未提供自定义签署方配置，使用签约链接预览');
        const result = await this.esignService.previewContractWithSignUrls(contractNo);
        return result;
      }

      // 如果提供了自定义签署方配置，使用原有方法
      this.logger.log('使用自定义签署方配置预览');
      const result = await this.esignService.previewContractWithSignUrls(contractNo);
      
      return result;
    } catch (error) {
      this.logger.error('获取合同预览信息失败', error.stack);
      
      // 注意：这里不再抛出异常，而是返回包含错误信息的响应
      // 这样前端就能收到错误响应而不是网络异常
      return {
        success: false,
        message: error.message || '获取合同预览信息失败',
      };
    }
  }

  /**
   * 撤销合同
   */
  @Post('withdraw-contract/:contractNo')
  async withdrawContract(
    @Param('contractNo') contractNo: string,
    @Body() body: { 
      withdrawReason?: string;
      isNoticeSignUser?: boolean;
    }
  ) {
    this.logger.log('调用 withdraw-contract 端点');
    
    try {
      const result = await this.esignService.withdrawContract(
        contractNo, 
        body.withdrawReason,
        body.isNoticeSignUser || false
      );
      
      return result;
    } catch (error) {
      this.logger.error('撤销合同失败', error.stack);
      
      return {
        success: false,
        message: error.message || '撤销合同失败',
      };
    }
  }

  /**
   * 作废合同
   */
  @Post('invalidate-contract/:contractNo')
  async invalidateContract(
    @Param('contractNo') contractNo: string,
    @Body() body: {
      validityTime?: number;
      notifyUrl?: string;
      redirectUrl?: string;
    }
  ) {
    this.logger.log('调用 invalidate-contract 端点');

    try {
      const result = await this.esignService.invalidateContract(
        contractNo,
        body.validityTime || 15, // 默认15天
        body.notifyUrl,
        body.redirectUrl
      );

      return result;
    } catch (error) {
      this.logger.error('作废合同失败', error.stack);

      return {
        success: false,
        message: error.message || '作废合同失败',
      };
    }
  }

  /**
   * 智能撤销/作废合同
   */
  @Post('cancel-contract/:contractNo')
  async cancelContract(
    @Param('contractNo') contractNo: string,
    @Body() body: {
      reason?: string;
      isNoticeSignUser?: boolean;
    }
  ) {
    this.logger.log('调用 cancel-contract 端点');

    try {
      const result = await this.esignService.cancelContract(
        contractNo,
        body.reason,
        body.isNoticeSignUser || false
      );

      return result;
    } catch (error) {
      this.logger.error('智能撤销/作废合同失败', error.stack);

      return {
        success: false,
        message: error.message || '撤销/作废合同失败',
      };
    }
  }

  /**
   * 爱签合同状态回调
   * 当合同状态变化时，爱签会调用这个接口
   *
   * 爱签状态码说明：
   * 0 = 等待签约
   * 1 = 签约中（有人已签署，但还有人未签）
   * 2 = 已签约（所有人都已签署）
   * 3 = 过期
   * 4 = 拒签
   * 6 = 作废
   * 7 = 撤销
   */
  @Public() // 爱签回调不需要认证
  @Post('callback')
  @Header('Content-Type', 'text/plain') // 返回纯文本
  async handleEsignCallback(@Body() callbackData: any, @Res() res: any) {
    this.logger.log('🔔 收到爱签回调:', JSON.stringify(callbackData));

    try {
      // 1. 处理爱签回调，更新合同状态
      await this.esignService.handleContractCallback(callbackData);

      // 2. 获取合同信息
      const { contractNo, status } = callbackData;
      const contract = await this.esignService['contractModel'].findOne({
        esignContractNo: contractNo
      }).populate('createdBy', '_id name').exec();

      if (contract) {
        // 3. 发送签署状态通知
        const statusNum = typeof status === 'string' ? parseInt(status, 10) : status;

        if (statusNum === 1) {
          // 签约中 - 有人已签署，判断是甲方还是乙方签了
          // 注：爱签回调可能包含签署人信息，这里简化处理
          this.logger.log(`📝 合同 ${contractNo} 有人已签署，发送通知`);

          // 异步发送通知，不阻塞回调响应
          this.contractSignNotificationService.sendContractSignedNotification(
            {
              _id: contract._id.toString(),
              contractNumber: contract.contractNumber,
              customerName: contract.customerName,
              workerName: contract.workerName,
              customerServiceFee: contract.customerServiceFee,
              createdBy: contract.createdBy,
            },
            'customer' // 暂时假设是雇主先签，后续可根据回调数据判断
          ).catch(error => {
            this.logger.error(`发送签署通知失败:`, error);
          });
        } else if (statusNum === 2) {
          // 已签约 - 所有人都已签署
          this.logger.log(`🎉 合同 ${contractNo} 已签约，发送通知并触发保险同步`);

          // 发送签署完成通知
          this.contractSignNotificationService.sendContractSignedNotification(
            {
              _id: contract._id.toString(),
              contractNumber: contract.contractNumber,
              customerName: contract.customerName,
              workerName: contract.workerName,
              customerServiceFee: contract.customerServiceFee,
              createdBy: contract.createdBy,
            },
            'both'
          ).catch(error => {
            this.logger.error(`发送签署完成通知失败:`, error);
          });

          // 异步触发保险同步，不阻塞回调响应
          this.contractsService.syncInsuranceOnContractActive(contract._id.toString())
            .catch(error => {
              this.logger.error(`保险同步失败（异步）:`, error);
            });
        }
      }

      // 🔥 重要：爱签要求回调响应必须是字符串 "ok"
      return res.status(200).send('ok');
    } catch (error) {
      this.logger.error('处理爱签回调失败', error.stack);

      // 即使失败也返回 "ok"，避免爱签重试
      return res.status(200).send('ok');
    }
  }

  @Post('test-get-contract')
  async testGetContract(@Body() body: { contractNo: string }) {
    this.logger.log('调用 test-get-contract 端点, contractNo:', body.contractNo);
    
    try {
      const result = await this.esignService.getContractInfo(body.contractNo);
      return result;
    } catch (error) {
      this.logger.error('测试getContract失败', error.stack);
      
      return {
        success: false,
        message: error.message || '测试getContract失败',
        error: error.toString()
      };
    }
  }

  /**
   * 🔍 查询用户权限状态
   */
  @Post('check-permissions')
  async checkUserPermissions(@Body() body: { account: string }) {
    this.logger.log('调用 check-permissions 端点, account:', body.account);
    
    try {
      const result = await this.esignService.checkUserPermissions(body.account);
      return result;
    } catch (error) {
      this.logger.error('查询用户权限失败', error.stack);
      
      return {
        success: false,
        message: error.message || '查询用户权限失败',
        error: error.toString()
      };
    }
  }

  /**
   * 🔍 查询企业测试账号权限状态
   */
  @Get('check-enterprise-permissions')
  async checkEnterprisePermissions() {
    this.logger.log('调用 check-enterprise-permissions 端点');
    
    try {
      const enterpriseAccount = 'ASIGN91110111MACJMD2R5J'; // 官方已实名测试企业账号
      const result = await this.esignService.checkUserPermissions(enterpriseAccount);
      return {
        ...result,
        account: enterpriseAccount,
        accountType: '官方已实名测试企业账号'
      };
    } catch (error) {
      this.logger.error('查询企业权限失败', error.stack);
      
      return {
        success: false,
        message: error.message || '查询企业权限失败',
        error: error.toString()
      };
    }
  }
} 
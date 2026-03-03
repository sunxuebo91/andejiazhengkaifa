import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import * as xml2js from 'xml2js';
import { InsurancePolicy, InsurancePolicyDocument, PolicyStatus } from './models/insurance-policy.model';
import { InsuranceSyncLog, InsuranceSyncLogDocument, SyncStatus } from './models/insurance-sync-log.model';
import { Contract, ContractDocument } from '../contracts/models/contract.model';
import {
  CreatePolicyDto,
  QueryPolicyDto,
  CancelPolicyDto,
  PrintPolicyDto,
  InvoiceDto,
  SurrenderPolicyDto,
  AmendPolicyDto,
  AddInsuredDto,
} from './dto/create-policy.dto';

// 大树保API配置接口
interface DashubaoConfig {
  user: string;
  password: string;
  testUrl: string;
  prodUrl: string;
  isProduction: boolean;
}

// API响应接口
interface DashubaoResponse {
  Success: string;
  Message?: string;
  OrderId?: string;
  PolicyNo?: string;
  PolicyPdfUrl?: string;
  AgencyPolicyRef?: string;
  TotalPremium?: string;
  AuthUrl?: string;
  SurrenderPremium?: string;
  Status?: string; // 保单状态：1-已生效, 0-待支付/处理中
  // 微信支付相关
  WeChatAppId?: string;
  WeChatTimeStamp?: string;
  WeChatNonceStr?: string;
  WeChatPackageValue?: string;
  WeChatSign?: string;
  WeChatPrepayId?: string;
  WeChatWebUrl?: string;
}

@Injectable()
export class DashubaoService {
  private readonly logger = new Logger(DashubaoService.name);
  private config: DashubaoConfig;

  constructor(
    private configService: ConfigService,
    @InjectModel(InsurancePolicy.name) private policyModel: Model<InsurancePolicyDocument>,
    @InjectModel(InsuranceSyncLog.name) private syncLogModel: Model<InsuranceSyncLogDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
  ) {
    // 从环境变量或使用提供的凭证
    this.config = {
      user: this.configService.get<string>('DASHUBAO_USER', 'ande'),
      password: this.configService.get<string>('DASHUBAO_PASSWORD', 'dsakfiejn;lASudf'),
      testUrl: 'http://fx.test.dasurebao.com.cn/remoting/ws',
      prodUrl: 'https://api.dasurebao.com.cn/remoting/ws',
      isProduction: this.configService.get<string>('NODE_ENV') === 'production',
    };

    this.logger.log('大树保服务初始化完成');
    this.logger.log(`使用${this.config.isProduction ? '生产' : '测试'}环境`);
  }

  /**
   * 获取API地址
   * 根据 NODE_ENV 自动切换测试/生产环境
   */
  private getApiUrl(): string {
    return this.config.isProduction ? this.config.prodUrl : this.config.testUrl;
  }

  /**
   * 生成渠道流水号
   */
  private generateAgencyPolicyRef(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ANDE${timestamp}${random}`;
  }

  /**
   * 格式化日期为大树保格式 (yyyyMMddHHmmss)
   */
  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  /**
   * 构建XML请求报文
   */
  private buildXmlRequest(requestType: string, bodyContent: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Packet type="REQUEST" version="1.0">
  <Head>
    <RequestType>${requestType}</RequestType>
    <User>${this.config.user}</User>
    <Password>${this.config.password}</Password>
  </Head>
  <Body>
    ${bodyContent}
  </Body>
</Packet>`;
  }

  /**
   * 解析XML响应
   */
  private async parseXmlResponse(xmlString: string): Promise<DashubaoResponse> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
      const result = await parser.parseStringPromise(xmlString);
      
      if (result.ResultInfo) {
        return result.ResultInfo;
      }
      if (result.Result) {
        return result.Result;
      }
      
      throw new Error('无法解析响应格式');
    } catch (error) {
      this.logger.error('XML解析错误:', error);
      throw new BadRequestException(`响应解析失败: ${error.message}`);
    }
  }

  /**
   * 发送请求到大树保API
   */
  private async sendRequest(xmlRequest: string): Promise<DashubaoResponse> {
    try {
      const apiUrl = this.getApiUrl();
      this.logger.log(`发送请求到大树保API: ${apiUrl}`);
      this.logger.debug('请求内容:', xmlRequest);

      const response = await axios.post(apiUrl, xmlRequest, {
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
        },
        timeout: 30000,
      });

      this.logger.log('收到响应:', response.data);
      return await this.parseXmlResponse(response.data);
    } catch (error) {
      this.logger.error('API请求失败:', error);
      throw new BadRequestException(`大树保API请求失败: ${error.message}`);
    }
  }

  /**
   * 发送请求到大树保API并返回原始响应（用于PDF等二进制数据）
   */
  private async sendRequestRaw(xmlRequest: string): Promise<Buffer> {
    try {
      const apiUrl = this.getApiUrl();
      this.logger.log(`发送请求到大树保API (原始响应): ${apiUrl}`);
      this.logger.debug('请求内容:', xmlRequest);

      const response = await axios.post(apiUrl, xmlRequest, {
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
        },
        responseType: 'arraybuffer', // 接收二进制数据
        timeout: 30000,
      });

      this.logger.log('收到原始响应，大小:', response.data.length, 'bytes');
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('API请求失败:', error);
      throw new BadRequestException(`大树保API请求失败: ${error.message}`);
    }
  }

  /**
   * 投保确认 (0002)
   */
  async createPolicy(dto: CreatePolicyDto, userId?: string): Promise<InsurancePolicy> {
    const agencyPolicyRef = this.generateAgencyPolicyRef();
    const issueDate = this.formatDate(new Date());

    this.logger.log(`创建保单，流水号: ${agencyPolicyRef}`);

    // 构建被保险人XML
    const insuredListXml = dto.insuredList.map((insured, index) => `
    <Insured>
      <InsuredId>${insured.insuredId || (index + 1)}</InsuredId>
      <InsuredName>${insured.insuredName}</InsuredName>
      <InsuredType>${insured.insuredType || '1'}</InsuredType>
      <IdType>${insured.idType}</IdType>
      <IdNumber>${insured.idNumber}</IdNumber>
      <BirthDate>${insured.birthDate}</BirthDate>
      <Gender>${insured.gender}</Gender>
      ${insured.mobile ? `<Mobile>${insured.mobile}</Mobile>` : ''}
      ${insured.email ? `<Email>${insured.email}</Email>` : ''}
      ${insured.occupationCode ? `<OccupationCode>${insured.occupationCode}</OccupationCode>` : ''}
      ${insured.occupationName ? `<OccupationName>${insured.occupationName}</OccupationName>` : ''}
      ${insured.relationShip ? `<RelationShip>${insured.relationShip}</RelationShip>` : ''}
    </Insured>`).join('');

    // 构建返佣信息XML
    let rebateXml = '';
    if (dto.rebateInfo) {
      rebateXml = `
    <RebateRate>${dto.rebateInfo.rebateRate}</RebateRate>
    <RebateCusName>${dto.rebateInfo.rebateCusName}</RebateCusName>
    <RebateCusIdNo>${dto.rebateInfo.rebateCusIdNo}</RebateCusIdNo>
    <RebateAccountNo>${dto.rebateInfo.rebateAccountNo}</RebateAccountNo>
    <RebateBankKeepMobile>${dto.rebateInfo.rebateBankKeepMobile}</RebateBankKeepMobile>
    ${dto.rebateInfo.rebateDelayDays ? `<RebateDelayDays>${dto.rebateInfo.rebateDelayDays}</RebateDelayDays>` : ''}`;
    }

    // 构建投保人信息XML
    const policyHolderXml = `
    <PolicyHolder>
      <PolicyHolderType>${dto.policyHolder.policyHolderType}</PolicyHolderType>
      <PolicyHolderName>${dto.policyHolder.policyHolderName}</PolicyHolderName>
      <PHIdType>${dto.policyHolder.phIdType}</PHIdType>
      <PHIdNumber>${dto.policyHolder.phIdNumber}</PHIdNumber>
      ${dto.policyHolder.phBirthDate ? `<PHBirthDate>${dto.policyHolder.phBirthDate}</PHBirthDate>` : ''}
      ${dto.policyHolder.gender ? `<Gender>${dto.policyHolder.gender}</Gender>` : ''}
      ${dto.policyHolder.phTelephone ? `<PHTelephone>${dto.policyHolder.phTelephone}</PHTelephone>` : ''}
      ${dto.policyHolder.phAddress ? `<PHAddress>${dto.policyHolder.phAddress}</PHAddress>` : ''}
      ${dto.policyHolder.phPostCode ? `<PHPostCode>${dto.policyHolder.phPostCode}</PHPostCode>` : ''}
      ${dto.policyHolder.phEmail ? `<PHEmail>${dto.policyHolder.phEmail}</PHEmail>` : ''}
      ${dto.policyHolder.reqFaPiao ? `<ReqFaPiao>${dto.policyHolder.reqFaPiao}</ReqFaPiao>` : ''}
      ${dto.policyHolder.reqMail ? `<ReqMail>${dto.policyHolder.reqMail}</ReqMail>` : ''}
      ${dto.policyHolder.phProvinceCode ? `<PHProvinceCode>${dto.policyHolder.phProvinceCode}</PHProvinceCode>` : ''}
      ${dto.policyHolder.phCityCode ? `<PHCityCode>${dto.policyHolder.phCityCode}</PHCityCode>` : ''}
      ${dto.policyHolder.phDistrictCode ? `<PHDistrictCode>${dto.policyHolder.phDistrictCode}</PHDistrictCode>` : ''}
    </PolicyHolder>`;

    // 构建请求体 - PolicyHolder 和 Policy 平级
    const bodyContent = `
    <Policy>
      ${dto.productCode ? `<ProductCode>${dto.productCode}</ProductCode>` : ''}
      <PlanCode>${dto.planCode}</PlanCode>
      <AgencyPolicyRef>${agencyPolicyRef}</AgencyPolicyRef>
      <IssueDate>${issueDate}</IssueDate>
      <EffectiveDate>${dto.effectiveDate}</EffectiveDate>
      <ExpireDate>${dto.expireDate}</ExpireDate>
      <GroupSize>${dto.groupSize}</GroupSize>
      <TotalPremium>${dto.totalPremium}</TotalPremium>
      ${dto.premiumCalType ? `<PremiumCalType>${dto.premiumCalType}</PremiumCalType>` : ''}
      ${dto.destination ? `<Destination>${dto.destination}</Destination>` : ''}
      ${dto.remark ? `<Remark>${dto.remark}</Remark>` : ''}
      ${dto.serviceAddress ? `<ServiceAddress>${dto.serviceAddress}</ServiceAddress>` : ''}
      ${dto.workOrderId ? `<WorkOrderId>${dto.workOrderId}</WorkOrderId>` : ''}
    </Policy>
    ${policyHolderXml}
    <InsuredList>${insuredListXml}
    </InsuredList>
    ${rebateXml}`;

    const xmlRequest = this.buildXmlRequest('0002', bodyContent);

    // 记录完整的入参（供应商需要）
    this.logger.log('='.repeat(80));
    this.logger.log('📤 大树保API入参（完整XML请求）:');
    this.logger.log(xmlRequest);
    this.logger.log('='.repeat(80));

    // 发送请求
    const response = await this.sendRequest(xmlRequest);

    // 创建保单记录
    const policy = new this.policyModel({
      agencyPolicyRef,
      policyNo: response.PolicyNo,
      orderId: response.OrderId,
      productCode: dto.productCode,
      planCode: dto.planCode,
      issueDate,
      effectiveDate: dto.effectiveDate,
      expireDate: dto.expireDate,
      groupSize: dto.groupSize,
      totalPremium: dto.totalPremium,
      premiumCalType: dto.premiumCalType,
      destination: dto.destination,
      remark: dto.remark,
      serviceAddress: dto.serviceAddress,
      workOrderId: dto.workOrderId,
      policyHolder: dto.policyHolder,
      insuredList: dto.insuredList.map((insured, index) => ({
        ...insured,
        insuredId: insured.insuredId || String(index + 1),
      })),
      rebateInfo: dto.rebateInfo,
      status: response.Success === 'true' ? PolicyStatus.ACTIVE : PolicyStatus.PENDING,
      policyPdfUrl: response.PolicyPdfUrl,
      authUrl: response.AuthUrl,
      wechatPayInfo: response.WeChatAppId ? {
        appId: response.WeChatAppId,
        timeStamp: response.WeChatTimeStamp,
        nonceStr: response.WeChatNonceStr,
        packageValue: response.WeChatPackageValue,
        sign: response.WeChatSign,
        prepayId: response.WeChatPrepayId,
        webUrl: response.WeChatWebUrl,
      } : undefined,
      resumeId: dto.resumeId ? new Types.ObjectId(dto.resumeId) : undefined,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      errorMessage: response.Success !== 'true' ? response.Message : undefined,
      rawResponse: response,
    });

    await policy.save();
    this.logger.log(`保单创建成功: ${policy.agencyPolicyRef}`);

    // 🔥 保单创建后，自动用被保险人身份证号匹配合同并绑定 contractId
    // 注意：不管大树保返回 Success 是否为 true（可能需要先支付），都尝试绑定
    if (dto.insuredList?.length > 0) {
      await this.tryBindPolicyToContract(policy._id, policy.agencyPolicyRef, dto.insuredList[0].idNumber);
    }

    return policy;
  }

  /**
   * 尝试将保单绑定到合同（通过被保险人身份证号匹配）
   */
  private async tryBindPolicyToContract(policyId: any, agencyPolicyRef: string, insuredIdCard?: string): Promise<void> {
    if (!insuredIdCard) return;
    try {
      // 检查是否已经绑定
      const existingPolicy = await this.policyModel.findById(policyId).exec();
      if (existingPolicy?.contractId) {
        this.logger.log(`ℹ️ 保单 ${agencyPolicyRef} 已绑定合同，跳过`);
        return;
      }

      const matchedContract = await this.contractModel.findOne({
        workerIdCard: insuredIdCard,
        contractStatus: 'active',
      }).sort({ createdAt: -1 }).exec();

      if (matchedContract) {
        await this.policyModel.findByIdAndUpdate(policyId, {
          contractId: matchedContract._id,
          bindToContractAt: new Date(),
        });
        this.logger.log(`✅ 保单 ${agencyPolicyRef} 已自动绑定到合同 ${matchedContract.contractNumber}（身份证号匹配: ${insuredIdCard}）`);
      } else {
        this.logger.log(`ℹ️ 未找到身份证号 ${insuredIdCard} 对应的生效合同，保单暂不绑定`);
      }
    } catch (bindError) {
      this.logger.warn(`⚠️ 保单自动绑定合同失败（不影响主流程）: ${bindError.message}`);
    }
  }

  /**
   * 保单查询 (0005)
   */
  async queryPolicy(dto: QueryPolicyDto): Promise<DashubaoResponse> {
    if (!dto.agencyPolicyRef && !dto.policyNo) {
      throw new BadRequestException('渠道流水号或保单号至少需要一个');
    }

    const bodyContent = `
    <Policy>
      ${dto.agencyPolicyRef ? `<AgencyPolicyRef>${dto.agencyPolicyRef}</AgencyPolicyRef>` : ''}
      ${dto.policyNo ? `<PolicyNo>${dto.policyNo}</PolicyNo>` : ''}
    </Policy>`;

    const xmlRequest = this.buildXmlRequest('0005', bodyContent);
    return await this.sendRequest(xmlRequest);
  }

  /**
   * 保单注销 (0004)
   */
  async cancelPolicy(dto: CancelPolicyDto): Promise<DashubaoResponse> {
    const bodyContent = `
    <Policy>
      <PolicyRef>${dto.policyNo}</PolicyRef>
    </Policy>`;
    const xmlRequest = this.buildXmlRequest('0004', bodyContent);

    const response = await this.sendRequest(xmlRequest);

    // 更新本地保单状态
    if (response.Success === 'true') {
      await this.policyModel.updateOne(
        { policyNo: dto.policyNo },
        { status: PolicyStatus.CANCELLED }
      );
    }

    return response;
  }

  /**
   * 保单打印 (0006) - 返回PDF文件
   */
  async printPolicy(dto: PrintPolicyDto): Promise<Buffer> {
    const bodyContent = `
    <Policy>
      <PolicyRef>${dto.policyNo}</PolicyRef>
      ${dto.reasonRemark ? `<ReasonRemark>${dto.reasonRemark}</ReasonRemark>` : ''}
    </Policy>`;

    const xmlRequest = this.buildXmlRequest('0006', bodyContent);
    return await this.sendRequestRaw(xmlRequest);
  }

  /**
   * 电子发票 (0008)
   */
  async requestInvoice(dto: InvoiceDto): Promise<DashubaoResponse> {
    const bodyContent = `
    <Policy>
      <PolicyRef>${dto.policyNo}</PolicyRef>
      <Amount>${dto.amount}</Amount>
      ${dto.phone ? `<Phone>${dto.phone}</Phone>` : ''}
      ${dto.mail ? `<Mail>${dto.mail}</Mail>` : ''}
      ${dto.invoiceHead ? `<Invoice_Head>${dto.invoiceHead}</Invoice_Head>` : ''}
      <Invoice_HeadType>${dto.invoiceHeadType}</Invoice_HeadType>
      ${dto.invoiceTaxpayerId ? `<Invoice_TaxpayerId>${dto.invoiceTaxpayerId}</Invoice_TaxpayerId>` : ''}
    </Policy>`;

    const xmlRequest = this.buildXmlRequest('0008', bodyContent);
    return await this.sendRequest(xmlRequest);
  }

  /**
   * 支付订单 (0022)
   * @param policyRef 保单号或流水号
   * @param tradeType 支付场景：APP, MINI, OPEN, MWEB, NATIVE
   * @param openId 微信用户openId（小程序支付MINI必传）
   */
  async createPaymentOrder(policyRef: string, tradeType: string = 'MWEB', openId?: string): Promise<DashubaoResponse> {
    // 查询保单信息
    const policy = await this.policyModel.findOne({
      $or: [
        { policyNo: policyRef },
        { agencyPolicyRef: policyRef }
      ]
    });

    if (!policy) {
      throw new BadRequestException('保单不存在');
    }

    // 小程序支付必须传递 openId
    if (tradeType === 'MINI' && !openId) {
      throw new BadRequestException('小程序支付必须传递openId');
    }

    // 构建支付信息（添加NotifyUrl回调地址 - 使用自己的服务器地址）
    const backendBaseUrl = process.env.BACKEND_BASE_URL || 'https://crm.andejiazheng.com';
    const notifyUrl = `${backendBaseUrl}/api/dashubao/payment/callback`;
    const payInfoXml = `
    <PayInfo>
      <Target>WeChat</Target>
      <TradeType>${tradeType}</TradeType>
      ${openId ? `<OpenId>${openId}</OpenId>` : ''}
      <NotifyUrl>${notifyUrl}</NotifyUrl>
    </PayInfo>`;

    // 构建保单信息（严格按照文档示例，不包含IssueDate和PremiumCalType）
    const policyXml = `
    <Policy>
      <AgencyPolicyRef>${policy.agencyPolicyRef}</AgencyPolicyRef>
      <ProductCode>${policy.productCode || ''}</ProductCode>
      <PlanCode>${policy.planCode}</PlanCode>
      <EffectiveDate>${policy.effectiveDate}</EffectiveDate>
      <ExpireDate>${policy.expireDate}</ExpireDate>
      <GroupSize>${policy.groupSize}</GroupSize>
      <TotalPremium>${policy.totalPremium}</TotalPremium>
      <SplitType>0</SplitType>
    </Policy>`;

    // 构建投保人信息（严格按照文档示例，不包含PolicyHolderType）
    const policyHolderXml = `
    <PolicyHolder>
      <PolicyHolderName>${policy.policyHolder.policyHolderName}</PolicyHolderName>
      <PHIdType>${policy.policyHolder.phIdType}</PHIdType>
      <PHIdNumber>${policy.policyHolder.phIdNumber}</PHIdNumber>
      ${policy.policyHolder.phAddress ? `<PHAddress>${policy.policyHolder.phAddress}</PHAddress>` : ''}
      ${policy.policyHolder.phProvinceCode ? `<PHProvinceCode>${policy.policyHolder.phProvinceCode}</PHProvinceCode>` : ''}
      ${policy.policyHolder.phCityCode ? `<PHCityCode>${policy.policyHolder.phCityCode}</PHCityCode>` : ''}
      ${policy.policyHolder.phDistrictCode ? `<PHDistrictCode>${policy.policyHolder.phDistrictCode}</PHDistrictCode>` : ''}
    </PolicyHolder>`;

    // 构建被保险人列表
    const insuredListXml = policy.insuredList.map(insured => `
    <Insured>
      <InsuredId>${insured.insuredId}</InsuredId>
      <InsuredName>${insured.insuredName}</InsuredName>
      <InsuredType>${insured.insuredType || '1'}</InsuredType>
      <IdType>${insured.idType}</IdType>
      <IdNumber>${insured.idNumber}</IdNumber>
      <BirthDate>${insured.birthDate}</BirthDate>
      <Gender>${insured.gender}</Gender>
      ${insured.mobile ? `<Mobile>${insured.mobile}</Mobile>` : ''}
    </Insured>`).join('');

    const bodyContent = `
    ${payInfoXml}
    ${policyXml}
    ${policyHolderXml}
    <InsuredList>${insuredListXml}
    </InsuredList>`;

    const xmlRequest = this.buildXmlRequest('0022', bodyContent);

    this.logger.log('='.repeat(80));
    this.logger.log('📤 支付订单请求（0022）:');
    this.logger.log(xmlRequest);
    this.logger.log('='.repeat(80));

    const response = await this.sendRequest(xmlRequest);

    // 更新微信支付信息
    if (response.Success === 'true' && response.WeChatAppId) {
      await this.policyModel.updateOne(
        { agencyPolicyRef: policy.agencyPolicyRef },
        {
          wechatPayInfo: {
            appId: response.WeChatAppId,
            timeStamp: response.WeChatTimeStamp,
            nonceStr: response.WeChatNonceStr,
            packageValue: response.WeChatPackageValue,
            sign: response.WeChatSign,
            prepayId: response.WeChatPrepayId,
            webUrl: response.WeChatWebUrl,
          }
        }
      );
    }

    return response;
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(body: any): Promise<any> {
    this.logger.log('='.repeat(80));
    this.logger.log('📥 收到支付回调通知:');
    this.logger.log('原始body类型:', typeof body);
    this.logger.log('原始body内容:', body);
    this.logger.log('='.repeat(80));

    try {
      // 如果body已经是对象，直接使用；否则解析XML
      let resultInfo;
      if (typeof body === 'string') {
        // 解析XML回调数据
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const result = await parser.parseStringPromise(body);
        resultInfo = result.ResultInfo;
      } else if (body.ResultInfo) {
        resultInfo = body.ResultInfo;
      } else {
        resultInfo = body;
      }

      const orderId = resultInfo.OrderId;
      const agencyPolicyRef = resultInfo.AgencyPolicyRef;
      const policyList = resultInfo.PolicyList?.Policy;

      this.logger.log(`📋 解析结果:`);
      this.logger.log(`  订单号: ${orderId}`);
      this.logger.log(`  流水号: ${agencyPolicyRef}`);
      this.logger.log(`  保单列表:`, JSON.stringify(policyList, null, 2));

      // 更新保单状态
      if (policyList) {
        const policies = Array.isArray(policyList) ? policyList : [policyList];

        for (const policyData of policies) {
          this.logger.log(`处理保单:`, JSON.stringify(policyData, null, 2));

          if (policyData.Success === 'true' || policyData.Success === true) {
            const updateResult = await this.policyModel.updateOne(
              { agencyPolicyRef: agencyPolicyRef },
              {
                status: PolicyStatus.ACTIVE,
                policyNo: policyData.PolicyNo,
                orderId: policyData.OrderId || orderId,
                effectiveDate: policyData.EffectiveDate,
                expireDate: policyData.ExpireDate,
                policyPdfUrl: policyData.PolicyPdfUrl,
                // 清除错误信息（支付成功后，之前的错误信息不再有效）
                errorMessage: null,
              }
            );
            this.logger.log(`✅ 保单 ${policyData.PolicyNo} 支付成功，状态已更新为active，已清除错误信息`);
            this.logger.log(`   更新结果: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);

            // 🔥 支付成功后，尝试自动绑定合同（创建时可能因未支付而未绑定）
            const paidPolicy = await this.policyModel.findOne({ agencyPolicyRef }).exec();
            if (paidPolicy && !paidPolicy.contractId && paidPolicy.insuredList?.length > 0) {
              await this.tryBindPolicyToContract(paidPolicy._id, agencyPolicyRef, paidPolicy.insuredList[0].idNumber);
            }
          } else {
            this.logger.warn(`⚠️  保单处理失败: Success=${policyData.Success}`);
          }
        }
      } else {
        this.logger.warn(`⚠️  回调中没有PolicyList数据`);
      }

      // 返回成功响应给大树保
      return { success: true, message: '回调处理成功' };
    } catch (error) {
      this.logger.error('❌ 处理支付回调失败:', error);
      this.logger.error('错误堆栈:', error.stack);
      throw error;
    }
  }

  /**
   * 批改接口 (0007) - 替换被保险人
   */
  async amendPolicy(dto: AmendPolicyDto): Promise<DashubaoResponse> {
    // 根据大树保API文档，批改接口需要使用PolicyRef，并且被保人信息需要type属性
    const bodyContent = `
    <Policy>
      <PolicyRef>${dto.policyNo}</PolicyRef>
    </Policy>
    <Insured type="old">
      <InsuredName>${dto.oldInsured.insuredName}</InsuredName>
      <IdType>${dto.oldInsured.idType}</IdType>
      <IdNumber>${dto.oldInsured.idNumber}</IdNumber>
      <BirthDate>${dto.oldInsured.birthDate}</BirthDate>
      <Gender>${dto.oldInsured.gender}</Gender>
    </Insured>
    <Insured type="new">
      <InsuredName>${dto.newInsured.insuredName}</InsuredName>
      <IdType>${dto.newInsured.idType}</IdType>
      <IdNumber>${dto.newInsured.idNumber}</IdNumber>
      <BirthDate>${dto.newInsured.birthDate}</BirthDate>
      <Gender>${dto.newInsured.gender}</Gender>
      ${dto.newInsured.mobile ? `<Mobile>${dto.newInsured.mobile}</Mobile>` : ''}
    </Insured>`;

    const xmlRequest = this.buildXmlRequest('0007', bodyContent);

    // 记录完整的入参（供调试）
    this.logger.log('='.repeat(80));
    this.logger.log('📤 大树保批改API入参（完整XML请求）:');
    this.logger.log(xmlRequest);
    this.logger.log('='.repeat(80));

    const response = await this.sendRequest(xmlRequest);

    // 记录响应
    this.logger.log('='.repeat(80));
    this.logger.log('📥 大树保批改API响应:');
    this.logger.log(JSON.stringify(response, null, 2));
    this.logger.log('='.repeat(80));

    // 如果批改成功，更新本地保单的被保险人信息
    if (response.Success === 'true') {
      await this.policyModel.updateOne(
        { policyNo: dto.policyNo },
        {
          $set: {
            'insuredList.0': {
              insuredName: dto.newInsured.insuredName,
              idType: dto.newInsured.idType,
              idNumber: dto.newInsured.idNumber,
              birthDate: dto.newInsured.birthDate,
              gender: dto.newInsured.gender,
              mobile: dto.newInsured.mobile,
            }
          }
        }
      );
    }

    return response;
  }

  /**
   * 批增接口 - 增加被保险人
   */
  async addInsured(dto: AddInsuredDto): Promise<DashubaoResponse> {
    const insuredListXml = dto.insuredList.map((insured, index) => `
    <Insured>
      <InsuredId>${insured.insuredId || (index + 1)}</InsuredId>
      <InsuredName>${insured.insuredName}</InsuredName>
      <IdType>${insured.idType}</IdType>
      <IdNumber>${insured.idNumber}</IdNumber>
      <BirthDate>${insured.birthDate}</BirthDate>
      <Gender>${insured.gender}</Gender>
      ${insured.mobile ? `<Mobile>${insured.mobile}</Mobile>` : ''}
    </Insured>`).join('');

    const bodyContent = `
    <PolicyNo>${dto.policyNo}</PolicyNo>
    <TotalPremium>${dto.totalPremium}</TotalPremium>
    <InsuredList>${insuredListXml}
    </InsuredList>`;

    const xmlRequest = this.buildXmlRequest('0007', bodyContent);
    return await this.sendRequest(xmlRequest);
  }

  /**
   * 退保接口 (0014)
   */
  async surrenderPolicy(dto: SurrenderPolicyDto): Promise<DashubaoResponse> {
    // 不使用 Policy 标签包裹（直接放在 Body 下）
    const bodyContent = `
    <PolicyNo>${dto.policyNo}</PolicyNo>
    <RemoveReason>${dto.removeReason}</RemoveReason>`;

    const xmlRequest = this.buildXmlRequest('0014', bodyContent);

    // 记录完整的入参（供应商需要）
    this.logger.log('='.repeat(80));
    this.logger.log('📤 大树保退保API入参（完整XML请求）:');
    this.logger.log(xmlRequest);
    this.logger.log('='.repeat(80));

    const response = await this.sendRequest(xmlRequest);

    // 记录响应
    this.logger.log('='.repeat(80));
    this.logger.log('📥 大树保退保API响应:');
    this.logger.log(JSON.stringify(response, null, 2));
    this.logger.log('='.repeat(80));

    // 更新本地保单状态
    if (response.Success === 'true') {
      await this.policyModel.updateOne(
        { policyNo: dto.policyNo },
        { status: PolicyStatus.SURRENDERED }
      );
    }

    return response;
  }

  /**
   * 返佣信息查询 (R001)
   */
  async queryRebate(policyNo: string): Promise<DashubaoResponse> {
    const bodyContent = `
    <Policy>
      <PolicyNo>${policyNo}</PolicyNo>
    </Policy>`;
    const xmlRequest = this.buildXmlRequest('R001', bodyContent);
    return await this.sendRequest(xmlRequest);
  }

  /**
   * 删除本地保单
   */
  async deletePolicy(id: string): Promise<void> {
    const result = await this.policyModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new BadRequestException('保单不存在');
    }
  }

  /**
   * 获取本地保单列表
   * @param query.createdBy 创建人ID，传入时只返回该用户创建的保单（普通员工场景）
   */
  async getPolicies(query: {
    status?: PolicyStatus;
    resumeId?: string;
    page?: number;
    limit?: number;
    createdBy?: string;
  }): Promise<{ data: InsurancePolicy[]; total: number }> {
    const filter: any = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.resumeId) {
      filter.resumeId = new Types.ObjectId(query.resumeId);
    }
    if (query.createdBy) {
      // 兼容 createdBy 可能是 ObjectId 或 string 类型
      filter.$or = [
        { createdBy: new Types.ObjectId(query.createdBy) },
        { createdBy: query.createdBy }
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.policyModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.policyModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  /**
   * 根据ID获取保单
   */
  async getPolicyById(id: string): Promise<InsurancePolicy | null> {
    return this.policyModel.findById(id).exec();
  }

  /**
   * 根据保单号获取保单
   */
  async getPolicyByPolicyNo(policyNo: string): Promise<InsurancePolicy | null> {
    return this.policyModel.findOne({ policyNo }).exec();
  }

  /**
   * 根据商户单号获取保单
   */
  async getPolicyByPolicyRef(policyRef: string): Promise<InsurancePolicy | null> {
    this.logger.log(`🔍 查询保单，商户单号: ${policyRef}`);
    const policy = await this.policyModel.findOne({ agencyPolicyRef: policyRef }).exec();
    this.logger.log(`📥 查询结果: ${policy ? `找到保单，状态=${policy.status}` : '未找到保单'}`);
    return policy;
  }

  /**
   * 同步保单状态（支持保单号或商户单号）
   */
  async syncPolicyStatus(identifier: string): Promise<InsurancePolicy | null> {
    this.logger.log(`🔄 开始同步保单状态: ${identifier}`);

    // 先尝试从数据库查询保单
    let policy = await this.policyModel.findOne({
      $or: [
        { policyNo: identifier },
        { agencyPolicyRef: identifier }
      ]
    }).exec();

    if (!policy) {
      this.logger.warn(`⚠️  保单不存在: ${identifier}`);
      return null;
    }

    // 使用保单号或商户单号查询大树保
    const queryParams: any = {};
    if (policy.policyNo) {
      queryParams.policyNo = policy.policyNo;
    } else {
      queryParams.agencyPolicyRef = policy.agencyPolicyRef;
    }

    this.logger.log(`📤 查询参数:`, queryParams);
    const response = await this.queryPolicy(queryParams);

    this.logger.log(`📥 查询保单响应:`, JSON.stringify(response, null, 2));

    if (response.Success === 'true') {
      const updateData: any = {
        rawResponse: response,
      };

      // 更新保单号（如果之前没有）
      if (response.PolicyNo && !policy.policyNo) {
        updateData.policyNo = response.PolicyNo;
        this.logger.log(`📝 更新保单号: ${response.PolicyNo}`);
      }

      // 更新保单PDF链接
      if (response.PolicyPdfUrl) {
        updateData.policyPdfUrl = response.PolicyPdfUrl;
      }

      // 根据大树保文档，查询接口会返回Status字段和PolicyPdfUrl
      // Status: 1-已生效, 0-待支付/处理中
      // 优先使用Status字段判断，其次使用PolicyPdfUrl
      if (response.Status === '1') {
        updateData.status = PolicyStatus.ACTIVE;
        // 清除错误信息（保单已生效，之前的错误信息不再有效）
        updateData.errorMessage = null;
        this.logger.log(`✅ 保单 ${identifier} 已生效（Status=1），已清除错误信息`);
      } else if (response.PolicyPdfUrl) {
        updateData.status = PolicyStatus.ACTIVE;
        // 清除错误信息（保单已生效，之前的错误信息不再有效）
        updateData.errorMessage = null;
        this.logger.log(`✅ 保单 ${identifier} 已生效（有PDF链接），已清除错误信息`);
      } else {
        // 如果既没有Status=1，也没有PDF链接，保持pending状态
        this.logger.log(`⏳ 保单 ${identifier} 仍在待支付状态`);
      }

      return this.policyModel.findOneAndUpdate(
        { _id: policy._id },
        updateData,
        { new: true }
      ).exec();
    }

    this.logger.warn(`⚠️  同步保单状态失败: ${identifier}, 原因: ${response.Message}`);
    return null;
  }

  /**
   * 根据被保险人身份证号查询保单列表
   */
  async getPoliciesByIdCard(idCard: string): Promise<InsurancePolicy[]> {
    this.logger.log(`🔍 根据身份证号查询保单: ${idCard}`);

    // 查询被保险人列表中包含该身份证号的所有保单
    const policies = await this.policyModel.find({
      'insuredList.idNumber': idCard
    }).sort({ createdAt: -1 }).exec();

    this.logger.log(`📥 查询结果: 找到 ${policies.length} 个保单`);
    return policies;
  }

  /**
   * 从身份证号提取出生日期
   * @param idCard 身份证号（15位或18位）
   * @returns 格式化的出生日期 yyyyMMddHHmmss
   */
  private extractBirthDateFromIdCard(idCard: string): string {
    if (!idCard) {
      throw new BadRequestException('身份证号不能为空');
    }

    if (idCard.length === 18) {
      const year = idCard.substring(6, 10);
      const month = idCard.substring(10, 12);
      const day = idCard.substring(12, 14);
      return `${year}${month}${day}000000`;
    } else if (idCard.length === 15) {
      const year = '19' + idCard.substring(6, 8);
      const month = idCard.substring(8, 10);
      const day = idCard.substring(10, 12);
      return `${year}${month}${day}000000`;
    }

    throw new BadRequestException('身份证号格式不正确，应为15位或18位');
  }

  /**
   * 从身份证号提取性别
   * @param idCard 身份证号（15位或18位）
   * @returns 性别代码 M-男, F-女
   */
  private extractGenderFromIdCard(idCard: string): string {
    if (!idCard) {
      throw new BadRequestException('身份证号不能为空');
    }

    let genderCode: number;
    if (idCard.length === 18) {
      genderCode = parseInt(idCard.charAt(16));
    } else if (idCard.length === 15) {
      genderCode = parseInt(idCard.charAt(14));
    } else {
      throw new BadRequestException('身份证号格式不正确，应为15位或18位');
    }

    return genderCode % 2 === 0 ? 'F' : 'M';
  }

  /**
   * 保险换人自动同步
   * 当合同换人并签约完成后，自动调用此方法同步保险
   */
  async syncInsuranceAmendment(params: {
    contractId: Types.ObjectId | string;
    policyIds: (Types.ObjectId | string)[];
    oldWorker: { name: string; idCard: string };
    newWorker: { name: string; idCard: string; phone?: string };
  }): Promise<{ success: boolean; results: any[] }> {
    this.logger.log('🔄 开始保险换人自动同步');
    this.logger.log(`合同ID: ${params.contractId}`);
    this.logger.log(`保单数量: ${params.policyIds.length}`);
    this.logger.log(`原服务人员: ${params.oldWorker.name} (${params.oldWorker.idCard})`);
    this.logger.log(`新服务人员: ${params.newWorker.name} (${params.newWorker.idCard})`);

    const results = [];

    for (const policyId of params.policyIds) {
      const policy = await this.policyModel.findById(policyId).exec();

      if (!policy) {
        this.logger.warn(`⚠️  保单 ${policyId} 不存在，跳过`);
        results.push({
          policyId,
          success: false,
          error: '保单不存在'
        });
        continue;
      }

      if (!policy.policyNo) {
        this.logger.warn(`⚠️  保单 ${policyId} 无保单号，跳过`);
        results.push({
          policyId,
          success: false,
          error: '保单号不存在'
        });
        continue;
      }

      // 创建同步日志
      const syncLog = new this.syncLogModel({
        contractId: params.contractId,
        policyId: policy._id,
        policyNo: policy.policyNo,
        oldWorkerName: params.oldWorker.name,
        oldWorkerIdCard: params.oldWorker.idCard,
        newWorkerName: params.newWorker.name,
        newWorkerIdCard: params.newWorker.idCard,
        newWorkerPhone: params.newWorker.phone,
        status: SyncStatus.PENDING,
      });

      try {
        this.logger.log(`📝 处理保单: ${policy.policyNo}`);

        // 提取新服务人员的出生日期和性别
        const birthDate = this.extractBirthDateFromIdCard(params.newWorker.idCard);
        const gender = this.extractGenderFromIdCard(params.newWorker.idCard);

        // 调用大树保换人API
        const oldBirthDate = this.extractBirthDateFromIdCard(params.oldWorker.idCard);
        const oldGender = this.extractGenderFromIdCard(params.oldWorker.idCard);

        const response = await this.amendPolicy({
          policyNo: policy.policyNo,
          oldInsured: {
            insuredName: params.oldWorker.name,
            idType: '1', // 1-身份证
            idNumber: params.oldWorker.idCard,
            birthDate: oldBirthDate,
            gender: oldGender,
          },
          newInsured: {
            insuredName: params.newWorker.name,
            idType: '1',
            idNumber: params.newWorker.idCard,
            birthDate: birthDate,
            gender: gender,
            mobile: params.newWorker.phone,
          },
        });

        // 更新同步日志
        if (response.Success === 'true') {
          syncLog.status = SyncStatus.SUCCESS;
          syncLog.syncedAt = new Date();
          this.logger.log(`✅ 保单 ${policy.policyNo} 换人成功`);

          // 更新保单的被保险人信息 + 绑定到新合同
          await this.policyModel.findByIdAndUpdate(policy._id, {
            'insuredList.0.insuredName': params.newWorker.name,
            'insuredList.0.idNumber': params.newWorker.idCard,
            'insuredList.0.birthDate': birthDate,
            'insuredList.0.gender': gender,
            'insuredList.0.mobile': params.newWorker.phone,
            // 🆕 更新保单绑定的合同ID为新合同
            contractId: params.contractId,
            bindToContractAt: new Date(),
          });

          this.logger.log(`✅ 保单 ${policy.policyNo} 已重新绑定到新合同 ${params.contractId}`);

          results.push({
            policyId: policy._id,
            policyNo: policy.policyNo,
            success: true,
          });
        } else {
          syncLog.status = SyncStatus.FAILED;
          syncLog.errorMessage = response.Message || '换人失败';
          this.logger.error(`❌ 保单 ${policy.policyNo} 换人失败: ${response.Message}`);

          results.push({
            policyId: policy._id,
            policyNo: policy.policyNo,
            success: false,
            error: response.Message,
          });
        }

        syncLog.dashubaoResponse = response;
      } catch (error) {
        syncLog.status = SyncStatus.FAILED;
        syncLog.errorMessage = error.message;
        this.logger.error(`❌ 保单 ${policy.policyNo} 换人异常:`, error);

        results.push({
          policyId: policy._id,
          policyNo: policy.policyNo,
          success: false,
          error: error.message,
        });
      }

      await syncLog.save();
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`🎉 保险同步完成: 成功 ${successCount}/${results.length}`);

    return {
      success: successCount > 0,
      results,
    };
  }

  /**
   * 查询保险同步日志
   */
  async getSyncLogs(contractId: string): Promise<InsuranceSyncLog[]> {
    return this.syncLogModel
      .find({ contractId })
      .sort({ createdAt: -1 })
      .exec();
  }
}


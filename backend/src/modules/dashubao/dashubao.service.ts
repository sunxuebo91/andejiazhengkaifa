import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import * as xml2js from 'xml2js';
import { InsurancePolicy, InsurancePolicyDocument, PolicyStatus } from './models/insurance-policy.model';
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

    return policy;
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
   */
  async createPaymentOrder(policyRef: string, tradeType: string = 'MWEB'): Promise<DashubaoResponse> {
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

    // 构建支付信息（添加NotifyUrl回调地址 - 使用自己的服务器地址）
    const backendBaseUrl = process.env.BACKEND_BASE_URL || 'https://crm.andejiazheng.com';
    const notifyUrl = `${backendBaseUrl}/api/dashubao/payment/callback`;
    const payInfoXml = `
    <PayInfo>
      <Target>WeChat</Target>
      <TradeType>${tradeType}</TradeType>
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
    this.logger.log(JSON.stringify(body, null, 2));
    this.logger.log('='.repeat(80));

    try {
      // 解析XML回调数据
      const xml2js = require('xml2js');
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(body);

      const resultInfo = result.ResultInfo;
      const orderId = resultInfo.OrderId;
      const agencyPolicyRef = resultInfo.AgencyPolicyRef;
      const policyList = resultInfo.PolicyList?.Policy;

      this.logger.log(`订单号: ${orderId}`);
      this.logger.log(`流水号: ${agencyPolicyRef}`);

      // 更新保单状态
      if (policyList) {
        const policies = Array.isArray(policyList) ? policyList : [policyList];

        for (const policy of policies) {
          if (policy.Success === 'true') {
            await this.policyModel.updateOne(
              { agencyPolicyRef: agencyPolicyRef },
              {
                status: 'active',
                policyNo: policy.PolicyNo,
                orderId: policy.OrderId,
                effectiveDate: policy.EffectiveDate,
                expireDate: policy.ExpireDate,
              }
            );
            this.logger.log(`✅ 保单 ${policy.PolicyNo} 支付成功，状态已更新`);
          }
        }
      }

      // 返回成功响应给大树保
      return { success: true, message: '回调处理成功' };
    } catch (error) {
      this.logger.error('处理支付回调失败:', error);
      throw error;
    }
  }

  /**
   * 批改接口 (0007) - 替换被保险人
   */
  async amendPolicy(dto: AmendPolicyDto): Promise<DashubaoResponse> {
    const bodyContent = `
    <PolicyNo>${dto.policyNo}</PolicyNo>
    <OldInsured>
      <InsuredName>${dto.oldInsured.insuredName}</InsuredName>
      <IdType>${dto.oldInsured.idType}</IdType>
      <IdNumber>${dto.oldInsured.idNumber}</IdNumber>
    </OldInsured>
    <NewInsured>
      <InsuredName>${dto.newInsured.insuredName}</InsuredName>
      <IdType>${dto.newInsured.idType}</IdType>
      <IdNumber>${dto.newInsured.idNumber}</IdNumber>
      <BirthDate>${dto.newInsured.birthDate}</BirthDate>
      <Gender>${dto.newInsured.gender}</Gender>
      ${dto.newInsured.mobile ? `<Mobile>${dto.newInsured.mobile}</Mobile>` : ''}
    </NewInsured>`;

    const xmlRequest = this.buildXmlRequest('0007', bodyContent);
    return await this.sendRequest(xmlRequest);
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
    // 不使用 Policy 标签包裹（尝试直接放在 Body 下）
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
   * 获取本地保单列表
   */
  async getPolicies(query: {
    status?: PolicyStatus;
    resumeId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: InsurancePolicy[]; total: number }> {
    const filter: any = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.resumeId) {
      filter.resumeId = new Types.ObjectId(query.resumeId);
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

      // 如果保单已支付，更新状态为已生效
      // 根据大树保文档，查询接口会返回保单的完整信息
      // 如果有PolicyPdfUrl，说明保单已生效
      if (response.PolicyPdfUrl) {
        updateData.status = PolicyStatus.ACTIVE;
        this.logger.log(`✅ 保单 ${identifier} 已生效（有PDF链接）`);
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
}


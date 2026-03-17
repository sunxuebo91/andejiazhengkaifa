import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { createCanvas } from 'canvas';
import { BackgroundCheck, BackgroundCheckDocument } from './models/background-check.model';
import { CreateBackgroundCheckDto } from './dto/create-background-check.dto';
import { ESignService } from '../esign/esign.service';
import { CosService } from '../upload/cos.service';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class ZmdbService {
  private readonly logger = new Logger(ZmdbService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly platformUserId: string;
  private readonly tplId: string;
  private readonly tplId2: string;
  private readonly baseUrl: string;
  private readonly fileBaseUrl: string;
  private readonly notifyUrl: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(BackgroundCheck.name) private bgCheckModel: Model<BackgroundCheckDocument>,
    @Inject(forwardRef(() => ESignService)) private esignService: ESignService,
    @Inject(forwardRef(() => ContractsService)) private contractsService: ContractsService,
    private cosService: CosService,
  ) {
    const isTest = this.configService.get<string>('ZMDB_IS_TEST', 'true') !== 'false';
    this.appId = this.configService.get<string>('ZMDB_APP_ID', '');
    this.appSecret = this.configService.get<string>('ZMDB_APP_SECRET', '');
    this.platformUserId = this.configService.get<string>('ZMDB_PLATFORM_USER_ID', '');
    this.tplId = this.configService.get<string>('ZMDB_TPL_ID', '');
    this.tplId2 = this.configService.get<string>('ZMDB_TPL_ID_2', '');
    this.baseUrl = isTest ? 'https://test-api.turingdata.cn' : 'https://api.turingdata.cn';
    this.fileBaseUrl = isTest ? 'https://test-file.zmbeidiao.com' : 'https://file.zmbeidiao.com';
    this.notifyUrl = this.configService.get<string>('ZMDB_NOTIFY_URL', '');
  }

  private generateSign(timestamp: string): string {
    const str = this.appId + timestamp + this.appSecret;
    // 芝麻背调要求签名保持小写，不需要 toUpperCase()
    return crypto.createHash('sha1').update(str).digest('hex');
  }

  private buildHeaders() {
    const timestamp = Date.now().toString();
    return {
      'auth-key': this.appId,
      'auth-timestamp': timestamp,
      'auth-sign': this.generateSign(timestamp),
    };
  }

  private async request(endpoint: string, data: any): Promise<any> {
    const headers = this.buildHeaders();
    this.logger.log(`ZMDB请求: ${endpoint}, headers: ${JSON.stringify(headers)}, data: ${JSON.stringify(data)}`);
    const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    const result = response.data;
    this.logger.log(`ZMDB响应: ${JSON.stringify(result)}`);
    if (result.code !== 200) {
      throw new BadRequestException(`芝麻背调接口错误：${result.errorMsg || JSON.stringify(result)}`);
    }
    return result.data;
  }

  /**
   * 发送 form-urlencoded 请求（用于下载报告等接口）
   */
  private async requestForm(endpoint: string, data: Record<string, string>): Promise<any> {
    const headers = this.buildHeaders();
    const formData = new URLSearchParams(data).toString();
    this.logger.log(`ZMDB Form请求: ${endpoint}, headers: ${JSON.stringify(headers)}, data: ${formData}`);
    const response = await axios.post(`${this.baseUrl}${endpoint}`, formData, {
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const result = response.data;
    this.logger.log(`ZMDB Form响应: ${JSON.stringify(result).substring(0, 500)}`);
    if (result.code !== 200) {
      throw new BadRequestException(`芝麻背调接口错误：${result.errorMsg || JSON.stringify(result)}`);
    }
    return result.data;
  }

  /**
   * 上传授权文件到芝麻背调
   * POST /platform_report_api/upload_image
   */
  async uploadAuthDoc(buffer: Buffer, filename: string): Promise<{ stuffId: string; imageUrl: string }> {
    const form = new FormData();
    form.append('imgFile', buffer, { filename, contentType: 'application/pdf' });

    const headers = this.buildHeaders();
    this.logger.log(`上传授权书到芝麻背调, filename: ${filename}, headers: ${JSON.stringify(headers)}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/platform_report_api/upload_image`,
        form,
        { headers: { ...headers, ...form.getHeaders() } },
      );

      const result = response.data;
      this.logger.log(`芝麻背调上传响应: ${JSON.stringify(result)}`);

      if (result.code !== 200) {
        throw new BadRequestException(`授权书上传失败：${result.errorMsg || JSON.stringify(result)}`);
      }

      return {
        stuffId: result.data.reportStuffId,
        imageUrl: result.data.imageUrl,
      };
    } catch (error) {
      this.logger.error(`上传授权书失败: ${error.message}`);
      if (error.response) {
        this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 从爱签系统下载已签署合同 PDF，上传到芝麻背调，返回 stuffId + imageUrl
   */
  async prepareAuthFromEsign(esignContractNo: string): Promise<{ stuffId: string; imageUrl: string; esignContractNo: string }> {
    this.logger.log(`从爱签下载合同 PDF: ${esignContractNo}`);

    // 调用爱签下载接口（返回 base64 编码的 PDF）
    const downloadResult = await this.esignService.downloadSignedContract(esignContractNo, { force: 1, downloadFileType: 1 });

    this.logger.log(`爱签下载结果结构: ${JSON.stringify(Object.keys(downloadResult || {}))}`);

    // downloadSignedContract 返回结构: { data: base64string, fileName, size, md5, fileType, downloadInfo }
    let pdfBase64: string;
    if (typeof downloadResult?.data === 'string' && downloadResult.data.length > 0) {
      pdfBase64 = downloadResult.data;
    } else if (typeof downloadResult?.data?.data === 'string' && downloadResult.data.data.length > 0) {
      pdfBase64 = downloadResult.data.data;
    } else if (typeof downloadResult === 'string' && downloadResult.length > 0) {
      pdfBase64 = downloadResult;
    } else {
      this.logger.error(`爱签下载结果: ${JSON.stringify(downloadResult)}`);
      throw new BadRequestException('从爱签获取合同 PDF 失败，请确认合同已签署完成');
    }

    if (!pdfBase64) {
      throw new BadRequestException('爱签返回的 PDF 数据为空');
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const filename = `contract_${esignContractNo}.pdf`;

    // 上传到芝麻背调
    const { stuffId, imageUrl } = await this.uploadAuthDoc(pdfBuffer, filename);
    this.logger.log(`授权书上传到芝麻背调成功，stuffId: ${stuffId}, imageUrl: ${imageUrl}`);

    return { stuffId, imageUrl, esignContractNo };
  }

  /**
   * 使用本地隐私协议文件生成授权书图片并上传到芝麻背调
   * 在文件末尾添加家政员姓名和日期
   */
  async prepareAuthFromLocalDoc(workerName: string): Promise<{ stuffId: string; imageUrl: string }> {
    this.logger.log(`使用本地隐私协议生成授权书图片，家政员: ${workerName}`);

    const templatePath = path.resolve('/home/ubuntu/andejiazhengcrm/安得家政隐私协议.docx');

    if (!fs.existsSync(templatePath)) {
      throw new BadRequestException('隐私协议模板文件不存在');
    }

    // 读取 docx 并提取段落（保留段落结构）
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const documentXml = zip.file('word/document.xml');
    const paragraphs: string[] = [];

    if (documentXml) {
      const xmlContent = documentXml.asText();
      // 提取每个段落 <w:p>...</w:p>
      const paraMatches = xmlContent.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/g);
      if (paraMatches) {
        for (const para of paraMatches) {
          // 从段落中提取所有文本
          const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
          if (textMatches) {
            const paraText = textMatches
              .map(match => match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'))
              .join('');
            if (paraText.trim()) {
              paragraphs.push(paraText.trim());
            }
          }
        }
      }
    }

    this.logger.log(`从Word文档提取了 ${paragraphs.length} 个段落`);

    // 获取当前日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 使用 canvas 生成图片（传入段落数组）
    const imageBuffer = this.generateAuthImage(paragraphs, workerName, dateStr, timeStr);
    const filename = `privacy_agreement_${workerName}_${Date.now()}.jpg`;

    this.logger.log(`生成授权书图片完成，准备上传到芝麻背调，文件大小: ${imageBuffer.length} bytes`);

    // 上传到芝麻背调（图片格式）
    const { stuffId, imageUrl } = await this.uploadAuthImage(imageBuffer, filename);
    this.logger.log(`授权书图片上传到芝麻背调成功，stuffId: ${stuffId}, imageUrl: ${imageUrl}`);

    return { stuffId, imageUrl };
  }

  /**
   * 使用 canvas 生成授权书图片（A4 尺寸，自动扩展高度）
   */
  private generateAuthImage(paragraphs: string[], workerName: string, dateStr: string, timeStr: string): Buffer {
    // A4 宽度 @ 150 DPI: 1240 像素，高度动态计算
    const width = 1240;
    const paddingX = 80;
    const paddingY = 80;
    const lineHeight = 32;
    const paragraphSpacing = 24; // 段落间距
    const fontSize = 20;
    const titleFontSize = 28;

    // 字体设置
    const normalFont = `${fontSize}px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
    const boldFont = `bold ${titleFontSize}px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
    const sectionFont = `bold ${fontSize}px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;

    // 可用文本宽度（考虑首行缩进）
    const maxTextWidth = width - paddingX * 2 - fontSize * 2;

    // 先计算需要的总高度
    const tempCanvas = createCanvas(100, 100);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = normalFont;

    let totalLines = 0;
    totalLines += 3; // 标题 + 空行

    for (const para of paragraphs) {
      if (!para.trim()) continue;
      // 计算段落需要的行数
      let lineCount = 0;
      let line = '';
      for (const char of para) {
        const testLine = line + char;
        const testWidth = tempCtx.measureText(testLine).width;
        if (testWidth > maxTextWidth && line.length > 0) {
          lineCount++;
          line = char;
        } else {
          line = testLine;
        }
      }
      if (line) lineCount++;
      totalLines += lineCount + 1; // +1 为段落间距
    }

    totalLines += 6; // 签名区域

    // 计算画布高度（确保内容不溢出）
    const height = Math.max(1754, paddingY * 2 + totalLines * lineHeight + 100);

    // 创建正式画布
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'top';

    let y = paddingY;

    // ========== 绘制标题（居中加粗）==========
    ctx.font = boldFont;
    ctx.fillStyle = '#000000';
    const title = '安得家政隐私协议';
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, (width - titleWidth) / 2, y);
    y += titleFontSize + 40;

    // ========== 绘制正文段落 ==========
    ctx.font = normalFont;
    ctx.fillStyle = '#333333';

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      if (!para.trim()) continue;

      // 检测是否是标题段落（如 "一、" "二、" 等开头）
      const isSectionTitle = /^[一二三四五六七八九十]+、/.test(para);

      if (isSectionTitle) {
        // 标题段落：加粗，增加上间距
        y += 10;
        ctx.font = sectionFont;
        ctx.fillStyle = '#000000';
      } else {
        ctx.font = normalFont;
        ctx.fillStyle = '#333333';
      }

      // 自动换行
      const paraLines: string[] = [];
      let line = '';
      for (const char of para) {
        const testLine = line + char;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxTextWidth && line.length > 0) {
          paraLines.push(line);
          line = char;
        } else {
          line = testLine;
        }
      }
      if (line) paraLines.push(line);

      // 绘制每行
      for (let i = 0; i < paraLines.length; i++) {
        // 首行缩进（非标题段落）
        const xOffset = (i === 0 && !isSectionTitle) ? fontSize * 2 : 0;
        ctx.fillText(paraLines[i], paddingX + xOffset, y);
        y += lineHeight;
      }

      y += paragraphSpacing;
    }

    // ========== 绘制签名区域 ==========
    y += 20;
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(width - paddingX, y);
    ctx.stroke();
    y += 20;

    ctx.font = sectionFont;
    ctx.fillStyle = '#000000';
    ctx.fillText(`家政员签名：${workerName}`, paddingX, y);
    y += lineHeight + 8;
    ctx.fillText(`签署时间：${dateStr} ${timeStr}`, paddingX, y);
    y += lineHeight + 8;
    ctx.fillText('北京安得家政有限公司', paddingX, y);

    return canvas.toBuffer('image/jpeg', { quality: 0.95 });
  }

  /**
   * 上传图片文件到芝麻背调
   */
  async uploadAuthImage(buffer: Buffer, filename: string): Promise<{ stuffId: string; imageUrl: string }> {
    const form = new FormData();
    form.append('imgFile', buffer, {
      filename,
      contentType: 'image/jpeg'
    });

    const headers = this.buildHeaders();
    this.logger.log(`上传授权书图片到芝麻背调, filename: ${filename}, headers: ${JSON.stringify(headers)}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/platform_report_api/upload_image`,
        form,
        { headers: { ...headers, ...form.getHeaders() } },
      );

      const result = response.data;
      this.logger.log(`芝麻背调上传响应: ${JSON.stringify(result)}`);

      if (result.code !== 200) {
        throw new BadRequestException(`授权书上传失败：${result.errorMsg || JSON.stringify(result)}`);
      }

      return {
        stuffId: result.data.reportStuffId,
        imageUrl: result.data.imageUrl,
      };
    } catch (error) {
      this.logger.error(`上传授权书失败: ${error.message}`);
      if (error.response) {
        this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 发起背调
   */
  async createReport(dto: CreateBackgroundCheckDto, userId: string): Promise<BackgroundCheck> {
    this.logger.log(`发起背调：${dto.name} ${dto.mobile}, 套餐: ${dto.packageType || '1'}`);

    // 🔍 根据身份证号查询关联的合同
    let contractId: Types.ObjectId | undefined;
    if (dto.idNo) {
      try {
        this.logger.log(`🔍 根据身份证号查询合同: ${dto.idNo}`);
        const contracts = await this.contractsService.searchByWorkerInfo(undefined, dto.idNo, undefined);

        if (contracts && contracts.length > 0) {
          // 取最新的合同（已按创建时间倒序排列）
          const latestContract = contracts[0] as any;
          contractId = latestContract._id as Types.ObjectId;
          this.logger.log(`✅ 找到关联合同: ${latestContract.contractNumber} (ID: ${contractId})`);
        } else {
          this.logger.log(`⚠️ 未找到身份证号 ${dto.idNo} 对应的合同`);
        }
      } catch (error) {
        this.logger.error(`❌ 查询合同失败: ${error.message}`);
        // 不影响背调流程，继续执行
      }
    }

    // 根据套餐类型选择对应的 tplId
    let selectedTplId = this.tplId; // 默认使用标准版
    if (dto.packageType === '2' && this.tplId2) {
      selectedTplId = this.tplId2; // 深度版
    }
    this.logger.log(`使用套餐模板ID: ${selectedTplId}`);

    const params: any = {
      chnlId: '2',
      terType: '7',
      tplId: dto.tplId || selectedTplId,
      platformUserId: this.platformUserId,
      authType: '3',
      authStuffUrl: dto.authStuffUrl,
      name: dto.name,
      mobile: dto.mobile,
    };
    if (dto.stuffId) params.stuffId = dto.stuffId;

    if (dto.idNo) params.idNo = dto.idNo;
    if (dto.position) params.position = dto.position;
    if (this.notifyUrl) params.reportNotifyUrl = this.notifyUrl;

    const result = await this.request('/platform_report_api/query_report', params);
    this.logger.log(`发起背调响应: ${JSON.stringify(result)}`);
    const reportId: string = result.reportId;

    // 🔍 如果没有传 stuffId，尝试从 authStuffUrl 中提取
    // authStuffUrl 格式通常是: https://file.zhimabc.com/{stuffId}
    let extractedStuffId = dto.stuffId;
    if (!extractedStuffId && dto.authStuffUrl) {
      const urlMatch = dto.authStuffUrl.match(/\/([a-zA-Z0-9_-]+)(?:\.[a-z]+)?$/);
      if (urlMatch) {
        extractedStuffId = urlMatch[1];
        this.logger.log(`从 authStuffUrl 提取 stuffId: ${extractedStuffId}`);
      }
    }

    const record = await this.bgCheckModel.create({
      reportId,
      name: dto.name,
      mobile: dto.mobile,
      idNo: dto.idNo,
      position: dto.position,
      stuffId: extractedStuffId,
      authStuffUrl: dto.authStuffUrl,
      esignContractNo: dto.esignContractNo,
      packageType: dto.packageType || '1',
      status: 1,
      createdBy: new Types.ObjectId(userId),
      contractId, // 关联合同ID
    });

    return record;
  }

  /**
   * 取消背调（仅 status=1 或 9 时有效）
   */
  async cancelReport(id: string): Promise<void> {
    const record = await this.bgCheckModel.findById(id);
    if (!record) throw new NotFoundException('背调记录不存在');
    if (!record.reportId) throw new BadRequestException('该背调尚未发起，无需取消');
    if (![1, 9].includes(record.status)) {
      throw new BadRequestException('当前状态不允许取消（仅限授权中或待补充信息状态）');
    }

    // 取消背调接口使用 form-urlencoded 格式
    await this.requestForm('/platform_report_api/cancel_query', { reportId: record.reportId });
    await this.bgCheckModel.findByIdAndUpdate(id, { status: 3 });
  }

  /**
   * 下载报告 PDF（返回 Buffer）
   */
  async downloadReport(reportId: string): Promise<Buffer> {
    const record = await this.bgCheckModel.findOne({ reportId });
    if (!record) throw new NotFoundException('背调记录不存在');

    // 下载报告接口使用 form-urlencoded 格式
    const result = await this.requestForm('/platform_report_api/download_new_version_report', {
      reportId,
      reportFileType: '1',
    });

    if (!result) throw new BadRequestException('报告下载失败，数据为空');

    // result 是 base64 字符串
    const base64Data = typeof result === 'string' ? result : result.data || result;
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * 下载授权书（从芝麻背调代理下载）
   */
  async downloadAuthDoc(stuffId: string): Promise<Buffer> {
    const url = `${this.fileBaseUrl}/${stuffId}`;
    this.logger.log(`下载授权书: ${url}`);

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`下载授权书失败: ${error.message}`);
      throw new BadRequestException('下载授权书失败');
    }
  }

  /**
   * 获取报告结构化数据（调用芝麻背调 get_report_info 接口）
   * 并将风险摘要字段存入数据库
   */
  async fetchAndSaveReportResult(reportId: string): Promise<void> {
    this.logger.log(`拉取报告结构化数据: reportId=${reportId}`);
    try {
      const data = await this.requestForm('/platform_report_api/get_report_info', {
        reportId,
        userId: this.platformUserId,
      });

      if (!data) {
        this.logger.warn(`get_report_info 返回空数据: reportId=${reportId}`);
        return;
      }

      const digest = data.creditReportDigest || {};
      const digestList: Array<{ name: string; risk: string; result: string; remark: string }> = [];
      const rawList = data.outline?.digestMap?.digestListInfo;
      if (Array.isArray(rawList)) {
        for (const item of rawList) {
          digestList.push({
            name: item.name || '',
            risk: item.risk || '',
            result: item.result || '',
            remark: item.remark || '',
          });
        }
      }

      const reportResult = {
        riskLevel: digest.riskLevel || data.reportInfo?.riskLevel || '',
        riskScore: digest.riskScore ?? null,
        failNum: digest.failNum ?? 0,
        summary: data.summary || '',
        identityRiskLevel: digest.identityRiskLevel || '',
        socialRiskLevel: digest.socialRiskLevel || '',
        courtRiskLevel: digest.courtRiskLevel || '',
        financeRiskLevel: digest.financeRiskLevel || '',
        digestList,
        fetchedAt: new Date(),
      };

      await this.bgCheckModel.findOneAndUpdate(
        { reportId },
        { $set: { reportResult } },
      );
      this.logger.log(`报告风险数据保存成功: reportId=${reportId}, riskLevel=${reportResult.riskLevel}`);
    } catch (error) {
      this.logger.error(`拉取报告数据失败: reportId=${reportId}, error=${error.message}`);
      // 不抛出，避免影响回调响应
    }
  }

  /**
   * 处理 ZMDB 状态回调
   */
  async handleCallback(body: { reportId: string; notifyType: number; status?: number }): Promise<void> {
    const { reportId, notifyType, status } = body;
    this.logger.log(`收到 ZMDB 回调：reportId=${reportId}, notifyType=${notifyType}, status=${status}`);

    const update: any = {
      $push: {
        callbackHistory: { notifyType, status: status ?? 0, receivedAt: new Date() },
      },
    };
    if (status !== undefined) {
      update.$set = { status };
    }

    await this.bgCheckModel.findOneAndUpdate({ reportId }, update);

    // 报告完成时自动拉取结构化风险数据
    if (status === 4 || status === 16) {
      await this.fetchAndSaveReportResult(reportId);
    }
  }

  /**
   * 分页查询背调列表（支持搜索）
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: { keyword?: string; name?: string; mobile?: string; idNo?: string }
  ): Promise<{
    data: BackgroundCheck[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // 构建查询条件
    const query: any = {};

    if (search) {
      const orConditions: any[] = [];

      // 通用关键词搜索（姓名、手机号、身份证号）
      if (search.keyword) {
        const kw = search.keyword.trim();
        orConditions.push(
          { name: { $regex: kw, $options: 'i' } },
          { mobile: { $regex: kw, $options: 'i' } },
          { idNo: { $regex: kw, $options: 'i' } }
        );
      }

      // 单独字段搜索
      if (search.name) {
        orConditions.push({ name: { $regex: search.name.trim(), $options: 'i' } });
      }
      if (search.mobile) {
        orConditions.push({ mobile: { $regex: search.mobile.trim(), $options: 'i' } });
      }
      if (search.idNo) {
        orConditions.push({ idNo: { $regex: search.idNo.trim(), $options: 'i' } });
      }

      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    }

    this.logger.log(`背调列表查询条件: ${JSON.stringify(query)}`);

    const [data, total] = await Promise.all([
      this.bgCheckModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name username')
        .populate('contractId', 'contractNumber customerName workerName esignContractNo') // 关联合同信息
        .lean()
        .exec(),
      this.bgCheckModel.countDocuments(query).exec(),
    ]);

    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 根据记录 ID 查询单条背调（含 reportResult）
   */
  async findOne(id: string): Promise<BackgroundCheck | null> {
    const record = await this.bgCheckModel
      .findById(id)
      .populate('createdBy', 'name username')
      .populate('contractId', 'contractNumber customerName workerName esignContractNo')
      .lean()
      .exec();
    return record as any;
  }

  /**
   * 根据身份证号查询最新的背调记录
   */
  async findByIdNo(idNo: string): Promise<BackgroundCheck | null> {
    if (!idNo) {
      return null;
    }

    this.logger.log(`🔍 根据身份证号查询背调记录: ${idNo}`);

    const record = await this.bgCheckModel
      .findOne({ idNo })
      .sort({ createdAt: -1 }) // 按创建时间倒序，取最新的
      .populate('createdBy', 'name username')
      .populate('contractId', 'contractNumber customerName workerName esignContractNo')
      .lean()
      .exec();

    if (record) {
      this.logger.log(`✅ 找到背调记录: reportId=${record.reportId}, status=${record.status}`);
    } else {
      this.logger.log(`⚠️ 未找到身份证号 ${idNo} 对应的背调记录`);
    }

    return record as any;
  }
}

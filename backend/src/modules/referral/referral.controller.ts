import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  Req,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../auth/decorators/public.decorator';
import { ReferralService } from './referral.service';
import { ConfigService } from '@nestjs/config';

/**
 * 推荐返费系统 Controller
 * 路由分组：
 *  - /referral/miniprogram/* : 小程序端接口（Public，用 openid 鉴权）
 *  - /referral/staff/*       : 员工端接口（Public，用 staffId 鉴权）
 *  - /referral/admin/*       : 管理员端接口（Public，用 staffId + isAdmin 校验）
 *  - /referral/crm/*         : CRM 回调接口（用 X-Service-Secret 鉴权）
 */
@ApiTags('推荐返费系统')
@Controller('referral')
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(
    private readonly referralService: ReferralService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 从 Authorization: Bearer <JWT> 头解析 openid。
   * - 优先读取 JWT 中的 openid（签名合法 + 未过期）
   * - JWT 缺失/过期/非法时返回 undefined，由调用方决定是否回退到 body.openid
   */
  private extractOpenidFromJwt(req: any): string | undefined {
    const authHeader: string | undefined = req?.headers?.authorization || req?.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }
    const token = authHeader.slice(7).trim();
    if (!token) return undefined;
    try {
      const payload: any = this.jwtService.verify(token);
      return typeof payload?.openid === 'string' && payload.openid ? payload.openid : undefined;
    } catch (err) {
      this.logger.warn(`JWT 校验失败，回退 body.openid: ${(err as any).message}`);
      return undefined;
    }
  }

  // ================================================================
  // 推荐人注册相关（miniprogram 侧，Public）
  // ================================================================

  @Public()
  @Post('miniprogram/register-referrer')
  @ApiOperation({ summary: '推荐人注册申请（小程序端）' })
  async registerReferrer(
    @Req() req: any,
    @Body() body: {
      openid?: string; // 兼容旧客户端：新客户端从 Authorization: Bearer JWT 解
      name: string;
      phone: string;
      wechatId: string;
      sourceStaffId?: string; // 分享员工身份三件套之一（可能是脏 ID，由后端解析）
      sourceOpenid?: string;  // 分享员工 openid（对应 users.wechatOpenId）
      sourcePhone?: string;   // 分享员工手机号（对应 users.phone）
      sourceCustomerId?: string; // 可选：来源客户ID（扫客户海报时携带）
    },
  ) {
    // 鉴权：优先从 JWT 解 openid，缺失/非法时回退 body.openid（兼容旧客户端）
    const openid = this.extractOpenidFromJwt(req) || body.openid;
    if (!openid) {
      throw new HttpException(
        { success: false, message: '未获取到 openid，请重新登录' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      const referrer = await this.referralService.registerReferrer(openid, {
        name: body.name,
        phone: body.phone,
        wechatId: body.wechatId,
        sourceStaffId: body.sourceStaffId,
        sourceOpenid: body.sourceOpenid,
        sourcePhone: body.sourcePhone,
        sourceCustomerId: body.sourceCustomerId,
      });
      // 显式返回 id 字段（小程序存为 crmReferrerId 做后续关联）
      return {
        success: true,
        data: {
          id: (referrer as any)._id?.toString() ?? (referrer as any).id,
          approvalStatus: referrer.approvalStatus,
        },
        message: '申请已提交，等待管理员审核',
      };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('miniprogram/referrer-status')
  @ApiOperation({ summary: '查询推荐人申请状态（供等待页轮询）' })
  async checkReferrerStatus(@Query('openid') openid: string) {
    try {
      const result = await this.referralService.checkReferrerStatus(openid);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ================================================================
  // 简历去重与提交（推荐人 referrer，Public）
  // ================================================================

  @Public()
  @Get('miniprogram/check-duplicate')
  @ApiOperation({ summary: '去重查询（推荐人提交前调用）' })
  async checkDuplicate(@Query('phone') phone?: string, @Query('idCard') idCard?: string) {
    try {
      const result = await this.referralService.checkDuplicate(phone, idCard);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('miniprogram/submit-referral')
  @ApiOperation({ summary: '录入被推荐阿姨信息（推荐人）' })
  async submitReferral(@Body() body: {
    openid: string;
    name: string;
    phone?: string;
    idCard?: string;
    serviceType: string;
    experience?: string;
    remark?: string;
    targetStaffId?: string; // 可选：本次扫码海报员工ID，决定 assignedStaffId；不传则回落 sourceStaffId
  }) {
    try {
      const resume = await this.referralService.submitReferral(body.openid, {
        name: body.name,
        phone: body.phone,
        idCard: body.idCard,
        serviceType: body.serviceType,
        experience: body.experience,
        remark: body.remark,
        targetStaffId: body.targetStaffId,
      });
      return { success: true, data: resume, message: '推荐信息提交成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('miniprogram/my-referrals')
  @ApiOperation({ summary: '获取我的推荐记录列表（推荐人视角，脱敏）' })
  async getMyReferrals(
    @Query('openid') openid: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    try {
      const result = await this.referralService.getMyReferrals(openid, page ? +page : 1, pageSize ? +pageSize : 20);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('miniprogram/job-types')
  @ApiOperation({ summary: '获取推荐可选工种列表（小程序端）' })
  getJobTypes() {
    return { success: true, data: this.referralService.getJobTypes() };
  }

  @Public()
  @Get('miniprogram/staff-info')
  @ApiOperation({ summary: '按 staffId 查员工公共信息（供海报扫码落地页使用）' })
  async getStaffPublicInfo(@Query('staffId') staffId: string) {
    if (!staffId) {
      return { success: false, data: null, message: '请提供 staffId' };
    }
    try {
      const data = await this.referralService.getStaffPublicInfo(staffId);
      if (!data) return { success: false, data: null, message: '未找到该员工' };
      return { success: true, data, message: '查询成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('miniprogram/referral-detail/:id')
  @ApiOperation({ summary: '推荐记录详情（推荐人视角，脱敏）' })
  async getReferralDetail(@Param('id') id: string, @Query('openid') openid: string) {
    try {
      const result = await this.referralService.getReferralDetail(openid, id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('miniprogram/apply-settlement')
  @ApiOperation({ summary: '推荐人申请结算（小程序端）' })
  async applySettlement(@Body() body: {
    openid: string;
    referralId: string;
    idCard: string;
    payeeName: string;
    payeePhone: string;
    bankCard: string;
    bankName: string;
  }) {
    try {
      await this.referralService.applySettlement(body.openid, {
        referralId:  body.referralId,
        idCard:      body.idCard,
        payeeName:   body.payeeName,
        payeePhone:  body.payeePhone,
        bankCard:    body.bankCard,
        bankName:    body.bankName,
      });
      return { success: true, message: '结算申请提交成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ================================================================
  // 员工侧：审核与跟进（Public，传 staffId 鉴权）
  // ================================================================

  @Public()
  @Get('staff/assigned-referrals')
  @ApiOperation({ summary: '获取分配给我的推荐简历列表（员工侧）' })
  async getMyAssignedReferrals(
    @Query('staffId') staffId: string,
    @Query('isAdmin') isAdmin?: string,
    @Query('reviewStatus') reviewStatus?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    try {
      const result = await this.referralService.getMyAssignedReferrals(
        staffId, isAdmin === 'true', reviewStatus, page ? +page : 1, pageSize ? +pageSize : 20,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('staff/review-referral')
  @ApiOperation({ summary: '审核推荐简历（员工侧，通过/拒绝）' })
  async reviewReferral(@Body() body: {
    staffId: string;
    isAdmin?: boolean;
    id: string;
    result: 'approve' | 'reject';
    note?: string;
  }) {
    try {
      await this.referralService.reviewReferral(body.staffId, body.isAdmin || false, body.id, body.result, body.note);
      return { success: true, message: '审核完成' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('staff/update-status')
  @ApiOperation({ summary: '更新推荐简历跟进状态（员工侧）' })
  async updateReferralStatus(@Body() body: {
    staffId: string;
    isAdmin?: boolean;
    id: string;
    status: string;
  }) {
    try {
      await this.referralService.updateReferralStatus(body.staffId, body.isAdmin || false, body.id, body.status);
      return { success: true, message: '状态更新成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('staff/process-reward')
  @ApiOperation({ summary: '返费审核/打款（员工侧，基于 rewardOwnerStaffId）' })
  async processReward(@Body() body: {
    staffId: string;
    isAdmin?: boolean;
    referralResumeId: string;
    action: 'approve' | 'reject' | 'markPaid';
    remark?: string;
  }) {
    try {
      await this.referralService.processReward(body.staffId, body.isAdmin || false, body.referralResumeId, body.action, body.remark);
      return { success: true, message: '操作成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('staff/release-to-resume-library')
  @ApiOperation({ summary: '释放推荐记录到简历库（管理员 或 简历归属员工）' })
  async releaseToResumeLibrary(@Body() body: {
    staffId: string;
    isAdmin?: boolean;
    referralResumeId: string;
  }) {
    try {
      const result = await this.referralService.releaseToResumeLibrary(
        body.staffId, body.isAdmin || false, body.referralResumeId,
      );
      return { success: true, data: result, message: '已释放到简历库' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ================================================================
  // 管理员侧：推荐人审批（Public，传 adminStaffId 鉴权）
  // ================================================================

  @Public()
  @Get('admin/referrers')
  @ApiOperation({ summary: '推荐人列表（管理员/运营看全部；员工传 sourceStaffId 看自己）' })
  async listReferrers(
    @Query('approvalStatus') approvalStatus?: string,
    @Query('search') search?: string,
    @Query('sourceStaffId') sourceStaffId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    try {
      const result = await this.referralService.listReferrers({
        approvalStatus, search, sourceStaffId,
        page: page ? +page : 1,
        pageSize: pageSize ? +pageSize : 20,
      });
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/create-referrer')
  @ApiOperation({ summary: '管理员直接创建推荐人（跳过审批流程）' })
  async adminCreateReferrer(@Body() body: {
    adminStaffId: string;
    name: string;
    phone: string;
    wechatId?: string;
    idCard?: string;
    bankCardNumber?: string;
    bankName?: string;
  }) {
    try {
      const referrer = await this.referralService.adminCreateReferrer(body.adminStaffId, {
        name: body.name,
        phone: body.phone,
        wechatId: body.wechatId,
        idCard: body.idCard,
        bankCardNumber: body.bankCardNumber,
        bankName: body.bankName,
      });
      return { success: true, data: referrer, message: '创建成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/update-referrer-info')
  @ApiOperation({ summary: '更新推荐人银行/身份证信息（管理员）' })
  async updateReferrerInfo(@Body() body: { referrerId: string; idCard?: string; bankCardNumber?: string; bankName?: string }) {
    try {
      await this.referralService.updateReferrerInfo(body.referrerId, {
        idCard: body.idCard,
        bankCardNumber: body.bankCardNumber,
        bankName: body.bankName,
      });
      return { success: true, message: '更新成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/delete-referrer')
  @ApiOperation({ summary: '删除推荐人（仅管理员）' })
  async deleteReferrer(@Body() body: { adminStaffId: string; referrerId: string }) {
    try {
      await this.referralService.deleteReferrer(body.adminStaffId, body.referrerId);
      return { success: true, message: '已删除' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('admin/pending-referrers')
  @ApiOperation({ summary: '待审批的推荐人申请列表（管理员）' })
  async listPendingReferrers(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    try {
      const result = await this.referralService.listPendingReferrers(page ? +page : 1, pageSize ? +pageSize : 20);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/approve-referrer')
  @ApiOperation({ summary: '通过推荐人注册申请（管理员或该推荐人的来源员工）' })
  async approveReferrer(@Body() body: { callerStaffId?: string; adminStaffId?: string; referrerId: string }) {
    try {
      const callerStaffId = body.callerStaffId || body.adminStaffId;
      if (!callerStaffId) throw new HttpException({ success: false, message: '缺少 callerStaffId' }, HttpStatus.BAD_REQUEST);
      await this.referralService.approveReferrer(callerStaffId, body.referrerId);
      return { success: true, message: '审批通过' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/reject-referrer')
  @ApiOperation({ summary: '拒绝推荐人注册申请（管理员或该推荐人的来源员工）' })
  async rejectReferrer(@Body() body: { callerStaffId?: string; adminStaffId?: string; referrerId: string; reason: string }) {
    try {
      const callerStaffId = body.callerStaffId || body.adminStaffId;
      if (!callerStaffId) throw new HttpException({ success: false, message: '缺少 callerStaffId' }, HttpStatus.BAD_REQUEST);
      await this.referralService.rejectReferrer(callerStaffId, body.referrerId, body.reason);
      return { success: true, message: '已拒绝' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('admin/all-referrals')
  @ApiOperation({ summary: '全量推荐记录查询（管理员）' })
  async listAllReferrals(
    @Query('assignedStaffId') assignedStaffId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    try {
      const result = await this.referralService.listAllReferrals({
        assignedStaffId, status, page: page ? +page : 1, pageSize: pageSize ? +pageSize : 20,
      });
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/reassign-binding')
  @ApiOperation({ summary: '重新分配绑定员工（管理员手动干预）' })
  async reassignBinding(@Body() body: { adminStaffId: string; id: string; newStaffId: string; reason: string }) {
    try {
      await this.referralService.reassignBinding(body.adminStaffId, body.id, body.newStaffId, body.reason);
      return { success: true, message: '重新分配成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/mark-staff-departed')
  @ApiOperation({ summary: '标记员工离职，触发批量自动流转（管理员）' })
  async markStaffDeparted(@Body() body: { adminStaffId: string; staffId: string; leftAt: string }) {
    try {
      const result = await this.referralService.markStaffDeparted(body.adminStaffId, body.staffId, new Date(body.leftAt));
      return { success: true, data: result, message: `离职处理完成，共流转 ${result.transferredCount} 条记录` };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/delete-referral')
  @ApiOperation({ summary: '删除单条推荐记录（仅管理员）' })
  async deleteReferralResume(@Body() body: { adminStaffId: string; referralResumeId: string }) {
    try {
      await this.referralService.deleteReferralResume(body.adminStaffId, body.referralResumeId);
      return { success: true, message: '已删除' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('admin/referral-detail/:id')
  @ApiOperation({ summary: '推荐记录详情（CRM 管理员/员工，含合同数据）' })
  async getAdminReferralDetail(@Param('id') id: string) {
    try {
      const data = await this.referralService.getAdminReferralDetail(id);
      return { success: true, data };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('admin/binding-logs/:referralResumeId')
  @ApiOperation({ summary: '查询绑定变更日志（管理员）' })
  async getBindingLogs(@Param('referralResumeId') referralResumeId: string) {
    try {
      const logs = await this.referralService.getBindingLogs(referralResumeId);
      return { success: true, data: logs };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/sync-cloud-referrals')
  @ApiOperation({ summary: '从小程序云数据库同步待审核推荐简历到 CRM（管理员）' })
  async syncFromCloudDb(@Body() body: { adminStaffId: string }) {
    try {
      const result = await this.referralService.syncFromCloudDb(body.adminStaffId);
      return {
        success: true,
        data: result,
        message: `同步完成：导入 ${result.imported} 条，跳过 ${result.skipped} 条，错误 ${result.errors} 条`,
      };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('admin/process-reward')
  @ApiOperation({ summary: '全量返费审核/打款（管理员，无 rewardOwnerStaffId 限制）' })
  async adminProcessReward(@Body() body: { adminStaffId: string; referralResumeId: string; action: 'approve' | 'reject' | 'markPaid'; remark?: string }) {
    try {
      await this.referralService.adminProcessReward(body.adminStaffId, body.referralResumeId, body.action, body.remark);
      return { success: true, message: '操作成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ================================================================
  // CRM 回调接口（X-Service-Secret 鉴权）
  // ================================================================

  @Public()
  @Post('crm/contract-signed')
  @ApiOperation({ summary: 'CRM 合同签署回调' })
  async crmContractSigned(
    @Headers('x-service-secret') secret: string,
    @Body() body: { referralResumeId: string; contractId: string; contractSignedAt: string; serviceFee: number },
  ) {
    const expectedSecret = this.configService.get('CRM_SERVICE_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('无效的服务密钥');
    }
    try {
      await this.referralService.crmCallbackContractSigned({
        referralResumeId: body.referralResumeId,
        contractId: body.contractId,
        contractSignedAt: new Date(body.contractSignedAt),
        serviceFee: body.serviceFee,
      });
      return { success: true, message: '合同签署回调处理成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Post('crm/onboarded')
  @ApiOperation({ summary: 'CRM 上户回调' })
  async crmOnboarded(
    @Headers('x-service-secret') secret: string,
    @Body() body: { referralResumeId: string; onboardedAt: string },
  ) {
    const expectedSecret = this.configService.get('CRM_SERVICE_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('无效的服务密钥');
    }
    try {
      await this.referralService.crmCallbackOnboarded({
        referralResumeId: body.referralResumeId,
        onboardedAt: new Date(body.onboardedAt),
      });
      return { success: true, message: '上户回调处理成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Post('crm/contract-terminated')
  @ApiOperation({ summary: 'CRM 合同提前终止回调（工作不足30天，推荐记录回到跟进中）' })
  async crmContractTerminated(
    @Headers('x-service-secret') secret: string,
    @Body() body: { referralResumeId: string; reason?: string },
  ) {
    const expectedSecret = this.configService.get('CRM_SERVICE_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('无效的服务密钥');
    }
    try {
      await this.referralService.crmCallbackContractTerminated({
        referralResumeId: body.referralResumeId,
        reason: body.reason,
      });
      return { success: true, message: '合同终止回调处理成功' };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

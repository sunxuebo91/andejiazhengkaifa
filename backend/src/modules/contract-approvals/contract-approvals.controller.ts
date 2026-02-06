import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ContractApprovalsService } from './contract-approvals.service';
import { ApproveDeletionDto, RejectDeletionDto } from './dto/create-deletion-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contract-approvals')
@UseGuards(JwtAuthGuard)
export class ContractApprovalsController {
  private readonly logger = new Logger(ContractApprovalsController.name);

  constructor(
    private readonly approvalsService: ContractApprovalsService,
  ) {}

  // 检查是否是孙学博
  private isSunXuebo(user: any): boolean {
    return user.username === 'sunxuebo' || user.name === '孙学博';
  }

  // 检查是否是管理员
  private isAdmin(user: any): boolean {
    return user.role === '系统管理员' || user.role === 'admin';
  }

  // 获取所有审批请求（仅管理员）
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!this.isAdmin(req.user)) {
      throw new ForbiddenException('只有管理员可以查看所有审批请求');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.approvalsService.findAll(status, pageNum, limitNum);
  }

  // 获取我的删除请求
  @Get('my-requests')
  async findMyRequests(@Request() req) {
    return this.approvalsService.findMyRequests(req.user.userId);
  }

  // 获取单个审批请求详情
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const approval = await this.approvalsService.findOne(id);

    // 只有管理员或申请人可以查看
    if (!this.isAdmin(req.user) && approval.requestedBy.toString() !== req.user.userId) {
      throw new ForbiddenException('无权查看此审批请求');
    }

    return approval;
  }

  // 批准删除请求（仅孙学博）
  @Post(':id/approve')
  async approve(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApproveDeletionDto,
  ) {
    this.logger.log(`用户 ${req.user.username} (${req.user.name}) 尝试批准删除请求 ${id}`);

    if (!this.isAdmin(req.user)) {
      throw new ForbiddenException('只有管理员可以审批');
    }

    if (!this.isSunXuebo(req.user)) {
      throw new ForbiddenException('只有孙学博可以审批删除请求');
    }

    const approval = await this.approvalsService.approve(
      id,
      req.user.userId,
      req.user.name,
      dto,
    );

    this.logger.log(`删除请求 ${id} 已被批准`);

    return {
      success: true,
      message: '删除请求已批准',
      data: approval,
    };
  }

  // 拒绝删除请求（仅孙学博）
  @Post(':id/reject')
  async reject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RejectDeletionDto,
  ) {
    this.logger.log(`用户 ${req.user.username} (${req.user.name}) 尝试拒绝删除请求 ${id}`);

    if (!this.isAdmin(req.user)) {
      throw new ForbiddenException('只有管理员可以审批');
    }

    if (!this.isSunXuebo(req.user)) {
      throw new ForbiddenException('只有孙学博可以审批删除请求');
    }

    const approval = await this.approvalsService.reject(
      id,
      req.user.userId,
      req.user.name,
      dto,
    );

    this.logger.log(`删除请求 ${id} 已被拒绝`);

    return {
      success: true,
      message: '删除请求已拒绝',
      data: approval,
    };
  }
}


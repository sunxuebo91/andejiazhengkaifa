import {
  Controller, Get, Post, Put, Body, Param, Query,
  HttpCode, HttpStatus, Logger, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TrainingLeadsService } from './training-leads.service';
import { CreateTrainingLeadDto } from './dto/create-training-lead.dto';
import { UpdateTrainingLeadDto } from './dto/update-training-lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('小程序-学员线索管理')
@Controller('training-leads/miniprogram')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrainingLeadsMiniProgramController {
  private readonly logger = new Logger(TrainingLeadsMiniProgramController.name);

  constructor(private readonly trainingLeadsService: TrainingLeadsService) {}

  // 只有 admin/manager 才能查看全部线索，其余角色只能看自己的
  private isManagerOrAdmin(user: any): boolean {
    return ['系统管理员', 'admin', '经理', 'manager'].includes(user?.role);
  }

  // ==================== 列表 & 详情 ====================

  @Get('list')
  @Permissions('training-lead:view')
  @ApiOperation({ summary: '【小程序】获取学员线索列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'leadSource', required: false })
  @ApiQuery({ name: 'trainingType', required: false })
  @ApiQuery({ name: 'intentionLevel', required: false })
  @ApiQuery({ name: 'keyword', required: false, description: '搜索姓名/手机号/学员编号' })
  @ApiQuery({ name: 'lastFollowUpResult', required: false, description: '最近跟进结果筛选，如：已接通、未接通、已回复、未回复等' })
  async getList(@Query() query: any, @Request() req) {
    try {
      const user = req?.user;
      // 非管理员只能看自己的线索
      if (!this.isManagerOrAdmin(user)) {
        query.createdBy = user?.userId;
      }
      const result = await this.trainingLeadsService.findAll(query);
      return { success: true, data: result, message: '获取线索列表成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '获取列表失败' };
    }
  }

  @Get('detail/:id')
  @Permissions('training-lead:view')
  @ApiOperation({ summary: '【小程序】获取线索详情' })
  @ApiParam({ name: 'id', description: '线索ID' })
  async getDetail(@Param('id') id: string) {
    try {
      const lead = await this.trainingLeadsService.findOne(id);
      const followUps = await this.trainingLeadsService.getFollowUps(id);
      return {
        success: true,
        data: { lead, followUps },
        message: '获取线索详情成功',
      };
    } catch (error: any) {
      return { success: false, message: error.message || '获取详情失败' };
    }
  }

  // ==================== 创建 & 更新 ====================

  @Post('create')
  @Permissions('training-lead:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建学员线索' })
  async createLead(@Body() dto: CreateTrainingLeadDto, @Request() req) {
    try {
      const lead = await this.trainingLeadsService.create(dto, req.user.userId);
      return { success: true, data: lead, message: '线索创建成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '创建失败' };
    }
  }

  @Put('update/:id')
  @Permissions('training-lead:edit')
  @ApiOperation({ summary: '【小程序】更新学员线索' })
  @ApiParam({ name: 'id', description: '线索ID' })
  async updateLead(@Param('id') id: string, @Body() dto: UpdateTrainingLeadDto) {
    try {
      const lead = await this.trainingLeadsService.update(id, dto);
      return { success: true, data: lead, message: '线索更新成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' };
    }
  }

  // ==================== 跟进记录 ====================

  @Get(':id/follow-ups')
  @Permissions('training-lead:view')
  @ApiOperation({ summary: '【小程序】获取跟进记录' })
  @ApiParam({ name: 'id', description: '线索ID' })
  async getFollowUps(@Param('id') id: string) {
    try {
      const followUps = await this.trainingLeadsService.getFollowUps(id);
      return { success: true, data: followUps, message: '获取跟进记录成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '获取失败' };
    }
  }

  @Post(':id/follow-ups')
  @Permissions('training-lead:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】添加跟进记录' })
  @ApiParam({ name: 'id', description: '线索ID' })
  async addFollowUp(
    @Param('id') id: string,
    @Body() body: { type: string; followUpResult: string; content: string; nextFollowUpDate?: string },
    @Request() req,
  ) {
    try {
      const followUp = await this.trainingLeadsService.createFollowUp(
        id, {
          type: body.type,
          followUpResult: body.followUpResult,
          content: body.content,
          nextFollowUpDate: body.nextFollowUpDate
        } as any,
        req.user.userId,
      );
      return { success: true, data: followUp, message: '跟进记录添加成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '添加失败' };
    }
  }

  // ==================== 分配 & 状态 ====================

  @Post(':id/assign')
  @Permissions('training-lead:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】分配线索给跟进人' })
  @ApiParam({ name: 'id', description: '线索ID' })
  async assignLead(
    @Param('id') id: string,
    @Body() body: { assignedTo: string; studentOwner?: string },
  ) {
    try {
      const updateData: any = { assignedTo: body.assignedTo };
      if (body.studentOwner) updateData.studentOwner = body.studentOwner;
      else updateData.studentOwner = body.assignedTo; // 默认归属=跟进人
      const lead = await this.trainingLeadsService.update(id, updateData);
      return { success: true, data: lead, message: '线索分配成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '分配失败' };
    }
  }

  @Post(':id/update-status')
  @Permissions('training-lead:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】更新线索状态' })
  @ApiParam({ name: 'id', description: '线索ID' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    try {
      const lead = await this.trainingLeadsService.update(id, { status: body.status } as any);
      return { success: true, data: lead, message: '状态更新成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '状态更新失败' };
    }
  }

  @Post(':id/delete')
  @Permissions('training-lead:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】删除线索' })
  @ApiParam({ name: 'id', description: '线索ID' })
  async deleteLead(@Param('id') id: string) {
    try {
      await this.trainingLeadsService.remove(id);
      return { success: true, message: '线索删除成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '删除失败' };
    }
  }

  // ==================== 统计 ====================

  @Get('statistics')
  @Permissions('training-lead:view')
  @ApiOperation({ summary: '【小程序】获取线索统计数据' })
  async getStatistics(@Request() req) {
    try {
      const user = req?.user;
      const isAdmin = this.isManagerOrAdmin(user);
      const stats = await this.trainingLeadsService.getStatisticsForMiniprogram(
        isAdmin ? undefined : user?.userId,
      );
      return { success: true, data: stats, message: '获取统计成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '获取统计失败' };
    }
  }

  // ==================== 枚举选项（给小程序下拉用） ====================

  @Get('options')
  @Permissions('training-lead:view')
  @ApiOperation({ summary: '【小程序】获取线索表单枚举选项' })
  async getOptions() {
    return {
      success: true,
      data: {
        genderOptions: ['男', '女', '其他'],
        leadSourceOptions: ['美团', '抖音', '快手', '小红书', '转介绍', '幼亲舒', 'BOSS直聘', '其他'],
        consultPositionOptions: ['育婴师', '母婴护理师', '养老护理员', '住家保姆', '月嫂', '育儿嫂', '保姆', '护老', '师资', '其他'],
        intentionLevelOptions: ['高', '中', '低'],
        leadGradeOptions: ['A', 'B', 'C', 'D', 'O'],
        statusOptions: ['跟进中', '已报名', '已结业', '新客未跟进', '流转未跟进', '未跟进', '7天未跟进', '15天未跟进', '无效线索', '已到店'],
        followUpTypeOptions: ['电话', '微信', '到店', '其他'],
        followUpResultOptions: {
          电话: ['已接通', '未接通', '关机', '停机', '拒接', '忙线'],
          微信: ['已回复', '未回复', '已读未回', '已拉黑'],
          到店: ['已到店', '未到店', '爽约'],
          其他: ['成功', '失败']
        },
        intendedCoursesOptions: [
          '高级母婴护理师', '高级催乳师', '高级产后修复师', '月子餐营养师',
          '高级育婴师', '早教指导师', '辅食营养师', '小儿推拿师',
          '高级养老护理师', '早教精英班',
        ],
      },
      message: '获取选项成功',
    };
  }
}

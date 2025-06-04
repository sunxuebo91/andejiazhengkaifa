import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FollowUpService } from './follow-up.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';

@ApiTags('跟进记录')
@Controller('follow-ups')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @Post()
  @Roles('admin', 'manager', 'employee')
  @ApiOperation({ summary: '创建跟进记录' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() createFollowUpDto: CreateFollowUpDto, @Request() req) {
    const followUp = await this.followUpService.create(createFollowUpDto, req.user.id);
    return {
      success: true,
      data: followUp,
      message: '创建跟进记录成功'
    };
  }

  @Get('resume/:resumeId')
  @Roles('admin', 'manager', 'employee')
  @ApiOperation({ summary: '获取简历的跟进记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findByResumeId(
    @Param('resumeId') resumeId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10
  ) {
    const result = await this.followUpService.findByResumeId(resumeId, page, pageSize);
    return {
      success: true,
      data: result,
      message: '获取跟进记录成功'
    };
  }

  @Get('user')
  @Roles('admin', 'manager', 'employee')
  @ApiOperation({ summary: '获取当前用户的跟进记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findByUserId(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10
  ) {
    const result = await this.followUpService.findByUserId(req.user.id, page, pageSize);
    return {
      success: true,
      data: result,
      message: '获取跟进记录成功'
    };
  }

  @Get('recent')
  @Roles('admin', 'manager', 'employee')
  @ApiOperation({ summary: '获取最近的跟进记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getRecentFollowUps(@Query('limit') limit: number = 5) {
    const followUps = await this.followUpService.getRecentFollowUps(limit);
    return {
      success: true,
      data: followUps,
      message: '获取最近跟进记录成功'
    };
  }

  @Get('all')
  @Roles('admin')
  @ApiOperation({ summary: '获取所有跟进记录（仅管理员）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10
  ) {
    const result = await this.followUpService.findAll(page, pageSize, req.user.id);
    return {
      success: true,
      data: result,
      message: '获取所有跟进记录成功'
    };
  }

  @Delete(':id')
  @Roles('admin', 'manager', 'employee')
  @ApiOperation({ summary: '删除跟进记录' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async delete(@Param('id') id: string, @Request() req) {
    await this.followUpService.delete(id, req.user.id);
    return {
      success: true,
      message: '删除跟进记录成功'
    };
  }
} 
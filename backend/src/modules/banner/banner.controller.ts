import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { ReorderBannerDto } from './dto/reorder-banner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Banner轮播图管理')
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  // ==================== CRM端管理接口（需要管理员权限） ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建Banner' })
  @ApiResponse({ status: 201, description: 'Banner创建成功' })
  async create(@Body() dto: CreateBannerDto, @Request() req) {
    const banner = await this.bannerService.create(dto, req.user.userId);
    return {
      success: true,
      data: banner,
      message: 'Banner创建成功',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取Banner列表（分页）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: QueryBannerDto) {
    const result = await this.bannerService.findAll(query);
    return {
      success: true,
      data: result,
      message: '获取成功',
    };
  }

  // ==================== 小程序端公开接口（必须在 :id 路由之前） ====================

  @Get('miniprogram/active')
  @ApiOperation({ summary: '小程序获取活跃的Banner列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getActiveBannersForMiniprogram() {
    const banners = await this.bannerService.findActiveBannersForMiniprogram();
    return {
      success: true,
      data: banners,
      message: '获取成功',
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个Banner详情' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    const banner = await this.bannerService.findOne(id);
    return {
      success: true,
      data: banner,
      message: '获取成功',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新Banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
    @Request() req,
  ) {
    const banner = await this.bannerService.update(id, dto, req.user.userId);
    return {
      success: true,
      data: banner,
      message: '更新成功',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除Banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    await this.bannerService.remove(id);
    return {
      success: true,
      message: '删除成功',
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新Banner状态' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    const banner = await this.bannerService.updateStatus(id, status, req.user.userId);
    return {
      success: true,
      data: banner,
      message: '状态更新成功',
    };
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量调整Banner排序' })
  @ApiResponse({ status: 200, description: '排序更新成功' })
  async reorder(@Body() dto: ReorderBannerDto, @Request() req) {
    await this.bannerService.reorder(dto, req.user.userId);
    return {
      success: true,
      message: '排序更新成功',
    };
  }

  // ==================== 小程序端公开接口（统计） ====================

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '记录Banner浏览' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: '记录成功' })
  async recordView(@Param('id') id: string) {
    await this.bannerService.recordView(id);
    return {
      success: true,
      message: '记录成功',
    };
  }

  @Post(':id/click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '记录Banner点击' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: '记录成功' })
  async recordClick(@Param('id') id: string) {
    await this.bannerService.recordClick(id);
    return {
      success: true,
      message: '记录成功',
    };
  }
}

import { Body, Controller, Get, Logger, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuntBlacklistService } from './aunt-blacklist.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { UpdateBlacklistDto } from './dto/update-blacklist.dto';
import { ReleaseBlacklistDto } from './dto/release-blacklist.dto';
import { CheckBlacklistDto, QueryBlacklistDto } from './dto/query-blacklist.dto';

/**
 * 阿姨黑名单 Controller
 * 路由前缀：/api/aunt-blacklist
 *
 * - view/create/edit 基于权限位 `blacklist:*`
 * - release 独立强制 @Roles('admin')，不走权限位，避免误授权
 */
@ApiTags('阿姨黑名单')
@Controller('aunt-blacklist')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class AuntBlacklistController {
  private readonly logger = new Logger(AuntBlacklistController.name);

  constructor(private readonly service: AuntBlacklistService) {}

  @Get()
  @Permissions('blacklist:view')
  @ApiOperation({ summary: '黑名单列表（分页）' })
  async list(@Query() query: QueryBlacklistDto) {
    const data = await this.service.list(query);
    return { success: true, data, message: '查询成功' };
  }

  @Get('check')
  @Permissions('blacklist:view')
  @ApiOperation({ summary: '黑名单命中探针（录入/合同创建前实时校验）' })
  async check(@Query() query: CheckBlacklistDto) {
    const hit = await this.service.checkActive({ phone: query.phone, idCard: query.idCard });
    return {
      success: true,
      data: hit
        ? {
            hit: true,
            id: hit._id,
            name: hit.name,
            reason: hit.reason,
            reasonType: hit.reasonType,
            createdAt: (hit as any).createdAt,
          }
        : { hit: false },
      message: hit ? '命中黑名单' : '未命中',
    };
  }

  @Get(':id')
  @Permissions('blacklist:view')
  @ApiOperation({ summary: '黑名单详情' })
  async detail(@Param('id') id: string) {
    const data = await this.service.findById(id);
    return { success: true, data, message: '查询成功' };
  }

  @Post()
  @Permissions('blacklist:create')
  @ApiOperation({ summary: '加入黑名单' })
  async create(@Body() dto: CreateBlacklistDto, @Req() req: any) {
    const data = await this.service.create(dto, {
      userId: req.user?.userId,
      name: req.user?.name || req.user?.username,
    });
    return { success: true, data, message: '加入黑名单成功' };
  }

  @Patch(':id')
  @Permissions('blacklist:edit')
  @ApiOperation({ summary: '编辑黑名单记录（不可改 phone/idCard）' })
  async update(@Param('id') id: string, @Body() dto: UpdateBlacklistDto) {
    const data = await this.service.update(id, dto);
    return { success: true, data, message: '更新成功' };
  }

  @Post(':id/release')
  @Roles('admin')
  @ApiOperation({ summary: '释放黑名单（仅管理员）' })
  async release(
    @Param('id') id: string,
    @Body() dto: ReleaseBlacklistDto,
    @Req() req: any,
  ) {
    const data = await this.service.release(id, dto, {
      userId: req.user?.userId,
      name: req.user?.name || req.user?.username,
    });
    this.logger.log(`admin ${req.user?.username} released blacklist ${id}`);
    return { success: true, data, message: '释放成功' };
  }
}

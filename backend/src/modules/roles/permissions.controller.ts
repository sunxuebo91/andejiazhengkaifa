import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSION_CATALOG } from './permission-catalog';

/**
 * 权限目录只读接口
 *
 * 路由前缀：/api/permissions
 * 供角色管理前端 UI 动态拉取全部可配置权限位，实现"权限即配置"。
 */
@ApiTags('权限目录')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('admin:roles')
export class PermissionsController {
  @Get('catalog')
  @ApiOperation({ summary: '获取权限目录（分组+元数据）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getCatalog() {
    return {
      success: true,
      data: PERMISSION_CATALOG,
      message: '获取权限目录成功',
    };
  }
}

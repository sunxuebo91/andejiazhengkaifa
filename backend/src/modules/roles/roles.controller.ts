import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('角色管理')
@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: '创建角色' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: '角色创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '角色名称已存在' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    try {
      const role = await this.rolesService.create(createRoleDto);
      return {
        success: true,
        data: role,
        message: '角色创建成功'
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new HttpException({
          success: false,
          message: '角色名称已存在',
          error: 'DUPLICATE_ROLE_NAME'
        }, HttpStatus.CONFLICT);
      }
      throw new HttpException({
        success: false,
        message: error.message || '创建角色失败',
        error: 'CREATE_FAILED'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: '获取角色列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string
  ) {
    try {
      const result = await this.rolesService.findAll(page, pageSize, search);
      return {
        success: true,
        data: result,
        message: '获取角色列表成功'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: error.message || '获取角色列表失败',
        error: 'FETCH_FAILED'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async findOne(@Param('id') id: string) {
    try {
      const role = await this.rolesService.findOne(id);
      return {
        success: true,
        data: role,
        message: '获取角色详情成功'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException({
        success: false,
        message: error.message || '获取角色详情失败',
        error: 'FETCH_FAILED'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新角色' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    try {
      const role = await this.rolesService.update(id, updateRoleDto);
      return {
        success: true,
        data: role,
        message: '角色更新成功'
      };
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('不存在')) {
        throw new HttpException({
          success: false,
          message: '角色不存在',
          error: 'ROLE_NOT_FOUND'
        }, HttpStatus.NOT_FOUND);
      }
      throw new HttpException({
        success: false,
        message: error.message || '更新角色失败',
        error: 'UPDATE_FAILED'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async remove(@Param('id') id: string) {
    try {
      await this.rolesService.remove(id);
      return {
        success: true,
        message: '角色删除成功'
      };
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('不存在')) {
        throw new HttpException({
          success: false,
          message: '角色不存在',
          error: 'ROLE_NOT_FOUND'
        }, HttpStatus.NOT_FOUND);
      }
      throw new HttpException({
        success: false,
        message: error.message || '删除角色失败',
        error: 'DELETE_FAILED'
      }, HttpStatus.BAD_REQUEST);
    }
  }
} 
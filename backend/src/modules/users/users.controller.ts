import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return {
        success: true,
        data: user,
        message: '用户创建成功'
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new HttpException({
          success: false,
          message: '用户名已存在',
          error: 'DUPLICATE_USERNAME'
        }, HttpStatus.CONFLICT);
      }
      throw new HttpException({
        success: false,
        message: error.message || '创建用户失败',
        error: 'CREATE_FAILED'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string
  ) {
    try {
      const result = await this.usersService.findAll(page, pageSize, search);
      return {
        success: true,
        data: result,
        message: '获取用户列表成功'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: error.message || '获取用户列表失败',
        error: 'FETCH_FAILED'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ⚠️ 注意：所有具体路径的路由必须放在 :id 动态路由之前
  // 例如：如果有 /users/batch-sync 路由，应该在这里添加

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 400, description: '无效的用户ID格式' })
  async findOne(@Param('id') id: string) {
    try {
      // ✅ 验证 id 是否是有效的 MongoDB ObjectId（24位十六进制字符串）
      const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(id);
      if (!isValidObjectId) {
        throw new HttpException({
          success: false,
          message: `无效的用户ID格式: ${id}`,
          error: 'INVALID_ID_FORMAT'
        }, HttpStatus.BAD_REQUEST);
      }

      const user = await this.usersService.findById(id);
      if (!user) {
        throw new HttpException({
          success: false,
          message: '用户不存在',
          error: 'USER_NOT_FOUND'
        }, HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: user,
        message: '获取用户详情成功'
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND || error.status === HttpStatus.BAD_REQUEST) {
        throw error;
      }
      throw new HttpException({
        success: false,
        message: error.message || '获取用户详情失败',
        error: 'FETCH_FAILED'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      const user = await this.usersService.update(id, updateUserDto);
      return {
        success: true,
        data: user,
        message: '用户更新成功'
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException({
          success: false,
          message: '用户不存在',
          error: 'USER_NOT_FOUND'
        }, HttpStatus.NOT_FOUND);
      }
      throw new HttpException({
        success: false,
        message: error.message || '更新用户失败',
        error: 'UPDATE_FAILED'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async remove(@Param('id') id: string) {
    try {
      await this.usersService.remove(id);
      return {
        success: true,
        message: '用户删除成功'
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException({
          success: false,
          message: '用户不存在',
          error: 'USER_NOT_FOUND'
        }, HttpStatus.NOT_FOUND);
      }
      throw new HttpException({
        success: false,
        message: error.message || '删除用户失败',
        error: 'DELETE_FAILED'
      }, HttpStatus.BAD_REQUEST);
    }
  }
} 
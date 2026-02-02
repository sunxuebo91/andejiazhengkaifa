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
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MiniProgramUserService } from './miniprogram-user.service';
import { RegisterMiniProgramUserDto } from './dto/register-miniprogram-user.dto';
import { UpdateMiniProgramUserDto } from './dto/update-miniprogram-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('小程序用户管理')
@Controller('miniprogram-users')
export class MiniProgramUserController {
  constructor(private readonly miniProgramUserService: MiniProgramUserService) {}

  /**
   * 小程序端注册或更新用户信息（公开接口）
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: '小程序用户注册或更新' })
  @ApiResponse({ status: 201, description: '注册成功' })
  async register(@Body() dto: RegisterMiniProgramUserDto, @Req() req) {
    try {
      const ip = req.ip || req.connection?.remoteAddress;
      const user = await this.miniProgramUserService.registerOrUpdate(dto, ip);
      return {
        success: true,
        data: user,
        message: '注册成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '注册失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 记录用户登录（公开接口）
   * 支持使用 openid 或 phone 登录
   * 优先使用 openid（小程序启动时可直接获取，无需用户授权）
   * 支持传递用户信息（昵称、头像等），用于首次登录时创建用户
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: '记录小程序用户登录' })
  async recordLogin(
    @Body('openid') openid?: string,
    @Body('phone') phone?: string,
    @Body('nickname') nickname?: string,
    @Body('avatar') avatar?: string,
    @Body('avatarFile') avatarFile?: string,
    @Body('gender') gender?: number,
    @Body('city') city?: string,
    @Body('province') province?: string,
    @Body('country') country?: string,
    @Body('language') language?: string,
    @Req() req?,
  ) {
    try {
      const ip = req.ip || req.connection?.remoteAddress;

      // 优先使用 openid，其次使用 phone
      if (!openid && !phone) {
        throw new HttpException(
          {
            success: false,
            message: 'openid 或 phone 至少需要提供一个',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.miniProgramUserService.recordLogin(
        openid,
        phone,
        ip,
        {
          nickname,
          avatar,
          avatarFile,
          gender,
          city,
          province,
          country,
          language,
        },
      );

      return {
        success: true,
        data: result,
        message: result.isNewUser ? '首次登录，已创建用户' : '登录成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '登录失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 使用账号密码登录（公开接口）
   */
  @Public()
  @Post('login-with-password')
  @ApiOperation({ summary: '使用账号密码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '密码错误' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async loginWithPassword(
    @Body('username') username: string,
    @Body('password') password: string,
    @Req() req,
  ) {
    try {
      if (!username || !password) {
        throw new HttpException(
          {
            success: false,
            message: '账号和密码不能为空',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const ip = req.ip || req.connection?.remoteAddress;
      const user = await this.miniProgramUserService.loginWithPassword(
        username,
        password,
        ip,
      );

      return {
        success: true,
        data: user,
        message: '登录成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '登录失败',
        },
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * 获取用户列表（需要认证）
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: '获取小程序用户列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词（手机号或昵称）' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.miniProgramUserService.findAll(
        page ? +page : 1,
        pageSize ? +pageSize : 20,
        search,
      );
      return {
        success: true,
        data: result,
        message: '获取成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取统计信息（需要认证）
   */
  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  @ApiOperation({ summary: '获取小程序用户统计信息' })
  async getStatistics() {
    try {
      const stats = await this.miniProgramUserService.getStatistics();
      return {
        success: true,
        data: stats,
        message: '获取成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取单个用户详情（需要认证）
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: '获取小程序用户详情' })
  async findOne(@Param('id') id: string) {
    try {
      const user = await this.miniProgramUserService.findById(id);
      return {
        success: true,
        data: user,
        message: '获取成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取失败',
        },
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * 更新用户信息（需要认证）
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: '更新小程序用户信息' })
  async update(@Param('id') id: string, @Body() dto: UpdateMiniProgramUserDto) {
    try {
      const user = await this.miniProgramUserService.update(id, dto);
      return {
        success: true,
        data: user,
        message: '更新成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '更新失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 删除用户（需要认证）
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: '删除小程序用户' })
  async remove(@Param('id') id: string) {
    try {
      await this.miniProgramUserService.remove(id);
      return {
        success: true,
        message: '删除成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '删除失败',
        },
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }
}


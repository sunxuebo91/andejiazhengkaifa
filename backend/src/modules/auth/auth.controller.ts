import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Multer 配置 - 头像上传专用
const avatarMulterConfig: MulterOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

@ApiTags('认证管理')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
    @Req() req,
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(username, password, ip, userAgent);
  }

  @Post('miniprogram-login')
  @HttpCode(HttpStatus.OK)
  async miniprogramLogin(
    @Body('code') code: string,
    @Body('phone') phone: string,
    @Req() req,
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.miniprogramLogin(code, phone, ip, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req) {
    return this.authService.logout(req.user.userId);
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async getSession(@Req() req) {
    return this.authService.getSession(req.user.userId);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() req) {
    return this.authService.refreshToken(req.user.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@Req() req) {
    try {
      const data = await this.authService.getCurrentUser(req.user.userId);
      return { success: true, data, message: '获取用户信息成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '获取用户信息失败' };
    }
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', avatarMulterConfig))
  @ApiOperation({ summary: '上传用户头像' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: '头像文件'
        },
      },
      required: ['avatar']
    },
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('请选择要上传的头像文件');
      }

      const data = await this.authService.uploadAvatar(req.user.userId, file);
      return { success: true, data, message: '头像上传成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '头像上传失败' };
    }
  }
}
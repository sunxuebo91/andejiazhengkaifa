import { Controller, Post, UseGuards, Get, Body, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回访问令牌和刷新令牌' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  @HttpCode(HttpStatus.OK)
  async login(@Req() req) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '令牌刷新成功，返回新的访问令牌和刷新令牌' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req, @Body() body: { refreshToken: string }) {
    return this.authService.logout(req.user.userId, body.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '返回当前用户信息' })
  async getProfile(@Req() req) {
    return { user: req.user };
  }
} 
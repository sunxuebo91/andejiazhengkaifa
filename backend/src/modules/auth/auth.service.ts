import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/models/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './models/refresh-token.entity';
import { ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.userService.validateUser(username, password);
    
    if (!user) {
      this.logger.warn(`用户验证失败: ${username}`);
      throw new UnauthorizedException('用户名或密码错误');
    }
    
    if (!user.isActive) {
      this.logger.warn(`用户已禁用: ${username}`);
      throw new UnauthorizedException('用户已被禁用');
    }
    
    return user;
  }

  async login(user: User) {
    // 更新最后登录时间
    await this.userService.updateLastLogin(user.id);
    
    // 生成访问令牌
    const payload = { 
      username: user.username, 
      sub: user.id,
      role: user.role 
    };
    
    const accessToken = this.jwtService.sign(payload);
    
    // 生成刷新令牌
    const refreshToken = await this.generateRefreshToken(user.id);
    
    this.logger.log(`用户登录成功: ${user.username}`);
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
    };
  }

  async refreshToken(token: string) {
    // 验证刷新令牌
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token,
        isRevoked: false,
      },
    });
    
    if (!refreshToken) {
      this.logger.warn(`刷新令牌无效`);
      throw new UnauthorizedException('刷新令牌无效');
    }
    
    // 检查令牌是否过期
    if (refreshToken.expiresAt < new Date()) {
      this.logger.warn(`刷新令牌已过期`);
      throw new UnauthorizedException('刷新令牌已过期');
    }
    
    // 获取用户信息
    const user = await this.userService.findOne(refreshToken.userId);
    
    // 生成新的访问令牌
    const payload = { 
      username: user.username, 
      sub: user.id,
      role: user.role 
    };
    
    const accessToken = this.jwtService.sign(payload);
    
    // 废除旧的刷新令牌
    await this.revokeRefreshToken(refreshToken.id);
    
    // 生成新的刷新令牌
    const newRefreshToken = await this.generateRefreshToken(user.id);
    
    this.logger.log(`令牌刷新成功: ${user.username}`);
    
    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    // 废除刷新令牌
    const token = await this.refreshTokenRepository.findOne({
      where: {
        userId,
        token: refreshToken,
        isRevoked: false,
      },
    });
    
    if (token) {
      await this.revokeRefreshToken(token.id);
      this.logger.log(`用户登出成功: ${userId}`);
    }
    
    return { success: true };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // 生成随机令牌
    const token = new ObjectId().toString();
    
    // 设置过期时间
    const expiresIn = this.configService.get<number>('REFRESH_TOKEN_EXPIRES_IN') || 7 * 24 * 60 * 60; // 默认7天
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
    
    // 创建新的刷新令牌
    const refreshToken = this.refreshTokenRepository.create({
      id: new ObjectId().toString(),
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
      isRevoked: false,
    });
    
    await this.refreshTokenRepository.save(refreshToken);
    
    return token;
  }

  private async revokeRefreshToken(id: string): Promise<void> {
    await this.refreshTokenRepository.update(id, {
      isRevoked: true,
      revokedAt: new Date(),
    });
  }
} 
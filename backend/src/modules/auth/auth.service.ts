import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// 登录日志模型
interface LoginLog {
  userId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  status: 'success' | 'failed';
}

@Injectable()
export class AuthService {
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15分钟

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel('LoginLog') private loginLogModel: Model<LoginLog>,
  ) {}

  async validateUser(username: string, password: string, ip: string, userAgent: string): Promise<any> {
    // 检查登录尝试次数
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: new Date() };
    if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
      if (timeSinceLastAttempt < this.LOGIN_ATTEMPT_WINDOW) {
        throw new UnauthorizedException('登录尝试次数过多，请稍后再试');
      }
      // 重置尝试次数
      this.loginAttempts.delete(username);
    }

    const user = await this.usersService.findByUsername(username);
    const isValid = user && await bcrypt.compare(password, user.password);

    // 记录登录尝试
    await this.loginLogModel.create({
      userId: user?._id,
      timestamp: new Date(),
      ip,
      userAgent,
      status: isValid ? 'success' : 'failed'
    });

    if (!isValid) {
      // 更新登录尝试次数
      this.loginAttempts.set(username, {
        count: attempts.count + 1,
        lastAttempt: new Date()
      });
      return null;
    }

    // 登录成功，清除尝试记录
    this.loginAttempts.delete(username);
    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(username: string, password: string, ip: string, userAgent: string) {
    const user = await this.validateUser(username, password, ip, userAgent);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    
    const payload = { username: user.username, sub: user._id };
    const token = this.jwtService.sign(payload);
    
    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        name: user.name
      },
    };
  }

  async logout(userId: string) {
    // 在实际应用中，你可能需要将token加入黑名单
    // 这里简单返回成功
    return { message: '登出成功' };
  }

  async getSession(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取最近的登录记录
    const recentLogins = await this.loginLogModel
      .find({ userId, status: 'success' })
      .sort({ timestamp: -1 })
      .limit(5)
      .exec();

    return {
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      recentLogins: recentLogins.map(log => ({
        timestamp: log.timestamp,
        ip: log.ip,
        userAgent: log.userAgent
      }))
    };
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const payload = { username: user.username, sub: user._id };
    return {
      token: this.jwtService.sign(payload)
    };
  }
}
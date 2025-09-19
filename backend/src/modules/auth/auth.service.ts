import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UploadService } from '../upload/upload.service';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginLog } from './models/login-log.entity';
import axios from 'axios';

@Injectable()
export class AuthService {
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15分钟

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private uploadService: UploadService,
    @InjectModel(LoginLog.name) private loginLogModel: Model<LoginLog>,
  ) {}

  private async logLoginAttempt(userId: string | null, ip: string, userAgent: string, status: 'success' | 'failed'): Promise<void> {
    try {
      await this.loginLogModel.create({
        userId: userId || 'unknown',
        timestamp: new Date(),
        ip,
        userAgent,
        status
      });
    } catch (error) {
      // 记录日志失败不应该影响登录流程
      console.error('Failed to log login attempt:', error);
    }
  }

  async validateUser(username: string, password: string, ip: string, userAgent: string): Promise<any> {
    try {
      // 检查登录尝试次数
      const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: new Date() };
      if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
        if (timeSinceLastAttempt < this.LOGIN_ATTEMPT_WINDOW) {
          await this.logLoginAttempt(null, ip, userAgent, 'failed');
          throw new UnauthorizedException('登录尝试次数过多，请稍后再试');
        }
        // 重置尝试次数
        this.loginAttempts.delete(username);
      }

      const user = await this.usersService.findByUsername(username);
      if (!user) {
        await this.logLoginAttempt(null, ip, userAgent, 'failed');
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      await this.logLoginAttempt(user._id.toString(), ip, userAgent, isValid ? 'success' : 'failed');

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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Login validation error:', error);
      throw new InternalServerErrorException('登录验证过程中发生错误');
    }
  }

  async login(username: string, password: string, ip: string, userAgent: string) {
    try {
      const user = await this.validateUser(username, password, ip, userAgent);
      if (!user) {
        throw new UnauthorizedException('用户名或密码错误');
      }

      const payload = { username: user.username, sub: user._id };
      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar || null,
          role: user.role,
          department: user.department || null,
          permissions: user.permissions
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Login error:', error);
      throw new InternalServerErrorException('登录过程中发生错误');
    }
  }

  async miniprogramLogin(code: string, phone: string, ip: string, userAgent: string) {
    try {
      // 1. 通过code获取openid（暂时模拟）
      let openidResult;
      try {
        openidResult = await this.getWechatOpenid(code);
      } catch (error) {
        // 如果微信API调用失败，使用模拟数据
        console.warn('微信API调用失败，使用模拟openid:', error.message);
        openidResult = { openid: `mock_openid_${Date.now()}` };
      }

      // 2. 通过手机号查找CRM用户
      const user = await this.usersService.findByPhone(phone);
      if (!user) {
        throw new UnauthorizedException('手机号未注册，请联系管理员');
      }

      // 3. 记录登录日志
      await this.logLoginAttempt(user._id.toString(), ip, userAgent, 'success');

      // 4. 生成JWT token
      const payload = { username: user.username, sub: user._id, openid: openidResult.openid };
      const token = this.jwtService.sign(payload);

      return {
        success: true,
        data: {
          access_token: token,
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            phone: user.phone,
            email: user.email,
            avatar: user.avatar || null,
            role: user.role,
            department: user.department || null,
            permissions: user.permissions
          },
          openid: openidResult.openid
        },
        message: '小程序登录成功'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Miniprogram login error:', error);
      throw new InternalServerErrorException('小程序登录过程中发生错误');
    }
  }

  private async getWechatOpenid(code: string): Promise<{ openid: string; session_key?: string }> {
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session`;
      const params = {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code',
      };

      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.errcode) {
        throw new HttpException(
          `获取用户信息失败: ${data.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        openid: data.openid,
        session_key: data.session_key,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取用户信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

  /**
   * 获取当前用户详细信息
   */
  async getCurrentUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      id: user._id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar || null,
      role: user.role,
      department: user.department || null,
      permissions: user.permissions,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * 上传用户头像
   */
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 上传头像文件
    const avatarUrl = await this.uploadService.uploadFile(file, { type: 'avatar' });

    // 更新用户头像URL
    await this.usersService.updateAvatar(userId, avatarUrl);

    return {
      avatar: avatarUrl
    };
  }
}
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'andejiazheng-secret-key',
    });
  }

  async validate(payload: any) {
    // 从数据库获取完整的用户信息，包括角色和权限
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      return null;
    }

    // 检查账号是否被暂停
    if (user.suspended) {
      throw new UnauthorizedException('账号已被暂停，无法访问系统');
    }

    // 检查账号是否被禁用
    if (!user.active) {
      throw new UnauthorizedException('账号已被禁用');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: user.role,
      permissions: user.permissions || [],
      department: user.department,
      name: user.name,
      phone: user.phone,
      openid: payload.openid // 小程序登录时的openid
    };
  }
}
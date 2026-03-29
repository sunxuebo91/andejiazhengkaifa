import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * 服务端共享密钥守卫
 * 用于客户端小程序云函数 → CRM 后端的机器间鉴权。
 * 校验请求头 X-Service-Secret 是否与环境变量 SERVICE_SECRET 一致。
 */
@Injectable()
export class ServiceSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-service-secret'];
    const expected = process.env.SERVICE_SECRET;

    if (!expected) {
      throw new UnauthorizedException('服务密钥未配置，请联系管理员');
    }

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('无效的服务密钥');
    }

    return true;
  }
}


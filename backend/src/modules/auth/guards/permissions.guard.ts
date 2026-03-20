import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userPermissions = Array.isArray(request.user?.permissions) ? request.user.permissions : [];

    if (userPermissions.includes('*')) {
      return true;
    }

    return requiredPermissions.some((permission) => this.hasPermission(userPermissions, permission));
  }

  private hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    const [resource] = requiredPermission.split(':');
    if (!resource) {
      return false;
    }

    return userPermissions.includes(`${resource}:all`);
  }
}

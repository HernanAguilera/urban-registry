import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_TENANT_CHECK_KEY = 'skipTenantCheck';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipTenantCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTenantCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new ForbiddenException('User tenant information is required');
    }

    // Add tenantId to request for easy access in controllers/services
    request.tenantId = user.tenantId;

    return true;
  }
}
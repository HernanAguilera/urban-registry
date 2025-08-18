import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisService } from './redis.service';

export const CACHE_INVALIDATE_KEY = 'cacheInvalidate';

export interface CacheInvalidateOptions {
  patterns: string[];
  tenantSpecific?: boolean;
}

export const CacheInvalidate = Reflector.createDecorator<CacheInvalidateOptions>();

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const invalidateOptions = this.reflector.getAllAndOverride(
      CacheInvalidate,
      [context.getHandler(), context.getClass()],
    );

    if (!invalidateOptions) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        await this.invalidateCache(context, invalidateOptions);
      }),
    );
  }

  private async invalidateCache(
    context: ExecutionContext,
    options: CacheInvalidateOptions,
  ): Promise<void> {
    try {
      const request = context.switchToHttp().getRequest();
      const tenantId = options.tenantSpecific ? request.user?.tenantId : undefined;

      for (const pattern of options.patterns) {
        if (pattern === 'properties') {
          // Use tenant-specific invalidation for properties
          await this.redisService.invalidatePropertiesCache(tenantId);
          this.logger.debug(`Properties cache invalidated for tenant: ${tenantId || 'all'}`);
        } else {
          // For other patterns, use generic deletion
          const fullPattern = `${pattern}:*`;
          await this.redisService.delPattern(fullPattern);
          this.logger.debug(`Cache invalidated for pattern: ${fullPattern}`);
        }
      }
    } catch (error) {
      this.logger.error('Cache invalidation failed:', error.message);
    }
  }
}
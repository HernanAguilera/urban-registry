import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  public redis: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'redis'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.redis.connect();
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error.message);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error.message);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error.message);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Redis DEL pattern error for pattern ${pattern}:`, error.message);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          result[key] = params[key];
        }
        return result;
      }, {});

    const paramsHash = Buffer.from(JSON.stringify(sortedParams))
      .toString('base64')
      .replace(/[+/=]/g, '');

    return `${prefix}:${paramsHash}`;
  }

  // Cache invalidation for properties
  async invalidatePropertiesCache(tenantId?: string): Promise<void> {
    try {
      if (!tenantId) {
        // Invalidate all if no tenant specified
        await this.delPattern('properties:*');
        this.logger.debug('Invalidated all properties cache');
        return;
      }

      // Get all properties cache keys
      const allKeys = await this.redis.keys('properties:*');
      const keysToDelete: string[] = [];

      // Check each key to see if it contains the tenant
      for (const key of allKeys) {
        try {
          // Extract the base64 part after "properties:"
          const base64Part = key.replace('properties:', '');
          const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
          const params = JSON.parse(decoded);
          
          // If this cache key is for the specific tenant, mark for deletion
          if (params.tenantId === tenantId) {
            keysToDelete.push(key);
          }
        } catch (decodeError) {
          // If we can't decode, skip this key
          this.logger.debug(`Skipping key with invalid base64: ${key}`);
        }
      }

      // Delete only the tenant-specific keys
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        this.logger.debug(`Invalidated ${keysToDelete.length} properties cache keys for tenant: ${tenantId}`);
      } else {
        this.logger.debug(`No properties cache keys found for tenant: ${tenantId}`);
      }
    } catch (error) {
      this.logger.error('Failed to invalidate properties cache:', error.message);
    }
  }

  // Cache warming - preload common queries
  async warmCache<T>(key: string, dataLoader: () => Promise<T>, ttlSeconds = 300): Promise<void> {
    try {
      const exists = await this.exists(key);
      if (!exists) {
        const data = await dataLoader();
        await this.set(key, data, ttlSeconds);
        this.logger.debug(`Cache warmed for key: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Cache warming failed for key ${key}:`, error.message);
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{ keys: number; memory: string }> {
    try {
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();
      
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      
      return { keys: dbsize, memory };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error.message);
      return { keys: 0, memory: 'unknown' };
    }
  }
}
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { RedisService } from '../cache/redis.service';
export interface ImportJobData {
  filename: string;
  tenantId: string;
  userId: string;
  idempotencyKey: string;
  totalRows: number;
}

export interface ImportJobResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;
  private readonly queueName = 'import-queue';

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      const rabbitUrl = `amqp://${this.configService.get('QUEUE_USERNAME', 'guest')}:${this.configService.get('QUEUE_PASSWORD', 'guest')}@${this.configService.get('QUEUE_HOST', 'localhost')}:${this.configService.get('QUEUE_PORT', 5672)}`;
      
      this.connection = await amqp.connect(rabbitUrl);
      this.channel = await this.connection.createConfirmChannel();
      
      // Declare queue with options
      await this.channel.assertQueue(this.queueName, {
        durable: true, // Persist queue
        arguments: {
          'x-message-ttl': 86400000, // 24 hours TTL
        }
      });

      this.logger.log('RabbitMQ connected and queue declared');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error.message);
      throw error;
    }
  }

  async addImportJob(data: ImportJobData): Promise<{ id: string; isDuplicate?: boolean }> {
    const jobId = data.idempotencyKey;
    const redisKey = `import:job:${jobId}`;

    try {
      // Check if job already exists
      const exists = await this.redisService.exists(redisKey);
      if (exists) {
        this.logger.log(`Duplicate job detected: ${jobId} for tenant: ${data.tenantId}`);
        return { id: jobId, isDuplicate: true };
      }

      // Mark job as queued in Redis
      await this.redisService.set(redisKey, 'queued');

      // Send message to queue
      const message = JSON.stringify({
        id: jobId,
        ...data,
        timestamp: new Date().toISOString(),
      });

      const sent = this.channel.sendToQueue(this.queueName, Buffer.from(message), {
        persistent: true, // Persist message
        messageId: jobId,
      });

      if (sent) {
        this.logger.log(`Import job sent to RabbitMQ: ${jobId} for tenant: ${data.tenantId}`);
        return { id: jobId };
      } else {
        // Remove from Redis if sending failed
        await this.redisService.del(redisKey);
        throw new Error('Failed to send message to queue');
      }
    } catch (error) {
      this.logger.error(`Failed to add import job ${jobId}:`, error.message);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'not_found';
    progress: number;
    data?: ImportJobData;
    result?: ImportJobResult;
    error?: string;
  }> {
    // For RabbitMQ, we'd need external storage for status tracking
    // This is a simplified implementation - in production you'd use Redis/DB for status
    return {
      id: jobId,
      status: 'waiting',
      progress: 0,
    };
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    try {
      const queueInfo = await this.channel.checkQueue(this.queueName);
      return {
        waiting: queueInfo.messageCount,
        active: 0, // RabbitMQ doesn't track this directly
        completed: 0, // Would need external tracking
        failed: 0, // Would need external tracking
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error.message);
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }
  }

  async retryFailedJobs(): Promise<{ message: string; jobsFound: number }> {
    // RabbitMQ doesn't have built-in failed job retry like BullMQ
    // Would need dead letter queue implementation
    return {
      message: 'Retry functionality requires dead letter queue implementation',
      jobsFound: 0,
    };
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down RabbitMQ connection...');
    
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error.message);
    }
  }
}
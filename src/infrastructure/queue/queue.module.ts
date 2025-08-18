import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { CacheModule } from '../cache';

@Module({
  imports: [CacheModule, ConfigModule],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class QueueModule {}
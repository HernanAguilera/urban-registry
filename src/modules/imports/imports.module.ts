import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { Property } from '../../core/entities';
import { QueueModule } from '../../infrastructure/queue';
import { CacheModule } from '../../infrastructure/cache';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property]),
    MulterModule.register({
      dest: './uploads',
    }),
    QueueModule,
    CacheModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
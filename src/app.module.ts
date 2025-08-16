import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesModule } from './modules/properties/properties.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CacheModule } from './infrastructure/cache';
import { User, Property, Listing, Transaction, RefreshToken } from './core/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'redatlas'),
        entities: [User, Property, Listing, Transaction, RefreshToken],
        migrations: [__dirname + '/infrastructure/database/migrations/*{.ts,.js}'],
        synchronize: false, // Always use migrations for schema changes
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    CacheModule,
    PropertiesModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User, Property, Listing, Transaction } from '../../core/entities';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'redatlas',
  entities: [User, Property, Listing, Transaction],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Always use migrations in production
  logging: process.env.NODE_ENV === 'development',
});
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as amqp from 'amqplib';
import { createReadStream } from 'fs';
import * as csv from 'csv-parser';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { Property, PropertyType, PropertyStatus, User, Listing, Transaction, RefreshToken } from '../core/entities';
import { ImportJobData, ImportJobResult } from '../infrastructure/queue/rabbitmq.service';
import IORedis from 'ioredis';

interface PropertyRow {
  external_id?: string;
  title?: string;
  description?: string;
  address?: string;
  sector?: string;
  type?: string;
  status?: string;
  price?: string;
  area?: string;
  bedrooms?: string;
  bathrooms?: string;
  parkingSpaces?: string;
  latitude?: string;
  longitude?: string;
  ownerId?: string;
}

class ImportConsumer {
  private dataSource: DataSource;
  private redis: IORedis;

  constructor() {
    this.initializeDatabase();
    this.initializeRedis();
  }

  private initializeDatabase() {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'redatlas',
      entities: [User, Property, Listing, Transaction, RefreshToken],
      synchronize: false,
    });
  }

  private initializeRedis() {
    this.redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async start() {
    console.log('🚀 Starting RabbitMQ Import Consumer...');

    // Initialize connections
    await this.dataSource.initialize();
    console.log('✅ Database connected');

    // Connect to RabbitMQ
    const rabbitUrl = `amqp://${process.env.QUEUE_USERNAME || 'guest'}:${process.env.QUEUE_PASSWORD || 'guest'}@${process.env.QUEUE_HOST || 'localhost'}:${process.env.QUEUE_PORT || '5672'}`;
    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();
    
    const queueName = 'import-queue';
    await channel.assertQueue(queueName, { 
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // Match with API
      }
    });
    
    console.log('✅ RabbitMQ connected, waiting for messages...');

    // Set prefetch to 1 - process one message at a time
    channel.prefetch(1);

    // Consume messages
    channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const jobData: ImportJobData = JSON.parse(msg.content.toString());
          console.log(`📥 Processing job: ${jobData.idempotencyKey}`);

          // Acknowledge immediately to prevent redelivery
          channel.ack(msg);

          // Mark as processing in Redis
          const redisKey = `import:job:${jobData.idempotencyKey}`;
          await this.redis.set(redisKey, 'processing');

          const result = await this.processImportFile(jobData);
          console.log(`✅ Job completed: ${result.successful}/${result.processed} processed`);

          // Clean up Redis when job is completed
          await this.redis.del(redisKey);
          console.log(`🧹 Cleaned up Redis key: ${redisKey}`);
        } catch (error) {
          console.error(`❌ Job failed:`, error.message);
          // Message already acked, can't nack
        }
      }
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down consumer...');
      await channel.close();
      await connection.close();
      await this.dataSource.destroy();
      await this.redis.quit();
      process.exit(0);
    });
  }

  async processImportFile(jobData: ImportJobData): Promise<ImportJobResult> {
    const { filename, tenantId, userId, totalRows } = jobData;
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];
    const batchSize = 100;
    let batch: Partial<Property>[] = [];

    console.log(`Starting import process for file: ${filename}, tenant: ${tenantId}`);

    try {
      await pipeline(
        createReadStream(filename),
        csv(),
        new Transform({
          objectMode: true,
          transform: async function(row: PropertyRow, _encoding, callback) {
            try {
              processed++;
              
              const property = await this.transformCsvRow(row, tenantId, userId);
              batch.push(property);

              if (batch.length >= batchSize) {
                const batchResult = await this.saveBatch(batch, processed, totalRows);
                successful += batchResult.successful;
                failed += batchResult.failed;
                errors.push(...batchResult.errors);
                batch = [];
              }

              if (processed % 100 === 0) {
                const progress = Math.round((processed / totalRows) * 100);
                console.log(`Import progress: ${progress}% (${processed}/${totalRows})`);
              }

              callback(); // Signal completion of this row
            } catch (error) {
              failed++;
              errors.push(`Row ${processed}: ${error.message}`);
              
              if (errors.length > 1000) {
                errors.splice(0, errors.length - 1000);
              }
              callback(); // Continue processing even if this row failed
            }
          }.bind(this)
        })
      );

      // Process remaining batch after pipeline completes
      if (batch.length > 0) {
        const batchResult = await this.saveBatch(batch, processed, totalRows);
        successful += batchResult.successful;
        failed += batchResult.failed;
        errors.push(...batchResult.errors);
      }

      // Invalidate cache
      await this.invalidatePropertiesCache(tenantId);

      console.log(`Import completed: ${successful} successful, ${failed} failed out of ${processed} total`);

      return {
        processed,
        successful,
        failed,
        errors: errors.slice(-100),
      };
    } catch (error) {
      console.error(`Import stream error: ${error.message}`);
      throw error;
    }
  }

  private async transformCsvRow(row: PropertyRow, tenantId: string, userId: string): Promise<Partial<Property>> {
    if (!row.title || !row.address || !row.sector || !row.price) {
      throw new Error('Missing required fields: title, address, sector, or price');
    }

    if (!row.external_id || !row.external_id.trim()) {
      throw new Error('external_id is required for UPSERT operations');
    }

    const latStr = (row.latitude || '').trim();
    const lonStr = (row.longitude || '').trim();
    
    if (!latStr || !lonStr) {
      throw new Error('Invalid coordinates - latitude and longitude are required');
    }
    
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`Invalid coordinates - lat: ${latStr}, lon: ${lonStr}`);
    }

    const type = this.validatePropertyType(row.type);
    const status = this.validatePropertyStatus(row.status);

    return {
      external_id: row.external_id.trim(),
      title: row.title.trim(),
      description: row.description?.trim() || '',
      address: row.address.trim(),
      sector: row.sector.trim(),
      type,
      status,
      price: parseFloat(row.price),
      area: row.area ? parseFloat(row.area) : null,
      bedrooms: row.bedrooms ? parseInt(row.bedrooms) : null,
      bathrooms: row.bathrooms ? parseInt(row.bathrooms) : null,
      parkingSpaces: row.parkingSpaces ? parseInt(row.parkingSpaces) : null,
      coordinates: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      tenantId: tenantId,
      ownerId: row.ownerId || userId,
    };
  }

  private validatePropertyType(type?: string): PropertyType {
    if (!type) return PropertyType.HOUSE;
    
    const normalizedType = type.toLowerCase().trim();
    const typeMap: Record<string, PropertyType> = {
      'house': PropertyType.HOUSE,
      'apartment': PropertyType.APARTMENT,
      'commercial': PropertyType.COMMERCIAL,
      'land': PropertyType.LAND,
      'warehouse': PropertyType.WAREHOUSE,
    };

    return typeMap[normalizedType] || PropertyType.HOUSE;
  }

  private validatePropertyStatus(status?: string): PropertyStatus {
    if (!status) return PropertyStatus.ACTIVE;
    
    const normalizedStatus = status.toLowerCase().trim();
    const statusMap: Record<string, PropertyStatus> = {
      'active': PropertyStatus.ACTIVE,
      'inactive': PropertyStatus.INACTIVE,
      'sold': PropertyStatus.SOLD,
      'rented': PropertyStatus.RENTED,
    };

    return statusMap[normalizedStatus] || PropertyStatus.ACTIVE;
  }

  private async saveBatch(
    batch: Partial<Property>[], 
    currentRow: number, 
    _totalRows: number
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const propertyRepository = this.dataSource.getRepository(Property);
      
      await propertyRepository.manager.transaction(async (transactionalEntityManager) => {
        for (const property of batch) {
          try {
            const existingProperty = await transactionalEntityManager.findOne(Property, {
              where: { 
                external_id: property.external_id,
                tenantId: property.tenantId 
              }
            });

            if (existingProperty) {
              const updatedProperty = transactionalEntityManager.merge(Property, existingProperty, property);
              await transactionalEntityManager.save(updatedProperty);
              console.log(`Updated property with external_id: ${property.external_id}`);
            } else {
              const entity = transactionalEntityManager.create(Property, property);
              await transactionalEntityManager.save(entity);
              console.log(`Created new property with external_id: ${property.external_id}`);
            }
            
            successful++;
          } catch (error) {
            failed++;
            errors.push(`Row ${currentRow - batch.length + successful + failed}: ${error.message}`);
          }
        }
      });
    } catch (error) {
      failed = batch.length;
      errors.push(`Batch transaction failed: ${error.message}`);
    }

    return { successful, failed, errors };
  }

  private async invalidatePropertiesCache(tenantId: string): Promise<void> {
    try {
      const allKeys = await this.redis.keys('properties:*');
      const keysToDelete: string[] = [];
      
      for (const key of allKeys) {
        try {
          const base64Part = key.replace('properties:', '');
          const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
          const params = JSON.parse(decoded);
          
          if (params.tenantId === tenantId) {
            keysToDelete.push(key);
          }
        } catch (decodeError) {
          console.log(`Skipping key with invalid base64: ${key}`);
        }
      }
      
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        console.log(`Invalidated ${keysToDelete.length} cache keys for tenant ${tenantId}`);
      }
    } catch (error) {
      console.error('Failed to invalidate properties cache:', error.message);
    }
  }
}

// Start the consumer
const consumer = new ImportConsumer();
consumer.start().catch(console.error);
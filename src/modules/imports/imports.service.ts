import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import * as csv from 'csv-parser';
import { Property, PropertyType, PropertyStatus } from '../../core/entities';
import { RabbitMQService, ImportJobData, ImportJobResult } from '../../infrastructure/queue';
import { RedisService } from '../../infrastructure/cache';

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

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    private queueService: RabbitMQService,
    private redisService: RedisService,
  ) {}

  async startImport(
    file: Express.Multer.File,
    tenantId: string,
    userId: string,
  ): Promise<{
    jobId: string;
    status: string;
    message: string;
    estimatedRows: number;
    statusUrl: string;
  }> {
    // Validate file
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    // Generate idempotency key automatically
    const idempotencyKey = this.generateIdempotencyKey(file, tenantId, userId);

    // Count rows in CSV for estimation
    const estimatedRows = await this.countCsvRows(file.path);

    // Create job data
    const jobData: ImportJobData = {
      filename: file.path,
      tenantId,
      userId,
      idempotencyKey,
      totalRows: estimatedRows,
    };

    // Add to queue
    const job = await this.queueService.addImportJob(jobData);

    // Check if it's a duplicate
    if (job.isDuplicate) {
      return {
        jobId: job.id,
        status: 'duplicate',
        message: 'Duplicate file detected - this file has already been processed. Use the jobId to check the original import status.',
        estimatedRows,
        statusUrl: `/v1/imports/status/${job.id}`,
      };
    }

    // RabbitMQ sends message to queue - consumer processes separately

    return {
      jobId: job.id,
      status: 'accepted',
      message: 'Import job started successfully. Use the jobId to track progress.',
      estimatedRows,
      statusUrl: `/v1/imports/status/${job.id}`,
    };
  }

  async getImportStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    data?: ImportJobData;
    result?: ImportJobResult;
    error?: string;
  }> {
    return this.queueService.getJobStatus(jobId);
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    return this.queueService.getQueueStats();
  }

  // Recovery method - RabbitMQ retry (would need DLQ implementation)
  async processWaitingJobs(): Promise<{ message: string; jobsFound: number }> {
    return this.queueService.retryFailedJobs();
  }

  // This method will be called by the worker
  async processImportFile(jobData: ImportJobData): Promise<ImportJobResult> {
    const { filename, tenantId, userId, totalRows } = jobData;
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];
    const batchSize = 100; // Process in batches
    let batch: Partial<Property>[] = [];

    this.logger.log(`Starting import process for file: ${filename}, tenant: ${tenantId}`);

    return new Promise((resolve, reject) => {
      const stream = createReadStream(filename)
        .pipe(csv());

      stream.on('data', async (row: PropertyRow) => {
        try {
          processed++;
          
          // Validate and transform row
          const property = await this.transformCsvRow(row, tenantId, userId);
          batch.push(property);

          // Process batch when it reaches the batch size
          if (batch.length >= batchSize) {
            const batchResult = await this.saveBatch(batch, processed, totalRows);
            successful += batchResult.successful;
            failed += batchResult.failed;
            errors.push(...batchResult.errors);
            batch = []; // Clear batch
          }

          // Update progress every 100 rows
          if (processed % 100 === 0) {
            const progress = Math.round((processed / totalRows) * 100);
            // Note: In a real implementation, you'd update job progress here
            this.logger.debug(`Import progress: ${progress}% (${processed}/${totalRows})`);
          }

        } catch (error) {
          failed++;
          errors.push(`Row ${processed}: ${error.message}`);
          
          // Limit error collection to prevent memory issues
          if (errors.length > 1000) {
            errors.splice(0, errors.length - 1000);
          }
        }
      });

      stream.on('end', async () => {
        try {
          // Process remaining items in batch
          if (batch.length > 0) {
            const batchResult = await this.saveBatch(batch, processed, totalRows);
            successful += batchResult.successful;
            failed += batchResult.failed;
            errors.push(...batchResult.errors);
          }

          // Invalidate properties cache after import
          await this.redisService.invalidatePropertiesCache(tenantId);

          this.logger.log(`Import completed: ${successful} successful, ${failed} failed out of ${processed} total`);

          resolve({
            processed,
            successful,
            failed,
            errors: errors.slice(-100), // Return last 100 errors
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error) => {
        this.logger.error(`Import stream error: ${error.message}`);
        reject(error);
      });
    });
  }

  private async countCsvRows(filename: string): Promise<number> {
    return new Promise((resolve) => {
      let count = 0;
      createReadStream(filename)
        .pipe(csv())
        .on('data', () => count++)
        .on('end', () => resolve(count));
    });
  }

  private async transformCsvRow(row: PropertyRow, tenantId: string, userId: string): Promise<Partial<Property>> {
    // Validate required fields
    if (!row.title || !row.address || !row.sector || !row.price) {
      throw new Error('Missing required fields: title, address, sector, or price');
    }

    // Validate external_id for UPSERT functionality
    if (!row.external_id || !row.external_id.trim()) {
      throw new Error('external_id is required for UPSERT operations');
    }

    // Validate coordinates
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

    // Transform and validate property type
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
      tenantId,
      ownerId: row.ownerId || userId, // Use authenticated user as owner if not provided
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
      // Use transaction for batch UPSERT
      await this.propertyRepository.manager.transaction(async (transactionalEntityManager) => {
        for (const property of batch) {
          try {
            // Check if property exists by external_id and tenantId
            const existingProperty = await transactionalEntityManager.findOne(Property, {
              where: { 
                external_id: property.external_id,
                tenantId: property.tenantId 
              }
            });

            if (existingProperty) {
              // UPDATE: Merge existing entity with new data
              const updatedProperty = transactionalEntityManager.merge(Property, existingProperty, property);
              await transactionalEntityManager.save(updatedProperty);
              this.logger.debug(`Updated property with external_id: ${property.external_id}`);
            } else {
              // INSERT: Create new entity
              const entity = transactionalEntityManager.create(Property, property);
              await transactionalEntityManager.save(entity);
              this.logger.debug(`Created new property with external_id: ${property.external_id}`);
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

  private generateIdempotencyKey(
    file: any,
    tenantId: string,
    userId: string,
  ): string {
    const hash = createHash('md5');
    hash.update(file.originalname);
    hash.update(file.size.toString());
    hash.update(tenantId);
    hash.update(userId);
    return hash.digest('hex');
  }
}
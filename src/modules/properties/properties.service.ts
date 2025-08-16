import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Property } from '../../core/entities';
import { PropertyFiltersDto, PaginatedPropertiesDto, PropertySummaryDto, SortBy } from './dto';
import { RedisService } from '../../infrastructure/cache';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    private redisService: RedisService,
  ) {}

  async findAll(
    filters: PropertyFiltersDto,
    tenantId: string,
  ): Promise<PaginatedPropertiesDto> {
    // Generate cache key
    const cacheKey = this.redisService.generateCacheKey('properties', {
      ...filters,
      tenantId,
    });

    // Try to get from cache first
    try {
      const cachedResult = await this.redisService.get<PaginatedPropertiesDto>(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return cachedResult;
      }
    } catch (error) {
      this.logger.warn('Cache read failed, continuing with DB query');
    }

    const {
      sector,
      type,
      status,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      minBedrooms,
      minBathrooms,
      sortBy,
      sortOrder,
      limit,
      cursor,
    } = filters;

    // Build base query with tenant isolation
    let queryBuilder = this.propertyRepository
      .createQueryBuilder('property')
      .where('property.tenantId = :tenantId', { tenantId })
      .andWhere('property.deletedAt IS NULL');

    // Apply filters
    queryBuilder = this.applyFilters(queryBuilder, filters);

    // Apply sorting
    const sortField = this.getSortField(sortBy);
    queryBuilder.addOrderBy(sortField, sortOrder);
    queryBuilder.addOrderBy('property.id', sortOrder); // Consistent ordering for cursor

    // Apply cursor pagination
    if (cursor) {
      const cursorProperty = await this.propertyRepository.findOne({
        where: { id: cursor, tenantId },
        select: ['id', 'price', 'createdAt', 'area', 'title'],
      });

      if (cursorProperty) {
        const operator = sortOrder === 'ASC' ? '>' : '<';
        const cursorValue = cursorProperty[this.getPropertyField(sortBy)];
        
        queryBuilder.andWhere(
          `(${sortField} ${operator} :cursorValue OR (${sortField} = :cursorValue AND property.id ${operator} :cursorId))`,
          { cursorValue, cursorId: cursor },
        );
      }
    }

    // Execute query with limit + 1 to check for next page
    const properties = await queryBuilder
      .take(limit + 1)
      .getMany();

    // Determine pagination state
    const hasNext = properties.length > limit;
    if (hasNext) {
      properties.pop(); // Remove extra item
    }

    // Get total count (for metadata)
    const totalQueryBuilder = this.propertyRepository
      .createQueryBuilder('property')
      .where('property.tenantId = :tenantId', { tenantId })
      .andWhere('property.deletedAt IS NULL');
    
    const totalWithFilters = await this.applyFilters(totalQueryBuilder, filters).getCount();

    // Determine cursors
    const nextCursor = hasNext ? properties[properties.length - 1]?.id : undefined;
    const prevCursor = properties.length > 0 ? properties[0].id : undefined;

    // Transform to DTOs
    const data: PropertySummaryDto[] = properties.map(property => ({
      id: property.id,
      title: property.title,
      sector: property.sector,
      type: property.type,
      status: property.status,
      price: parseFloat(property.price.toString()),
      area: property.area ? parseFloat(property.area.toString()) : null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parkingSpaces: property.parkingSpaces,
      createdAt: property.createdAt,
    }));

    const result = {
      data,
      meta: {
        limit,
        nextCursor,
        prevCursor: cursor ? prevCursor : undefined,
        hasNext,
        hasPrev: !!cursor,
        total: totalWithFilters,
      },
    };

    // Cache the result (5 minutes TTL)
    try {
      await this.redisService.set(cacheKey, result, 300);
      this.logger.debug(`Cached result for key: ${cacheKey}`);
    } catch (error) {
      this.logger.warn('Failed to cache result:', error.message);
    }

    return result;
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Property>,
    filters: PropertyFiltersDto,
  ): SelectQueryBuilder<Property> {
    const {
      sector,
      type,
      status,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      minBedrooms,
      minBathrooms,
    } = filters;

    if (sector) {
      queryBuilder.andWhere('LOWER(property.sector) LIKE LOWER(:sector)', {
        sector: `%${sector}%`,
      });
    }

    if (type) {
      queryBuilder.andWhere('property.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('property.status = :status', { status });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('property.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('property.price <= :maxPrice', { maxPrice });
    }

    if (minArea !== undefined) {
      queryBuilder.andWhere('property.area >= :minArea', { minArea });
    }

    if (maxArea !== undefined) {
      queryBuilder.andWhere('property.area <= :maxArea', { maxArea });
    }

    if (minBedrooms !== undefined) {
      queryBuilder.andWhere('property.bedrooms >= :minBedrooms', { minBedrooms });
    }

    if (minBathrooms !== undefined) {
      queryBuilder.andWhere('property.bathrooms >= :minBathrooms', { minBathrooms });
    }

    return queryBuilder;
  }

  private getSortField(sortBy: SortBy): string {
    const fieldMapping = {
      [SortBy.PRICE]: 'property.price',
      [SortBy.CREATED_AT]: 'property.createdAt',
      [SortBy.AREA]: 'property.area',
      [SortBy.TITLE]: 'property.title',
    };

    return fieldMapping[sortBy] || fieldMapping[SortBy.CREATED_AT];
  }

  private getPropertyField(sortBy: SortBy): keyof Property {
    const fieldMapping: Record<SortBy, keyof Property> = {
      [SortBy.PRICE]: 'price',
      [SortBy.CREATED_AT]: 'createdAt',
      [SortBy.AREA]: 'area',
      [SortBy.TITLE]: 'title',
    };

    return fieldMapping[sortBy] || fieldMapping[SortBy.CREATED_AT];
  }

}
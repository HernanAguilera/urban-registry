import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Property } from '../../core/entities';
import { 
  PropertyFiltersDto, 
  PaginatedPropertiesDto, 
  PropertySummaryDto, 
  PropertyGeoJSONCollection,
  SortBy 
} from './dto';
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
  ): Promise<PaginatedPropertiesDto | PropertyGeoJSONCollection> {
    // Generate cache key
    const cacheKey = this.redisService.generateCacheKey('properties', {
      ...filters,
      tenantId,
    });

    // Check if this is a geospatial query
    const isGeospatialQuery = filters.lat !== undefined && filters.lon !== undefined && filters.radius !== undefined;

    // Try to get from cache first
    try {
      const cachedResult = await this.redisService.get<PaginatedPropertiesDto | PropertyGeoJSONCollection>(cacheKey);
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
      lat,
      lon,
      radius,
    } = filters;

    // Build base query with tenant isolation
    let queryBuilder = this.propertyRepository
      .createQueryBuilder('property')
      .where('property.tenantId = :tenantId', { tenantId })
      .andWhere('property.deletedAt IS NULL');

    // Add geospatial filtering if provided
    if (isGeospatialQuery) {
      // Use PostGIS ST_DWithin for distance filtering (radius in meters)
      queryBuilder
        .addSelect('ST_Distance(property.coordinates, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000', 'distance')
        .andWhere('ST_DWithin(property.coordinates, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)', {
          lat,
          lon,
          radiusMeters: radius * 1000, // Convert km to meters
        });
    }

    // Apply filters
    queryBuilder = this.applyFilters(queryBuilder, filters);

    // Apply sorting
    if (isGeospatialQuery && (!sortBy || sortBy === SortBy.CREATED_AT)) {
      // For geospatial queries, default to sorting by distance
      queryBuilder.addOrderBy('distance', 'ASC');
      queryBuilder.addOrderBy('property.id', sortOrder); // Consistent ordering for cursor
    } else {
      const sortField = this.getSortField(sortBy);
      queryBuilder.addOrderBy(sortField, sortOrder);
      queryBuilder.addOrderBy('property.id', sortOrder); // Consistent ordering for cursor
    }

    // Apply cursor pagination
    if (cursor) {
      // Validate cursor is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(cursor)) {
        throw new BadRequestException('Invalid cursor format. Expected a valid UUID.');
      }

      const cursorProperty = await this.propertyRepository.findOne({
        where: { id: cursor, tenantId },
        select: ['id', 'price', 'createdAt', 'area', 'title'],
      });

      if (cursorProperty) {
        const operator = sortOrder === 'ASC' ? '>' : '<';
        const cursorValue = cursorProperty[this.getPropertyField(sortBy)];
        const sortField = this.getSortField(sortBy);
        
        queryBuilder.andWhere(
          `(${sortField} ${operator} :cursorValue OR (${sortField} = :cursorValue AND property.id ${operator} :cursorId))`,
          { cursorValue, cursorId: cursor },
        );
      }
    }

    // Execute query with limit + 1 to check for next page
    const rawResults = await queryBuilder
      .take(limit + 1)
      .getRawAndEntities();
      
    const properties = rawResults.entities;
    const rawData = rawResults.raw;

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

    // Create result based on query type
    let result: PaginatedPropertiesDto | PropertyGeoJSONCollection;

    if (isGeospatialQuery) {
      // Transform to GeoJSON format
      const features = properties.map((property, index) => {
        const rawRow = rawData[index];
        const distance = rawRow?.distance ? parseFloat(rawRow.distance) : undefined;
        
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              parseFloat(property.coordinates.coordinates[0].toString()),
              parseFloat(property.coordinates.coordinates[1].toString())
            ] as [number, number]
          },
          properties: {
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
            ...(distance !== undefined && { distance })
          }
        };
      });

      result = {
        type: 'FeatureCollection',
        features,
        meta: {
          limit,
          nextCursor,
          prevCursor: cursor ? prevCursor : undefined,
          hasNext,
          hasPrev: !!cursor,
          total: totalWithFilters,
        },
      };
    } else {
      // Transform to regular DTO format
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

      result = {
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
    }

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

  // CRUD operations that trigger cache invalidation
  async createProperty(propertyData: Partial<Property>, tenantId: string): Promise<Property> {
    const property = this.propertyRepository.create({
      ...propertyData,
      tenantId,
    });
    
    const savedProperty = await this.propertyRepository.save(property);
    
    // Invalidate cache after creation
    await this.redisService.invalidatePropertiesCache(tenantId);
    
    return savedProperty;
  }

  async updateProperty(
    propertyId: string, 
    propertyData: Partial<Property>, 
    tenantId: string
  ): Promise<Property> {
    await this.propertyRepository.update(
      { id: propertyId, tenantId },
      propertyData
    );
    
    const updatedProperty = await this.propertyRepository.findOne({
      where: { id: propertyId, tenantId }
    });
    
    if (!updatedProperty) {
      throw new NotFoundException(`Property with ID ${propertyId} not found or access denied`);
    }
    
    // Invalidate cache after update
    await this.redisService.invalidatePropertiesCache(tenantId);
    
    return updatedProperty;
  }

  async deleteProperty(propertyId: string, tenantId: string): Promise<void> {
    const result = await this.propertyRepository.softDelete({
      id: propertyId,
      tenantId
    });
    
    if (result.affected === 0) {
      throw new NotFoundException(`Property with ID ${propertyId} not found or access denied`);
    }
    
    // Invalidate cache after deletion
    await this.redisService.invalidatePropertiesCache(tenantId);
  }

}
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PropertyType, PropertyStatus } from '../../../core/entities';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum SortBy {
  PRICE = 'price',
  CREATED_AT = 'createdAt',
  AREA = 'area',
  TITLE = 'title',
}

export class PropertyFiltersDto {
  @ApiProperty({
    description: 'Property sector/neighborhood',
    required: false,
    example: 'Centro',
  })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiProperty({
    description: 'Property type',
    enum: PropertyType,
    required: false,
    example: PropertyType.HOUSE,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiProperty({
    description: 'Property status',
    enum: PropertyStatus,
    required: false,
    example: PropertyStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiProperty({
    description: 'Minimum price',
    required: false,
    example: 100000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price',
    required: false,
    example: 500000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    description: 'Minimum area in square meters',
    required: false,
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minArea?: number;

  @ApiProperty({
    description: 'Maximum area in square meters',
    required: false,
    example: 200,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxArea?: number;

  @ApiProperty({
    description: 'Minimum number of bedrooms',
    required: false,
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBedrooms?: number;

  @ApiProperty({
    description: 'Minimum number of bathrooms',
    required: false,
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBathrooms?: number;

  @ApiProperty({
    description: 'Sort field',
    enum: SortBy,
    required: false,
    default: SortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED_AT;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    required: false,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Page size (max 100)',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Cursor for pagination (property ID)',
    required: false,
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
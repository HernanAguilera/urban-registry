import { ApiProperty } from '@nestjs/swagger';
import { Property } from '../../../core/entities';

export class PropertySummaryDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'Beautiful house in Centro' })
  title: string;

  @ApiProperty({ example: 'Centro' })
  sector: string;

  @ApiProperty({ example: 'house' })
  type: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 250000 })
  price: number;

  @ApiProperty({ example: 120.5 })
  area: number;

  @ApiProperty({ example: 3 })
  bedrooms: number;

  @ApiProperty({ example: 2 })
  bathrooms: number;

  @ApiProperty({ example: 1 })
  parkingSpaces: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 'next-cursor-uuid', required: false })
  nextCursor?: string;

  @ApiProperty({ example: 'prev-cursor-uuid', required: false })
  prevCursor?: string;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;

  @ApiProperty({ example: 1250 })
  total: number;
}

export class PaginatedPropertiesDto {
  @ApiProperty({ type: [PropertySummaryDto] })
  data: PropertySummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
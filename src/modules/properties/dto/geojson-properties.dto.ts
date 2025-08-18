import { ApiProperty } from '@nestjs/swagger';

export class GeoJSONCoordinates {
  @ApiProperty({ 
    example: [-77.0428, -12.0464],
    description: 'Longitude, Latitude coordinates' 
  })
  coordinates: [number, number];
}

export class GeoJSONGeometry {
  @ApiProperty({ example: 'Point' })
  type: 'Point';

  @ApiProperty({ 
    type: 'array',
    items: { type: 'number' },
    example: [-77.0428, -12.0464],
    description: 'Longitude, Latitude coordinates'
  })
  coordinates: [number, number];
}

export class PropertyGeoJSONProperties {
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

  @ApiProperty({ 
    example: 1.2,
    description: 'Distance in kilometers (only present in geospatial searches)' 
  })
  distance?: number;
}

export class PropertyGeoJSONFeature {
  @ApiProperty({ example: 'Feature' })
  type: 'Feature';

  @ApiProperty({ type: GeoJSONGeometry })
  geometry: GeoJSONGeometry;

  @ApiProperty({ type: PropertyGeoJSONProperties })
  properties: PropertyGeoJSONProperties;
}

export class PropertyGeoJSONCollection {
  @ApiProperty({ example: 'FeatureCollection' })
  type: 'FeatureCollection';

  @ApiProperty({ type: [PropertyGeoJSONFeature] })
  features: PropertyGeoJSONFeature[];

  @ApiProperty({
    example: {
      limit: 20,
      nextCursor: 'next-cursor-uuid',
      prevCursor: 'prev-cursor-uuid',
      hasNext: true,
      hasPrev: false,
      total: 1250
    }
  })
  meta: {
    limit: number;
    nextCursor?: string;
    prevCursor?: string;
    hasNext: boolean;
    hasPrev: boolean;
    total: number;
  };
}
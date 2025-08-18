import { Controller, Get, Query, UseGuards, Request, Post, Delete, Param, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PropertiesService } from './properties.service';
import { PropertyFiltersDto, PaginatedPropertiesDto, PropertyGeoJSONCollection, UpdatePropertyDto } from './dto';
import { TenantGuard, RolesGuard } from '../../shared/guards';
import { CurrentUser, Roles } from '../../shared/decorators';
import { UserRole, Property } from '../../core/entities';
import { CacheInvalidate } from '../../infrastructure/cache/cache-invalidation.interceptor';

@ApiTags('properties')
@Controller('v1/properties')
@UseGuards(AuthGuard('jwt'), TenantGuard)
@ApiBearerAuth()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Search properties with advanced filters',
    description: 'Returns a paginated list of properties with cursor-based pagination and advanced filtering options. If lat, lon, and radius are provided, returns GeoJSON format with distance sorting.'
  })
  @ApiResponse({
    status: 200,
    description: 'Properties retrieved successfully (regular format)',
    type: PaginatedPropertiesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Properties retrieved successfully (GeoJSON format when geospatial filters are used)',
    type: PropertyGeoJSONCollection,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - tenant access required',
  })
  async findAll(
    @Query() filters: PropertyFiltersDto,
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<PaginatedPropertiesDto | PropertyGeoJSONCollection> {
    return this.propertiesService.findAll(filters, tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @CacheInvalidate({
    patterns: ['properties'],
    tenantSpecific: true,
  })
  @ApiOperation({ 
    summary: 'Update property (Admin only)',
    description: 'Update property details. Only accessible by admin users. If latitude and longitude are provided, coordinates will be updated automatically.'
  })
  @ApiResponse({
    status: 200,
    description: 'Property updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Property updated successfully' },
        property: {
          type: 'object',
          description: 'Updated property details'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  async updateProperty(
    @Param('id') propertyId: string,
    @Body() updateData: UpdatePropertyDto,
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<{ message: string; property: Property }> {
    // Transform coordinates if latitude and longitude are provided
    const propertyData: Partial<Property> = {};
    
    // Copy all valid Property fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'latitude' && key !== 'longitude' && updateData[key] !== undefined) {
        propertyData[key] = updateData[key];
      }
    });
    
    // Handle coordinates transformation
    if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
      propertyData.coordinates = {
        type: 'Point',
        coordinates: [updateData.longitude, updateData.latitude],
      };
    }

    const updatedProperty = await this.propertiesService.updateProperty(
      propertyId,
      propertyData,
      tenantId
    );
    
    return {
      message: 'Property updated successfully',
      property: updatedProperty
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @CacheInvalidate({
    patterns: ['properties'],
    tenantSpecific: true,
  })
  @ApiOperation({ 
    summary: 'Delete property (Admin only)',
    description: 'Soft delete a property. Only accessible by admin users.'
  })
  @ApiResponse({
    status: 200,
    description: 'Property deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  async deleteProperty(
    @Param('id') propertyId: string,
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<{ message: string }> {
    await this.propertiesService.deleteProperty(propertyId, tenantId);
    return { message: `Property ${propertyId} deleted successfully` };
  }
}
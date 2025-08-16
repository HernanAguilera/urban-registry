import { Controller, Get, Query, UseGuards, Request, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PropertiesService } from './properties.service';
import { PropertyFiltersDto, PaginatedPropertiesDto } from './dto';
import { TenantGuard, RolesGuard } from '../../shared/guards';
import { CurrentUser, Roles } from '../../shared/decorators';
import { UserRole } from '../../core/entities';

@ApiTags('properties')
@Controller('v1/properties')
@UseGuards(AuthGuard('jwt'), TenantGuard)
@ApiBearerAuth()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Search properties with advanced filters',
    description: 'Returns a paginated list of properties with cursor-based pagination and advanced filtering options'
  })
  @ApiResponse({
    status: 200,
    description: 'Properties retrieved successfully',
    type: PaginatedPropertiesDto,
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
  ): Promise<PaginatedPropertiesDto> {
    return this.propertiesService.findAll(filters, tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
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
    // This would implement actual deletion logic
    return { message: `Property ${propertyId} marked for deletion by admin` };
  }
}
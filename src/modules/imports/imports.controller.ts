import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ImportsService } from './imports.service';
import { ImportStartedDto, ImportJobStatusDto, QueueStatsDto } from './dto';
import { TenantGuard, RolesGuard } from '../../shared/guards';
import { CurrentUser, Roles } from '../../shared/decorators';
import { UserRole } from '../../core/entities';

@ApiTags('imports')
@Controller('v1/imports')
@UseGuards(AuthGuard('jwt'), TenantGuard)
@ApiBearerAuth()
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Generate unique filename
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('csv') || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only CSV files are allowed'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    })
  )
  @ApiOperation({
    summary: 'Start async CSV import (Admin only)',
    description: 'Upload a CSV file for background processing. Returns immediately with a job ID for tracking progress. Automatic idempotency prevents duplicate imports of the same file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file containing property data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file with property data',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import job started successfully',
    type: ImportStartedDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - duplicate file detected, returns existing job',
    type: ImportStartedDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  async startImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Res() res: any,
  ): Promise<void> {
    const result = await this.importsService.startImport(
      file,
      tenantId,
      userId,
    );

    // Return appropriate HTTP status based on result
    if (result.status === 'duplicate') {
      res.status(HttpStatus.CONFLICT).json(result);
    } else {
      res.status(HttpStatus.CREATED).json(result);
    }
  }

  @Get('status/:jobId')
  @ApiOperation({
    summary: 'Get import job status',
    description: 'Check the progress and status of an import job using its job ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import job status retrieved successfully',
    type: ImportJobStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - tenant access required',
  })
  async getImportStatus(
    @Param('jobId') jobId: string,
  ): Promise<ImportJobStatusDto> {
    return this.importsService.getImportStatus(jobId);
  }

  @Get('queue/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get queue statistics (Admin only)',
    description: 'Get current statistics about the import queue including waiting, active, completed, and failed job counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
    type: QueueStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  async getQueueStats(): Promise<QueueStatsDto> {
    return this.importsService.getQueueStats();
  }

  @Post('process-waiting')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Process orphaned waiting jobs (Admin only)',
    description: 'Manually trigger processing of jobs that are stuck in waiting state due to server restarts or errors.',
  })
  @ApiResponse({
    status: 200,
    description: 'Waiting jobs processed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        jobsFound: { type: 'number' },
      },
    },
  })
  async processWaitingJobs(): Promise<{ message: string; jobsFound: number }> {
    return this.importsService.processWaitingJobs();
  }
}
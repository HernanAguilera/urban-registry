import { ApiProperty } from '@nestjs/swagger';

export class ImportJobStatusDto {
  @ApiProperty({ example: 'abc123-import-key' })
  id: string;

  @ApiProperty({ 
    example: 'active',
    enum: ['waiting', 'active', 'completed', 'failed', 'not_found'],
    description: 'Current status of the import job'
  })
  status: string;

  @ApiProperty({ example: 75, description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ 
    example: { 
      filename: 'properties.csv', 
      tenantId: 'tenant123', 
      totalRows: 1000 
    },
    required: false,
    description: 'Job data (only present if job exists)'
  })
  data?: {
    filename: string;
    tenantId: string;
    userId: string;
    idempotencyKey: string;
    totalRows: number;
  };

  @ApiProperty({ 
    example: { 
      processed: 1000, 
      successful: 950, 
      failed: 50, 
      errors: ['Row 10: Invalid coordinates', 'Row 25: Missing required field'] 
    },
    required: false,
    description: 'Job result (only present when completed)'
  })
  result?: {
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  };

  @ApiProperty({ 
    example: 'Database connection failed',
    required: false,
    description: 'Error message (only present when failed)'
  })
  error?: string;
}

export class QueueStatsDto {
  @ApiProperty({ example: 5, description: 'Number of jobs waiting to be processed' })
  waiting: number;

  @ApiProperty({ example: 2, description: 'Number of jobs currently being processed' })
  active: number;

  @ApiProperty({ example: 150, description: 'Number of completed jobs' })
  completed: number;

  @ApiProperty({ example: 3, description: 'Number of failed jobs' })
  failed: number;
}
import { ApiProperty } from '@nestjs/swagger';

export class ImportStartedDto {
  @ApiProperty({ 
    example: 'abc123-import-key',
    description: 'Unique job identifier that can be used to track progress'
  })
  jobId: string;

  @ApiProperty({ 
    example: 'accepted',
    description: 'Status indicating the import has been queued'
  })
  status: string;

  @ApiProperty({ 
    example: 'Import job started successfully. Use the jobId to track progress.',
    description: 'Human-readable message'
  })
  message: string;

  @ApiProperty({ 
    example: 10500,
    description: 'Estimated number of rows to be processed'
  })
  estimatedRows: number;

  @ApiProperty({ 
    example: '/v1/imports/status/abc123-import-key',
    description: 'URL to check import status'
  })
  statusUrl: string;
}
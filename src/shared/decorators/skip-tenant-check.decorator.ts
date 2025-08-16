import { SetMetadata } from '@nestjs/common';
import { SKIP_TENANT_CHECK_KEY } from '../guards/tenant.guard';

export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);
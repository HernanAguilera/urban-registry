# Technical Debt

## Naming Conventions Inconsistency

**Priority: Medium**

### Problem
Inconsistent naming conventions across the codebase:
- Some properties use camelCase (`tenantId`, `userId`)
- Some properties use snake_case (`external_id`)
- Database columns all use snake_case
- TypeORM entities mix both conventions

### Current State
- Entity properties: mixed camelCase/snake_case
- Database columns: snake_case
- Function parameters: camelCase
- Variables: mixed

### Target State
All properties and variables should use snake_case according to coding standards.

### Impact
- Confusing for developers
- Potential bugs in queries
- Inconsistent API responses

### Effort
- Medium: Requires systematic refactoring
- Need to update entities, DTOs, services, and migration scripts
- Risk of breaking existing API contracts

### Files Affected
- `src/core/entities/*.entity.ts`
- `src/workers/import-consumer.ts`
- All DTOs and services that reference these properties
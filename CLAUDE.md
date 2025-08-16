# CLAUDE.md - Project Guidelines

## Command Execution Protocol

**IMPORTANTE**: Antes de ejecutar cualquier comando que pueda consumir recursos significativos o afectar el sistema, SIEMPRE ofrecer al usuario ejecutarlo él mismo, a menos que haya pedido explícitamente que lo ejecute Claude.

### Comandos que requieren confirmación del usuario:
- `npm run seed` - Script de seeding (puede consumir muchos tokens)
- `docker compose up/down` - Operaciones de Docker
- `npm install` - Instalación de dependencias
- `npm run build` - Compilación del proyecto
- `npm run test` - Ejecución de tests
- `npm run migration:run` - Aplicar migraciones
- Cualquier comando que modifique archivos del sistema
- Comandos de larga duración o que consuman recursos

### Protocolo:
1. Explicar qué hace el comando
2. Mostrar el comando completo para que el usuario lo copie
3. Esperar confirmación del usuario antes de ejecutar
4. Solo ejecutar directamente si el usuario lo pide explícitamente

### Excepciones (comandos seguros para ejecutar directamente):
- `cat`, `ls`, `pwd` - Comandos de lectura
- `mkdir` - Crear directorios
- Operaciones de archivos simples con herramientas de Claude

## Configuración del Proyecto

### Stack Tecnológico
- **Backend**: NestJS + TypeScript
- **Base de datos**: PostgreSQL 15 + PostGIS
- **Cache**: Redis
- **Queue**: RabbitMQ
- **Package Manager**: npm (dentro del contenedor)
- **ORM**: TypeORM con migraciones

### Arquitectura
- Arquitectura híbrida Clean Architecture + NestJS modules
- Separación en capas: core, modules, infrastructure, shared
- Multi-tenant con tenant_id en todas las entidades
- Soft delete implementado
- PostGIS para datos geoespaciales

### Scripts importantes (Docker-First)
```bash
# Levantar stack completo
docker compose up -d

# Desarrollo (ver logs)
docker compose logs -f api

# Migraciones (dentro del contenedor)
docker compose exec api npm run migration:generate src/infrastructure/database/migrations/nombre
docker compose exec api npm run migration:run

# Seeding (¡PEDIR CONFIRMACIÓN!)
docker compose exec api npm run seed

# Testing (dentro del contenedor)
docker compose exec api npm run test:cov
docker compose exec api npm run test:load

# Acceso al contenedor
docker compose exec api bash
```

### Notas para Claude
- Siempre leer este archivo antes de ejecutar comandos
- Priorizar eficiencia de tokens
- Ofrecer comandos para que el usuario los ejecute
- Solo ejecutar directamente si es explícitamente solicitado
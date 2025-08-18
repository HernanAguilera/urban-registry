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

## Testing Manual Completo

### Credenciales de Prueba (después del seeding)
```
Admin: admin@test.com / password123 (rol: admin, tenant: tenant-test)  
Usuario: user@test.com / password123 (rol: user, tenant: tenant-test)
```

### Secuencia de Testing (ORDEN OBLIGATORIO)
```bash
# 1. Migraciones (crear tablas)
docker compose exec api npm run migration:run

# 2. Seeding (crear usuarios y datos)
docker compose exec api npm run seed

# 3. Obtener token
curl -X POST "http://localhost:3030/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "password123"}'

# 4. Exportar token (copiar access_token de respuesta anterior)
export TOKEN="tu_access_token_aqui"

# 5. Probar búsqueda normal
curl "http://localhost:3030/v1/properties?limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 6. Probar búsqueda geoespacial (GeoJSON)
curl "http://localhost:3030/v1/properties?lat=-34.6037&lon=-58.3816&radius=10&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 7. Probar import CSV (solo admin)
echo "title,description,address,sector,type,status,price,area,bedrooms,bathrooms,parkingSpaces,latitude,longitude
Casa Test,Descripción test,Av. Corrientes 1234,Palermo,house,active,350000,100,3,2,1,-34.6037,-58.3816" > test.csv

curl -X POST "http://localhost:3030/v1/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -F "file=@test.csv"

# 8. Verificar status import (usar jobId de respuesta anterior)
curl "http://localhost:3030/v1/imports/status/JOB_ID_AQUI" \
  -H "Authorization: Bearer $TOKEN"
```

### URLs importantes
- API: http://localhost:3030
- Swagger: http://localhost:3030/docs
- RabbitMQ: http://localhost:15672 (guest/guest)

### Notas para Claude
- Siempre leer este archivo antes de ejecutar comandos
- Priorizar eficiencia de tokens
- Ofrecer comandos para que el usuario los ejecute
- Solo ejecutar directamente si es explícitamente solicitado
- **SIEMPRE verificar dependencias**: ¿tiene el usuario todo lo necesario para esto?
- **SIEMPRE documentar información crítica**: comandos de prueba van aquí, no se pierden en chat

## Protocolo de Debug Obligatorio

**ANTES de proponer cualquier solución a un bug, OBLIGATORIAMENTE:**

1. **ANALIZAR LA CAUSA RAÍZ**: ¿Por qué está ocurriendo este comportamiento? No asumir, investigar.
2. **EVALUAR EL IMPACTO**: ¿Qué partes del sistema se ven afectadas? ¿Es realmente un problema?
3. **DEBUGGEAR PRIMERO**: Usar logs, queries directos, verificar datos antes de cambiar código.
4. **PROPONER SOLUCIÓN MÍNIMA**: La menor cantidad de cambios posible para resolver la causa real.

**PROHIBIDO:**
- Cambiar estrategias completas sin entender la causa
- Asumir que el problema está en una parte específica sin verificar
- Proponer refactors grandes para problemas pequeños
- Saltar directamente a "la solución" sin análisis

**Recordatorio**: Analizar → Debuggear → Solución mínima. NO reaccionar impulsivamente.
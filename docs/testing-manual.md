# Testing Manual - Red Atlas API

## Comandos de Prueba Manual

### Credenciales
- **Admin**: `admin@test.com` / `password123` (tenant: tenant-test)
- **Usuario**: `user@test.com` / `password123` (tenant: tenant-test)

#### 1. Ejecutar Migraciones (PRIMERO)
```bash
# Ejecutar todas las migraciones para crear las tablas
docker compose exec api npm run migration:run
```

#### 2. Verificar Tablas Creadas
```bash
# Conectarse a PostgreSQL para verificar
docker compose exec postgres psql -U postgres -d redatlas -c "\dt"

# Deberías ver estas tablas:
# - users (usuarios del sistema)
# - properties (propiedades inmobiliarias)
# - listings (anuncios/listados)
# - transactions (transacciones)
# - refresh_tokens (tokens de autenticación)
```

#### 3. Ejecutar el Seeding (DESPUÉS de las migraciones)
```bash
# Poblar la base de datos con datos de prueba (incluye usuarios admin@test.com y user@test.com)
docker compose exec api npm run seed
```

#### 4. Verificar Datos
```bash
# Verificar que los usuarios de prueba fueron creados
docker compose exec postgres psql -U postgres -d redatlas -c "SELECT email, role, \"tenantId\" FROM users WHERE email LIKE '%test.com';"
```

### 5. Obtener Token de Autenticación
```bash
curl -X POST "http://localhost:3030/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### 6. Exportar Token (copia el access_token de la respuesta anterior)
```bash
export TOKEN="tu_access_token_aqui"
```

### 7. Probar Búsqueda Normal de Propiedades
```bash
curl "http://localhost:3030/v1/properties?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Probar Búsqueda Geoespacial (retorna GeoJSON)
```bash
# Búsqueda por proximidad (Buenos Aires - radio 10km)
curl "http://localhost:3030/v1/properties?lat=-34.6037&lon=-58.3816&radius=10&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### 9. Probar Filtros Avanzados
```bash
# Combinando filtros geoespaciales con filtros de negocio
curl "http://localhost:3030/v1/properties?lat=-34.6037&lon=-58.3816&radius=5&type=house&minPrice=80000&maxPrice=800000&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 10. Testing Completo CSV Import + Idempotencia + UPSERT (Solo Admin)

**Objetivo:** Probar los 3 escenarios críticos con **muestras controladas** para verificación precisa:
1. **INSERT** inicial de propiedades
2. **Idempotencia** - rechazo de archivos duplicados  
3. **UPSERT** - actualización de propiedades específicas con valores conocidos

**🎯 MUESTRAS CONTROLADAS para verificación:**
- `EXT-TEST-001`: Casa Palermo - ANTES: $450,000 → DESPUÉS: $517,500 (+15%)
- `EXT-TEST-002`: Depto Recoleta - ANTES: $380,000 → DESPUÉS: $437,000 (+15%)
- `EXT-TEST-003`: Casa Villa Crespo - ANTES: $320,000 → DESPUÉS: $368,000 (+15%)

#### 10.0. Generar CSV con Herramientas Incluidas

**Importante**: El seeder ahora simula un **sistema maduro en producción** con:
- 8 cargas CSV históricas (2023-2024)
- Propiedades con external_id realistas
- Múltiples listings y transacciones por propiedad
- Relaciones FK establecidas para testing de UPSERT

```bash
# Generar CSV para testing INSERT (nuevas propiedades)
docker compose exec api npm run generate-csv -- --count 100

# Generar CSV para testing UPSERT (actualizar propiedades existentes del seeder)
docker compose exec api npm run generate-csv -- --count 10 --update --use-existing-ids

# Generar CSV masivo para performance testing
docker compose exec api npm run generate-csv -- --count 100000

# Ver todas las opciones disponibles
docker compose exec api npm run generate-csv -- --help
```

#### 10.0.1. Verificar Muestras Controladas (ANTES de cualquier operación)
```bash
# Script de verificación automática de las muestras controladas
./scripts/verify-controlled-samples.sh
```

#### 10.1. Escenario 1: Primera Carga (INSERT) - Preservando relaciones existentes

**Nota**: Ya NO limpiamos la base porque queremos probar en un **sistema maduro con relaciones FK establecidas**.

```bash
# Paso 1: Verificar estado inicial de muestras controladas
./scripts/verify-controlled-samples.sh

# Paso 2: Verificar que hay listings y transacciones relacionadas
docker compose exec postgres psql -U postgres -d redatlas -c "
SELECT 
  (SELECT COUNT(*) FROM properties WHERE tenant_id = 'tenant-test') as properties,
  (SELECT COUNT(*) FROM listings WHERE tenant_id = 'tenant-test') as listings,
  (SELECT COUNT(*) FROM transactions WHERE property_id IN (SELECT id FROM properties WHERE tenant_id = 'tenant-test')) as transactions;
"

# Paso 3: Generar CSV con nuevas propiedades (external_ids únicos)
docker compose exec api npm run generate-csv -- --count 100

# Paso 4: Subir CSV (debe crear 100 propiedades NUEVAS sin afectar existentes)
curl -X POST "http://localhost:3030/v1/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/app/uploads/properties_100_rows.csv"

# Paso 5: Verificar status del import
curl "http://localhost:3030/v1/imports/status/TU_JOB_ID_AQUI" \
  -H "Authorization: Bearer $TOKEN"

# Paso 6: Verificar que las muestras controladas NO cambiaron (deben seguir igual)
./scripts/verify-controlled-samples.sh
```
**Resultado Esperado:** ✅ 100 successful, 0 failed + muestras controladas intactas

#### 10.2. Escenario 2: Idempotencia (RECHAZO de duplicados)
```bash
# Subir EXACTAMENTE el mismo archivo (debe ser rechazado automáticamente)
curl -X POST "http://localhost:3030/v1/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/app/uploads/properties_100_rows.csv"

# Verificar que retorna el mismo jobId sin procesar de nuevo
curl "http://localhost:3030/v1/imports/status/MISMO_JOB_ID_ANTERIOR" \
  -H "Authorization: Bearer $TOKEN"
```
**Resultado Esperado:** ❌ Duplicate job detected - retorna mismo jobId

#### 10.3. Escenario 3: UPSERT (UPDATE de muestras controladas)
```bash
# PASO CRÍTICO: Verificar estado ANTES del UPSERT (valores originales conocidos)
echo "🔍 ESTADO ANTES DEL UPSERT:"
./scripts/verify-controlled-samples.sh

# Generar CSV que actualizará las 3 MUESTRAS CONTROLADAS específicas
docker compose exec api npm run generate-csv -- --count 10 --update --use-existing-ids

# Subir CSV de actualización (UPSERT que preserva relaciones)
curl -X POST "http://localhost:3030/v1/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/app/uploads/update_properties_10_rows.csv"

# Verificar progreso
curl "http://localhost:3030/v1/imports/status/NUEVO_JOB_ID" \
  -H "Authorization: Bearer $TOKEN"

# VERIFICACIÓN CRUCIAL: ¿Cambiaron los valores esperados?
echo "🔍 ESTADO DESPUÉS DEL UPSERT:"
./scripts/verify-controlled-samples.sh

# Verificar específicamente que los precios aumentaron 15%
echo ""
echo "💰 VERIFICACIÓN DE PRECIOS ESPECÍFICOS:"
curl "http://localhost:3030/v1/properties?limit=100" \
  -H "Authorization: Bearer $TOKEN" | \
  jq -r '.data[] | select(.external_id | test("EXT-TEST-00[123]")) | 
  "🏠 \(.external_id): \(.title) - Precio: $\(.price)"'

# Verificar que metadata se actualizó (importHistory debe ser >1)
docker compose exec postgres psql -U postgres -d redatlas -c "
SELECT 
    external_id,
    price,
    metadata->>'importHistory' as import_count,
    metadata->>'csvBatch' as csv_batch,
    updated_at
FROM properties 
WHERE external_id IN ('EXT-TEST-001', 'EXT-TEST-002', 'EXT-TEST-003')
ORDER BY external_id;
"
```
**Resultado Esperado:** 
- ✅ 10 successful (3 UPDATES de muestras controladas + otros)  
- ✅ Precios: $450K→$517.5K, $380K→$437K, $320K→$368K
- ✅ Títulos incluyen "ACTUALIZADO"
- ✅ Relaciones FK preservadas
- ✅ metadata.importHistory incrementado

#### 10.4. Verificación Final del Sistema Maduro
```bash
# Verificar que el sistema maduro mantuvo su integridad tras las operaciones
docker compose exec postgres psql -U postgres -d redatlas -c "
SELECT 
  'Properties' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN tenant_id = 'tenant-test' THEN 1 END) as tenant_test_count
FROM properties
UNION ALL
SELECT 
  'Listings' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN tenant_id = 'tenant-test' THEN 1 END) as tenant_test_count
FROM listings
UNION ALL
SELECT 
  'Transactions' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN property_id IN (SELECT id FROM properties WHERE tenant_id = 'tenant-test') THEN 1 END) as tenant_test_count
FROM transactions;
"

# Ver estadísticas de la cola de importación
curl "http://localhost:3030/v1/imports/queue/stats" \
  -H "Authorization: Bearer $TOKEN"

# Verificar que las propiedades actualizadas mantuvieron sus relaciones
curl "http://localhost:3030/v1/properties?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {external_id, title, price, id}'

# Verificar integridad referencial (no debe haber huérfanos)
docker compose exec postgres psql -U postgres -d redatlas -c "
-- Verificar que no hay listings huérfanos
SELECT COUNT(*) as orphaned_listings 
FROM listings l 
WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.id = l.property_id);
-- Verificar que no hay transacciones huérfanas  
SELECT COUNT(*) as orphaned_transactions
FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.id = t.property_id);
"
```

#### 10.5. Testing Manual Alternativo (CSV pequeño)
```bash
# Crear CSV manual para testing rápido
echo "external_id,title,description,address,sector,type,status,price,area,bedrooms,bathrooms,parkingSpaces,latitude,longitude
EXT-TEST-001,Casa Test,Casa de prueba,Av. Test 1234,Palermo,house,active,300000,120,3,2,1,-34.5875,-58.3974
EXT-TEST-002,Depto Test,Departamento de prueba,Av. Test 5678,Recoleta,apartment,active,250000,85,2,2,1,-34.5913,-58.3965" > test_manual.csv

# Subir CSV manual
curl -X POST "http://localhost:3030/v1/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_manual.csv"

# Crear versión actualizada del CSV manual
echo "external_id,title,description,address,sector,type,status,price,area,bedrooms,bathrooms,parkingSpaces,latitude,longitude
EXT-TEST-001,Casa Test RENOVADA,Casa de prueba ACTUALIZADA,Av. Test 1234,Palermo,house,active,350000,120,3,2,1,-34.5875,-58.3974
EXT-TEST-002,Depto Test PREMIUM,Departamento de prueba MEJORADO,Av. Test 5678,Recoleta,apartment,active,290000,85,2,2,1,-34.5913,-58.3965" > test_manual_updated.csv

# Subir versión actualizada
curl -X POST "http://localhost:3030/v1/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_manual_updated.csv"
```

### 11. Probar Endpoint PUT de Actualización Individual (Solo Admin)
```bash
# Obtener ID de una propiedad para actualizar
curl "http://localhost:3030/v1/properties?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id'

# Exportar ID de la primera propiedad (reemplaza con un ID real)
export PROPERTY_ID="copia_un_id_de_propiedad_aqui"

# Actualizar propiedad individual - cambiar título y precio
curl -X PUT "http://localhost:3030/v1/properties/$PROPERTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Casa Renovada - ACTUALIZADA VIA API",
    "price": 650000,
    "description": "Propiedad actualizada mediante endpoint PUT",
    "status": "active"
  }'

# Actualizar coordenadas de una propiedad
curl -X PUT "http://localhost:3030/v1/properties/$PROPERTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -34.6118,
    "longitude": -58.3960,
    "sector": "Puerto Madero"
  }'

# Verificar que el cache se invalida buscando la propiedad actualizada
curl "http://localhost:3030/v1/properties?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### 12. Ver Estadísticas de Queue (Solo Admin)
```bash
curl "http://localhost:3030/v1/imports/queue/stats" \
  -H "Authorization: Bearer $TOKEN"
```

## Verificar Funcionalidad de Cache
```bash
# Primera llamada (sin cache)
time curl "http://localhost:3030/v1/properties?limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Segunda llamada (con cache - debe ser más rápida)
time curl "http://localhost:3030/v1/properties?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

## Funcionalidades Implementadas

### ✅ Autenticación JWT
- Login con email/password
- Refresh token rotation
- Guards para roles (admin/user)
- Aislamiento por tenant

### ✅ Búsqueda de Propiedades
- Paginación por cursor
- Filtros: precio, área, habitaciones, sector, tipo, status
- Ordenamiento configurable
- Cache con Redis (5 min TTL)

### ✅ Búsqueda Geoespacial
- Filtros: lat, lon, radius (PostGIS)
- Respuesta en formato GeoJSON
- Ordenamiento por proximidad
- Distancias incluidas en respuesta

### ✅ Import CSV Asíncrono
- Upload de archivos hasta 50MB
- Procesamiento en background con cola RabbitMQ
- Idempotencia automática para prevenir duplicados
- UPSERT por external_id para actualizaciones
- Status tracking con jobId
- Streaming para archivos grandes (100k+ filas)
- Solo accesible por usuarios admin

### ✅ Cache Avanzado
- Invalidación automática post-CUD
- Cache warming
- Estadísticas de uso

## URLs Importantes
- **API**: http://localhost:3030
- **Swagger Docs**: http://localhost:3030/docs
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
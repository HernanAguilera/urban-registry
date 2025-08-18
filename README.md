# RED Atlas Backend Challenge – Senior Level

El objetivo es evaluar tus habilidades en arquitectura, rendimiento, seguridad y mantenibilidad, trabajando sobre un caso realista de gestión catastral/inmobiliaria.

## Enfoque Estratégico

Este repositorio sigue un **plan de desarrollo por fases** diseñado para un challenge técnico:

1.  **Entrega Principal (Estimado 3-4 días):** Cubre el 100% de los **Core Requirements** para garantizar una evaluación exitosa y completa.
2.  **Objetivos Adicionales (Stretch Goals):** Mejoras opcionales (la mayoría de los requisitos **Bonus**) a implementar si la entrega principal se completa antes de la fecha límite, con el fin de demostrar capacidades avanzadas.

## 📅 Roadmap de Desarrollo

```
Día 1: 🏗️ Foundation & Setup  →  Día 2: 🔐 Auth & Search  →  Día 3: ⚡ Performance  →  Día 4: ✅ Quality & Delivery
```

**Progreso de Core Requirements:**
- **Día 1**: Infraestructura + Modelado + Dataset (25%)
- **Día 2**: Autenticación + Búsquedas + Cache L1 (60%) 
- **Día 3**: PostGIS + Cache L2 + CSV Async (90%)
- **Día 4**: Testing + SLOs + Documentación (100%)

[Descripción del Challenge](docs/challenge-description.md)

[Plan de Solución Detallado (por Fases)](docs/plan-of-solution.md)

---

### Notas Importantes

-   **Fecha límite de entrega:** jueves 21 de agosto.
-   **Ejecución:** Debe poder ejecutarse localmente con Docker Compose.
-   **Deploy:** El despliegue público no es obligatorio.

## 🧪 Plan de Validación

**Métricas de Éxito Automatizadas:**
- **Performance SLOs**: `autocannon -c 200 -d 60s` → p95 ≤800ms sin cache, ≤300ms con cache
- **Test Coverage**: `npm run test:cov` → objetivo >80% coverage
- **Setup Validation**: `docker-compose up` → stack completo funcionando en <5min
- **API Documentation**: Swagger UI disponible en `/docs` con 100% endpoints documentados

## 🚀 Instalación y Ejecución

**Requisitos previos:**
- Docker y Docker Compose instalados
- Git

**Setup completo desde cero:**
```bash
git clone <repo> && cd redatlas-backend
docker compose up -d

# Esperar a que todos los servicios estén listos, luego:
docker compose exec api npm run migration:run
docker compose exec api npm run seed
```

**Comandos de Validación:**
```bash
# Ejecutar tests (dentro del contenedor)
docker compose exec api pnpm run test:cov

# Validación de SLOs de performance
docker compose exec api pnpm run test:load

# Ver logs en tiempo real
docker compose logs -f api

# Acceder al contenedor para debugging
docker compose exec api bash
```

**URLs importantes:**
- **API**: http://localhost:3030
- **Swagger Docs**: http://localhost:3030/docs
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

## 📦 Estrategia de Invalidación de Cache

### Política de Cache
- **Llaves compuestas**: Cada consulta genera una key basada en parámetros serializados (JSON hasheado)
- **TTL**: Sin expiración automática, invalidación manual por eventos
- **Patrón**: `properties:{hash_de_parametros}`

### Invalidación Automática
El sistema invalida automáticamente el cache en las siguientes operaciones:

**Operaciones que invalidan**:
- `DELETE /properties/:id` - Elimina todo cache `properties:*`
- `POST /imports` - Elimina cache después de procesar CSV
- Futuras operaciones CUD (CREATE, UPDATE)

**Implementación**:
- Interceptor global `CacheInvalidationInterceptor`
- Decorador `@CacheInvalidate` en controladores
- Patrón de invalidación: `properties:*` (todos los cache de propiedades)

**Justificación**:
- **Consistencia**: Evita datos stale entre cache y DB
- **Simplicidad**: Fácil mantenimiento vs. invalidación granular
- **Performance**: Cache se recrea solo cuando es necesario

### Monitoreo de Cache
```bash
# Ver cache actual
docker compose exec redis redis-cli KEYS "properties:*"

# Limpiar cache manualmente
docker compose exec redis redis-cli FLUSHDB
```

## 🧪 Testing Manual

Para probar todas las funcionalidades implementadas, consulta la **[Guía de Testing Manual](docs/testing-manual.md)** que incluye:

- ✅ Credenciales de prueba (admin@test.com / user@test.com)
- ✅ Setup inicial de base de datos (migraciones → seeding)
- ✅ Comandos curl para todas las funcionalidades
- ✅ Verificación de cache, búsqueda geoespacial e import CSV

---

## 🔧 Decisiones Técnicas

### Arquitectura Docker-First

**Enfoque:** Todo el desarrollo y ejecución se realiza dentro de contenedores Docker para garantizar:

- **Consistencia de entorno**: Mismas versiones de Node.js, PostgreSQL, Redis entre desarrolladores
- **Aislamiento de dependencias**: No conflictos con versiones locales instaladas
- **Reproducibilidad**: El entorno de desarrollo es idéntico al de producción
- **Setup simplificado**: Un solo comando `docker compose up -d` para levantar todo el stack

**Importante:** Todos los comandos de desarrollo (`pnpm`, `npm`, tests, migraciones) deben ejecutarse dentro del contenedor usando `docker compose exec api <comando>`.

### Package Manager: pnpm

**Justificación:** Seleccionado sobre npm por ventajas técnicas:

- **Performance**: ~2x más rápido en instalaciones
- **Eficiencia de espacio**: Symlinks evitan duplicación (reducción ~70% disco)
- **Strict dependency resolution**: Previene phantom dependencies
- **Deterministic installs**: Garantiza reproducibilidad entre entornos
- **Monorepo ready**: Soporte nativo para workspaces

### CSV Import con External ID para UPSERT

**Problema identificado:** Los datos scraped de sitios inmobiliarios contienen direcciones susceptibles a errores de tipeo y inconsistencias de formato, haciendo que la dirección no sea un identificador único confiable.

**Solución implementada:** Campo `external_id` en el modelo Property para operaciones UPSERT confiables.

**Justificación técnica:**
- **Confiabilidad**: external_id generado por el sistema ETL es consistente
- **UPSERT seguro**: Permite actualizar propiedades existentes sin crear duplicados
- **Trazabilidad**: Mantiene referencia al origen del dato en el sistema fuente
- **Escalabilidad**: Facilita sincronización con múltiples fuentes de datos

**Implementación:**
- Campo `external_id` nullable en Property entity (para compatibilidad con datos existentes)
- Validación obligatoria en CSV import (external_id requerido)
- Lógica UPSERT: INSERT si no existe, UPDATE si ya existe por external_id + tenantId
- Documentación actualizada con nuevo formato CSV incluyendo external_id

---

Cuando lo tengas listo, por favor responde al correo con:
1.  Link a tu repositorio (público o privado con acceso para nosotros).
2.  Instrucciones claras de instalación y ejecución (incluidas en este README).

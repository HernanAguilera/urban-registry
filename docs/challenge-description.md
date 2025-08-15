# Backend Challenge – Senior Level

> **Objetivo**: Evaluar la capacidad de un perfil **Senior Backend** para diseñar, implementar y mantener una API robusta, escalable y segura para gestión catastral/inmobiliaria.  
> El challenge busca validar arquitectura, rendimiento, seguridad, mantenibilidad y criterio técnico.

---

## 📌 Alcance y expectativas

- El **Bonus** es opcional, solo para destacar.  
- La solución debe funcionar **localmente con Docker Compose** (API, DB, cache, queue).  
- **No es obligatorio** el deploy en free tier, pero si lo hacés, linkealo en el README como extra.

---

## 🧩 Stack requerido

- **Node.js + TypeScript** — Framework a elección (**Express** o **NestJS**, justificar).
- **PostgreSQL 14+ con PostGIS**.
- **TypeORM** con migraciones `up`/`down`.
- **Redis** (cache + locks).
- **Cola**: RabbitMQ o SQS (simulable localmente).
- **JWT + Refresh tokens** (rotación).
- **Tests**: Jest + SuperTest.
- **Docker Compose** para levantar todo.

---

## **Core Requirements** ✅

### 1) Modelado y CRUD avanzado
- Entidades: **Propiedades**, **Anuncios**, **Transacciones** (1:N / N:M).
- **Soft delete** + restauración.
- Validaciones sólidas y errores normalizados (RFC 7807 o similar).
- Multi-tenant con `tenant_id` en entidades y queries.

### 2) Dataset inicial
- **100,000 propiedades**, **200,000 anuncios**, **150,000 transacciones**.  
- Sectores, tipos y coordenadas simuladas realistas.  
- Script idempotente de seed (TS/SQL).  
- Documentar cómo escalar a 1M+ registros y plan de índices/particionamiento.

### 3) Performance (SLOs core)
**Condiciones de prueba**: dataset provisto, máquina local, sin CDN, carga sostenida 60 seg con `autocannon` o similar.
- `GET /v1/properties?...` **p95 ≤ 800 ms** sin cache.
- `GET /v1/properties?...` **p95 ≤ 300 ms** con cache.
- ≤ **1% error rate** bajo 200 conexiones concurrentes.

### 4) Búsquedas y optimización
- Filtros combinados (sector, tipo, precio, fecha, búsqueda simple por dirección).
- **Paginación por cursor**.
- **Sorting** con lista blanca de campos.
- **Cache Redis** con llave compuesta y política de invalidación documentada.

### 5) Autenticación y autorización
- JWT con refresh rotation (invalidación de tokens comprometidos).
- Roles `user` / `admin`; enforcement de `tenant_id` en autorización.

### 6) Geoespacial (PostGIS)
- Filtro por radio desde punto.
- Orden por proximidad (`<->`).
- Respuesta en formato **GeoJSON**.

### 7) Procesamiento asíncrono
- `POST /v1/imports` para subir CSV de ≥ 100k filas (streaming).
- Pipeline: parse → validar → upsert batch → calcular `valuation`.
- Idempotency-Key por import.

---

## **Bonus Requirements** ⭐

- **DLQ + backoff/reintentos** para jobs fallidos.
- Observabilidad avanzada:
  - Logs JSON.
  - `/metrics` (Prometheus) + trazas (OpenTelemetry).
  - `Correlation-ID` por request.
- Auditoría de cambios críticos (quién, cuándo, qué).
- Analytics:
  - Distribución por sector/tipo.
  - Evolución mensual p50/p90.
  - Sectores con mayor valorización YoY.
- ADRs breves para framework, paginación, cache, índices.
- Diagramas C4 nivel 2 + sequence del import.
- Deploy público (Render/Railway/Fly.io/Neon o similar).

---

## 📂 Entregables

- Código + `docker-compose.yml` (API, Postgres, Redis, queue).
- **OpenAPI/Swagger** en `/docs`.
- Tests con cobertura ≥ 80%.
- README con:
  - Setup local y variables env.
  - Comandos de migración y seed.
  - Estrategia de invalidación de cache.
  - Cómo validar performance (incluyendo métricas obtenidas).
  - Checklist OWASP aplicado.

---

## 📊 Rúbrica de evaluación

Cada ítem se puntúa 0–3 (0: ausente, 1: básico, 2: correcto, 3: excelente).  
**Aprobación Senior**: ≥ 18/24 y sin rojos en **Seguridad** ni **Rendimiento**.

| Criterio                          | Puntos |
| --------------------------------- | ------ |
| **Arquitectura & Documentación**  | 0–3    |
| **Modelo de datos & SQL/índices** | 0–3    |
| **Rendimiento & Cache (SLOs)**    | 0–3    |
| **Concurrencia & Idempotencia**   | 0–3    |
| **Seguridad & Multi-tenant**      | 0–3    |
| **Calidad de código & Tests**     | 0–3    |
| **DX (Swagger, scripts, setup)**  | 0–3    |
| **Bonus entregados**              | 0–3    |

---

## 📌 Notas finales
- Se prioriza código claro, mantenible y documentado sobre “features extra” incompletas.
- Valoramos decisiones explícitas y trade-offs razonados en el README.
- **Core** completo y funcionando con Docker = Challenge evaluable.  
- **Bonus** eleva la puntuación y permite destacarse.

# Fase 2: Objetivos Adicionales (Stretch Goals)

**Meta:** Si la Fase 1 (Core Requirements) se completa con tiempo de sobra, abordar estas funcionalidades de la sección **Bonus** para demostrar un dominio excepcional y proactividad.

Cada una de estas mejoras puede ser tratada como un mini-proyecto independiente.

---

### Mejora 1: Observabilidad de Nivel Enterprise

**Objetivo:** Instrumentar la aplicación para tener una visibilidad profunda de su comportamiento, similar a un sistema en producción.

| Tarea | Descripción |
|---|---|
| **SG.1.1** | **Logs Estructurados (JSON):** Configurar un logger (como Pino) para que todos los logs de la aplicación se emitan en formato JSON, incluyendo un `correlationId`. |
| **SG.1.2** | **Métricas con Prometheus:** Exponer un endpoint `/metrics` que siga el estándar de Prometheus, incluyendo métricas de latencia de peticiones HTTP, tasa de errores y contadores para eventos de negocio. |
| **SG.1.3** | **Tracing con OpenTelemetry:** Implementar tracing distribuido básico para seguir el ciclo de vida de una petición a través del gateway, el servicio y la base de datos. |

**Notas Técnicas de `optimization-opportunities`:**
- Para las métricas, considerar la creación de métricas de negocio específicas como `redatlas_properties_per_tenant` o un histograma para `redatlas_transaction_value`.
- Para la observabilidad, se puede añadir un endpoint de health check profundo (`/health/deep`) que verifique la latencia de la base de datos y la cola de mensajes.

---

### Mejora 2: Resiliencia y Auditoría

**Objetivo:** Aumentar la robustez del sistema ante fallos y registrar un rastro de las operaciones críticas.

| Tarea | Descripción |
|---|---|
| **SG.2.1** | **Dead Letter Queue (DLQ):** Para la importación de CSV, configurar una DLQ en la cola de mensajes para capturar trabajos que fallen repetidamente y poder analizarlos manualmente. |
| **SG.2.2** | **Estrategia de Reintentos (Backoff):** Implementar una lógica de reintentos con `exponential backoff` para el worker que procesa los CSV. |
| **SG.2.3** | **Sistema de Auditoría:** Implementar un `subscriber` de TypeORM que escuche los eventos de `UPDATE` y `DELETE` en entidades críticas (como `Property`) y guarde un registro en una tabla `audit_logs`. |

**Notas Técnicas de `optimization-opportunities`:**
- El `audit_log` podría enriquecerse para incluir contexto de la petición (IP, User-Agent) y del negocio (entidades afectadas, reglas de negocio aplicadas).

---

### Mejora 3: Documentación y Optimización Técnica

**Objetivo:** Documentar las decisiones de diseño clave y aplicar optimizaciones técnicas específicas para demostrar un dominio profundo del stack.

| Tarea | Descripción |
|---|---|
| **SG.3.1** | **ADRs (Architecture Decision Records):** Escribir 2-3 ADRs para las decisiones más importantes (ej. la elección de la arquitectura híbrida, la estrategia de paginación por cursor). |
| **SG.3.2** | **Diagrama C4:** Crear un diagrama de Contenedores (Nivel 2) que ilustre la arquitectura del sistema. |
| **SG.3.3** | **Optimización de Seeding:** Mejorar el script de seeding para que se ejecute de forma más rápida, por ejemplo, usando workers paralelos para procesar los datos en chunks. |
| **SG.3.4** | **Optimización de Índices:** Analizar las queries más comunes con `EXPLAIN ANALYZE` y proponer/crear índices especializados (parciales, GIST optimizados) para mejorar la performance. |

---

## Anexo: Posibles Mejoras Futuras (Fuera de Scope para el Challenge)

*Esta sección contiene ideas avanzadas del documento original `optimization-opportunities.md` que se consideran fuera del alcance para esta prueba técnica, pero que demuestran una visión a largo plazo del producto.*

- **Caching Multi-Nivel:** Implementar una jerarquía de caché (In-memory L1, Redis L2) para optimizar aún más la latencia.
- **Analytics Avanzados:** Desarrollar endpoints con análisis de series temporales o un dashboard en tiempo real con WebSockets.
- **Seguridad Proactiva:** Añadir una capa de detección de intrusiones (IDS) que monitorice patrones de peticiones anómalas.
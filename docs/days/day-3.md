# Día 3: Performance y Lógica Asíncrona

**Meta del Día:** Enfocarse en los requisitos de performance más exigentes, implementando la búsqueda geoespacial, una estrategia de caché avanzada y el procesamiento asíncrono de archivos masivos.

---

### Checklist de Tareas

| Tarea | Descripción | Horas Estimadas | Challenge Requirement Cubierto |
|---|---|---|---|
| **3.1** | **Búsqueda Geoespacial:** Implementar el filtro por radio y ordenamiento por proximidad usando PostGIS. La respuesta debe ser en formato GeoJSON. | 2.5h | Geoespacial (PostGIS) |
| **3.2** | **Estrategia de Caché Avanzada:** Implementar o refinar la estrategia de caché con Redis, asegurando una política de invalidación eficiente. | 2.5h | Performance y Cache |
| **3.3** | **Importación Asíncrona de CSV:** Crear el endpoint `POST /imports` que use una cola (RabbitMQ/Bull) para procesar en segundo plano un CSV de +100k filas con streaming y `Idempotency-Key`. | 3h | Procesamiento Asíncrono |

### Criterios de Aceptación

- El endpoint `GET /properties` acepta filtros de `lat`, `lon` y `radius` y funciona correctamente.
- Las respuestas cacheadas del endpoint de búsqueda se invalidan tras una operación CUD en una propiedad.
- Subir un CSV grande responde inmediatamente con `202 Accepted` y el trabajo se procesa en segundo plano.
- La idempotencia previene importaciones duplicadas.

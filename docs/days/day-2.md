# Día 2: Autenticación y Búsquedas

**Meta del Día:** Implementar un sistema de autenticación robusto y la lógica de negocio para búsquedas avanzadas, sentando las bases de la interacción principal del usuario con la plataforma.

---

### Checklist de Tareas

| Tarea | Descripción | Horas Estimadas | Challenge Requirement Cubierto |
|---|---|---|---|
| **2.1** | **Autenticación JWT:** Implementar el flujo completo de autenticación con `email/password`, incluyendo JWT y **Refresh Token Rotation**. | 3h | Autenticación y Autorización |
| **2.2** | **Autorización y Multi-Tenancy:** Crear guards para la validación de roles (`user`/`admin`) y para el aislamiento estricto de datos por `tenant_id`. | 2h | Seguridad y Multi-tenant |
| **2.3** | **Búsquedas Avanzadas:** Implementar filtros combinados (sector, tipo, precio), ordenamiento y **paginación por cursor** en el endpoint de propiedades. | 2.5h | Búsquedas y Optimización |
| **2.4** | **Cache L1 (Opcional):** Implementar una primera capa de caché con Redis para el endpoint de búsquedas si el tiempo lo permite. | 0.5h | Performance y Cache |

### Criterios de Aceptación

- El endpoint de `login` retorna un `accessToken` y `refreshToken` válidos.
- Las rutas protegidas son inaccesibles sin un token válido.
- Un usuario solo puede ver y modificar los datos de su propio `tenant_id`.
- El endpoint `GET /properties` funciona con filtros, ordenamiento y paginación por cursor.

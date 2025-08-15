# Día 1: Fundación y Entidades

**Meta del Día:** Establecer el 100% de la infraestructura del proyecto y definir el modelo de datos principal, incluyendo las entidades y el CRUD básico. Al final del día, el proyecto debe ser completamente funcional en un entorno local y listo para la lógica de negocio.

---

### Checklist de Tareas

| Tarea | Descripción | Horas Estimadas | Challenge Requirement Cubierto |
|---|---|---|---|
| **1.1** | **Setup del Proyecto Base:** Inicializar NestJS, configurar TypeORM, y estructurar los directorios (`core`, `modules`, `infrastructure`, `shared`). | 2h | Arquitectura y Documentación |
| **1.2** | **Infraestructura Docker:** Crear y configurar el `docker-compose.yml` para levantar la API, PostgreSQL (con PostGIS) y Redis. | 2h | DX (Setup) |
| **1.3** | **Modelo y Esquema de Datos:** Definir las entidades `Property`, `Listing`, `Transaction` y `User` con sus relaciones y columnas, incluyendo `soft-delete` y `tenant_id`. | 3h | Modelado y CRUD Avanzado |
| **1.4** | **Migraciones y Seeding:** Crear la migración inicial de la base de datos y un script para popularla con el dataset de prueba (100k+ registros). *Nota: Usar datos sintéticos generados programáticamente + batch inserts paralelos para lograr 100k+ en <1h.* | 1h | Dataset Inicial |

### Criterios de Aceptación

- `docker-compose up` levanta todo el stack sin errores.
- La base de datos se crea y la migración se aplica correctamente.
- El script de seeding funciona y puebla la base de datos.
- La estructura de directorios sigue la `architectural-guidelines.md`.

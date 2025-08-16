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

---

Cuando lo tengas listo, por favor responde al correo con:
1.  Link a tu repositorio (público o privado con acceso para nosotros).
2.  Instrucciones claras de instalación y ejecución (incluidas en este README).

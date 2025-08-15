# Día 4: Calidad, Pruebas y Entrega

**Meta del Día:** Asegurar la calidad y robustez de la solución a través de pruebas exhaustivas, validación de performance y la finalización de la documentación, dejando el proyecto listo para la entrega.

---

### Checklist de Tareas

| Tarea | Descripción | Horas Estimadas | Challenge Requirement Cubierto |
|---|---|---|---|
| **4.1** | **Pruebas Unitarias y de Integración:** Escribir y refinar los tests para alcanzar una cobertura de código superior al 80%. | 3h | Calidad de Código y Tests |
| **4.2** | **Validación de Performance (SLOs):** Ejecutar pruebas de carga con `autocannon` para verificar y documentar el cumplimiento de los SLOs (p95 ≤ 800ms sin caché, p95 ≤ 300ms con caché). | 2h | Performance (SLOs) |
| **4.3** | **Documentación Final:** Completar el `README.md` con instrucciones detalladas y asegurar que la documentación de la API en `/docs` (Swagger/OpenAPI) esté completa y sea clara. | 2h | DX (Documentación) |
| **4.4** | **Revisión Final y Pulido:** Realizar una revisión completa del código, verificar que se cumplan todos los requisitos del challenge y empaquetar el proyecto para la entrega. | 1h | Todos |

### Criterios de Aceptación

- `npm run test:cov` muestra una cobertura > 80%.
- Los resultados de las pruebas de carga demuestran el cumplimiento de los SLOs.
- El `README.md` contiene toda la información necesaria para que un evaluador clone, instale y ejecute el proyecto en menos de 5 minutos.
- Todos los puntos del checklist de entregables del challenge están cubiertos.

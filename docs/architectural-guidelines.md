# Guía de Arquitectura Pragmática - RedAtlas (Versión Enterprise)

Este documento es la guía definitiva para la arquitectura del proyecto RedAtlas. Nuestro enfoque es una **solución híbrida y pragmática** que combina la robustez de la **Arquitectura Limpia (Clean Architecture)** con la estructura modular y la excelente experiencia de desarrollador del framework **NestJS**.

## 1. Filosofía: Lo Mejor de Ambos Mundos

-   **De NestJS, tomamos:** La organización por **módulos de funcionalidad (feature modules)**. Esto mantiene el código relacionado (propiedades, autenticación, etc.) cohesionado y fácil de localizar.
-   **De la Arquitectura Limpia, tomamos:** La **Regla de la Dependencia** y la separación estricta de nuestro **núcleo de negocio (core/domain)** de las preocupaciones externas.

## 2. Estructura de Directorios Híbrida

Esta es la estructura oficial del proyecto, diseñada para ser compatible con NestJS y escalable:

```
src/
├── modules/              # Módulos por funcionalidad (Estilo NestJS)
│   ├── properties/       # Ejemplo: Módulo de Propiedades
│   │   ├── properties.controller.ts
│   │   ├── properties.service.ts
│   │   ├── properties.module.ts
│   │   └── dto/
│   └── auth/             # Módulo de Autenticación
│       ├── guards/
│       ├── strategies/
│       └── decorators/
├── core/                 # El Dominio puro (Clean Architecture)
│   ├── entities/
│   ├── interfaces/       # Interfaces (puertos) para repositorios, caché, etc.
│   ├── value-objects/
│   └── events/
├── infrastructure/       # Implementaciones de concerns externos
│   ├── database/
│   │   ├── repositories/ # Implementaciones de Repositorios con TypeORM
│   │   └── schemas/      # Esquemas de TypeORM si se separan de la entidad
│   ├── security/         # Servicios de JWT, Encriptación
│   ├── cache/            # Implementación de cliente de Caché (Redis)
│   └── resilience/       # Implementación de Circuit Breaker
└── shared/               # Lógica transversal (sin lógica de negocio)
    ├── decorators/
    ├── guards/
    ├── filters/
    └── pipes/
```

## 3. El Flujo de la Inversión de Dependencias

El `PropertiesService` (en `modules`) depende de la interfaz `IPropertyRepository` (en `core`). La clase `PropertyRepository` (en `infrastructure`) implementa esa interfaz. En el `PropertiesModule` le decimos a NestJS cómo resolver esta dependencia, "inyectando" la clase concreta cuando se solicita la interfaz. Esto es el corazón de nuestra arquitectura desacoplada.

## 4. Patrones de Nivel Enterprise

### 4.1. Seguridad

La seguridad se integra en todas las capas de forma coherente:

-   **Core:** Define los contratos de seguridad. (`core/interfaces/auth.interface.ts`)
-   **Infrastructure:** Implementa la lógica de seguridad (JWT, encriptación) y los guards de bajo nivel como el aislamiento de tenants. (`infrastructure/security/`, `infrastructure/guards/`)
-   **Modules:** Utiliza los guards y decoradores en los controladores para aplicar las políticas de seguridad.

**Ejemplo de Contrato de Seguridad en el Core:**
```typescript
// core/interfaces/auth.interface.ts
export interface IAuthService {
  validateUser(token: string): Promise<User | null>;
  hasPermission(user: User, resource: string, action: string): boolean;
}
```

**Ejemplo de Aplicación en el Controlador:**
```typescript
// modules/properties/properties.controller.ts
@Controller('properties')
@UseGuards(JwtAuthGuard, TenantIsolationGuard) // Adaptadores de Infrastructure
export class PropertiesController {
  @Get()
  @RequirePermission('properties:read') // Regla de dominio vía decorador
  async findAll(@CurrentUser() user: User) {
    // El TenantIsolationGuard ya ha asegurado que las operaciones
    // estarán aisladas al tenant del usuario.
    return this.propertiesService.findAll(user.tenantId);
  }
}
```

### 4.2. Performance y Resiliencia

-   **Caching:** Se define una interfaz `ICacheService` en el `core`. La implementación con Redis (`RedisCacheService`) vive en `infrastructure/cache`. Se aplica de forma declarativa usando un `CacheInterceptor` en `shared/interceptors`.
-   **Circuit Breaker:** Se define una interfaz `ICircuitBreaker` en el `core`. La implementación (usando librerías como `opossum`) vive en `infrastructure/resilience`. El servicio de aplicación lo utiliza para proteger llamadas a repositorios o servicios externos.

**Ejemplo de Contrato de Caché en el Core:**
```typescript
// core/interfaces/cache.interface.ts
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidateByTags(tags: string[]): Promise<void>;
}
```

**Ejemplo de Uso en un Servicio:**
```typescript
// modules/properties/properties.service.ts
async create(dto: CreateDto, tenantId: string): Promise<Property> {
  const property = await this.circuitBreaker.execute(
    'properties.create',
    () => this.repository.save({ ...dto, tenantId })
  );

  // Invalidación inteligente de caché por tags
  await this.cacheService.invalidateByTags([
    `properties:tenant:${tenantId}`,
    `properties:sector:${property.sector}`,
  ]);

  return property;
}
```

## 5. Ejemplo Completo End-to-End: Propiedades

Esta sección muestra la implementación completa de una funcionalidad, sirviendo como plantilla para el resto del proyecto.

### 5.1. Capa Core (Dominio Puro)

```typescript
// core/entities/property.entity.ts
export class Property { /* ... Lógica de negocio pura ... */ }

// core/value-objects/coordinates.vo.ts
export class Coordinates { /* ... Validación y lógica ... */ }

// core/interfaces/property.repository.interface.ts
export interface IPropertyRepository {
  findById(id: string, tenantId: string): Promise<Property | null>;
  findByTenant(tenantId: string, filters: any): Promise<any>;
  save(property: Partial<Property>): Promise<Property>;
}
```

### 5.2. Capa Infrastructure (Implementación Concreta)

```typescript
// infrastructure/database/repositories/property.repository.ts
@Injectable()
export class PropertyRepository implements IPropertyRepository {
  constructor(
    @InjectRepository(Property) // Schema de TypeORM
    private readonly ormRepository: Repository<Property>,
  ) {}

  async findById(id: string, tenantId: string): Promise<Property | null> {
    return this.ormRepository.findOne({ where: { id, tenant_id: tenantId } });
  }
  // ... Implementación de otros métodos con TypeORM y SQL optimizado
}
```

### 5.3. Capa Application (Orquestación del Caso de Uso)

```typescript
// modules/properties/dto/create-property.dto.ts
export class CreatePropertyDto { /* ... con decoradores de class-validator ... */ }

// modules/properties/properties.service.ts
@Injectable()
export class PropertiesService {
  constructor(
    @Inject('IPropertyRepository') private readonly repository: IPropertyRepository,
    @Inject('ICacheService') private readonly cacheService: ICacheService,
    @Inject('ICircuitBreaker') private readonly circuitBreaker: ICircuitBreaker
  ) {}

  async findAll(tenantId: string, filters: any) {
    const cacheKey = `properties:list:tenant:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const result = await this.circuitBreaker.execute(
      'properties.findAll',
      () => this.repository.findByTenant(tenantId, filters)
    );

    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }
  // ... otros casos de uso
}
```

### 5.4. Capa Web y Módulo (Punto de Entrada y Cableado)

```typescript
// modules/properties/properties.controller.ts
@Controller('properties')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() filters: any) {
    return this.propertiesService.findAll(user.tenantId, filters);
  }
}

// modules/properties/properties.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Property])],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    { provide: 'IPropertyRepository', useClass: PropertyRepository },
    { provide: 'ICacheService', useClass: RedisCacheService },
    { provide: 'ICircuitBreaker', useClass: CircuitBreakerService },
  ],
})
export class PropertiesModule {}
```

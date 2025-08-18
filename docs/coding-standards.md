# Coding Standards

## Convenciones de Naming

### Propiedades y Variables
- **snake_case** para todas las propiedades y variables
- Ejemplo: `external_id`, `tenant_id`, `created_at`, `user_name`

### Métodos y Funciones
- **camelCase** para nombres de métodos y funciones
- Ejemplo: `findProperty()`, `createUser()`, `validateInput()`

### Clases
- **PascalCase** para nombres de clases
- Ejemplo: `Property`, `User`, `ImportService`

## Aplicación en Base de Datos

### Entidades TypeORM
- Propiedades de clase: snake_case
- Nombres de columnas: snake_case
- Nombres de tablas: snake_case (plural)

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column()
  email_address: string;

  @Column({ name: 'tenant_id' })
  tenant_id: string;
}
```

### APIs y DTOs
- Propiedades JSON: snake_case
- Parámetros de query: snake_case
- Headers: snake_case

```typescript
export class CreateUserDto {
  first_name: string;
  email_address: string;
  tenant_id: string;
}
```

## Consistencia Obligatoria

Todas las propiedades deben seguir snake_case consistentemente en:
- Entidades de base de datos
- DTOs de API
- Respuestas JSON
- Parámetros de query
- Variables locales
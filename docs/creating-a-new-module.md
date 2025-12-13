# Creating a New Module

This guide explains how to create a new module following our **Clean Architecture** + **CQRS** + **Hexagonal Architecture** patterns.

## Using Hygen Generator

We provide a hygen generator that scaffolds a complete module structure following our architecture:

### Prerequisites

Hygen is already included as a dev dependency in the project. If you need to install dependencies, run:

```bash
bun install
```

### Generate a New Module

Run the following command:

```bash
bun run generate:module
```

You will be prompted for:

- **Module name (singular)**: e.g., `Product`, `Order`, `Category`
- **Plural name (optional)**: e.g., `Products`, `Orders`, `Categories` (auto-pluralized if empty)

### Example

```bash
$ bun run generate:module
✔ What is the module name (singular)? · Product
✔ What is the plural name? (optional) · Products
```

This will generate:

```
src/product/
├── application/
│   ├── commands/
│   │   ├── create-product.command.ts
│   │   ├── update-product.command.ts
│   │   └── delete-product.command.ts
│   ├── queries/
│   │   ├── get-product.query.ts
│   │   └── get-products.query.ts
│   ├── handlers/
│   │   ├── create-product.handler.ts
│   │   ├── update-product.handler.ts
│   │   ├── delete-product.handler.ts
│   │   ├── get-product.handler.ts
│   │   └── get-products.handler.ts
│   └── ports/
│       ├── product.repository.port.ts
│       └── product.repository.port.token.ts
├── domain/
│   └── product.ts
├── infrastructure/
│   └── persistence/
│       ├── entities/
│       │   └── product.entity.ts
│       ├── mappers/
│       │   └── product.mapper.ts
│       ├── repositories/
│       │   └── product.repository.ts
│       └── product-persistence.module.ts
├── presentation/
│   └── http/
│       ├── controllers/
│       │   └── product.controller.ts
│       └── dtos/
│           ├── create-product.dto.ts
│           ├── update-product.dto.ts
│           └── query-product.dto.ts
├── product.module.ts
└── README.md
```

## Post-Generation Steps

After generating the module, follow these steps to complete the setup:

### 1. Customize the Domain Entity

Edit `src/[module]/domain/[module].ts` to add your business properties:

```typescript
export class Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

### 2. Update the TypeORM Entity

Edit `src/[module]/infrastructure/persistence/entities/[module].entity.ts`:

```typescript
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { generateUuidV7 } from '@/utils/uuid-v7';

@Entity('product')
export class ProductEntity extends EntityHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateUuidV7();
    }
  }

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
```

### 3. Update the Mapper

Edit `src/[module]/infrastructure/persistence/mappers/[module].mapper.ts`:

```typescript
export class ProductMapper {
  static toDomain(raw: ProductEntity): Product {
    const domainEntity = new Product();
    domainEntity.id = raw.id;
    domainEntity.name = raw.name;
    domainEntity.description = raw.description;
    domainEntity.price = Number(raw.price);
    domainEntity.stock = raw.stock;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Product): ProductEntity {
    const persistenceEntity = new ProductEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.description = domainEntity.description;
    persistenceEntity.price = domainEntity.price;
    persistenceEntity.stock = domainEntity.stock;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt;
    return persistenceEntity;
  }
}
```

### 4. Update DTOs

Edit DTOs in `src/[module]/presentation/http/dtos/`:

**create-product.dto.ts:**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Latest iPhone model', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stock: number;
}
```

### 5. Update Filter Options (if needed)

Edit `src/[module]/application/ports/[module].repository.port.ts`:

```typescript
export interface FilterProductDto {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}
```

### 6. Update Handlers

The generated handlers contain placeholder logic. Update them with your business logic:

**create-product.handler.ts:**

```typescript
async execute(command: CreateProductCommand): Promise<Product> {
  const { payload } = command;

  // Add business validation here
  if (payload.price < 0) {
    throw new BadRequestException('Price cannot be negative');
  }

  return this.productRepository.create({
    name: payload.name,
    description: payload.description ?? null,
    price: payload.price,
    stock: payload.stock,
  } as any);
}
```

### 7. Create Migration

Generate a migration for your new entity:

```bash
bun run migration:generate src/database/migrations/CreateProduct
```

Review and edit the migration, then run:

```bash
bun run migration:run
```

### 8. Register in App Module

Add your module to `src/app.module.ts`:

```typescript
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    // ... other modules
    ProductModule,
  ],
})
export class AppModule {}
```

### 9. Test Your Endpoints

Your module will now have these endpoints:

- `POST /v1/products` - Create product
- `GET /v1/products` - List products (with pagination)
- `GET /v1/products/:id` - Get product by ID
- `PATCH /v1/products/:id` - Update product
- `DELETE /v1/products/:id` - Delete product (soft delete)

## Architecture Principles

### Layer Responsibilities

**Domain Layer** (`domain/`)

- Pure business entities
- No dependencies on other layers
- Business logic and rules

**Application Layer** (`application/`)

- Commands & Queries (CQRS)
- Handlers (use cases)
- Ports (interfaces) - defines what we need from infrastructure
- Contains business workflows

**Infrastructure Layer** (`infrastructure/`)

- Adapters implementing ports
- Database access (TypeORM repositories)
- External services
- Technical implementations

**Presentation Layer** (`presentation/`)

- HTTP controllers
- DTOs (Data Transfer Objects)
- Request/Response handling
- API documentation

### Key Patterns

**CQRS (Command Query Responsibility Segregation)**

- **Commands**: Write operations (Create, Update, Delete)
- **Queries**: Read operations (Get, List)
- Handlers implement the business logic
- Controllers dispatch commands/queries via buses

**Hexagonal Architecture (Ports & Adapters)**

- **Ports**: Interfaces defined in application layer
- **Adapters**: Implementations in infrastructure layer
- **DI Tokens**: Symbol tokens for dependency injection
- Enables easy testing and swapping implementations

**Dependency Injection**

```typescript
// Define port interface
export interface ProductRepositoryPort {
  create(data: CreateProductData): Promise<Product>;
}

// Create DI token
export const PRODUCT_REPOSITORY_PORT = Symbol('ProductRepositoryPort');

// Provide in module
{
  provide: PRODUCT_REPOSITORY_PORT,
  useExisting: TypeOrmProductRepository,
}

// Inject in handler
constructor(
  @Inject(PRODUCT_REPOSITORY_PORT)
  private readonly productRepository: ProductRepositoryPort,
) {}
```

## Best Practices

1. **Use Singular Names**: Module names should be singular (e.g., `product`, not `products`)
2. **UUID v7 for IDs**: All entities use UUID v7 for primary keys
3. **Soft Deletes**: Use soft deletes (deletedAt) instead of hard deletes
4. **Validation in DTOs**: Use class-validator decorators in DTOs
5. **Business Logic in Handlers**: Keep controllers thin, logic in handlers
6. **Pure Domain**: Domain entities should have no infrastructure dependencies
7. **Port-First Design**: Define ports before implementing adapters
8. **CQRS Separation**: Keep commands and queries strictly separated
9. **Event Publishing**: Use domain events for side effects
10. **Path Aliases**: Always use `@/` path aliases for imports

## Common Scenarios

### Adding a Relationship

If your entity has relationships (e.g., Product belongs to Category):

1. Add the relation property to domain entity:

```typescript
export class Product {
  // ... other properties
  category: Category;
}
```

2. Add to TypeORM entity:

```typescript
@ManyToOne(() => CategoryEntity)
@JoinColumn({ name: 'categoryId' })
category: CategoryEntity;

@Column({ type: 'uuid' })
categoryId: string;
```

3. Update mapper to handle the relation
4. Update DTOs to accept categoryId
5. Import the related module in your module

### Adding Custom Queries

Add a method to your repository port:

```typescript
export interface ProductRepositoryPort {
  // ... other methods
  findByCategory(categoryId: string): Promise<Product[]>;
}
```

Implement in TypeORM repository and create a new query handler.

### Publishing Domain Events

Create an event:

```typescript
export class ProductCreatedEvent {
  constructor(public readonly product: Product) {}
}
```

Publish in handler:

```typescript
await this.eventBus.publish(new ProductCreatedEvent(product));
```

Create event handler:

```typescript
@EventsHandler(ProductCreatedEvent)
export class ProductCreatedEventHandler
  implements IEventHandler<ProductCreatedEvent>
{
  async handle(event: ProductCreatedEvent): Promise<void> {
    // Handle side effects (e.g., send notification, update cache)
  }
}
```

## Troubleshooting

### Module not found errors

- Ensure path aliases are correctly configured in `tsconfig.json`
- Check import paths use `@/` prefix

### DI errors

- Verify the Symbol token is exported and imported correctly
- Check the provider is registered in the module
- Ensure TypeOrmModule.forFeature includes your entity

### Migration errors

- Check entity decorators are correct
- Ensure all columns have proper types
- Review the generated migration before running

## Additional Resources

- [Architecture Documentation](./architecture.md)
- [Testing Guide](./testing-auth-endpoints.md)
- [NestJS CQRS Documentation](https://docs.nestjs.com/recipes/cqrs)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

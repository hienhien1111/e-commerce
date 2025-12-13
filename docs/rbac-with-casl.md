# RBAC with CASL

This document explains how Role-Based Access Control (RBAC) is implemented using CASL in this application.

## Overview

The application uses **CASL** (an isomorphic authorization library) to implement fine-grained permissions. Permissions are stored in the database and dynamically loaded based on user roles.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Permission Module                    │
├─────────────────────────────────────────────────────────┤
│  Domain Layer                                            │
│  - Permission entity (id, name, action, subject, ...)   │
├─────────────────────────────────────────────────────────┤
│  Application Layer                                       │
│  - PermissionRepositoryPort                             │
├─────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                    │
│  - TypeORM Repository                                   │
│  - CASL Ability Factory                                 │
│  - PermissionsGuard                                     │
│  - @CheckPermissions decorator                          │
└─────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Permission Structure

Each permission consists of:

- **action**: What can be done (e.g., 'create', 'read', 'update', 'delete', 'manage')
- **subject**: What entity it applies to (e.g., 'User', 'Product', 'Role')
- **conditions** (optional): Additional constraints (e.g., only own resources)

### 2. Special Actions

- **`manage`**: A special action that represents ALL actions on a subject
  - If a user has `manage` permission on `User`, they can perform any action on User entities
  - Useful for admin roles to reduce the number of permission entries

### 3. Relationships

```
User ──> Role ──> Permissions (Many-to-Many)
```

- A User has one Role
- A Role can have many Permissions
- Permissions are eagerly loaded with Roles

## Database Schema

### Permission Table

```sql
CREATE TABLE permission (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE,
  action VARCHAR,
  subject VARCHAR,
  conditions JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### Role-Permission Junction Table

```sql
CREATE TABLE role_permission (
  role_id UUID REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permission(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);
```

## Usage

### 1. Protecting Routes with Permissions

Use the `@CheckPermissions` decorator to protect routes:

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CheckPermissions } from '@/permission/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/permission/infrastructure/guards/permissions.guard';

@Controller('products')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProductController {
  // Requires 'read' permission on 'Product'
  @Get()
  @CheckPermissions({ action: 'read', subject: 'Product' })
  async findAll() {
    // ...
  }

  // Requires 'create' permission on 'Product'
  @Post()
  @CheckPermissions({ action: 'create', subject: 'Product' })
  async create(@Body() dto: CreateProductDto) {
    // ...
  }

  // Requires BOTH 'read' and 'update' permissions on 'Product'
  @Patch(':id')
  @CheckPermissions(
    { action: 'read', subject: 'Product' },
    { action: 'update', subject: 'Product' },
  )
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    // ...
  }
}
```

### 2. Checking Permissions Programmatically

You can also check permissions in your service layer:

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { CaslAbilityFactory } from '@/permission/infrastructure/casl/casl-ability.factory';
import { User } from '@/user/domain/user';

@Injectable()
export class ProductService {
  constructor(private caslAbilityFactory: CaslAbilityFactory) {}

  async deleteProduct(user: User, productId: string) {
    const ability = this.caslAbilityFactory.createForUser(user);

    if (!ability.can('delete', 'Product')) {
      throw new ForbiddenException('You cannot delete products');
    }

    // ... proceed with deletion
  }
}
```

### 3. Conditional Permissions

You can add conditions to permissions for more fine-grained control:

```typescript
// In seed migration or admin panel
await permissionRepository.create({
  name: 'update_own_profile',
  action: 'update',
  subject: 'User',
  conditions: { id: '${user.id}' }, // User can only update their own profile
});
```

Then check with CASL:

```typescript
const ability = caslAbilityFactory.createForUser(currentUser);

// Check if user can update a specific user object
if (ability.can('update', targetUser)) {
  // Allowed
}
```

## Default Permissions

After running migrations, the following permissions are seeded:

### User Permissions

- `manage_users` - All actions on User
- `create_user` - Create users
- `read_user` - View users
- `update_user` - Update users
- `delete_user` - Delete users

### Product Permissions

- `manage_products` - All actions on Product
- `create_product` - Create products
- `read_product` - View products
- `update_product` - Update products
- `delete_product` - Delete products

### Role Permissions

- `manage_roles` - All actions on Role
- `read_role` - View roles

### Permission Permissions

- `manage_permissions` - All actions on Permission
- `read_permission` - View permissions

## Default Role Assignments

### ADMIN Role

- Has ALL permissions (all `manage_*` permissions)

### USER Role

- `read_user` - Can view users
- `read_product` - Can view products
- `read_role` - Can view roles

## Running Migrations

To create the permission tables and seed initial data:

```bash
# Run migrations
bun run typeorm -- --dataSource=src/database/data-source.ts migration:run
```

To revert:

```bash
# Revert last migration
bun run typeorm -- --dataSource=src/database/data-source.ts migration:revert
```

## Adding New Permissions

### Option 1: Via Migration (Recommended for initial setup)

Create a new migration:

```bash
bun run typeorm -- migration:create src/database/migrations/AddOrderPermissions
```

Add permissions in the migration:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';
import { generateUuidV7 } from '@/utils/uuid-v7';

export class AddOrderPermissions1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      {
        id: generateUuidV7(),
        name: 'create_order',
        action: 'create',
        subject: 'Order',
      },
      {
        id: generateUuidV7(),
        name: 'read_order',
        action: 'read',
        subject: 'Order',
      },
    ];

    for (const permission of permissions) {
      await queryRunner.query(
        `INSERT INTO "permission" ("id", "name", "action", "subject", "conditions")
         VALUES ($1, $2, $3, $4, $5)`,
        [
          permission.id,
          permission.name,
          permission.action,
          permission.subject,
          null,
        ],
      );
    }

    // Assign to ADMIN role
    const adminRole = await queryRunner.query(
      `SELECT "id" FROM "role" WHERE "name" = 'ADMIN' LIMIT 1`,
    );
    if (adminRole.length > 0) {
      for (const permission of permissions) {
        await queryRunner.query(
          `INSERT INTO "role_permission" ("role_id", "permission_id")
           VALUES ($1, $2)`,
          [adminRole[0].id, permission.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "permission" WHERE "subject" = 'Order'`,
    );
  }
}
```

### Option 2: Via Admin API (Future Enhancement)

Create an admin endpoint to manage permissions dynamically:

```typescript
@Post('permissions')
@CheckPermissions({ action: 'manage', subject: 'Permission' })
async createPermission(@Body() dto: CreatePermissionDto) {
  return this.commandBus.execute(new CreatePermissionCommand(dto));
}
```

## Best Practices

1. **Use `manage` for Admins**: Give admin roles `manage` permission instead of individual CRUD permissions
2. **Granular for Regular Users**: Give regular users specific permissions (create, read, update, delete)
3. **Use Conditions Sparingly**: Only use conditions when necessary (e.g., own resources only)
4. **Document Permissions**: Keep this document updated when adding new permissions
5. **Test Permissions**: Always test permission checks with different user roles
6. **Eager Load Permissions**: The current setup eagerly loads permissions with roles for performance

## Troubleshooting

### Permission Check Always Fails

1. Check if user has a role: `user.role`
2. Check if role has permissions: `user.role.permissions`
3. Verify permission name, action, and subject match exactly (case-sensitive)
4. Check database: `SELECT * FROM role_permission WHERE role_id = '<role_id>'`

### TypeScript Errors with CASL

- We use `MongoAbility` which supports string-based subjects (stored in database)
- Actions and Subjects types are defined in `casl-ability.factory.ts`
- Add new subjects to the `Subjects` type when creating new entities

### Permissions Not Loading

- Ensure `eager: true` is set on the `@ManyToMany` relationship in `RoleEntity`
- Check if migrations have been run
- Verify foreign keys in `role_permission` table

## Related Files

- Permission domain: `src/permission/domain/permission.ts`
- CASL factory: `src/permission/infrastructure/casl/casl-ability.factory.ts`
- Guards: `src/permission/infrastructure/guards/permissions.guard.ts`
- Decorators: `src/permission/infrastructure/decorators/check-permissions.decorator.ts`
- Migrations:
  - `src/database/migrations/*-CreatePermissionTable.ts`
  - `src/database/migrations/*-SeedPermissions.ts`

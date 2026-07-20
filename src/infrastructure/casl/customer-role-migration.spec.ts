import { describe, expect, it } from 'bun:test';
import { migrateCustomerRole } from '../../../scripts/migrate-customer-role';

describe('migrateCustomerRole', () => {
  it('renames the old role in place when customer is absent', async () => {
    const updateCalls: unknown[] = [];
    const prisma = {
      role: {
        findUnique: async ({ where }: { where: { name: string } }) =>
          where.name === 'user' ? { id: 'legacy' } : null,
        update: async (input: unknown) => updateCalls.push(input),
      },
    };

    await expect(migrateCustomerRole(prisma as never)).resolves.toBe('renamed');
    expect(updateCalls).toEqual([
      { where: { id: 'legacy' }, data: { name: 'customer' } },
    ]);
  });

  it('merges non-duplicate role links before removing the old role', async () => {
    const calls: string[] = [];
    const prisma = {
      role: {
        findUnique: async ({ where }: { where: { name: string } }) =>
          where.name === 'user' ? { id: 'legacy' } : { id: 'customer' },
        delete: async () => calls.push('role.delete'),
      },
      userRole: {
        findMany: async () => [{ userId: 'user-1', roleId: 'legacy' }],
        upsert: async () => calls.push('userRole.upsert'),
        deleteMany: async () => calls.push('userRole.deleteMany'),
      },
      rolePermission: {
        findMany: async () => [
          { roleId: 'legacy', permissionId: 'permission-1' },
        ],
        upsert: async () => calls.push('rolePermission.upsert'),
        deleteMany: async () => calls.push('rolePermission.deleteMany'),
      },
    };

    await expect(migrateCustomerRole(prisma as never)).resolves.toBe('merged');
    expect(calls).toEqual([
      'userRole.upsert',
      'rolePermission.upsert',
      'userRole.deleteMany',
      'rolePermission.deleteMany',
      'role.delete',
    ]);
  });
});

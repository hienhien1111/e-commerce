import { describe, expect, it } from 'bun:test';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import type { User } from '@/domain/entities/user';

describe('CaslAbilityFactory', () => {
  it('grants an admin manage-all ability across catalog and commerce subjects', () => {
    const ability = new CaslAbilityFactory().createForUser({
      role: {
        permissions: [
          {
            action: PermissionActionEnum.MANAGE,
            subject: PermissionSubjectEnum.ALL,
            conditions: null,
          },
        ],
      },
    } as User);

    expect(
      ability.can(PermissionActionEnum.UPDATE, PermissionSubjectEnum.PRODUCT),
    ).toBe(true);
    expect(
      ability.can(PermissionActionEnum.READ, PermissionSubjectEnum.ORDER),
    ).toBe(true);
    expect(
      ability.can(PermissionActionEnum.DELETE, PermissionSubjectEnum.COUPON),
    ).toBe(true);
  });

  it('keeps a customer limited to its explicitly seeded permissions', () => {
    const ability = new CaslAbilityFactory().createForUser({
      role: {
        permissions: [
          {
            action: PermissionActionEnum.CREATE,
            subject: PermissionSubjectEnum.CART,
            conditions: null,
          },
        ],
      },
    } as User);

    expect(
      ability.can(PermissionActionEnum.CREATE, PermissionSubjectEnum.CART),
    ).toBe(true);
    expect(
      ability.can(PermissionActionEnum.CREATE, PermissionSubjectEnum.PRODUCT),
    ).toBe(false);
    expect(
      ability.can(PermissionActionEnum.READ, PermissionSubjectEnum.ORDER),
    ).toBe(false);
  });
});

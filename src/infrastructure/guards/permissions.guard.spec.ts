import type { ExecutionContext } from '@nestjs/common';
import {
  CHECK_ANY_PERMISSIONS_KEY,
  CHECK_PERMISSIONS_KEY,
} from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

const context = {
  getHandler: () => undefined,
  getClass: () => undefined,
  switchToHttp: () => ({ getRequest: () => ({ user: { id: 'admin-1' } }) }),
} as unknown as ExecutionContext;

describe('PermissionsGuard any-permission groups', () => {
  const alternatives = [
    {
      action: PermissionActionEnum.READ,
      subject: PermissionSubjectEnum.ORDER,
    },
    {
      action: PermissionActionEnum.READ,
      subject: PermissionSubjectEnum.PAYMENT,
    },
  ];

  it('authorizes an operations user with either ORDER or PAYMENT permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === CHECK_ANY_PERMISSIONS_KEY ? alternatives : undefined,
      ),
    };
    const abilities = {
      createForUser: () => ({
        can: (_action: string, subject: string) =>
          subject === PermissionSubjectEnum.ORDER,
      }),
    };

    await expect(
      new PermissionsGuard(reflector as never, abilities as never).canActivate(
        context,
      ),
    ).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      CHECK_PERMISSIONS_KEY,
      expect.any(Array),
    );
  });

  it('rejects when none of the alternative permissions are granted', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === CHECK_ANY_PERMISSIONS_KEY ? alternatives : undefined,
      ),
    };
    const abilities = {
      createForUser: () => ({ can: () => false }),
    };

    await expect(
      new PermissionsGuard(reflector as never, abilities as never).canActivate(
        context,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

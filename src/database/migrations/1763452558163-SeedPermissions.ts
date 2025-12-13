import { MigrationInterface, QueryRunner } from 'typeorm';
import { generateUuidV7 } from '@/utils/uuid-v7';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

export class SeedPermissions1763452558163 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      {
        id: generateUuidV7(),
        name: 'manage_users',
        action: PermissionActionEnum.MANAGE,
        subject: PermissionSubjectEnum.USER,
      },
      {
        id: generateUuidV7(),
        name: 'create_user',
        action: PermissionActionEnum.CREATE,
        subject: PermissionSubjectEnum.USER,
      },
      {
        id: generateUuidV7(),
        name: 'read_user',
        action: PermissionActionEnum.READ,
        subject: PermissionSubjectEnum.USER,
      },
      {
        id: generateUuidV7(),
        name: 'update_user',
        action: PermissionActionEnum.UPDATE,
        subject: PermissionSubjectEnum.USER,
      },
      {
        id: generateUuidV7(),
        name: 'delete_user',
        action: PermissionActionEnum.DELETE,
        subject: PermissionSubjectEnum.USER,
      },
      {
        id: generateUuidV7(),
        name: 'manage_roles',
        action: PermissionActionEnum.MANAGE,
        subject: PermissionSubjectEnum.ROLE,
      },
      {
        id: generateUuidV7(),
        name: 'read_role',
        action: PermissionActionEnum.READ,
        subject: PermissionSubjectEnum.ROLE,
      },
      {
        id: generateUuidV7(),
        name: 'manage_permissions',
        action: PermissionActionEnum.MANAGE,
        subject: PermissionSubjectEnum.PERMISSION,
      },
      {
        id: generateUuidV7(),
        name: 'read_permission',
        action: PermissionActionEnum.READ,
        subject: PermissionSubjectEnum.PERMISSION,
      },
    ];

    await queryRunner.query(`DELETE FROM "role_permission"`);
    await queryRunner.query(`DELETE FROM "permission"`);

    for (const permission of permissions) {
      await queryRunner.query(
        `
        INSERT INTO "permission" ("id", "name", "action", "subject", "conditions")
        VALUES ($1, $2, $3, $4, $5)
      `,
        [
          permission.id,
          permission.name,
          permission.action,
          permission.subject,
          null,
        ],
      );
    }

    // Get ADMIN role ID
    const adminRoleResult = await queryRunner.query(
      `SELECT "id" FROM "role" WHERE "name" = 'admin' LIMIT 1`,
    );

    if (adminRoleResult.length > 0) {
      const adminRoleId = adminRoleResult[0].id;

      // Assign all permissions to ADMIN role
      for (const permission of permissions) {
        await queryRunner.query(
          `
          INSERT INTO "role_permission" ("role_id", "permission_id")
          VALUES ($1, $2)
        `,
          [adminRoleId, permission.id],
        );
      }
    }

    // Get USER role ID
    const userRoleResult = await queryRunner.query(
      `SELECT "id" FROM "role" WHERE "name" = 'user' LIMIT 1`,
    );

    if (userRoleResult.length > 0) {
      const userRoleId = userRoleResult[0].id;

      // Assign limited permissions to USER role
      const userPermissions = permissions.filter((p) =>
        ['read_user', 'read_role'].includes(p.name),
      );

      for (const permission of userPermissions) {
        await queryRunner.query(
          `
          INSERT INTO "role_permission" ("role_id", "permission_id")
          VALUES ($1, $2)
        `,
          [userRoleId, permission.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete all role_permission entries
    await queryRunner.query(`DELETE FROM "role_permission"`);

    // Delete all permissions
    await queryRunner.query(`DELETE FROM "permission"`);
  }
}

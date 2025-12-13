import { Test, TestingModule } from '@nestjs/testing';
import { GetRolesHandler } from './get-roles.handler';
import { GetRolesQuery } from './get-roles.query';
import { ROLE_REPOSITORY_PORT } from '../../ports/tokens';
import { Role } from '@/domain/entities/role';

describe('GetRolesHandler', () => {
  let handler: GetRolesHandler;
  let roleRepository: jest.Mocked<{
    findAll: jest.Mock;
  }>;

  const mockRoles = [
    { id: 'role-1', name: 'admin' },
    { id: 'role-2', name: 'user' },
  ] as Role[];

  beforeEach(async () => {
    roleRepository = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRolesHandler,
        { provide: ROLE_REPOSITORY_PORT, useValue: roleRepository },
      ],
    }).compile();

    handler = module.get<GetRolesHandler>(GetRolesHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return all roles', async () => {
      roleRepository.findAll.mockResolvedValue(mockRoles);

      const query = new GetRolesQuery();

      const result = await handler.execute(query);

      expect(roleRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockRoles);
    });

    it('should return empty array if no roles exist', async () => {
      roleRepository.findAll.mockResolvedValue([]);

      const query = new GetRolesQuery();

      const result = await handler.execute(query);

      expect(result).toEqual([]);
    });
  });
});

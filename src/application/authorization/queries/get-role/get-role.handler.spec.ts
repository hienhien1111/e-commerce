import { Test, TestingModule } from '@nestjs/testing';
import { GetRoleHandler } from './get-role.handler';
import { GetRoleQuery } from './get-role.query';
import { ROLE_REPOSITORY_PORT } from '../../ports/tokens';
import { Role } from '@/domain/entities/role';

describe('GetRoleHandler', () => {
  let handler: GetRoleHandler;
  let roleRepository: jest.Mocked<{ findById: jest.Mock }>;

  const mockRole = { id: 'role-123', name: 'admin' } as Role;

  beforeEach(async () => {
    roleRepository = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRoleHandler,
        { provide: ROLE_REPOSITORY_PORT, useValue: roleRepository },
      ],
    }).compile();

    handler = module.get<GetRoleHandler>(GetRoleHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return role by id', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);

      const query = new GetRoleQuery('role-123');

      const result = await handler.execute(query);

      expect(roleRepository.findById).toHaveBeenCalledWith('role-123');
      expect(result).toEqual(mockRole);
    });

    it('should return null if role not found', async () => {
      roleRepository.findById.mockResolvedValue(null);

      const query = new GetRoleQuery('non-existent');

      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });
});

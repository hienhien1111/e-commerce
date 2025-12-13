---
to: src/application/<%= moduleName %>/queries/get-<%= nameKebabCase %>/get-<%= nameKebabCase %>.handler.spec.ts
---
import { Test, TestingModule } from '@nestjs/testing';
import { Get<%= name %>Handler } from './get-<%= nameKebabCase %>.handler';
import { Get<%= name %>Query } from './get-<%= nameKebabCase %>.query';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

describe('Get<%= name %>Handler', () => {
  let handler: Get<%= name %>Handler;
  let <%= nameCamelCase %>Repository: jest.Mocked<<%= name %>RepositoryPort>;

  const mock<%= name %> = {
    id: 'test-id',
    name: 'Test <%= name %>',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as <%= name %>;

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<<%= name %>RepositoryPort>> = {
      create: jest.fn(),
      findById: jest.fn(),
      findManyWithPagination: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Get<%= name %>Handler,
        {
          provide: <%= nameUpperCase %>_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<Get<%= name %>Handler>(Get<%= name %>Handler);
    <%= nameCamelCase %>Repository = module.get(<%= nameUpperCase %>_REPOSITORY_PORT);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return a <%= nameCamelCase %> when found', async () => {
      <%= nameCamelCase %>Repository.findById.mockResolvedValue(mock<%= name %>);

      const query = new Get<%= name %>Query('test-id');

      const result = await handler.execute(query);

      expect(<%= nameCamelCase %>Repository.findById).toHaveBeenCalledWith('test-id');
      expect(result.<%= nameCamelCase %>).toEqual(mock<%= name %>);
    });

    it('should return null when <%= nameCamelCase %> not found', async () => {
      <%= nameCamelCase %>Repository.findById.mockResolvedValue(null);

      const query = new Get<%= name %>Query('non-existent-id');

      const result = await handler.execute(query);

      expect(result.<%= nameCamelCase %>).toBeNull();
    });
  });
});

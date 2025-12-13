---
to: src/application/<%= moduleName %>/queries/get-<%= pluralKebabCase %>/get-<%= pluralKebabCase %>.handler.spec.ts
---
import { Test, TestingModule } from '@nestjs/testing';
import { Get<%= plural %>Handler } from './get-<%= pluralKebabCase %>.handler';
import { Get<%= plural %>Query } from './get-<%= pluralKebabCase %>.query';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

describe('Get<%= plural %>Handler', () => {
  let handler: Get<%= plural %>Handler;
  let <%= nameCamelCase %>Repository: jest.Mocked<<%= name %>RepositoryPort>;

  const mock<%= plural %> = [
    {
      id: 'test-id-1',
      name: 'Test <%= name %> 1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'test-id-2',
      name: 'Test <%= name %> 2',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as unknown as <%= name %>[];

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
        Get<%= plural %>Handler,
        {
          provide: <%= nameUpperCase %>_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<Get<%= plural %>Handler>(Get<%= plural %>Handler);
    <%= nameCamelCase %>Repository = module.get(<%= nameUpperCase %>_REPOSITORY_PORT);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return a list of <%= pluralCamelCase %>', async () => {
      <%= nameCamelCase %>Repository.findManyWithPagination.mockResolvedValue(mock<%= plural %>);

      const query = new Get<%= plural %>Query(null, null, { cursor: null, limit: 10 });

      const result = await handler.execute(query);

      expect(<%= nameCamelCase %>Repository.findManyWithPagination).toHaveBeenCalledWith({
        filterOptions: null,
        sortOptions: null,
        paginationOptions: { cursor: null, limit: 10 },
      });
      expect(result.<%= pluralCamelCase %>).toHaveLength(2);
    });

    it('should return empty array when no <%= pluralCamelCase %> found', async () => {
      <%= nameCamelCase %>Repository.findManyWithPagination.mockResolvedValue([]);

      const query = new Get<%= plural %>Query(null, null, { cursor: null, limit: 10 });

      const result = await handler.execute(query);

      expect(result.<%= pluralCamelCase %>).toHaveLength(0);
    });
  });
});

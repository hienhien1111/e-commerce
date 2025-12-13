---
to: src/application/<%= moduleName %>/commands/create-<%= nameKebabCase %>/create-<%= nameKebabCase %>.handler.spec.ts
---
import { Test, TestingModule } from '@nestjs/testing';
import { Create<%= name %>Handler } from './create-<%= nameKebabCase %>.handler';
import { Create<%= name %>Command } from './create-<%= nameKebabCase %>.command';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

describe('Create<%= name %>Handler', () => {
  let handler: Create<%= name %>Handler;
  let <%= nameCamelCase %>Repository: jest.Mocked<<%= name %>RepositoryPort>;

  const mock<%= name %> = {
    id: 'test-id',
    name: 'Test <%= name %>',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as <%= name %>;

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<<%= name %>RepositoryPort>> = {
      create: jest.fn().mockResolvedValue(mock<%= name %>),
      findById: jest.fn(),
      findManyWithPagination: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Create<%= name %>Handler,
        {
          provide: <%= nameUpperCase %>_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<Create<%= name %>Handler>(Create<%= name %>Handler);
    <%= nameCamelCase %>Repository = module.get(<%= nameUpperCase %>_REPOSITORY_PORT);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should create a new <%= nameCamelCase %>', async () => {
      const command = new Create<%= name %>Command({
        name: 'Test <%= name %>',
      });

      const result = await handler.execute(command);

      expect(<%= nameCamelCase %>Repository.create).toHaveBeenCalled();
      expect(result.<%= nameCamelCase %>).toBeDefined();
      expect(result.<%= nameCamelCase %>.name).toBe('Test <%= name %>');
    });
  });
});

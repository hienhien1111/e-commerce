---
to: src/application/<%= moduleName %>/commands/delete-<%= nameKebabCase %>/delete-<%= nameKebabCase %>.handler.spec.ts
---
import { Test, TestingModule } from '@nestjs/testing';
import { Delete<%= name %>Handler } from './delete-<%= nameKebabCase %>.handler';
import { Delete<%= name %>Command } from './delete-<%= nameKebabCase %>.command';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';

describe('Delete<%= name %>Handler', () => {
  let handler: Delete<%= name %>Handler;
  let <%= nameCamelCase %>Repository: jest.Mocked<<%= name %>RepositoryPort>;

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<<%= name %>RepositoryPort>> = {
      create: jest.fn(),
      findById: jest.fn(),
      findManyWithPagination: jest.fn(),
      update: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Delete<%= name %>Handler,
        {
          provide: <%= nameUpperCase %>_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<Delete<%= name %>Handler>(Delete<%= name %>Handler);
    <%= nameCamelCase %>Repository = module.get(<%= nameUpperCase %>_REPOSITORY_PORT);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should delete a <%= nameCamelCase %>', async () => {
      const command = new Delete<%= name %>Command('test-id');

      const result = await handler.execute(command);

      expect(<%= nameCamelCase %>Repository.remove).toHaveBeenCalledWith('test-id');
      expect(result.success).toBe(true);
    });
  });
});

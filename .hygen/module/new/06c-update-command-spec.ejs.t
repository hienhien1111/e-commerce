---
to: src/application/<%= moduleName %>/commands/update-<%= nameKebabCase %>/update-<%= nameKebabCase %>.handler.spec.ts
---
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Update<%= name %>Handler } from './update-<%= nameKebabCase %>.handler';
import { Update<%= name %>Command } from './update-<%= nameKebabCase %>.command';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

describe('Update<%= name %>Handler', () => {
  let handler: Update<%= name %>Handler;
  let <%= nameCamelCase %>Repository: jest.Mocked<<%= name %>RepositoryPort>;

  const mock<%= name %> = {
    id: 'test-id',
    name: 'Updated <%= name %>',
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
        Update<%= name %>Handler,
        {
          provide: <%= nameUpperCase %>_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<Update<%= name %>Handler>(Update<%= name %>Handler);
    <%= nameCamelCase %>Repository = module.get(<%= nameUpperCase %>_REPOSITORY_PORT);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should update an existing <%= nameCamelCase %>', async () => {
      <%= nameCamelCase %>Repository.update.mockResolvedValue(mock<%= name %>);

      const command = new Update<%= name %>Command('test-id', {
        name: 'Updated <%= name %>',
      });

      const result = await handler.execute(command);

      expect(<%= nameCamelCase %>Repository.update).toHaveBeenCalledWith('test-id', {
        name: 'Updated <%= name %>',
      });
      expect(result.<%= nameCamelCase %>).toBeDefined();
    });

    it('should throw NotFoundException when <%= nameCamelCase %> not found', async () => {
      <%= nameCamelCase %>Repository.update.mockResolvedValue(null);

      const command = new Update<%= name %>Command('non-existent-id', {
        name: 'Updated <%= name %>',
      });

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });
});

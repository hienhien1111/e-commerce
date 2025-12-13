---
to: src/presentation/http/controllers/<%= nameKebabCase %>.controller.ts
skip_if: <%= addController ? false : true %>
---
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';
import { NullableType } from '@/utils/types/nullable.type';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '@/utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '@/utils/infinity-pagination';

import { Create<%= name %>Command } from '@/application/<%= moduleName %>/commands/create-<%= nameKebabCase %>/create-<%= nameKebabCase %>.command';
import { Update<%= name %>Command } from '@/application/<%= moduleName %>/commands/update-<%= nameKebabCase %>/update-<%= nameKebabCase %>.command';
import { Delete<%= name %>Command } from '@/application/<%= moduleName %>/commands/delete-<%= nameKebabCase %>/delete-<%= nameKebabCase %>.command';
import { Get<%= name %>Query } from '@/application/<%= moduleName %>/queries/get-<%= nameKebabCase %>/get-<%= nameKebabCase %>.query';
import { Get<%= plural %>Query } from '@/application/<%= moduleName %>/queries/get-<%= pluralKebabCase %>/get-<%= pluralKebabCase %>.query';
import { Create<%= name %>Result } from '@/application/<%= moduleName %>/commands/create-<%= nameKebabCase %>/create-<%= nameKebabCase %>.result';
import { Update<%= name %>Result } from '@/application/<%= moduleName %>/commands/update-<%= nameKebabCase %>/update-<%= nameKebabCase %>.result';
import { Get<%= name %>Result } from '@/application/<%= moduleName %>/queries/get-<%= nameKebabCase %>/get-<%= nameKebabCase %>.result';
import { Get<%= plural %>Result } from '@/application/<%= moduleName %>/queries/get-<%= pluralKebabCase %>/get-<%= pluralKebabCase %>.result';

import { Create<%= name %>Dto } from '../dtos/create-<%= nameKebabCase %>.dto';
import { Update<%= name %>Dto } from '../dtos/update-<%= nameKebabCase %>.dto';
import { Query<%= name %>Dto } from '../dtos/query-<%= nameKebabCase %>.dto';

@ApiTags('<%= plural %>')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: '<%= pluralKebabCase %>',
  version: '1',
})
export class <%= name %>Controller {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: <%= name %>,
  })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() create<%= name %>Dto: Create<%= name %>Dto): Promise<<%= name %>> {
    const result = await this.commandBus.execute<Create<%= name %>Command, Create<%= name %>Result>(
      new Create<%= name %>Command(create<%= name %>Dto),
    );
    return result.<%= nameCamelCase %>;
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(<%= name %>),
  })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: Query<%= name %>Dto,
  ): Promise<InfinityPaginationResponseDto<<%= name %>>> {
    const limit = Math.min(query?.limit ?? 10, 50);

    const result = await this.queryBus.execute<Get<%= plural %>Query, Get<%= plural %>Result>(
      new Get<%= plural %>Query(
        query.filters ?? null,
        query.sort ?? null,
        {
          cursor: query.cursor ?? null,
          limit,
        },
      ),
    );

    return infinityPagination(result.<%= pluralCamelCase %>, {
      cursor: query.cursor ?? null,
      limit,
    });
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: <%= name %>,
  })
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<NullableType<<%= name %>>> {
    const result = await this.queryBus.execute<Get<%= name %>Query, Get<%= name %>Result>(
      new Get<%= name %>Query(id),
    );
    return result.<%= nameCamelCase %>;
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: <%= name %>,
  })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() update<%= name %>Dto: Update<%= name %>Dto,
  ): Promise<<%= name %>> {
    const result = await this.commandBus.execute<Update<%= name %>Command, Update<%= name %>Result>(
      new Update<%= name %>Command(id, update<%= name %>Dto),
    );
    return result.<%= nameCamelCase %>;
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute(new Delete<%= name %>Command(id));
  }
}

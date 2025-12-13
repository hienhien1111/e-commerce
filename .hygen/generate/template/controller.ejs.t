---
to: src/presentation/http/controllers/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.controller.ts
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
import { <%= name %> } from '@/domain/entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>';
import { NullableType } from '@/utils/types/nullable.type';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '@/utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '@/utils/infinity-pagination';

import { Create<%= name %>Command } from '@/application/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/commands/create-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/create-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.command';
import { Update<%= name %>Command } from '@/application/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/commands/update-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/update-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.command';
import { Delete<%= name %>Command } from '@/application/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/commands/delete-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/delete-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.command';
import { Get<%= name %>Query } from '@/application/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/queries/get-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/get-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.query';
import { Get<%= h.inflection.transform(name, ['pluralize']) %>Query } from '@/application/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/queries/get-<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>/get-<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>.query';

import { Create<%= name %>Dto } from '../dtos/create-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.dto';
import { Update<%= name %>Dto } from '../dtos/update-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.dto';
import { Query<%= name %>Dto } from '../dtos/query-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.dto';

@ApiTags('<%= h.inflection.transform(name, ['pluralize']) %>')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: '<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>',
  version: '1',
})
export class <%= name %>Controller {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: <%= name %> })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() create<%= name %>Dto: Create<%= name %>Dto): Promise<<%= name %>> {
    const result = await this.commandBus.execute(
      new Create<%= name %>Command(create<%= name %>Dto),
    );
    return result.<%= h.inflection.camelize(name, true) %>;
  }

  @Get()
  @ApiOkResponse({ type: InfinityPaginationResponse(<%= name %>) })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: Query<%= name %>Dto,
  ): Promise<InfinityPaginationResponseDto<<%= name %>>> {
    const limit = Math.min(query?.limit ?? 10, 50);

    const result = await this.queryBus.execute(
      new Get<%= h.inflection.transform(name, ['pluralize']) %>Query(
        query.filters ?? null,
        query.sort ?? null,
        { cursor: query.cursor ?? null, limit },
      ),
    );

    return infinityPagination(result.<%= h.inflection.camelize(h.inflection.pluralize(name), true) %>, {
      cursor: query.cursor ?? null,
      limit,
    });
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiOkResponse({ type: <%= name %> })
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<NullableType<<%= name %>>> {
    const result = await this.queryBus.execute(new Get<%= name %>Query(id));
    return result.<%= h.inflection.camelize(name, true) %>;
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiOkResponse({ type: <%= name %> })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() update<%= name %>Dto: Update<%= name %>Dto,
  ): Promise<<%= name %>> {
    const result = await this.commandBus.execute(
      new Update<%= name %>Command(id, update<%= name %>Dto),
    );
    return result.<%= h.inflection.camelize(name, true) %>;
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute(new Delete<%= name %>Command(id));
  }
}

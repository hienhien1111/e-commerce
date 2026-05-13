---
to: src/presentation/http/controllers/<%= name %>.controller.ts
---
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsString, IsNotEmpty } from 'class-validator';

import { Create<%= sampleEntity %>Command } from '@/application/<%= name %>/commands/create-<%= h.changeCase.kebab(sampleEntity) %>';
import { Get<%= sampleEntity %>Query } from '@/application/<%= name %>/queries/get-<%= h.changeCase.kebab(sampleEntity) %>';

class Create<%= sampleEntity %>Dto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@ApiTags('<%= h.changeCase.pascal(name) %>')
@ApiBearerAuth()
@Controller({ path: '<%= name %>', version: '1' })
export class <%= h.changeCase.pascal(name) %>Controller {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: Create<%= sampleEntity %>Dto) {
    return this.commandBus.execute(new Create<%= sampleEntity %>Command(dto));
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryBus.execute(new Get<%= sampleEntity %>Query(id));
  }
}

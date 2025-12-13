---
to: src/presentation/http/dtos/query-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.dto.ts
---
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, ValidateNested, IsArray, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { <%= name %> } from '@/domain/entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>';

export class Filter<%= name %>Dto {
  @ApiPropertyOptional({ description: 'Filter by name' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class Sort<%= name %>Dto {
  @ApiPropertyOptional({ description: 'Field to sort by', example: 'createdAt' })
  @IsString()
  orderBy: keyof <%= name %>;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC';
}

export class Query<%= name %>Dto {
  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string | null;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ type: Filter<%= name %>Dto })
  @IsOptional()
  @ValidateNested()
  @Type(() => Filter<%= name %>Dto)
  filters?: Filter<%= name %>Dto | null;

  @ApiPropertyOptional({ type: [Sort<%= name %>Dto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Sort<%= name %>Dto)
  sort?: Sort<%= name %>Dto[] | null;
}

---
to: src/presentation/http/dtos/update-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.dto.ts
---
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class Update<%= name %>Dto {
  @ApiPropertyOptional({ example: 'Updated <%= name %>' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  name?: string;
}

---
to: src/presentation/http/dtos/update-<%= nameKebabCase %>.dto.ts
skip_if: <%= addController ? false : true %>
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

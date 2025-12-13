---
to: src/presentation/http/dtos/create-<%= nameKebabCase %>.dto.ts
skip_if: <%= addController ? false : true %>
---
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class Create<%= name %>Dto {
  @ApiProperty({ example: 'Sample <%= name %>' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;
}

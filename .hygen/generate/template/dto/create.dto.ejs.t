---
to: src/presentation/http/dtos/create-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.dto.ts
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

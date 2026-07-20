import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class QueryCategoryDto {
  @ApiPropertyOptional({
    description: 'Only return children of this root category',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { RoleDto } from '@/presentation/http/dtos/role.dto';

export class UserDto {
  @Allow()
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id: string;

  @Allow()
  @ApiProperty({
    type: String,
    nullable: true,
  })
  email: string | null;

  @Allow()
  @ApiProperty({
    type: String,
  })
  provider: string;

  @Allow()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
  })
  socialId?: string | null;

  @Allow()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
  })
  firstName?: string | null;

  @Allow()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
  })
  lastName?: string | null;

  @Allow()
  @ApiPropertyOptional({
    type: RoleDto,
    nullable: true,
  })
  role?: RoleDto | null;

  @Allow()
  @ApiProperty({
    type: Date,
  })
  createdAt: Date;

  @Allow()
  @ApiProperty({
    type: Date,
  })
  updatedAt: Date;

  @Allow()
  @ApiPropertyOptional({
    type: Date,
    nullable: true,
  })
  deletedAt?: Date;
}

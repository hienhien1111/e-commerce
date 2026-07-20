import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';

export class AuthEmailChangeDto {
  @ApiProperty({ example: 'new.email@example.com' })
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  currentPassword: string;
}

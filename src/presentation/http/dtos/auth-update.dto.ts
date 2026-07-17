import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';
import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';
import { UserEssentialProps } from '@/domain/entities/user';

type AuthUpdateFields = Pick<
  UserEssentialProps,
  'firstName' | 'lastName' | 'email' | 'password' | 'phone'
>;

const normalizePhone = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/[\s.-]/g, '');
  return normalized === '' ? null : normalized;
};

export class AuthUpdateDto implements Partial<AuthUpdateFields> {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'new.email@example.com' })
  @IsOptional()
  @IsNotEmpty()
  @IsEmail()
  @Transform(lowerCaseTransformer)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  oldPassword?: string;

  @ApiPropertyOptional({ example: '0901234567', nullable: true })
  @Transform(normalizePhone)
  @IsOptional()
  @Matches(/^0(?:3|5|7|8|9)\d{8}$/, {
    message: 'mustBeVietnameseMobilePhone',
  })
  phone?: string | null;
}

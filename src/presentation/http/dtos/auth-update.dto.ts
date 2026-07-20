import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';
import { UserEssentialProps } from '@/domain/entities/user';

type AuthUpdateFields = Pick<
  UserEssentialProps,
  'firstName' | 'lastName' | 'phone'
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

  @ApiPropertyOptional({ example: '0901234567', nullable: true })
  @Transform(normalizePhone)
  @IsOptional()
  @Matches(/^0(?:3|5|7|8|9)\d{8}$/, {
    message: 'mustBeVietnameseMobilePhone',
  })
  phone?: string | null;
}

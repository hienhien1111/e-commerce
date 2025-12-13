import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';
import { UserEssentialProps } from '@/domain/entities/user';

type EmailLoginFields = Required<
  Pick<UserEssentialProps, 'email' | 'password'>
>;

export class AuthEmailLoginDto implements EmailLoginFields {
  @ApiProperty({ example: 'admin@teko.com', type: String })
  @Transform(lowerCaseTransformer)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsNotEmpty()
  password: string;
}

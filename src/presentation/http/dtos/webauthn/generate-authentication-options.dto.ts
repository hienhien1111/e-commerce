import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateAuthenticationOptionsDto {
  @ApiProperty({ description: 'User ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'User email', required: false })
  @IsEmail()
  @IsOptional()
  userEmail?: string;
}

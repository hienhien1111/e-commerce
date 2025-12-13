import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateRegistrationOptionsDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'User display name' })
  @IsString()
  @IsNotEmpty()
  userDisplayName: string;

  @ApiProperty({ description: 'User email' })
  @IsEmail()
  userEmail: string;
}

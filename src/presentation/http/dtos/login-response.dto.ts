import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '@/presentation/http/dtos/user.dto';

export class LoginResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  tokenExpires: number;

  @ApiProperty({
    type: () => UserDto,
  })
  user: UserDto;
}

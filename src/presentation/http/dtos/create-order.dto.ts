import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class ShippingAddressInputDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) fullName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(40) phone!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(300) addressLine!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) ward!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) district!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) city!: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: ShippingAddressInputDto })
  @ValidateNested()
  @Type(() => ShippingAddressInputDto)
  shippingAddress!: ShippingAddressInputDto;
}

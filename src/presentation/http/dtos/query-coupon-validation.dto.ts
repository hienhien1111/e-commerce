import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const toNumber = ({ value }: { value: unknown }) => Number(value);

export class QueryCouponValidationDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code!: string;

  @ApiProperty({ minimum: 0 })
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  @Max(999_999_999_999)
  total!: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CommerceOperationStatusEnum } from '@/domain/enums/commerce-operation-status.enum';

const optionalNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : Number(value);

export class QueryCommerceOperationDto {
  @ApiPropertyOptional({ enum: CommerceOperationStatusEnum })
  @IsOptional()
  @IsEnum(CommerceOperationStatusEnum)
  status?: CommerceOperationStatusEnum;

  @ApiPropertyOptional({ example: 'RefundReconciliationRequested' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Transform(optionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CommerceOperationDto {
  @ApiProperty() id!: string;
  @ApiProperty() aggregateType!: string;
  @ApiProperty() aggregateId!: string;
  @ApiProperty() eventType!: string;
  @ApiProperty({ enum: CommerceOperationStatusEnum })
  status!: CommerceOperationStatusEnum;
  @ApiProperty() attempts!: number;
  @ApiProperty() availableAt!: Date;
  @ApiPropertyOptional({ nullable: true }) lastError!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class CommerceOperationPageDto {
  @ApiProperty({ type: [CommerceOperationDto] })
  data!: CommerceOperationDto[];
  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

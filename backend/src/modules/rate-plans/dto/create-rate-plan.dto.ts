import { IsDateString, IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRatePlanDto {
  @IsString()
  roomTypeId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validTo: string;

  @IsOptional()
  @IsObject()
  restrictions?: Record<string, unknown>;
}

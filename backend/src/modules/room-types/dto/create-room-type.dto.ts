import { IsArray, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  maxOccupancy: number;

  @IsNumber()
  @Min(0)
  baseRate: number;

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsString()
  otaRoomId?: string;
}

import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

class GuestInputDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class RoomSelectionDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  ratePlanId?: string;
}

export class CreateReservationDto {
  @ValidateNested()
  @Type(() => GuestInputDto)
  guest: GuestInputDto;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RoomSelectionDto)
  rooms: RoomSelectionDto[];
}

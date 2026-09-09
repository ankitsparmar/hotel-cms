import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  roomTypeId: string;

  @IsString()
  @MinLength(1)
  roomNumber: string;

  @IsOptional()
  @IsString()
  floor?: string;
}

import { IsString } from 'class-validator';

export class ReassignRoomDto {
  @IsString()
  reservationRoomId: string;

  @IsString()
  newRoomId: string;
}

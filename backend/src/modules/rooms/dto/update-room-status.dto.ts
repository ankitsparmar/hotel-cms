import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { RoomStatus } from '../../../common/enums';

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatus)
  status: RoomStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  override?: boolean;
}

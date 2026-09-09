import { IsBoolean, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsBoolean()
  override?: boolean;
}

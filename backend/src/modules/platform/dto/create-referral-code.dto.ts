import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReferralCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, Min, ValidateNested } from 'class-validator';

class CredentialsDto {
  hotelId: string;
  username: string;
  password: string;
}

// This is what the property owner fills in on their own Settings ->
// Integrations page — "keep Booking.com as a configurable piece" per-owner
// rather than a single hard-coded global integration.
export class ConfigureChannelDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials?: CredentialsDto;

  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  demoMode?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  pollIntervalMinutes?: number;

  @IsOptional()
  @IsObject()
  roomTypeMapping?: Record<string, string>;
}

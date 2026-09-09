import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class BootstrapSuperAdminDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @Matches(/^[a-z0-9_.-]{3,32}$/, {
    message: 'Username must be 3-32 characters: letters, numbers, "_", "." or "-"',
  })
  username?: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Must match SUPER_ADMIN_BOOTSTRAP_SECRET. This is a one-time-use gate —
  // the endpoint refuses unconditionally once any super admin already
  // exists, regardless of the secret.
  @IsString()
  secret: string;
}

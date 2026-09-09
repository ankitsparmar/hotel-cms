import { IsEmail, IsString, MinLength } from 'class-validator';

export class BootstrapSuperAdminDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Must match SUPER_ADMIN_BOOTSTRAP_SECRET. This is a one-time-use gate —
  // the endpoint refuses unconditionally once any super admin already
  // exists, regardless of the secret.
  @IsString()
  secret: string;
}

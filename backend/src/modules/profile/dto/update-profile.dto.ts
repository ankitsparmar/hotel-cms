import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Self-service profile edit — deliberately narrower than admin's
// UpdateUserDto: no role/active here, since a user can never change their
// own permissions or reactivate themselves.
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(/^[a-z0-9_.-]{3,32}$/, {
    message: 'Username must be 3-32 characters: letters, numbers, "_", "." or "-"',
  })
  username?: string;
}

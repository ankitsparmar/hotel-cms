import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  // Optional — left blank, UsersService derives one from the email's local
  // part so every account still has a username to sign in with.
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

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

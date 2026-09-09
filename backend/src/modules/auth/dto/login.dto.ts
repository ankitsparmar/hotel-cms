import { IsString, MinLength } from 'class-validator';

// Accepts either the account's email or its username — AuthService.login
// figures out which by trying both columns, same way it already handles
// "email exists at more than one property" (most-recently-created wins).
export class LoginDto {
  @IsString()
  @MinLength(1)
  identifier: string;

  @IsString()
  password: string;
}

import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Property-owner self-signup: creates a brand new Property (tenant) plus
// its first User with role=owner, per the user's chosen multi-tenant model
// ("property owners can sign up to the app").
export class SignupDto {
  @IsString()
  @MinLength(2)
  propertyName: string;

  @IsString()
  @MinLength(2)
  ownerName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Optional — lets users sign in with a memorable handle instead of their
  // email. Left blank, AuthService derives one from the email's local part.
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

  // Signup is gated on a referral code minted by a super admin — see
  // ReferralCode / PlatformService.createReferralCode.
  @IsString()
  @MinLength(4)
  referralCode: string;
}

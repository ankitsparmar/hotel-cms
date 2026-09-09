import { IsEmail, IsString, MinLength } from 'class-validator';

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

  // Signup is gated on a referral code minted by a super admin — see
  // ReferralCode / PlatformService.createReferralCode.
  @IsString()
  @MinLength(4)
  referralCode: string;
}

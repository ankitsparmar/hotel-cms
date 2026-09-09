import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { ensureUniqueUsername, normalizeUsername, usernameFromEmail } from '../../common/username';
import { generateRawToken, hashToken } from '../../common/tokens';
import { MailService } from '../mail/mail.service';
import { Property } from '../properties/entities/property.entity';
import { ReferralCode } from '../referral-codes/entities/referral-code.entity';
import { User } from '../users/entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Property) private properties: Repository<Property>,
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private dataSource: DataSource,
    private mail: MailService,
  ) {}

  private sign(user: User) {
    const token = this.jwt.sign({
      sub: user.id,
      propertyId: user.propertyId,
      role: user.role,
      email: user.email,
    });
    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        propertyId: user.propertyId,
        emailVerified: user.emailVerified,
      },
    };
  }

  async signup(dto: SignupDto) {
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const rawVerificationToken = generateRawToken();

    // Everything below is one transaction so that redeeming the referral
    // code and creating the property+owner are atomic: a row lock on the
    // code prevents two concurrent signups from both consuming it, and if
    // anything after the lock fails, the code is left unused.
    const result = await this.dataSource.transaction(async (manager) => {
      const normalizedCode = dto.referralCode.trim().toUpperCase();
      const code = await manager
        .getRepository(ReferralCode)
        .createQueryBuilder('rc')
        .setLock('pessimistic_write')
        .where('rc.code = :code', { code: normalizedCode })
        .getOne();

      if (!code || code.revoked) {
        throw new BadRequestException('Invalid referral code');
      }
      if (code.usedByPropertyId) {
        throw new BadRequestException('This referral code has already been used');
      }

      const property = manager.getRepository(Property).create({ name: dto.propertyName });
      await manager.getRepository(Property).save(property);

      const userRepo = manager.getRepository(User);
      const username = await ensureUniqueUsername(
        dto.username ? normalizeUsername(dto.username) : usernameFromEmail(dto.email),
        async (candidate) => (await userRepo.findOne({ where: { propertyId: property.id, username: candidate } })) !== null,
      );

      const passwordHash = await bcrypt.hash(dto.password, 12);
      const owner = userRepo.create({
        propertyId: property.id,
        name: dto.ownerName,
        email: dto.email.toLowerCase(),
        username,
        passwordHash,
        role: UserRole.OWNER,
        active: true,
        emailVerified: false,
        emailVerificationTokenHash: hashToken(rawVerificationToken),
        emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      });
      await userRepo.save(owner);

      code.usedByPropertyId = property.id;
      code.usedAt = new Date();
      await manager.getRepository(ReferralCode).save(code);

      return owner;
    });

    await this.mail.sendVerificationEmail(result.email, result.name, rawVerificationToken);
    return this.sign(result);
  }

  async login(dto: LoginDto) {
    // Email/username are unique per-property, not globally, since this is
    // multi-tenant. In the near-universal case a person owns/works at one
    // property this is unambiguous; if the same identifier exists at more
    // than one property we pick the most recently created account
    // (documented MVP limitation, same as before username login existed).
    const identifier = dto.identifier.trim().toLowerCase();
    const candidates = await this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :identifier', { identifier })
      .orWhere('LOWER(user.username) = :identifier', { identifier })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
    const user = candidates[0];
    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid email/username or password');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email/username or password');
    }
    if (user.propertyId) {
      const property = await this.properties.findOne({ where: { id: user.propertyId } });
      if (property?.suspended) {
        throw new UnauthorizedException('This property has been suspended');
      }
    }
    return this.sign(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const candidates = await this.users.find({ where: { email }, order: { createdAt: 'DESC' } });
    const user = candidates[0];
    // Always the same response whether or not the email exists, so this
    // endpoint can't be used to probe which addresses have accounts.
    if (user && user.active) {
      const rawToken = generateRawToken();
      user.passwordResetTokenHash = hashToken(rawToken);
      user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await this.users.save(user);
      await this.mail.sendPasswordResetEmail(user.email, user.name, rawToken);
    }
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashToken(dto.token);
    const user = await this.users.findOne({ where: { passwordResetTokenHash: tokenHash } });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires.getTime() < Date.now()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await this.users.save(user);
    return this.sign(user);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = hashToken(dto.token);
    const user = await this.users.findOne({ where: { emailVerificationTokenHash: tokenHash } });
    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
      throw new BadRequestException('This verification link is invalid or has expired');
    }
    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await this.users.save(user);
    return { verified: true, email: user.email };
  }

  async resendVerification(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Account not found');
    if (user.emailVerified) {
      return { message: 'Your email is already verified.' };
    }
    const rawToken = generateRawToken();
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    await this.users.save(user);
    await this.mail.sendVerificationEmail(user.email, user.name, rawToken);
    return { message: 'Verification email sent.' };
  }

  // Exposed so other modules (e.g. platform bootstrap, which creates a user
  // outside the normal signup/login flow) can issue a token the same way.
  issueToken(user: User) {
    return this.sign(user);
  }
}

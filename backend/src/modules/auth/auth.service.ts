import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { Property } from '../properties/entities/property.entity';
import { ReferralCode } from '../referral-codes/entities/referral-code.entity';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Property) private properties: Repository<Property>,
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private dataSource: DataSource,
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
        role: user.role,
        propertyId: user.propertyId,
      },
    };
  }

  async signup(dto: SignupDto) {
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Everything below is one transaction so that redeeming the referral
    // code and creating the property+owner are atomic: a row lock on the
    // code prevents two concurrent signups from both consuming it, and if
    // anything after the lock fails, the code is left unused.
    return this.dataSource.transaction(async (manager) => {
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

      const passwordHash = await bcrypt.hash(dto.password, 12);
      const owner = manager.getRepository(User).create({
        propertyId: property.id,
        name: dto.ownerName,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: UserRole.OWNER,
        active: true,
      });
      await manager.getRepository(User).save(owner);

      code.usedByPropertyId = property.id;
      code.usedAt = new Date();
      await manager.getRepository(ReferralCode).save(code);

      return this.sign(owner);
    });
  }

  async login(dto: LoginDto) {
    // Email is unique per-property, not globally, since this is multi-tenant.
    // In the near-universal case a person owns/works at one property this is
    // unambiguous; if the same email exists at more than one property we
    // pick the most recently created account (documented MVP limitation).
    const candidates = await this.users.find({
      where: { email: dto.email.toLowerCase() },
      order: { createdAt: 'DESC' },
    });
    const user = candidates[0];
    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.propertyId) {
      const property = await this.properties.findOne({ where: { id: user.propertyId } });
      if (property?.suspended) {
        throw new UnauthorizedException('This property has been suspended');
      }
    }
    return this.sign(user);
  }

  // Exposed so other modules (e.g. platform bootstrap, which creates a user
  // outside the normal signup/login flow) can issue a token the same way.
  issueToken(user: User) {
    return this.sign(user);
  }
}

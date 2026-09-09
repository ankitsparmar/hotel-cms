import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Property) private properties: Repository<Property>,
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
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

    const property = this.properties.create({ name: dto.propertyName });
    await this.properties.save(property);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const owner = this.users.create({
      propertyId: property.id,
      name: dto.ownerName,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: UserRole.OWNER,
      active: true,
    });
    await this.users.save(owner);

    return this.sign(owner);
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
    return this.sign(user);
  }
}

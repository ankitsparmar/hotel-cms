import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { generateRawToken, hashToken } from '../../common/tokens';
import { MailService } from '../mail/mail.service';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

// Self-service "my account" endpoints — available to every authenticated
// role including SUPER_ADMIN, unlike UsersController which is Owner/Admin
// managing OTHER accounts within their own property.
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Property) private properties: Repository<Property>,
    private mail: MailService,
  ) {}

  async getMe(actor: AuthUser) {
    const user = await this.findSelf(actor);
    return this.toDto(user);
  }

  async updateMe(actor: AuthUser, dto: UpdateProfileDto) {
    const user = await this.findSelf(actor);

    if (dto.name) user.name = dto.name;

    if (dto.username && dto.username !== user.username) {
      const taken = await this.users.findOne({ where: { propertyId: user.propertyId, username: dto.username } });
      if (taken) throw new ConflictException('That username is already taken');
      user.username = dto.username;
    }

    let rawVerificationToken: string | null = null;
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const newEmail = dto.email.toLowerCase();
      const taken = await this.users.findOne({ where: { propertyId: user.propertyId, email: newEmail } });
      if (taken) throw new ConflictException('That email is already in use');
      user.email = newEmail;
      // Changing email means the new address hasn't been proven to belong to
      // this person yet — re-verify it, same as at signup.
      user.emailVerified = false;
      rawVerificationToken = generateRawToken();
      user.emailVerificationTokenHash = hashToken(rawVerificationToken);
      user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    }

    await this.users.save(user);
    if (rawVerificationToken) {
      await this.mail.sendVerificationEmail(user.email, user.name, rawVerificationToken);
    }
    return this.toDto(user);
  }

  async changePassword(actor: AuthUser, dto: ChangePasswordDto) {
    const user = await this.findSelf(actor);
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.users.save(user);
    return { message: 'Password updated.' };
  }

  private async findSelf(actor: AuthUser) {
    const user = await this.users.findOne({ where: { id: actor.userId } });
    if (!user) throw new NotFoundException('Account not found');
    return user;
  }

  private async toDto(user: User) {
    const property = user.propertyId ? await this.properties.findOne({ where: { id: user.propertyId } }) : null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      active: user.active,
      emailVerified: user.emailVerified,
      propertyId: user.propertyId,
      propertyName: property?.name ?? null,
      createdAt: user.createdAt,
    };
  }
}

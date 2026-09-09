import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { AuthService } from '../auth/auth.service';
import { Property } from '../properties/entities/property.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { BootstrapSuperAdminDto } from './dto/bootstrap-super-admin.dto';

// The one deliberate cross-tenant surface in the app: everything here reads
// or writes across ALL properties, gated entirely on UserRole.SUPER_ADMIN.
// Every other module stays strictly scoped to actor.propertyId.
@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Property) private properties: Repository<Property>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Room) private rooms: Repository<Room>,
    @InjectRepository(Reservation) private reservations: Repository<Reservation>,
    private config: ConfigService,
    private authService: AuthService,
  ) {}

  async bootstrap(dto: BootstrapSuperAdminDto) {
    const secret = this.config.get<string>('SUPER_ADMIN_BOOTSTRAP_SECRET');
    if (!secret) {
      throw new ForbiddenException('Super admin bootstrap is not configured on this deployment');
    }
    if (dto.secret !== secret) {
      throw new ForbiddenException('Invalid bootstrap secret');
    }
    const existingSuperAdmin = await this.users.findOne({ where: { role: UserRole.SUPER_ADMIN } });
    if (existingSuperAdmin) {
      throw new ForbiddenException('A super admin already exists on this deployment');
    }
    const existingEmail = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existingEmail) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const admin = this.users.create({
      propertyId: null,
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      active: true,
    });
    await this.users.save(admin);
    return this.authService.issueToken(admin);
  }

  async listProperties() {
    const properties = await this.properties.find({ order: { createdAt: 'DESC' } });
    return Promise.all(properties.map((p) => this.withStats(p)));
  }

  async getProperty(id: string) {
    const property = await this.properties.findOne({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    const [stats, users] = await Promise.all([
      this.withStats(property),
      this.users.find({ where: { propertyId: id }, order: { createdAt: 'ASC' } }),
    ]);
    return {
      ...stats,
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active })),
    };
  }

  async setSuspended(id: string, suspended: boolean) {
    const property = await this.properties.findOne({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    property.suspended = suspended;
    await this.properties.save(property);
    return this.withStats(property);
  }

  async stats() {
    const [propertyCount, suspendedCount, userCount, roomCount, reservationCount] = await Promise.all([
      this.properties.count(),
      this.properties.count({ where: { suspended: true } }),
      this.users.count(),
      this.rooms.count(),
      this.reservations.count(),
    ]);
    return { propertyCount, suspendedCount, userCount, roomCount, reservationCount };
  }

  private async withStats(property: Property) {
    const [userCount, roomCount, reservationCount, owner] = await Promise.all([
      this.users.count({ where: { propertyId: property.id } }),
      this.rooms.count({ where: { propertyId: property.id } }),
      this.reservations.count({ where: { propertyId: property.id } }),
      this.users.findOne({ where: { propertyId: property.id, role: UserRole.OWNER } }),
    ]);
    return {
      id: property.id,
      name: property.name,
      suspended: property.suspended,
      createdAt: property.createdAt,
      userCount,
      roomCount,
      reservationCount,
      owner: owner ? { name: owner.name, email: owner.email } : null,
    };
  }
}

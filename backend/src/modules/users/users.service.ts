import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PROPERTY_ADMIN_ROLES, UserRole } from '../../common/enums';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { HousekeepingTask } from '../housekeeping/entities/housekeeping-task.entity';
import { RoomStatusLog } from '../housekeeping/entities/room-status-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

// Implements spec §2.1: within one property, OWNER is the only role that can
// manage other ADMIN accounts and hard-delete; ADMIN can manage front
// desk/housekeeping/accountant users but not other admins/owners.
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(RoomStatusLog) private statusLogs: Repository<RoomStatusLog>,
    @InjectRepository(HousekeepingTask) private tasks: Repository<HousekeepingTask>,
    @InjectRepository(AuditLog) private auditLogs: Repository<AuditLog>,
  ) {}

  private assertCanManage(actor: AuthUser, targetRole?: UserRole) {
    if (actor.role === UserRole.OWNER) return;
    if (actor.role === UserRole.ADMIN) {
      if (targetRole && PROPERTY_ADMIN_ROLES.includes(targetRole)) {
        throw new ForbiddenException('Admins cannot manage other Admin or Owner accounts');
      }
      return;
    }
    throw new ForbiddenException('Only Owner/Admin can manage users');
  }

  findAll(propertyId: string) {
    return this.users.find({ where: { propertyId }, order: { createdAt: 'ASC' } });
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    this.assertCanManage(actor, dto.role);
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({
      propertyId: actor.propertyId,
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
      active: dto.active ?? true,
    });
    return this.users.save(user);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const user = await this.users.findOne({ where: { id, propertyId: actor.propertyId } });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManage(actor, user.role);
    if (dto.role) this.assertCanManage(actor, dto.role);

    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email.toLowerCase();
    if (dto.role) user.role = dto.role;
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 12);

    return this.users.save(user);
  }

  // Hard delete only succeeds when the user has zero history (spec §2.1) —
  // otherwise callers should PATCH active=false instead. This is a
  // best-effort check across the tables that reference a user as actor.
  async remove(actor: AuthUser, id: string) {
    const user = await this.users.findOne({ where: { id, propertyId: actor.propertyId } });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManage(actor, user.role);

    const [statusLogCount, taskCount, auditCount] = await Promise.all([
      this.statusLogs.count({ where: { changedBy: id } }),
      this.tasks.count({ where: { assignedTo: id } }),
      this.auditLogs.count({ where: { actorId: id } }),
    ]);
    if (statusLogCount + taskCount + auditCount > 0) {
      throw new ConflictException('User has history and cannot be hard-deleted — deactivate instead');
    }
    await this.users.remove(user);
    return { deleted: true };
  }
}

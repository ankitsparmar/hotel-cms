import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// Kept under /admin per spec §13 — "so the wider permission check lives in
// one place" — even though it's Owner+Admin here rather than a single
// global Super Admin, since this SaaS is multi-tenant and each property's
// Owner is that property's top-level admin (see §2.1 in the spec doc).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('api/v1/admin/users')
export class UsersController {
  constructor(
    private users: UsersService,
    private audit: AuditService,
  ) {}

  @Get()
  findAll(@CurrentUser() actor: AuthUser) {
    return this.users.findAll(actor.propertyId);
  }

  @Post()
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    const user = await this.users.create(actor, dto);
    await this.audit.log({
      propertyId: actor.propertyId,
      actorId: actor.userId,
      action: 'user.create',
      targetType: 'user',
      targetId: user.id,
      metadata: { role: user.role },
    });
    return user;
  }

  @Patch(':id')
  async update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.users.update(actor, id, dto);
    await this.audit.log({
      propertyId: actor.propertyId,
      actorId: actor.userId,
      action: 'user.update',
      targetType: 'user',
      targetId: id,
      metadata: { ...dto },
    });
    return user;
  }

  @Delete(':id')
  async remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const result = await this.users.remove(actor, id);
    await this.audit.log({
      propertyId: actor.propertyId,
      actorId: actor.userId,
      action: 'user.delete',
      targetType: 'user',
      targetId: id,
    });
    return result;
  }
}

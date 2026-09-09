import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { HousekeepingTaskStatus, RoomStatus, UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoomsService } from '../rooms/rooms.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { HousekeepingService } from './housekeeping.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.HOUSEKEEPING, UserRole.FRONT_DESK)
@Controller('api/v1/housekeeping/tasks')
export class HousekeepingController {
  constructor(
    private housekeeping: HousekeepingService,
    private rooms: RoomsService,
  ) {}

  @Get()
  findAll(@CurrentUser() actor: AuthUser, @Query('status') status?: HousekeepingTaskStatus) {
    return this.housekeeping.findAll(actor.propertyId, status);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTaskDto) {
    return this.housekeeping.createManualTask(actor.propertyId, dto.roomId, dto.type, dto.assignedTo);
  }

  @Patch(':id/assign')
  assign(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body('assignedTo') assignedTo: string) {
    return this.housekeeping.assign(actor.propertyId, id, assignedTo || actor.userId);
  }

  // Completing a task flips the room to clean (or inspected, if the
  // caller is Owner/Admin signing off) — spec §8.
  @Patch(':id/complete')
  async complete(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body('inspected') inspected?: boolean) {
    const task = await this.housekeeping.complete(actor, id);
    const isAdmin = actor.role === UserRole.OWNER || actor.role === UserRole.ADMIN;
    await this.rooms.setStatus(actor, task.roomId, {
      status: inspected && isAdmin ? RoomStatus.INSPECTED : RoomStatus.CLEAN,
    });
    return task;
  }
}

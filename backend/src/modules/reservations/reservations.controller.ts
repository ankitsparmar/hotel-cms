import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReservationStatus, UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckInDto } from './dto/check-in.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReassignRoomDto } from './dto/reassign-room.dto';
import { ReservationsService } from './reservations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/reservations')
export class ReservationsController {
  constructor(private service: ReservationsService) {}

  @Get()
  findAll(
    @CurrentUser() actor: AuthUser,
    @Query('status') status?: ReservationStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(actor.propertyId, { status, from, to });
  }

  @Get(':id')
  findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.findOne(actor.propertyId, id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FRONT_DESK)
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateReservationDto) {
    return this.service.create(actor, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FRONT_DESK)
  @Patch(':id/check-in')
  checkIn(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: CheckInDto) {
    return this.service.checkIn(actor, id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FRONT_DESK)
  @Patch(':id/check-out')
  checkOut(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.checkOut(actor, id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FRONT_DESK)
  @Patch(':id/no-show')
  noShow(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.markNoShow(actor, id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FRONT_DESK)
  @Patch(':id/reassign-room')
  reassignRoom(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: ReassignRoomDto) {
    return this.service.reassignRoom(actor, id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FRONT_DESK)
  @Delete(':id')
  cancel(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body('note') note?: string) {
    return this.service.cancel(actor, id, note);
  }
}

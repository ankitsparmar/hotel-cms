import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoomStatus, UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { RoomsService } from './rooms.service';

class ImportCsvDto {
  @IsString()
  csv: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/rooms')
export class RoomsController {
  constructor(private service: RoomsService) {}

  @Get()
  findAll(
    @CurrentUser() actor: AuthUser,
    @Query('status') status?: RoomStatus,
    @Query('type') roomTypeId?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.service.findAll(actor.propertyId, { status, roomTypeId, includeArchived: includeArchived === 'true' });
  }

  @Get(':id')
  findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.findOne(actor.propertyId, id);
  }

  @Get(':id/history')
  history(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.history(actor.propertyId, id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateRoomDto) {
    return this.service.create(actor.propertyId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('bulk-import')
  bulkImport(@CurrentUser() actor: AuthUser, @Body() dto: ImportCsvDto) {
    return this.service.bulkImportCsv(actor.propertyId, dto.csv);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(actor, id, dto);
  }

  // Housekeeping + Front desk can change status day-to-day; setStatus()
  // itself enforces the extra Owner/Admin-only rule for out-of-order.
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.HOUSEKEEPING, UserRole.FRONT_DESK)
  @Patch(':id/status')
  setStatus(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    return this.service.setStatus(actor, id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.remove(actor.propertyId, id);
  }
}

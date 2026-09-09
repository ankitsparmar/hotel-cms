import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomTypesService } from './room-types.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/room-types')
export class RoomTypesController {
  constructor(private service: RoomTypesService) {}

  @Get()
  findAll(@CurrentUser() actor: AuthUser, @Query('includeArchived') includeArchived?: string) {
    return this.service.findAll(actor.propertyId, includeArchived === 'true');
  }

  @Get(':id')
  findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.findOne(actor.propertyId, id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateRoomTypeDto) {
    return this.service.create(actor.propertyId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.service.update(actor.propertyId, id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.remove(actor.propertyId, id);
  }
}

import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { RatePlansService } from './rate-plans.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/rate-plans')
export class RatePlansController {
  constructor(private service: RatePlansService) {}

  @Get()
  findAll(@CurrentUser() actor: AuthUser, @Query('roomTypeId') roomTypeId?: string) {
    return this.service.findAll(actor.propertyId, roomTypeId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateRatePlanDto) {
    return this.service.create(actor.propertyId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.remove(actor.propertyId, id);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AvailabilityService } from './availability.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1')
export class AvailabilityController {
  constructor(private service: AvailabilityService) {}

  @Get('availability')
  availability(
    @CurrentUser() actor: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') roomTypeId?: string,
  ) {
    return this.service.availability(actor.propertyId, from, to, roomTypeId);
  }

  @Get('calendar')
  calendar(@CurrentUser() actor: AuthUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.calendar(actor.propertyId, from, to);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get('reservations/:id/payments')
  findForReservation(@Param('id') id: string) {
    return this.service.findForReservation(id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FRONT_DESK)
  @Post('reservations/:id/payments')
  capture(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.service.capture(actor.propertyId, id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('payments/:id/refund')
  refund(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body('amount') amount?: number) {
    return this.service.refund(actor.propertyId, id, amount);
  }
}

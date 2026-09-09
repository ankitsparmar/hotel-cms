import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreditNoteDto } from './dto/credit-note.dto';
import { InvoicesService } from './invoices.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1')
export class InvoicesController {
  constructor(private service: InvoicesService) {}

  @Get('reservations/:id/invoices')
  findForReservation(@Param('id') id: string) {
    return this.service.findForReservation(id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @Post('invoices/:id/credit-note')
  creditNote(@Param('id') id: string, @Body() dto: CreditNoteDto) {
    const lineItems = dto.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice.toFixed(2),
      total: li.total.toFixed(2),
    }));
    return this.service.issueCreditNote(id, lineItems, dto.reason);
  }
}

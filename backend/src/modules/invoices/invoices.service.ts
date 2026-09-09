import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Invoice, InvoiceLineItem } from './entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(@InjectRepository(Invoice) private invoices: Repository<Invoice>) {}

  findForReservation(reservationId: string) {
    return this.invoices.find({ where: { reservationId }, order: { issuedAt: 'DESC' } });
  }

  private async nextInvoiceNumber(manager: EntityManager): Promise<string> {
    const count = await manager.getRepository(Invoice).count();
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // Generated at checkout from room charges + extras (spec §10). Runs
  // inside the same transaction as the checkout itself when called from
  // ReservationsService.
  async generateForCheckout(
    reservationId: string,
    lineItems: InvoiceLineItem[],
    manager: EntityManager,
  ) {
    const repo = manager.getRepository(Invoice);
    const total = lineItems.reduce((sum, li) => sum + Number(li.total), 0);
    const invoice = repo.create({
      reservationId,
      invoiceNumber: await this.nextInvoiceNumber(manager),
      lineItems,
      total: total.toFixed(2),
      isCreditNote: false,
    });
    return repo.save(invoice);
  }

  // Totals are immutable once issued (spec §10) — a correction is always a
  // new, linked credit-note row, never an edit of the original.
  async issueCreditNote(originalId: string, lineItems: InvoiceLineItem[], reason?: string) {
    const original = await this.invoices.findOne({ where: { id: originalId } });
    if (!original) throw new NotFoundException('Invoice not found');
    if (lineItems.length === 0) throw new BadRequestException('Credit note needs at least one line item');

    const total = lineItems.reduce((sum, li) => sum + Number(li.total), 0);
    const note = this.invoices.create({
      reservationId: original.reservationId,
      invoiceNumber: `${original.invoiceNumber}-CN`,
      lineItems: reason ? [...lineItems, { description: `Reason: ${reason}`, quantity: 1, unitPrice: '0.00', total: '0.00' }] : lineItems,
      total: (-Math.abs(total)).toFixed(2),
      isCreditNote: true,
      creditNoteFor: original.id,
    });
    return this.invoices.save(note);
  }
}

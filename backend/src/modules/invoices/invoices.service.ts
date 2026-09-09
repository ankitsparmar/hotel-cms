import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Invoice, InvoiceLineItem } from './entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private invoices: Repository<Invoice>,
    @InjectRepository(Reservation) private reservations: Repository<Reservation>,
    @InjectRepository(Property) private properties: Repository<Property>,
  ) {}

  findForReservation(reservationId: string) {
    return this.invoices.find({ where: { reservationId }, order: { issuedAt: 'DESC' } });
  }

  // Full document view for one invoice — the property's own name/address/
  // currency plus guest and stay details, so the printable template is
  // built fresh per property rather than hardcoding any one hotel's info.
  // Scoped to the caller's property: an invoice whose reservation belongs
  // to a different property is treated as not found, never leaked.
  async getDetail(propertyId: string, invoiceId: string) {
    const invoice = await this.invoices.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const reservation = await this.reservations.findOne({
      where: { id: invoice.reservationId, propertyId },
      relations: { guest: true, rooms: { room: true } },
    });
    if (!reservation) throw new NotFoundException('Invoice not found');

    const property = await this.properties.findOne({ where: { id: propertyId } });

    let originalInvoiceNumber: string | undefined;
    if (invoice.isCreditNote && invoice.creditNoteFor) {
      const original = await this.invoices.findOne({ where: { id: invoice.creditNoteFor } });
      originalInvoiceNumber = original?.invoiceNumber;
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      lineItems: invoice.lineItems,
      total: invoice.total,
      isCreditNote: invoice.isCreditNote,
      originalInvoiceNumber,
      issuedAt: invoice.issuedAt,
      property: property
        ? { name: property.name, address: property.address ?? null, currency: property.currency }
        : { name: 'Hotel CMS', address: null, currency: 'GBP' },
      guest: { name: reservation.guest.name, email: reservation.guest.email ?? null, phone: reservation.guest.phone ?? null },
      reservation: {
        id: reservation.id,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        rooms: reservation.rooms.map((r) => r.room.roomNumber),
      },
    };
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

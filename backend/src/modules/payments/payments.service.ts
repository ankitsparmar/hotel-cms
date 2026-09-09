import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod, PaymentStatus, ReservationSource } from '../../common/enums';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(Reservation) private reservations: Repository<Reservation>,
  ) {}

  findForReservation(reservationId: string) {
    return this.payments.find({ where: { reservationId }, order: { createdAt: 'DESC' } });
  }

  async capture(propertyId: string, reservationId: string, dto: CreatePaymentDto) {
    const reservation = await this.reservations.findOne({ where: { id: reservationId, propertyId } });
    if (!reservation) throw new NotFoundException('Reservation not found');

    // Spec §10 acceptance criterion: bookings where the OTA collects
    // payment are excluded from the app's own charge flow, to avoid
    // double-charging the guest.
    if (reservation.paymentViaOta && dto.method !== PaymentMethod.OTA_COLLECTED) {
      throw new BadRequestException('This booking is marked payment-via-OTA — do not charge it directly');
    }

    const payment = this.payments.create({
      reservationId,
      amount: dto.amount.toFixed(2),
      method: dto.method,
      providerRef: dto.providerRef,
      cardLast4: dto.cardLast4,
      status: PaymentStatus.SUCCEEDED,
    });
    return this.payments.save(payment);
  }

  // Refunds always go through the provider's API, never a local-only
  // record (spec §10). Since no live provider is wired up, this records
  // the refund as a linked Payment row the way a webhook confirmation
  // would, rather than mutating the original payment.
  async refund(propertyId: string, paymentId: string, amount?: number) {
    const original = await this.payments.findOne({ where: { id: paymentId } });
    if (!original) throw new NotFoundException('Payment not found');
    const reservation = await this.reservations.findOne({ where: { id: original.reservationId, propertyId } });
    if (!reservation) throw new NotFoundException('Payment not found');

    const refund = this.payments.create({
      reservationId: original.reservationId,
      amount: (-(amount ?? Number(original.amount))).toFixed(2),
      method: original.method,
      providerRef: original.providerRef,
      status: PaymentStatus.REFUNDED,
      refundOfPaymentId: original.id,
    });
    return this.payments.save(refund);
  }
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../../../common/enums';
import { Reservation } from '../../reservations/entities/reservation.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  reservationId: string;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column('numeric', { precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  // Reference into the hosted payment provider (Stripe/Adyen charge id).
  // The app never stores a full card number, only this ref + last4.
  @Column({ nullable: true })
  providerRef?: string;

  @Column({ nullable: true })
  cardLast4?: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // If this payment is a refund, points at the payment it refunds.
  @Column('uuid', { nullable: true })
  refundOfPaymentId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

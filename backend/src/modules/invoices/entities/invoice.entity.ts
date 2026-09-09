import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  reservationId: string;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column()
  invoiceNumber: string;

  @Column('jsonb')
  lineItems: InvoiceLineItem[];

  @Column('numeric', { precision: 10, scale: 2 })
  total: string;

  // Once issued, totals are immutable (spec §10) — a correction is a new
  // Invoice row with isCreditNote=true and creditNoteFor pointing back here,
  // never an update to this row.
  @Column({ default: false })
  isCreditNote: boolean;

  @Column('uuid', { nullable: true })
  creditNoteFor?: string;

  @CreateDateColumn()
  issuedAt: Date;
}

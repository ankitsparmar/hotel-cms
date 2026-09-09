import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ReservationSource, ReservationStatus } from '../../../common/enums';
import { Guest } from '../../guests/entities/guest.entity';
import { ReservationRoom } from './reservation-room.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  propertyId: string;

  @Column('uuid')
  guestId: string;

  @ManyToOne(() => Guest)
  @JoinColumn({ name: 'guestId' })
  guest: Guest;

  @Column('date')
  checkIn: string;

  @Column('date')
  checkOut: string;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ type: 'enum', enum: ReservationSource, default: ReservationSource.DIRECT })
  source: ReservationSource;

  // OTA reservation id, set when source != direct
  @Column({ nullable: true })
  externalRef?: string;

  @Column('uuid', { nullable: true })
  otaChannelId?: string;

  @Column({ default: false })
  paymentViaOta: boolean;

  @Column({ nullable: true })
  rawPayloadRef?: string;

  @OneToMany(() => ReservationRoom, (rr) => rr.reservation, { cascade: true })
  rooms: ReservationRoom[];

  @Column('jsonb', { default: [] })
  statusHistory: { status: string; at: string; by?: string; note?: string }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

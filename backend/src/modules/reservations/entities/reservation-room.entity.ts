import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';
import { RatePlan } from '../../rate-plans/entities/rate-plan.entity';
import { Reservation } from './reservation.entity';

// Denormalizes room_id + check_in/check_out + `active` from the parent
// Reservation so that a Postgres EXCLUDE constraint (see migration
// 1700000000002-exclusion-constraint.ts) can enforce "no two active
// bookings overlap for the same room" at the database level — the
// concurrency guarantee called for in spec §6, not just an app-level check.
@Entity('reservation_rooms')
@Index(['roomId', 'active'])
export class ReservationRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reservationId: string;

  @ManyToOne(() => Reservation, (r) => r.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column()
  roomId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ nullable: true })
  ratePlanId?: string;

  @ManyToOne(() => RatePlan, { nullable: true })
  @JoinColumn({ name: 'ratePlanId' })
  ratePlan?: RatePlan;

  @Column('numeric', { precision: 10, scale: 2 })
  priceAtBooking: string;

  // Kept in sync with the parent reservation's dates/status by the
  // reservations service inside the same transaction.
  @Column('date')
  checkIn: string;

  @Column('date')
  checkOut: string;

  // true while the reservation occupies pending/confirmed/checked_in;
  // flipped false on cancel/no_show/checked_out so the exclusion
  // constraint only guards live bookings.
  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

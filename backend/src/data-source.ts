import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Property } from './modules/properties/entities/property.entity';
import { User } from './modules/users/entities/user.entity';
import { RoomType } from './modules/room-types/entities/room-type.entity';
import { Room } from './modules/rooms/entities/room.entity';
import { RatePlan } from './modules/rate-plans/entities/rate-plan.entity';
import { Guest } from './modules/guests/entities/guest.entity';
import { Reservation } from './modules/reservations/entities/reservation.entity';
import { ReservationRoom } from './modules/reservations/entities/reservation-room.entity';
import { HousekeepingTask } from './modules/housekeeping/entities/housekeeping-task.entity';
import { RoomStatusLog } from './modules/housekeeping/entities/room-status-log.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { Invoice } from './modules/invoices/entities/invoice.entity';
import { OTAChannel } from './modules/ota/entities/ota-channel.entity';
import { OTASyncLog } from './modules/ota/entities/ota-sync-log.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { ReferralCode } from './modules/referral-codes/entities/referral-code.entity';

export const entities = [
  Property,
  User,
  RoomType,
  Room,
  RatePlan,
  Guest,
  Reservation,
  ReservationRoom,
  HousekeepingTask,
  RoomStatusLog,
  Payment,
  Invoice,
  OTAChannel,
  OTASyncLog,
  AuditLog,
  ReferralCode,
];

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: false,
});

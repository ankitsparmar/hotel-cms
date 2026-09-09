import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from '../guests/entities/guest.entity';
import { HousekeepingModule } from '../housekeeping/housekeeping.module';
import { RoomStatusLog } from '../housekeeping/entities/room-status-log.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { RatePlan } from '../rate-plans/entities/rate-plan.entity';
import { RatePlansModule } from '../rate-plans/rate-plans.module';
import { Room } from '../rooms/entities/room.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { ReservationRoom } from './entities/reservation-room.entity';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, ReservationRoom, Guest, Room, RoomType, RatePlan, RoomStatusLog]),
    RatePlansModule,
    HousekeepingModule,
    InvoicesModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}

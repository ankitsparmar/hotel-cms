import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationRoom } from '../reservations/entities/reservation-room.entity';
import { RatePlan } from './entities/rate-plan.entity';
import { RatePlansController } from './rate-plans.controller';
import { RatePlansService } from './rate-plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([RatePlan, ReservationRoom])],
  controllers: [RatePlansController],
  providers: [RatePlansService],
  exports: [RatePlansService],
})
export class RatePlansModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatePlan } from '../rate-plans/entities/rate-plan.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomType } from './entities/room-type.entity';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomType, Room, RatePlan])],
  controllers: [RoomTypesController],
  providers: [RoomTypesService],
  exports: [RoomTypesService],
})
export class RoomTypesModule {}

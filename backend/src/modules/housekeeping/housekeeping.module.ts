import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsModule } from '../rooms/rooms.module';
import { HousekeepingTask } from './entities/housekeeping-task.entity';
import { RoomStatusLog } from './entities/room-status-log.entity';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';

@Module({
  imports: [TypeOrmModule.forFeature([HousekeepingTask, RoomStatusLog]), RoomsModule],
  controllers: [HousekeepingController],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}

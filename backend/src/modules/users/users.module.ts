import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { HousekeepingTask } from '../housekeeping/entities/housekeeping-task.entity';
import { RoomStatusLog } from '../housekeeping/entities/room-status-log.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, RoomStatusLog, HousekeepingTask, AuditLog]), AuditModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

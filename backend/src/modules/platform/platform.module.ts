import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Property } from '../properties/entities/property.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { PlatformBootstrapController } from './platform-bootstrap.controller';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, User, Room, Reservation]), AuthModule],
  controllers: [PlatformController, PlatformBootstrapController],
  providers: [PlatformService],
})
export class PlatformModule {}

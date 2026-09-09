import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { entities } from './data-source';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { OtaModule } from './modules/ota/ota.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlatformModule } from './modules/platform/platform.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { RatePlansModule } from './modules/rate-plans/rate-plans.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities,
        synchronize: false,
        logging: false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),
    AuditModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    RoomTypesModule,
    RoomsModule,
    RatePlansModule,
    AvailabilityModule,
    ReservationsModule,
    HousekeepingModule,
    PaymentsModule,
    InvoicesModule,
    OtaModule,
    PlatformModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

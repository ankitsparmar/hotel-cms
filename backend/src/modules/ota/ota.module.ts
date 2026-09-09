import { BullModule } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReservationsModule } from '../reservations/reservations.module';
import { OTAChannel } from './entities/ota-channel.entity';
import { OTASyncLog } from './entities/ota-sync-log.entity';
import { OtaChannelsService } from './ota-channels.service';
import { OtaController } from './ota.controller';
import { OtaSyncProcessor } from './ota-sync.processor';
import { OtaSyncService } from './ota-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OTAChannel, OTASyncLog]),
    BullModule.registerQueue({ name: 'ota-sync' }),
    ReservationsModule,
  ],
  controllers: [OtaController],
  providers: [OtaChannelsService, OtaSyncService, OtaSyncProcessor],
  exports: [OtaChannelsService, OtaSyncService],
})
export class OtaModule implements OnModuleInit {
  constructor(@InjectQueue('ota-sync') private queue: Queue) {}

  // Schedules the repeatable "poll every 5 minutes" job described in §3's
  // architecture diagram. Idempotent: BullMQ repeatable jobs are
  // deduplicated by pattern, so re-running this on every boot is safe.
  async onModuleInit() {
    await this.queue.add(
      'poll-due-channels',
      {},
      { repeat: { every: 5 * 60 * 1000 }, jobId: 'poll-due-channels-schedule' },
    );
  }
}

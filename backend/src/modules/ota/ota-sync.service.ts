import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OTASyncStatus } from '../../common/enums';
import { ReservationsService } from '../reservations/reservations.service';
import { BookingComAdapter } from './adapters/booking-com.adapter';
import { ChannelAdapter } from './adapters/channel-adapter.interface';
import { OtaChannelsService } from './ota-channels.service';
import { OTASyncLog } from './entities/ota-sync-log.entity';

@Injectable()
export class OtaSyncService {
  private logger = new Logger(OtaSyncService.name);

  constructor(
    private channels: OtaChannelsService,
    @InjectRepository(OTASyncLog) private syncLogs: Repository<OTASyncLog>,
    private reservations: ReservationsService,
  ) {}

  private buildAdapter(channel: Awaited<ReturnType<OtaChannelsService['findById']>>): ChannelAdapter {
    const credentials = channel ? this.channels.getDecryptedCredentials(channel) : null;
    const mappedOtaRoomIds = channel ? Object.keys(channel.roomTypeMapping || {}) : [];
    return new BookingComAdapter(credentials, channel?.demoMode ?? true, mappedOtaRoomIds);
  }

  // The core of §11: poll -> map OTA room id -> internal RoomType via the
  // channel's manually-maintained mapping -> create/upsert the reservation
  // -> write everything (successes and failures) to OTASyncLog, since "a
  // silently-failing sync is worse than no integration".
  async syncChannel(channelId: string) {
    const channel = await this.channels.findById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    const errors: string[] = [];
    let pulled = 0;

    try {
      const adapter = this.buildAdapter(channel);
      const rawReservations = await adapter.pullReservations();

      for (const raw of rawReservations) {
        const roomTypeId = channel.roomTypeMapping[raw.otaRoomId];
        if (!roomTypeId) {
          errors.push(`No room-type mapping configured for OTA room id "${raw.otaRoomId}" (reservation ${raw.externalRef})`);
          continue;
        }
        try {
          await this.reservations.createFromOta({
            propertyId: channel.propertyId,
            otaChannelId: channel.id,
            externalRef: raw.externalRef,
            guest: { name: raw.guestName, email: raw.guestEmail, phone: raw.guestPhone },
            checkIn: raw.checkIn,
            checkOut: raw.checkOut,
            roomTypeId,
            paymentViaOta: raw.paymentCollectedByOta,
            rawPayloadRef: raw.rawPayloadRef,
          });
          pulled++;
        } catch (err: any) {
          errors.push(`Reservation ${raw.externalRef}: ${err?.message ?? 'unknown error'}`);
        }
      }
    } catch (err: any) {
      errors.push(`Poll failed: ${err?.message ?? 'unknown error'}`);
    }

    await this.channels.markSynced(channel.id);
    const log = this.syncLogs.create({
      channelId: channel.id,
      status: errors.length === 0 ? OTASyncStatus.SUCCESS : pulled > 0 ? OTASyncStatus.PARTIAL : OTASyncStatus.FAILED,
      reservationsPulled: pulled,
      errors,
    });
    await this.syncLogs.save(log);

    if (errors.length > 0) {
      // Spec §14: failed syncs should alert, not just log silently. No
      // email/Slack provider is wired up in this environment, so this is
      // the surfacing point where that integration would hook in.
      this.logger.warn(`OTA sync for channel ${channel.id} had ${errors.length} error(s): ${errors.join(' | ')}`);
    }

    return log;
  }
}

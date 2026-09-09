import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decryptJson, encryptJson } from '../../common/crypto.util';
import { OTAChannelName } from '../../common/enums';
import { BookingComCredentials } from './adapters/booking-com.adapter';
import { ConfigureChannelDto } from './dto/configure-channel.dto';
import { OTAChannel } from './entities/ota-channel.entity';
import { OTASyncLog } from './entities/ota-sync-log.entity';

@Injectable()
export class OtaChannelsService {
  constructor(
    @InjectRepository(OTAChannel) private channels: Repository<OTAChannel>,
    @InjectRepository(OTASyncLog) private syncLogs: Repository<OTASyncLog>,
    private config: ConfigService,
  ) {}

  // Every property gets a Booking.com channel row lazily, defaulting to
  // demo mode + disabled, so the settings page always has something to
  // show and toggle rather than a separate "connect" step.
  async getOrCreate(propertyId: string): Promise<OTAChannel> {
    let channel = await this.channels.findOne({ where: { propertyId, name: OTAChannelName.BOOKING_COM } });
    if (!channel) {
      channel = this.channels.create({
        propertyId,
        name: OTAChannelName.BOOKING_COM,
        syncEnabled: false,
        demoMode: true,
        pollIntervalMinutes: 15,
        roomTypeMapping: {},
      });
      channel = await this.channels.save(channel);
    }
    return channel;
  }

  toPublic(channel: OTAChannel) {
    return {
      id: channel.id,
      name: channel.name,
      hasCredentials: !!channel.encryptedCredentials,
      syncEnabled: channel.syncEnabled,
      demoMode: channel.demoMode,
      pollIntervalMinutes: channel.pollIntervalMinutes,
      roomTypeMapping: channel.roomTypeMapping,
      lastSyncedAt: channel.lastSyncedAt,
    };
  }

  async update(propertyId: string, dto: ConfigureChannelDto) {
    const channel = await this.getOrCreate(propertyId);
    if (dto.credentials) {
      channel.encryptedCredentials = encryptJson(dto.credentials, this.config.get<string>('CREDENTIALS_ENC_KEY')!);
    }
    if (dto.syncEnabled !== undefined) channel.syncEnabled = dto.syncEnabled;
    if (dto.demoMode !== undefined) channel.demoMode = dto.demoMode;
    if (dto.pollIntervalMinutes !== undefined) channel.pollIntervalMinutes = dto.pollIntervalMinutes;
    if (dto.roomTypeMapping !== undefined) channel.roomTypeMapping = dto.roomTypeMapping;
    return this.toPublic(await this.channels.save(channel));
  }

  getDecryptedCredentials(channel: OTAChannel): BookingComCredentials | null {
    if (!channel.encryptedCredentials) return null;
    try {
      return decryptJson<BookingComCredentials>(channel.encryptedCredentials, this.config.get<string>('CREDENTIALS_ENC_KEY')!);
    } catch {
      return null;
    }
  }

  syncLogsFor(channelId: string) {
    return this.syncLogs.find({ where: { channelId }, order: { runAt: 'DESC' }, take: 50 });
  }

  async dueChannels(): Promise<OTAChannel[]> {
    const enabled = await this.channels.find({ where: { syncEnabled: true } });
    const now = Date.now();
    return enabled.filter((c) => {
      if (!c.lastSyncedAt) return true;
      return now - new Date(c.lastSyncedAt).getTime() >= c.pollIntervalMinutes * 60 * 1000;
    });
  }

  findById(id: string) {
    return this.channels.findOne({ where: { id } });
  }

  async markSynced(id: string) {
    await this.channels.update(id, { lastSyncedAt: new Date() });
  }
}

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OtaChannelsService } from './ota-channels.service';
import { OtaSyncService } from './ota-sync.service';

// §3/§11: "a scheduled job, not a webhook handler, is the integration's
// backbone" — this worker wakes on a BullMQ repeatable schedule (every 5
// minutes, see ota.module.ts) and syncs whichever channels are actually
// due per their own pollIntervalMinutes, across every property that has
// enabled sync.
@Processor('ota-sync')
export class OtaSyncProcessor extends WorkerHost {
  private logger = new Logger(OtaSyncProcessor.name);

  constructor(
    private channels: OtaChannelsService,
    private syncService: OtaSyncService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'poll-due-channels') {
      const due = await this.channels.dueChannels();
      for (const channel of due) {
        try {
          await this.syncService.syncChannel(channel.id);
        } catch (err: any) {
          this.logger.error(`Failed to sync channel ${channel.id}: ${err?.message}`);
        }
      }
      return;
    }
    if (job.name === 'sync-one' && job.data?.channelId) {
      await this.syncService.syncChannel(job.data.channelId);
    }
  }
}

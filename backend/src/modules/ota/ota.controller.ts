import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ConfigureChannelDto } from './dto/configure-channel.dto';
import { OtaChannelsService } from './ota-channels.service';
import { OtaSyncService } from './ota-sync.service';

// Each property owner configures their own Booking.com connection here —
// the integration is a per-property setting, not a single global one.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('api/v1/integrations/booking-com')
export class OtaController {
  constructor(
    private channels: OtaChannelsService,
    private syncService: OtaSyncService,
  ) {}

  @Get()
  async getChannel(@CurrentUser() actor: AuthUser) {
    const channel = await this.channels.getOrCreate(actor.propertyId);
    return this.channels.toPublic(channel);
  }

  @Patch()
  configure(@CurrentUser() actor: AuthUser, @Body() dto: ConfigureChannelDto) {
    return this.channels.update(actor.propertyId, dto);
  }

  @Get('sync-log')
  async syncLog(@CurrentUser() actor: AuthUser) {
    const channel = await this.channels.getOrCreate(actor.propertyId);
    return this.channels.syncLogsFor(channel.id);
  }

  // "Trigger an out-of-band poll" per spec §13 — runs immediately rather
  // than waiting for the channel's own poll interval, and returns the
  // resulting sync log synchronously so the admin sees the outcome now.
  @Post('sync-now')
  async syncNow(@CurrentUser() actor: AuthUser) {
    const channel = await this.channels.getOrCreate(actor.propertyId);
    return this.syncService.syncChannel(channel.id);
  }
}

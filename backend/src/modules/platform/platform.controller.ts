import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateReferralCodeDto } from './dto/create-referral-code.dto';
import { SetSuspendedDto } from './dto/set-suspended.dto';
import { PlatformService } from './platform.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('api/v1/platform')
export class PlatformController {
  constructor(private platform: PlatformService) {}

  @Get('stats')
  stats() {
    return this.platform.stats();
  }

  @Get('properties')
  listProperties() {
    return this.platform.listProperties();
  }

  @Get('properties/:id')
  getProperty(@Param('id') id: string) {
    return this.platform.getProperty(id);
  }

  @Patch('properties/:id')
  setSuspended(@Param('id') id: string, @Body() dto: SetSuspendedDto) {
    return this.platform.setSuspended(id, dto.suspended);
  }

  @Get('referral-codes')
  listReferralCodes() {
    return this.platform.listReferralCodes();
  }

  @Post('referral-codes')
  createReferralCode(@CurrentUser() user: AuthUser, @Body() dto: CreateReferralCodeDto) {
    return this.platform.createReferralCode(user.userId, dto);
  }

  @Delete('referral-codes/:id')
  revokeReferralCode(@Param('id') id: string) {
    return this.platform.revokeReferralCode(id);
  }
}

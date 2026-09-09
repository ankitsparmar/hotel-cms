import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
}

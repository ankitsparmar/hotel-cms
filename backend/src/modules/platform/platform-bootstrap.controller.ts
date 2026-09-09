import { Body, Controller, Post } from '@nestjs/common';
import { BootstrapSuperAdminDto } from './dto/bootstrap-super-admin.dto';
import { PlatformService } from './platform.service';

// Deliberately unguarded — there's no super admin to authenticate as yet.
// Safety comes entirely from the shared-secret + "only while zero super
// admins exist" checks inside PlatformService.bootstrap.
@Controller('api/v1/platform')
export class PlatformBootstrapController {
  constructor(private platform: PlatformService) {}

  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapSuperAdminDto) {
    return this.platform.bootstrap(dto);
  }
}

import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

// Deliberately open to every authenticated role (no @Roles()/RolesGuard) —
// unlike /admin/users, this is a user managing their OWN account, whether
// they're front-desk staff, a property owner, or the platform super admin.
@UseGuards(JwtAuthGuard)
@Controller('api/v1/me')
export class ProfileController {
  constructor(private profile: ProfileService) {}

  @Get()
  getMe(@CurrentUser() actor: AuthUser) {
    return this.profile.getMe(actor);
  }

  @Patch()
  updateMe(@CurrentUser() actor: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profile.updateMe(actor, dto);
  }

  @Post('change-password')
  changePassword(@CurrentUser() actor: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.profile.changePassword(actor, dto);
  }
}

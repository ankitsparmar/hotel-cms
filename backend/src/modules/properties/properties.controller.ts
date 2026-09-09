import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/property')
export class PropertiesController {
  constructor(private service: PropertiesService) {}

  @Get()
  get(@CurrentUser() actor: AuthUser) {
    return this.service.findOne(actor.propertyId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch()
  update(@CurrentUser() actor: AuthUser, @Body() dto: UpdatePropertyDto) {
    return this.service.update(actor.propertyId, dto);
  }
}

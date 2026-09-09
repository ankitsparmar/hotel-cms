import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Property]), MailModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessRateLimitService } from '../common/rate-limit/rate-limit';
import { MailModule } from '../mail/mail.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import {
  ChangePasswordValidationPipe,
  DeleteAccountValidationPipe,
  RequestEmailChangeValidationPipe,
  UpdateSettingsValidationPipe,
  UpdateUsernameValidationPipe,
  UsernameAvailabilityValidationPipe,
} from './pipes/me-validation.pipes';

@Module({
  imports: [AuthModule, MailModule, UploadsModule],
  controllers: [MeController],
  providers: [
    BusinessRateLimitService,
    MeService,
    UpdateUsernameValidationPipe,
    RequestEmailChangeValidationPipe,
    UsernameAvailabilityValidationPipe,
    UpdateSettingsValidationPipe,
    ChangePasswordValidationPipe,
    DeleteAccountValidationPipe,
  ],
})
export class MeModule {}

import { Module } from '@nestjs/common';
import { BusinessRateLimitService } from '../common/rate-limit/rate-limit';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import {
  ForgotPasswordValidationPipe,
  LoginValidationPipe,
  RegistrationValidationPipe,
  ResetPasswordValidationPipe,
} from './pipes/auth-validation.pipes';
import { TokenService } from './token.service';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    BusinessRateLimitService,
    AuthService,
    TokenService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RegistrationValidationPipe,
    LoginValidationPipe,
    ForgotPasswordValidationPipe,
    ResetPasswordValidationPipe,
  ],
  exports: [TokenService, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}

import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import path from 'node:path';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { createRateLimiter } from './common/rate-limit/rate-limit';
import { RequestContextMiddleware } from './context/request-context.middleware';
import { RequestContextModule } from './context/request-context.module';
import { HealthController } from './health/health.controller';
import { LoggerModule } from './logger/logger.module';
import { AppLoggerService } from './logger/logger.service';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { UploadsModule } from './uploads/uploads.module';
import { AppConfigService } from './config/app-config.service';
import { RequestContextService } from './context/request-context.service';
import { MailModule } from './mail/mail.module';
import { MeController } from './me/me.controller';
import { MeModule } from './me/me.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '../.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    RequestContextModule,
    LoggerModule,
    PrismaModule,
    UploadsModule,
    MailModule,
    AuthModule,
    MeModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  constructor(
    private readonly config: AppConfigService,
    private readonly logger: AppLoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  configure(consumer: MiddlewareConsumer): void {
    const apiLimiter = createRateLimiter(
      {
        windowMs: this.config.security.httpRateLimitWindowMs,
        max: this.config.security.httpRateLimitMax,
        code: 'HTTP_RATE_LIMIT',
        message: 'Too many requests',
      },
      this.logger,
      this.requestContext,
    );
    const authLimiter = createRateLimiter(
      {
        windowMs: this.config.security.authRateLimitWindowMs,
        max: this.config.security.authRateLimitMax,
        code: 'AUTH_RATE_LIMIT',
        message: 'Too many auth requests',
      },
      this.logger,
      this.requestContext,
    );
    const loginLimiter = createRateLimiter(
      {
        windowMs: this.config.security.loginRateLimitWindowMs,
        max: this.config.security.loginRateLimitMax,
        code: 'LOGIN_RATE_LIMIT',
        message: 'Too many login attempts',
      },
      this.logger,
      this.requestContext,
    );
    const uploadLimiter = createRateLimiter(
      {
        windowMs: this.config.security.uploadRateLimitWindowMs,
        max: this.config.security.uploadRateLimitMax,
        keyGenerator: (req) => {
          const user = req as typeof req & { user?: { sub?: string; id?: string } };
          const userId = user.user?.sub || user.user?.id;
          return userId ? `user:${userId}` : `ip:${req.ip}`;
        },
        code: 'UPLOAD_RATE_LIMIT',
        message: 'Too many uploads',
      },
      this.logger,
      this.requestContext,
    );

    consumer.apply(RequestContextMiddleware).forRoutes('*');
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
    consumer.apply(apiLimiter, authLimiter).forRoutes(AuthController);
    consumer.apply(loginLimiter).forRoutes({
      path: 'api/auth/login',
      method: RequestMethod.POST,
    });
    consumer.apply(uploadLimiter).forRoutes({
      path: 'api/me/avatar',
      method: RequestMethod.POST,
    });
  }
}

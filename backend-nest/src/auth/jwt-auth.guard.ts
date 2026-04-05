import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { RequestContextService } from '../context/request-context.service';
import { AppLoggerService } from '../logger/logger.service';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { TokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly requestContext: RequestContextService,
    private readonly logger: AppLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      this.requestContext.assign({
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
      });
      this.logger.getLogger('security').warn(
        {
          event: 'login_failed',
          reason: 'missing_authorization_header',
        },
        'Missing auth header',
      );
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return false;
    }

    try {
      const payload = this.tokenService.verifyAccessToken(header.slice(7));
      req.user = payload;
      this.requestContext.assign({ userId: payload.sub });
      this.logger.getLogger('security').info(
        {
          event: 'auth_token_valid',
          userId: payload.sub,
        },
        'Auth token validated',
      );
      return true;
    } catch {
      this.requestContext.assign({
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
      });
      this.logger.getLogger('security').warn(
        {
          event: 'login_failed',
          reason: 'invalid_or_expired_token',
        },
        'Invalid or expired token',
      );
      res.status(401).json({ error: { message: 'Invalid or expired token' } });
      return false;
    }
  }
}

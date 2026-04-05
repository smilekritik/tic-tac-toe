import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RequestContextService } from '../context/request-context.service';
import { AppLoggerService } from '../logger/logger.service';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { TokenService } from './token.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly requestContext: RequestContextService,
    private readonly logger: AppLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return true;
    }

    try {
      const payload = this.tokenService.verifyAccessToken(header.slice(7));
      req.user = payload;
      this.requestContext.assign({ userId: payload.sub || payload.id });
      this.logger.getLogger('security').info(
        {
          event: 'auth_token_valid',
          userId: payload.sub || payload.id,
          optional: true,
        },
        'Optional auth token validated',
      );
    } catch {
      req.user = undefined;
    }

    return true;
  }
}
